import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import healthRouter from './routes/health.js';
import geminiRouter from './routes/gemini.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and Vite dev server origins
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.nodeEnv !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Routes
app.use('/api/health', healthRouter);
app.use('/api/gemini', geminiRouter);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'CreatorSpace AI Backend API',
    status: 'Running',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'POST /api/gemini/generate',
    ],
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred.',
  });
});

// Start Server
const server = app.listen(config.port, () => {
  console.log(`🚀 CreatorSpace AI Backend running on http://localhost:${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`✨ Gemini Engine: ${config.gemini.model}`);
});

export default app;
