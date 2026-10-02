import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from './db/connection.js';
import { PostRepository } from './db/storage.js';
import { syntheticInstagramPosts } from './data/syntheticPosts.js';

import authRoutes from './routes/authRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import importRoutes from './routes/importRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import similarityRoutes from './routes/similarityRoutes.js';
import plannerRoutes from './routes/plannerRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger for debugging in development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Health & Status endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = getDBStatus();
  const postCount = await PostRepository.count();
  res.json({
    status: 'healthy',
    project: 'Content Recycler (Smart India Hackathon)',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    libraryPostCount: postCount,
    aiEngine: 'Heuristic Explainable Recommendations + TF-IDF Vectorizer (Zero-cost pure JS NLP)',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/similarity', similarityRoutes);
app.use('/api/planner', plannerRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

// Startup routine
async function startServer() {
  await connectDB();

  // Auto-seed the 50 synthetic records on startup if library is empty for instant demonstration
  try {
    const existingCount = await PostRepository.count();
    if (existingCount === 0) {
      console.log('[Startup] Empty content library detected. Auto-seeding 50 synthetic demo posts...');
      await PostRepository.insertMany(syntheticInstagramPosts);
      console.log('[Startup] ✅ 50 synthetic demo posts loaded ready for SIH evaluation.');
    } else {
      console.log(`[Startup] Content library already populated with ${existingCount} posts.`);
    }
  } catch (seedErr) {
    console.warn('[Startup] Warning during initial seed check:', seedErr.message);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Content Recycler Backend Server running on port ${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}/api`);
    console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer();
