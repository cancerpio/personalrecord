import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'PR_SESSIONS';
const STORAGE_KEY_BODY = 'PR_BODY_METRICS';

// 一次性資料遷移：舊的 `Squat` 實際上指高背槓深蹲，正名為 `High Bar Squat`。
// Firestore 端的歷史紀錄另以 firestore_update_document 逐筆更新；
// 本機 localStorage 的資料只能在讀取時就地轉換並寫回。
// 待所有裝置的舊資料都轉換過後（估計 2027 年起），此段連同測試可整批移除。
const LEGACY_EXERCISE_RENAMES = {
    'Squat': 'High Bar Squat'
};

// 純函式：回傳轉換後的紀錄與是否真的有變動，供呼叫端決定要不要寫回。
export function normalizeLegacyExerciseNames(sessions) {
    let changed = false;
    const normalized = (sessions || []).map(session => {
        if (!session || !session.exercise) return session;
        const renamed = LEGACY_EXERCISE_RENAMES[session.exercise];
        if (!renamed) return session;
        changed = true;
        return { ...session, exercise: renamed };
    });
    return { sessions: normalized, changed };
}

export class LocalService {
    async getSessions() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        const data = localStorage.getItem(STORAGE_KEY);
        const stored = data ? JSON.parse(data) : [];

        const { sessions, changed } = normalizeLegacyExerciseNames(stored);
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        }
        return sessions;
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
