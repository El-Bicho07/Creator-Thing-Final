
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { MongoClient } from 'mongodb';

// We delay connection to runtime
let db: any = null;
export function getDb() {
  if (!db) {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth');
    db = client.db();
  }
  return db;
}

export const auth = betterAuth({
  database: mongodbAdapter(getDb()),
  emailAndPassword: { enabled: true }
});
