import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'PR_SESSIONS';
const STORAGE_KEY_BODY = 'PR_BODY_METRICS';

export class LocalService {
    async getSessions() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    async addSession(record) {
        await new Promise(resolve => setTimeout(resolve, 300));

        // Auto-generate ID and timestamp if not provided
        const newRecord = {
            ...record,
            id: record.id || uuidv4(),
            createdAt: record.createdAt || Date.now()
        };

        const currentData = await this.getSessions();
        currentData.push(newRecord);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
        return newRecord;
    }

    async updateSession(id, updatedFields) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const currentData = await this.getSessions();
        const index = currentData.findIndex(s => s.id === id);
        if (index !== -1) {
            currentData[index] = { ...currentData[index], ...updatedFields };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
            return currentData[index];
        }
        throw new Error('Session not found');
    }

    async deleteSession(id) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const currentData = await this.getSessions();
        const newData = currentData.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        return true;
    }

    async getBodyMetrics() {
        await new Promise(resolve => setTimeout(resolve, 300));
        const data = localStorage.getItem(STORAGE_KEY_BODY);
        return data ? JSON.parse(data) : [];
    }

    async addBodyMetric(record) {
        await new Promise(resolve => setTimeout(resolve, 300));

        const currentData = await this.getBodyMetrics();

        // Upsert Logic: Only 1 record per day allowed
        const existingIndex = currentData.findIndex(item => item.date === record.date);

        const newRecord = {
            ...record,
            id: existingIndex >= 0 ? currentData[existingIndex].id : uuidv4(),
            updatedAt: Date.now()
        };

        if (existingIndex >= 0) {
            currentData[existingIndex] = newRecord; // Overwrite
        } else {
            currentData.push(newRecord); // Insert
        }

        localStorage.setItem(STORAGE_KEY_BODY, JSON.stringify(currentData));
        return newRecord;
    }

    async deleteBodyMetric(date) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const currentData = await this.getBodyMetrics();
        const newData = currentData.filter(item => item.date !== date);
        localStorage.setItem(STORAGE_KEY_BODY, JSON.stringify(newData));
        return true;
    }
}
