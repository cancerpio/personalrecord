import { randomUUID } from 'crypto';

export interface User {
    docId: string;
    displayName?: string;
    pictureUrl?: string;
    settings?: any;
    createdAt: string;
    updatedAt: string;
}

export interface TrainingSession {
    docId: string;
    userId: string;
    date: string;
    exercise: string;
    weight: number;
    reps: number;
    sets: number;
    rtype: string;
    createdAt: string;
    updatedAt: string;
}

export interface BodyMetric {
    docId: string;
    userId: string;
    date: string;
    fatPercentage?: number;
    bodyWeight?: number;
    createdAt: string;
    updatedAt: string;
}

class MockDatabase {
    users: Map<string, User> = new Map();
    sessions: Map<string, TrainingSession> = new Map();
    bodyMetrics: Map<string, BodyMetric> = new Map();

    // --- Users ---
    getUser(userId: string): User | undefined {
        return this.users.get(userId);
    }

    upsertUser(userId: string, data: Partial<User>): User {
        const existing = this.users.get(userId);
        const now = new Date().toISOString();
        if (existing) {
            const updated = { ...existing, ...data, updatedAt: now };
            this.users.set(userId, updated);
            return updated;
        } else {
            const newUser: User = {
                docId: userId,
                createdAt: now,
                updatedAt: now,
                ...data
            };
            this.users.set(userId, newUser);
            return newUser;
        }
    }

    // --- Training Sessions ---
    getSessions(userId: string): TrainingSession[] {
        return Array.from(this.sessions.values()).filter(s => s.userId === userId);
    }

    addSession(userId: string, data: Omit<TrainingSession, 'docId' | 'userId' | 'createdAt' | 'updatedAt'>): TrainingSession {
        const docId = randomUUID();
        const now = new Date().toISOString();
        const session: TrainingSession = {
            ...data,
            docId,
            userId,
            createdAt: now,
            updatedAt: now
        };
        this.sessions.set(docId, session);
        return session;
    }

    updateSession(userId: string, docId: string, data: Partial<TrainingSession>): TrainingSession | null {
        const existing = this.sessions.get(docId);
        if (!existing || existing.userId !== userId) return null;

        const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
        this.sessions.set(docId, updated);
        return updated;
    }

    deleteSession(userId: string, docId: string): boolean {
        const existing = this.sessions.get(docId);
        if (!existing || existing.userId !== userId) return false;
        return this.sessions.delete(docId);
    }

    // --- Body Metrics ---
    getBodyMetrics(userId: string): BodyMetric[] {
        return Array.from(this.bodyMetrics.values()).filter(m => m.userId === userId);
    }

    upsertBodyMetric(userId: string, date: string, data: Partial<BodyMetric>): BodyMetric {
        const docId = `${userId}_${date}`;
        const existing = this.bodyMetrics.get(docId);
        const now = new Date().toISOString();

        if (existing) {
            const updated = { ...existing, ...data, updatedAt: now };
            this.bodyMetrics.set(docId, updated);
            return updated;
        } else {
            const newMetric: BodyMetric = {
                docId,
                userId,
                date,
                createdAt: now,
                updatedAt: now,
                ...data
            };
            this.bodyMetrics.set(docId, newMetric);
            return newMetric;
        }
    }

    deleteBodyMetric(userId: string, date: string): boolean {
        const docId = `${userId}_${date}`;
        const existing = this.bodyMetrics.get(docId);
        if (!existing || existing.userId !== userId) return false;
        return this.bodyMetrics.delete(docId);
    }
}

export const mockDb = new MockDatabase();
