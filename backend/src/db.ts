import { IDatabase } from './repositories/types';
import { FirestoreRepository } from './repositories/FirestoreRepository';
import { MongoRepository } from './repositories/MongoRepository';

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
    if (dbInstance) {
        return dbInstance;
    }

    const provider = process.env.DB_PROVIDER || 'mongodb';

    if (provider === 'mongodb') {
        console.log(`[Database] Initializing MongoDB Repository...`);
        dbInstance = new MongoRepository();
    } else if (provider === 'firestore') {
        console.log(`[Database] Initializing Firestore Repository...`);
        dbInstance = new FirestoreRepository();
    } else {
        throw new Error(`[Database] Unknown DB_PROVIDER: ${provider}`);
    }

    return dbInstance;
}

export const firestoreDb = getDatabase();
// Export old names for compatibility during migration, eventually rename.
export { IDatabase } from './repositories/types';
