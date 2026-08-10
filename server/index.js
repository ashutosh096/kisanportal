import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDb } from './db.js';

import authRoutes from './routes/auth.js';
import farmerRoutes from './routes/farmers.js';
import surveyorRoutes from './routes/surveyors.js';
import exportRoutes from './routes/export.js';
import usersRoutes from './routes/users.js';
import form2Routes from './routes/form2.js';
import lockRoutes from './routes/lock.js';

import { apiLimiter } from './middleware/rateLimiter.js';
import { csrfSetCookie, csrfProtection } from './middleware/csrf.js';

const app = express();
const server = http.createServer(app);

// Initialize DB schema & migrations
initDb().then(() => {
  console.log('✅ PostgreSQL Schema & Migrations Initialized');
}).catch((err) => {
  console.error('❌ DB Init Error:', err);
});

// ─── Socket.IO ───
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── FIX #8: CORS — restrict to configured origin ───
// In development (no FRONTEND_URL set) we fall back to localhost origins
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:3000',
      'http://localhost:5050',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5050',
      'http://localhost:5173',
      'http://192.168.0.159:3000',
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ─── Pass Socket.io to routes ───
app.set('io', io);

// ─── General API Rate Limit ───
app.use('/api', apiLimiter);

// ─── CSRF — set cookie on requests, protect cookie-authenticated routes ───
app.use(csrfSetCookie);
app.use('/api/auth/refresh', csrfProtection);
app.use('/api/auth/logout', csrfProtection);

// ─── Initialize Database ───
initDb();

// ─── Routes (scoped to /api) ───
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/surveyors', surveyorRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/form2', form2Routes);
app.use('/api/locks', lockRoutes);


// ─── Serve Static React Build ───
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// ─── Scheduled Cleanup: Expired editing sessions & refresh tokens every 5 minutes ───
setInterval(async () => {
  try {
    const { run } = await import('./db.js');
    await run('DELETE FROM editing_sessions WHERE expires_at <= NOW()', []);
    await run('DELETE FROM refresh_tokens WHERE expires_at <= NOW()', []);
  } catch (e) {
    // Ignore periodic cleanup errors
  }
}, 5 * 60 * 1000);

// ─── Socket Events ───
io.on('connection', (socket) => {
  console.log('📡 Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ─── SPA Fallback ───
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => { if (err) next(); });
});

const PORT = process.env.PORT || 5050;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Farmer Survey Server running on http://localhost:${PORT}`);
  });
}

export default app;
