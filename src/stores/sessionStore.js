import { defineStore } from 'pinia';
import { api } from '../services/api';

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
            let filtered = state.bodyMetrics;

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
