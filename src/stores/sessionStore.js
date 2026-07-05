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

            const pastWeeks = Object.keys(weeklyVolumes).filter(monday => monday !== currentMonday);
            let averageVolume = 0;
            if (pastWeeks.length > 0) {
                const totalPastVolume = pastWeeks.reduce((sum, monday) => sum + weeklyVolumes[monday], 0);
                averageVolume = Math.round(totalPastVolume / pastWeeks.length);
            }

            let trend = 'none';
            let statusLabel = '—';
            if (pastWeeks.length > 0) {
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
            } else {
                trend = currentVolume > 0 ? 'up' : 'none';
                statusLabel = currentVolume > 0 ? '首週訓練中' : '—';
            }

            return {
                currentVolume,
                averageVolume,
                trend,
                statusLabel
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
