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

export interface IDatabase {
    // --- Users ---
    getUser(userId: string): Promise<User | undefined>;
    upsertUser(userId: string, data: Partial<User>): Promise<User>;

    // --- Training Sessions ---
    getSessions(userId: string): Promise<TrainingSession[]>;
    addSession(userId: string, data: Omit<TrainingSession, 'docId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TrainingSession>;
    updateSession(userId: string, docId: string, data: Partial<TrainingSession>): Promise<TrainingSession | null>;
    deleteSession(userId: string, docId: string): Promise<boolean>;

    // --- Body Metrics ---
    getBodyMetrics(userId: string): Promise<BodyMetric[]>;
    upsertBodyMetric(userId: string, date: string, data: Partial<BodyMetric>): Promise<BodyMetric>;
    deleteBodyMetric(userId: string, date: string): Promise<boolean>;

    // Database diagnostics
    isHealthy(): Promise<boolean>;
}
