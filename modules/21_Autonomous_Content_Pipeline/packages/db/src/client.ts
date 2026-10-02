
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function connect(uri: string) {
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
  }
  return client;
}

export function getClient() {
  if (!client) throw new Error("Database not connected");
  return client;
}

export async function close() {
  if (client) {
    await client.close();
    client = null;
  }
}
