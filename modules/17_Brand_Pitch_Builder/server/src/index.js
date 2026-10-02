const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const aiRoutes = require('./routes/aiRoutes');
const profileRoutes = require('./routes/profileRoutes');
const proposalRoutes = require('./routes/proposalRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize SQLite database
db.initDatabase();

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/proposals', proposalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Brand Pitch Builder API',
    llmProvider: config.llmProvider,
    hasGeminiKey: Boolean(config.geminiApiKey),
    hasOpenaiKey: Boolean(config.openaiApiKey)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start listening
const server = app.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 Brand Pitch Builder API Server running!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🤖 AI Provider: ${config.llmProvider}`);
  console.log(`💾 SQLite DB: ${config.dbPath}`);
  console.log(`=================================================`);
});

module.exports = { app, server };
