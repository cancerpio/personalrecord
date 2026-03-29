import * as admin from 'firebase-admin';
import { IDatabase, User, TrainingSession, BodyMetric } from './types';

export class FirestoreRepository implements IDatabase {
    private db: admin.firestore.Firestore;

    constructor() {
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        this.db = admin.firestore();
        this.db.settings({ ignoreUndefinedProperties: true });
    }

    // --- Users ---
    async getUser(userId: string): Promise<User | undefined> {
        const doc = await this.db.collection('users').doc(userId).get();
        if (!doc.exists) return undefined;
        const data = doc.data()!;
        return {
            ...data,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
        } as User;
    }

    async upsertUser(userId: string, data: Partial<User>): Promise<User> {
        const userRef = this.db.collection('users').doc(userId);
        const doc = await userRef.get();
        const now = admin.firestore.FieldValue.serverTimestamp();

        if (doc.exists) {
            await userRef.update({ ...data, updatedAt: now });
            const updated = await userRef.get();
            const updatedData = updated.data()!;
            return {
                ...updatedData,
                createdAt: updatedData.createdAt?.toDate().toISOString(),
                updatedAt: updatedData.updatedAt?.toDate().toISOString(),
            } as User;
        } else {
            const newUser = {
                docId: userId,
                createdAt: now,
                updatedAt: now,
                ...data
            };
            await userRef.set(newUser);
            return {
                ...newUser,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as any;
        }
    }

    // --- Training Sessions ---
    async getSessions(userId: string): Promise<TrainingSession[]> {
        const snapshot = await this.db.collection('training_sessions')
            .where('userId', '==', userId)
            .get();
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as any;
        });
    }

    async addSession(userId: string, data: Omit<TrainingSession, 'docId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TrainingSession> {
        const sessionRef = this.db.collection('training_sessions').doc();
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        const session = {
            ...data,
            docId: sessionRef.id,
            userId,
            createdAt: now,
            updatedAt: now
        };
        await sessionRef.set(session);
        return {
           ...session,
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
        } as any;
    }

    async updateSession(userId: string, docId: string, data: Partial<TrainingSession>): Promise<TrainingSession | null> {
        const sessionRef = this.db.collection('training_sessions').doc(docId);
        const doc = await sessionRef.get();
        
        if (!doc.exists || doc.data()?.userId !== userId) {
            return null;
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        await sessionRef.update({ ...data, updatedAt: now });
        
        const updated = await sessionRef.get();
        const updatedData = updated.data()!;
        return {
            ...updatedData,
            createdAt: updatedData.createdAt?.toDate().toISOString(),
            updatedAt: updatedData.updatedAt?.toDate().toISOString(),
        } as any;
    }

    async deleteSession(userId: string, docId: string): Promise<boolean> {
        const sessionRef = this.db.collection('training_sessions').doc(docId);
        const doc = await sessionRef.get();
        
        if (!doc.exists || doc.data()?.userId !== userId) {
            return false;
        }

        await sessionRef.delete();
        return true;
    }

    // --- Body Metrics ---
    async getBodyMetrics(userId: string): Promise<BodyMetric[]> {
         const snapshot = await this.db.collection('body_metrics')
            .where('userId', '==', userId)
            .get();
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            } as any;
        });
    }

    async upsertBodyMetric(userId: string, date: string, data: Partial<BodyMetric>): Promise<BodyMetric> {
        const docId = `${userId}_${date}`;
        const metricRef = this.db.collection('body_metrics').doc(docId);
        const doc = await metricRef.get();
        const now = admin.firestore.FieldValue.serverTimestamp();

        if (doc.exists) {
            await metricRef.update({ ...data, updatedAt: now });
            const updated = await metricRef.get();
            const updatedData = updated.data()!;
            return {
                ...updatedData,
                createdAt: updatedData.createdAt?.toDate().toISOString(),
                updatedAt: updatedData.updatedAt?.toDate().toISOString(),
            } as any;
        } else {
            const newMetric = {
                docId,
                userId,
                date,
                createdAt: now,
                updatedAt: now,
                ...data
            };
            await metricRef.set(newMetric);
            return {
                ...newMetric,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as any;
        }
    }

    async deleteBodyMetric(userId: string, date: string): Promise<boolean> {
        const docId = `${userId}_${date}`;
        const metricRef = this.db.collection('body_metrics').doc(docId);
        const doc = await metricRef.get();
        
        if (!doc.exists || doc.data()?.userId !== userId) {
            return false;
        }

        await metricRef.delete();
        return true;
    }

    // Database diagnostics
    async isHealthy(): Promise<boolean> {
        try {
            await this.db.collection('health_checks').limit(1).get();
            return true;
        } catch {
            return false;
        }
    }
}
