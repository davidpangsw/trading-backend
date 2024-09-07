import { MongoClient, Db, Collection } from 'mongodb';
import logger from './logging';

let connDB: Db | null = null;

export async function initDB(connStr: string, database: string): Promise<void> {
    const client = new MongoClient(connStr);
    await client.connect();
    await client.db(database).command({ ping: 1 });
    connDB = client.db(database);
    logger.info("Database Connected successfully");
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
    if (!connDB) {
        throw new Error("Database is not initialized. Call initDB first.");
    }
    return connDB.collection<T>(name);
}
