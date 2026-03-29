import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import { IDatabase, User, TrainingSession, BodyMetric } from './types';

export class MongoRepository implements IDatabase {
    private client: MongoClient;
    private db: Db | null = null;
    
    // Config
    private dbName = 'personalrecord';

    constructor() {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/personalrecord';
        this.client = new MongoClient(uri);
    }

    async connect() {
        if (!this.db) {
            await this.client.connect();
            // Parse DB name from URI or fallback
            // Extract db name: mongodb://user:pass@host/dbname?query
            let extractedName = this.dbName;
            try {
                const url = new URL(process.env.MONGODB_URI || 'mongodb://localhost:27017/personalrecord');
                if (url.pathname && url.pathname.length > 1) {
                    extractedName = url.pathname.substring(1);
                }
            } catch (e) {
                // Ignore parse errors, fallback
            }
            this.dbName = extractedName;
            this.db = this.client.db(this.dbName);
        }
    }

    private get collectionUsers(): Collection<Document> {
        if (!this.db) throw new Error("Database not connected");
        return this.db.collection('users');
    }

    private get collectionSessions(): Collection<Document> {
        if (!this.db) throw new Error("Database not connected");
        return this.db.collection('training_sessions');
    }

    private get collectionMetrics(): Collection<Document> {
        if (!this.db) throw new Error("Database not connected");
        return this.db.collection('body_metrics');
    }

    // Diagnostics
    async isHealthy(): Promise<boolean> {
        try {
            await this.connect();
            await this.db!.command({ ping: 1 });
            return true;
        } catch {
            return false;
        }
    }

    private mapIdOut(doc: any) {
        if (!doc) return doc;
        // The NoSQL document _id object is converted to a docId string if not present
        const docId = doc.docId || (doc._id ? doc._id.toString() : '');
        const { _id, ...rest } = doc;
        return { ...rest, docId };
    }

    // --- Users ---
    async getUser(userId: string): Promise<User | undefined> {
        await this.connect();
        const doc = await this.collectionUsers.findOne({ docId: userId });
        if (!doc) return undefined;
        return this.mapIdOut(doc) as User;
    }

    async upsertUser(userId: string, data: Partial<User>): Promise<User> {
        await this.connect();
        const now = new Date().toISOString();

        const updateData: any = {
            ...data,
            updatedAt: now
        };

        const result = await this.collectionUsers.findOneAndUpdate(
            { docId: userId },
            { 
                $set: updateData,
                $setOnInsert: {
                    docId: userId,
                    createdAt: now
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        if (!result) throw new Error("Upsert failed");
        return this.mapIdOut(result) as User;
    }

    // --- Training Sessions ---
    async getSessions(userId: string): Promise<TrainingSession[]> {
        await this.connect();
        const docs = await this.collectionSessions.find({ userId }).toArray();
        return docs.map(d => this.mapIdOut(d) as TrainingSession);
    }

    async addSession(userId: string, data: Omit<TrainingSession, 'docId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TrainingSession> {
        await this.connect();
        const now = new Date().toISOString();
        const docId = new ObjectId().toString();

        const session = {
            ...data,
            docId,
            userId,
            createdAt: now,
            updatedAt: now
        };

        await this.collectionSessions.insertOne({ ...session, _id: new ObjectId(docId) });
        return session as TrainingSession;
    }

    async updateSession(userId: string, docId: string, data: Partial<TrainingSession>): Promise<TrainingSession | null> {
        await this.connect();
        const now = new Date().toISOString();

        const result = await this.collectionSessions.findOneAndUpdate(
            { docId, userId },
            { $set: { ...data, updatedAt: now } },
            { returnDocument: 'after' }
        );

        if (!result) return null;
        return this.mapIdOut(result) as TrainingSession;
    }

    async deleteSession(userId: string, docId: string): Promise<boolean> {
        await this.connect();
        const result = await this.collectionSessions.deleteOne({ docId, userId });
        return result.deletedCount > 0;
    }

    // --- Body Metrics ---
    async getBodyMetrics(userId: string): Promise<BodyMetric[]> {
        await this.connect();
        const docs = await this.collectionMetrics.find({ userId }).toArray();
        return docs.map(d => this.mapIdOut(d) as BodyMetric);
    }

    async upsertBodyMetric(userId: string, date: string, data: Partial<BodyMetric>): Promise<BodyMetric> {
        await this.connect();
        const now = new Date().toISOString();
        const docId = `${userId}_${date}`;

        const updateData: any = {
            ...data,
            updatedAt: now
        };

        const result = await this.collectionMetrics.findOneAndUpdate(
            { docId },
            { 
                $set: updateData,
                $setOnInsert: {
                    docId,
                    userId,
                    date,
                    createdAt: now
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        if (!result) throw new Error("Upsert failed");
        return this.mapIdOut(result) as BodyMetric;
    }

    async deleteBodyMetric(userId: string, date: string): Promise<boolean> {
        await this.connect();
        const docId = `${userId}_${date}`;
        const result = await this.collectionMetrics.deleteOne({ docId, userId });
        return result.deletedCount > 0;
    }
}
