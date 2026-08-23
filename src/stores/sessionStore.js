import { defineStore } from 'pinia';
import { api } from '../services/api';

function getMondayOfDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday, ...
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(y, m - 1, diff));
    const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(monday.getUTCDate()).padStart(2, '0');
    return `${monday.getUTCFullYear()}-${mm}-${dd}`;
}

// 依週分組計算每週平均體重（沿用相同的 UTC 週邊界）。
// 回傳 { '<週一>': 平均體重 }，僅包含有紀錄的週。
function getWeeklyBodyWeightAverages(bodyMetrics) {
    const sums = {};
    (bodyMetrics || []).forEach(m => {
        if (!m || !m.date) return;
        if (m.bodyWeight === undefined || m.bodyWeight === null || m.bodyWeight === '') return;
        const bw = Number(m.bodyWeight);
        if (Number.isNaN(bw)) return;
        const monday = getMondayOfDate(m.date);
        if (!sums[monday]) sums[monday] = { sum: 0, count: 0 };
        sums[monday].sum += bw;
        sums[monday].count += 1;
    });
    const avgs = {};
    Object.keys(sums).forEach(k => { avgs[k] = sums[k].sum / sums[k].count; });
    return avgs;
}

// 12 週基準的視窗：自當週往回推的 N 個「完整週」週一（不含當週）。
// 由舊到新回傳，供容積與體重共用同一組視窗，確保標頭 chip 與圖上基準線同值。
const BASELINE_WEEKS = 12;
function getBaselineWeekKeys(currentMonday, weeks = BASELINE_WEEKS) {
    const [y, m, d] = currentMonday.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const keys = [];
    for (let i = weeks; i >= 1; i--) {
        const dt = new Date(base);
        dt.setUTCDate(dt.getUTCDate() - i * 7);
        const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        keys.push(`${dt.getUTCFullYear()}-${mm}-${dd}`);
    }
    return keys;
}

// 四捨五入到小數一位，並把 -0 正規化成 0。
// 判定門檻與畫面顯示 SHALL 吃同一個值，避免「顯示 0.5 卻判定持平」這種自相矛盾，
// 也避免 (-0.04).toFixed(1) 產生 "-0.0"。
function round1(value) {
    const r = Number(value.toFixed(1));
    return r === 0 ? 0 : r;
}

// 將 createdAt 正規化為可比較的毫秒數。
// local 模式存的是 Date.now() 數字、後端存的是 ISO 字串，兩者都吃得下；
// 舊資料可能完全沒有此欄位，回 null 交由呼叫端退回陣列順序。
function toTimestamp(value) {
    if (value === undefined || value === null || value === '') return null;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
}

