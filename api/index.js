import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDb } from '../server/db.js';

import authRoutes from '../server/routes/auth.js';
import farmerRoutes from '../server/routes/farmers.js';
import surveyorRoutes from '../server/routes/surveyors.js';
import exportRoutes from '../server/routes/export.js';
import usersRoutes from '../server/routes/users.js';
import form2Routes from '../server/routes/form2.js';
import lockRoutes from '../server/routes/lock.js';

import { apiLimiter } from '../server/middleware/rateLimiter.js';
import { csrfSetCookie, csrfProtection } from '../server/middleware/csrf.js';

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Apply Rate Limiting
app.use('/api', apiLimiter);

// CSRF Protection
app.use(csrfSetCookie);
app.use('/api/auth/refresh', csrfProtection);
app.use('/api/auth/logout', csrfProtection);

// Initialize Database Schema
initDb().catch(err => console.error('DB Init Error:', err));

// Serverless API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/surveyors', surveyorRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/form2', form2Routes);
app.use('/api/locks', lockRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

