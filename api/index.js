import express from 'express';
import cors from 'cors';
import { initDb } from '../server/db.js';

import authRoutes from '../server/routes/auth.js';
import farmerRoutes from '../server/routes/farmers.js';
import surveyRoutes from '../server/routes/surveys.js';
import surveyorRoutes from '../server/routes/surveyors.js';
import exportRoutes from '../server/routes/export.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Database (Vercel Driver or SQLite)
initDb();

// Routes for Vercel Serverless
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
