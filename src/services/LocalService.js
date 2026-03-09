import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'PR_SESSIONS';

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
}
