import mongoose from 'mongoose';

let isConnected = false;
let isMemoryFallback = false;

// In-Memory store for offline/demo operation without MongoDB Atlas configuration
const memoryStore = {
  users: new Map(),
  posts: new Map(),
  planItems: new Map(),
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.log('[DB] No MONGODB_URI provided in .env');
    console.log('[DB] ⚡ Engaging In-Memory Fallback Mode (Full CRUD & JWT Auth functional for SIH Demo)');
    isMemoryFallback = true;
    return;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    isMemoryFallback = false;
    console.log('[DB] ✅ Connected successfully to MongoDB Atlas / Local MongoDB');
  } catch (error) {
    console.warn(`[DB] ⚠️ MongoDB connection failed: ${error.message}`);
    console.log('[DB] ⚡ Engaging In-Memory Fallback Mode for smooth offline presentation');
    isMemoryFallback = true;
  }
}

export function getDBStatus() {
  return {
    isConnected,
    isMemoryFallback,
    mode: isMemoryFallback ? 'In-Memory Demo Engine' : 'MongoDB Atlas Connected',
  };
}

export { memoryStore, isMemoryFallback };