export const useSessionStore = defineStore('session', {
    state: () => ({
        sessions: [],
        bodyMetrics: [],
        isLoading: false,
        error: null,
    }),

    getters: {
        // Basic getter
        getSessionsByExercise: (state) => (exerciseName) => {
            return state.sessions.filter(s => s.exercise === exerciseName).sort((a, b) => new Date(a.date) - new Date(b.date));
        },

        // 取得某動作「最後一組」的重量與次數，供記錄表單選完動作後帶入。
        // 「最後一組」＝先比 date（YYYY-MM-DD 補零，字典序即時間序），
        // 同日再比 createdAt；任一方缺 createdAt 時退回陣列原順序（後加入者視為較新）。
        // 動作名稱採精確比對，不做 trim／大小寫正規化。
        getLastSetForExercise: (state) => (exerciseName) => {
            if (!exerciseName) return null;

            let best = null;
            let bestIdx = -1;
            let bestTs = null;

            state.sessions.forEach((session, idx) => {
                if (!session || session.exercise !== exerciseName || !session.date) return;

                const ts = toTimestamp(session.createdAt);

                if (best === null) {
                    best = session; bestIdx = idx; bestTs = ts;
                    return;
                }

                let isNewer;
                if (session.date !== best.date) {
                    isNewer = session.date > best.date;
                } else if (ts !== null && bestTs !== null) {
                    isNewer = ts > bestTs;
                } else {
                    isNewer = idx > bestIdx;
                }

                if (isNewer) { best = session; bestIdx = idx; bestTs = ts; }
            });

            return best ? { weight: best.weight, reps: best.reps } : null;
        },

        // Weekly training volume calculation and trend
        weeklyTrainingVolumeInfo: (state) => {
            const weeklyVolumes = {};
            state.sessions.forEach(session => {
                const dateStr = session.date;
                if (!dateStr) return;
                const monday = getMondayOfDate(dateStr);
                const vol = (session.reps || 0) * (session.weight || 0);
                weeklyVolumes[monday] = (weeklyVolumes[monday] || 0) + vol;
            });

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;
            const currentMonday = getMondayOfDate(todayStr);

            const currentVolume = weeklyVolumes[currentMonday] || 0;

            // 趨勢：以「當週即時總量」對「12 週基準」判定。
            // 12 週基準＝往回推 12 個完整週（不含當週）的容積平均；該視窗內沒有訓練紀錄的週
            // 補 0 計入、分母固定 12（沒訓練就是 0，這對容積是真值）。
            // 當週即時總量（部分加總）就是被比較的值，與標頭大數字一致
            // ——週初偏低時可能顯示下降（已知並接受的取捨）。
            // 改用固定視窗而非「全期平均」的原因：全期平均是不斷成長的視窗，每多記一週就更遲鈍，
            // 長期下來趨勢指示會退化成永遠「持平」且不會有任何錯誤徵兆。
            const baselineWeeks = getBaselineWeekKeys(currentMonday);
            const hasBaselineVolume = baselineWeeks.some(monday => weeklyVolumes[monday] !== undefined);

            let averageVolume = 0;
            let trend = 'none';
            let statusLabel = '—';
            let trendPct = null;

            if (!hasBaselineVolume) {
                // 視窗內完全沒有訓練紀錄，維持既有無資料處理
                trend = currentVolume > 0 ? 'up' : 'none';
                statusLabel = currentVolume > 0 ? '首週訓練中' : '—';
            } else {
                averageVolume = Math.round(
                    baselineWeeks.reduce((sum, monday) => sum + (weeklyVolumes[monday] || 0), 0) / BASELINE_WEEKS
                );
                trendPct = averageVolume > 0 ? Math.round((currentVolume / averageVolume - 1) * 100) : null;
                if (currentVolume > averageVolume * 1.05) {
                    trend = 'up';
                    statusLabel = '上升';
                } else if (currentVolume < averageVolume * 0.95) {
                    trend = 'down';
                    statusLabel = '下降';
                } else {
                    trend = 'stable';
                    statusLabel = '持平';
                }
            }

            // 每週平均體重：當週摘要與趨勢，沿用與容積相同的 12 週視窗。
            // 但空白週的處理刻意與容積不同——那週沒量體重不等於 0 kg，補 0 會把基準拉到 70 幾，
            // 因此只平均「視窗內有體重紀錄的週」，分母是實際有紀錄的週數。
            // 門檻 ±0.5kg：實測相鄰週的週平均體重變化中位數 0.27kg、平均 0.43kg，
            // 舊的 ±0.3kg 會有近半數的正常波動踩過門檻，訊號被雜訊稀釋。
            const BW_THRESHOLD = 0.5;
            const weeklyBW = getWeeklyBodyWeightAverages(state.bodyMetrics);
            const currentBodyWeight = weeklyBW[currentMonday] !== undefined ? weeklyBW[currentMonday] : null;

            const baselineBWWeeks = baselineWeeks.filter(monday => weeklyBW[monday] !== undefined);

            let bodyWeightTrend = 'none';
            let bodyWeightDelta = null;
            if (currentBodyWeight !== null && baselineBWWeeks.length > 0) {
                const avgBW = baselineBWWeeks.reduce((sum, monday) => sum + weeklyBW[monday], 0) / baselineBWWeeks.length;
                // 先四捨五入再判定，讓門檻與畫面顯示永遠一致
                bodyWeightDelta = round1(currentBodyWeight - avgBW);
                if (bodyWeightDelta > BW_THRESHOLD) bodyWeightTrend = 'up';
                else if (bodyWeightDelta < -BW_THRESHOLD) bodyWeightTrend = 'down';
                else bodyWeightTrend = 'stable';
            }

            return {
                currentVolume,
                averageVolume,
                trend,
                statusLabel,
                trendPct,
                currentBodyWeight,
                bodyWeightTrend,
                bodyWeightDelta
            };
        },

        // Trailing 12-week volume series for the dashboard bar chart.
        // Returns a fixed-length (12) series ordered oldest -> current week,
        // with missing weeks filled as 0, plus the 12-week average.
        trailing12WeekVolumeInfo: (state) => {
            const WEEKS = 12;

            // Reuse the same weekly grouping as weeklyTrainingVolumeInfo.
            const weeklyVolumes = {};
            state.sessions.forEach(session => {
                const dateStr = session.date;
                if (!dateStr) return;
                const monday = getMondayOfDate(dateStr);
                const vol = (session.reps || 0) * (session.weight || 0);
                weeklyVolumes[monday] = (weeklyVolumes[monday] || 0) + vol;
            });

            const weeklyBW = getWeeklyBodyWeightAverages(state.bodyMetrics);

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const currentMonday = getMondayOfDate(todayStr);
            const [cy, cm, cd] = currentMonday.split('-').map(Number);
            const currentMondayDate = new Date(Date.UTC(cy, cm - 1, cd));

            const weeks = [];
            let prevMonth = null;
            for (let i = WEEKS - 1; i >= 0; i--) {
                const monday = new Date(currentMondayDate);
                monday.setUTCDate(monday.getUTCDate() - i * 7);
                const sunday = new Date(monday);
                sunday.setUTCDate(sunday.getUTCDate() + 6);

                const key = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
                const mo = monday.getUTCMonth() + 1;
                // Sparse x-axis: label only the first shown week of each month.
                const monthLabel = mo !== prevMonth ? `${mo}月` : '';
                prevMonth = mo;

                weeks.push({
                    monday: key,
                    volume: weeklyVolumes[key] || 0,
                    // 該週平均體重；無紀錄為 null（不補 0、不內插）
                    avgBodyWeight: weeklyBW[key] !== undefined ? weeklyBW[key] : null,
                    monthLabel,
                    rangeLabel: `${mo}/${monday.getUTCDate()}–${sunday.getUTCMonth() + 1}/${sunday.getUTCDate()}`,
                    isCurrent: key === currentMonday
                });
            }

            // 基準線與標頭 chip 用同一個定義：往回 12 個完整週（不含當週）、空白週補 0、分母 12。
            // 刻意不用「圖上這 12 根的平均」——那會把進行中的當週算進分母，
            // 等於拿當週去跟一個包含自己的平均比較，週初必然被自己拉低。
            const average = Math.round(
                getBaselineWeekKeys(currentMonday).reduce((sum, monday) => sum + (weeklyVolumes[monday] || 0), 0) / BASELINE_WEEKS
            );

            return { weeks, average };
        },

        // Transforms data into [timestamp, weight] format for Highcharts
        getChartSeriesForExercise: (state) => (exerciseName, calculationType = 'PR', year = 'all', month = 'all') => {
            let filtered = state.sessions.filter(s => s.exercise === exerciseName);

            if (year !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[0]) === year);
            }
            if (month !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[1]) === month);
            }

            // Map 'PR' to exactly 1 rep, '3RM' to exactly 3 reps, '5RM' to exactly 5 reps
            // Users want strict classification, not "at least X reps"
            let targetReps = 1;
            if (calculationType === '3RM') targetReps = 3;
            else if (calculationType === '5RM') targetReps = 5;

            // Filter out sets that don't match the EXACT rep requirement
            const repFiltered = filtered.filter(s => s.reps === targetReps);

            // Group by date to find max per day
            const groupedByDate = {};
            repFiltered.forEach(record => {
                const currentMax = groupedByDate[record.date] || 0;
                if (record.weight > currentMax) {
                    groupedByDate[record.date] = record.weight;
                }
            });

            // Convert to Highcharts tuple [timestamp, value] sorted by time
            const chartData = Object.entries(groupedByDate).map(([dateStr, maxWeight]) => {
                // We use UTC so highcharts plots exactly on the date
                const timeParts = dateStr.split('-');
                const timestamp = Date.UTC(parseInt(timeParts[0]), parseInt(timeParts[1]) - 1, parseInt(timeParts[2]));
                return [timestamp, maxWeight];
            }).sort((a, b) => a[0] - b[0]);

            return chartData;
        },

        // Transforms Body Fat data into [timestamp, fatPercentage] format for Highcharts secondary axis
        getChartSeriesForBodyFat: (state) => (year = 'all', month = 'all') => {
            let filtered = state.bodyMetrics.filter(s => s.fatPercentage !== undefined && s.fatPercentage !== null && s.fatPercentage !== '');

            if (year !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[0]) === year);
            }
            if (month !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[1]) === month);
            }

            // Convert to Highcharts tuple [timestamp, value] sorted by time
            const chartData = filtered.map(record => {
                const timeParts = record.date.split('-');
                const timestamp = Date.UTC(parseInt(timeParts[0]), parseInt(timeParts[1]) - 1, parseInt(timeParts[2]));
                return [timestamp, record.fatPercentage];
            }).sort((a, b) => a[0] - b[0]);

            return chartData;
        },

        // Transforms Body Weight data into [timestamp, bodyWeight] format for Highcharts primary axis
        getChartSeriesForBodyWeight: (state) => (year = 'all', month = 'all') => {
            let filtered = state.bodyMetrics.filter(s => s.bodyWeight !== undefined && s.bodyWeight !== null && s.bodyWeight !== '');

            if (year !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[0]) === year);
            }
            if (month !== 'all') {
                filtered = filtered.filter(s => parseInt(s.date.split('-')[1]) === month);
            }

            // Convert to Highcharts tuple [timestamp, value] sorted by time
            const chartData = filtered.map(record => {
                const timeParts = record.date.split('-');
                const timestamp = Date.UTC(parseInt(timeParts[0]), parseInt(timeParts[1]) - 1, parseInt(timeParts[2]));
                return [timestamp, Number(record.bodyWeight)];
            }).sort((a, b) => a[0] - b[0]);

            return chartData;
        }
    },

    actions: {
        async fetchSessions() {
            this.isLoading = true;
            this.error = null;
            try {
                const data = await api.getSessions();
                this.sessions = data || [];
                // Also fetch body metrics concurrently or sequentially
                const bodyData = await api.getBodyMetrics();
                this.bodyMetrics = bodyData || [];
            } catch (err) {
                console.error('Failed to fetch sessions:', err);
                this.error = err.message || 'Failed to fetch sessions';
            } finally {
                this.isLoading = false;
            }
        },

        async addSession(record) {
            this.isLoading = true;
            this.error = null;
            try {
                const newRecord = await api.addSession(record);
                // Reactively update the state without requiring a full refetch
                this.sessions.push(newRecord);
                return newRecord;
            } catch (err) {
                console.error('Failed to add session:', err);
                this.error = err.message || 'Failed to save session';
                throw err;
            } finally {
                this.isLoading = false;
            }
        },

        async updateSession(id, updatedFields) {
            this.isLoading = true;
            this.error = null;
            try {
                const updatedRecord = await api.updateSession(id, updatedFields);
                const index = this.sessions.findIndex(s => s.id === id);
                if (index !== -1) {
                    this.sessions[index] = updatedRecord;
                }
                return updatedRecord;
            } catch (err) {
                console.error('Failed to update session:', err);
                this.error = err.message || 'Failed to update session';
                throw err;
            } finally {
                this.isLoading = false;
            }
        },

        async deleteSession(id) {
            this.isLoading = true;
            this.error = null;
            try {
                await api.deleteSession(id);
                this.sessions = this.sessions.filter(s => s.id !== id);
            } catch (err) {
                console.error('Failed to delete session:', err);
                this.error = err.message || 'Failed to delete session';
                throw err;
            } finally {
                this.isLoading = false;
            }
        },

        async addBodyMetric(record) {
            this.isLoading = true;
            this.error = null;
            try {
                const newRecord = await api.addBodyMetric(record);
                // Upsert locally in state
                const existingIndex = this.bodyMetrics.findIndex(item => item.date === record.date);
                if (existingIndex >= 0) {
                    this.bodyMetrics[existingIndex] = newRecord;
                } else {
                    this.bodyMetrics.push(newRecord);
                }
                return newRecord;
            } catch (err) {
                console.error('Failed to add body metric:', err);
                this.error = err.message || 'Failed to save body metric';
                throw err;
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBodyMetric(date) {
            this.isLoading = true;
            this.error = null;
            try {
                await api.deleteBodyMetric(date);
                this.bodyMetrics = this.bodyMetrics.filter(item => item.date !== date);
            } catch (err) {
                console.error('Failed to delete body metric:', err);
                this.error = err.message || 'Failed to delete body metric';
                throw err;
            } finally {
                this.isLoading = false;
            }
        }
    }
});
