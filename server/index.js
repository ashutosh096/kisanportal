import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDb } from './db.js';

import authRoutes from './routes/auth.js';
import farmerRoutes from './routes/farmers.js';
import surveyRoutes from './routes/surveys.js';
import surveyorRoutes from './routes/surveyors.js';
import exportRoutes from './routes/export.js';

const app = express();
const server = http.createServer(app);

// Enable Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Pass Socket.io instance to Express app
app.set('io', io);

// Initialize SQLite database schema & seed data
initDb();

// Dual route mounting for local server & Vercel serverless rewrites
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/farmers', farmerRoutes);
app.use('/farmers', farmerRoutes);

app.use('/api/surveys', surveyRoutes);
app.use('/surveys', surveyRoutes);

app.use('/api/surveyors', surveyorRoutes);
app.use('/surveyors', surveyorRoutes);

app.use('/api/export', exportRoutes);
app.use('/export', exportRoutes);

// Serve static React client build in production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('📡 Admin/Client connected to live WebSockets:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Fallback route for React SPA routing in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 5050;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Farmer Survey Server running on http://localhost:${PORT}`);
  });
}

export default app;
