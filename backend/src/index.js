require('dotenv').config();
console.log("OPENAI =", process.env.OPENAI_API_KEY);
const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { runMigrations } = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/chat', chatRouter);
app.get('/', (req, res) => {
  res.json({
    message: 'AI Chat Agent Backend Running'
  });
});

app.use(notFound);
app.use(errorHandler);

// Run migrations then start server
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });
