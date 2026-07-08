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

            // 方案 2A：以「上一完整週」對「前期各週平均」判定趨勢，
            // 而非拿當週的部分加總去比。完整週＝有紀錄且非當週的各週。
            const completeWeeks = Object.keys(weeklyVolumes)
                .filter(monday => monday !== currentMonday)
                .sort(); // YYYY-MM-DD 補零，字典序即時間序

            let averageVolume = 0;
            let trend = 'none';
            let statusLabel = '—';
            let trendPct = null;

            if (completeWeeks.length === 0) {
                // 完全沒有完整週，維持既有無資料處理
                trend = currentVolume > 0 ? 'up' : 'none';
                statusLabel = currentVolume > 0 ? '首週訓練中' : '—';
            } else if (completeWeeks.length === 1) {
                // 只有一個完整週：無前期可構成平均 → 持平
                averageVolume = weeklyVolumes[completeWeeks[0]];
                trend = 'stable';
                statusLabel = '持平';
                trendPct = 0;
            } else {
                const lastComplete = completeWeeks[completeWeeks.length - 1];
                const priorWeeks = completeWeeks.slice(0, -1);
                const lastVolume = weeklyVolumes[lastComplete];
                averageVolume = Math.round(
                    priorWeeks.reduce((sum, monday) => sum + weeklyVolumes[monday], 0) / priorWeeks.length
                );
                trendPct = averageVolume > 0 ? Math.round((lastVolume / averageVolume - 1) * 100) : null;
                if (lastVolume > averageVolume * 1.05) {
                    trend = 'up';
                    statusLabel = '上升';
                } else if (lastVolume < averageVolume * 0.95) {
                    trend = 'down';
                    statusLabel = '下降';
                } else {
                    trend = 'stable';
                    statusLabel = '持平';
                }
            }

            // 每週平均體重：當週摘要與趨勢（同採 2A，門檻改用絕對量 ±0.3kg）
            const BW_THRESHOLD = 0.3;
            const weeklyBW = getWeeklyBodyWeightAverages(state.bodyMetrics);
            const currentBodyWeight = weeklyBW[currentMonday] !== undefined ? weeklyBW[currentMonday] : null;

            const completeBWWeeks = Object.keys(weeklyBW)
                .filter(monday => monday !== currentMonday)
                .sort();

            let bodyWeightTrend = 'none';
            let bodyWeightDelta = null;
            if (completeBWWeeks.length === 1) {
                bodyWeightTrend = 'stable';
                bodyWeightDelta = 0;
            } else if (completeBWWeeks.length > 1) {
                const lastBWKey = completeBWWeeks[completeBWWeeks.length - 1];
                const priorBWWeeks = completeBWWeeks.slice(0, -1);
                const lastBW = weeklyBW[lastBWKey];
                const avgBW = priorBWWeeks.reduce((sum, monday) => sum + weeklyBW[monday], 0) / priorBWWeeks.length;
                bodyWeightDelta = lastBW - avgBW;
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

        // Trailing 16-week volume series for the dashboard bar chart.
        // Returns a fixed-length (16) series ordered oldest -> current week,
        // with missing weeks filled as 0, plus the 16-week average.
        trailing16WeekVolumeInfo: (state) => {
            const WEEKS = 16;

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

            const total = weeks.reduce((sum, w) => sum + w.volume, 0);
            const average = Math.round(total / WEEKS);

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
