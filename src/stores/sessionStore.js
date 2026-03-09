import { defineStore } from 'pinia';
import { api } from '../services/api';

export const useSessionStore = defineStore('session', {
    state: () => ({
        sessions: [],
        isLoading: false,
        error: null,
    }),

    getters: {
        // Basic getter
        getSessionsByExercise: (state) => (exerciseName) => {
            return state.sessions.filter(s => s.exercise === exerciseName).sort((a, b) => new Date(a.date) - new Date(b.date));
        },

        // Transforms data into [timestamp, weight] format for Highcharts
        getChartSeriesForExercise: (state) => (exerciseName, calculationType = 'PR') => {
            const filtered = state.sessions.filter(s => s.exercise === exerciseName);

            // Group by date to find max per day depending on calculation logic
            const groupedByDate = {};
            filtered.forEach(record => {
                // For MVP PR, we just plot the max weight lifted that day regardless of reps. 
                // Future iteration could use Brzycki formula for 1RM based on reps & weight.
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
        }
    },

    actions: {
        async fetchSessions() {
            this.isLoading = true;
            this.error = null;
            try {
                const data = await api.getSessions();
                this.sessions = data || [];
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
        }
    }
});
