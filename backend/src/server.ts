import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import docRoutes from './routes/documents';
import userRoutes from './routes/users';
import signatureRoutes from './routes/signatures';
import { startReminderCron } from './lib/cron';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per window
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 uploads per window
  message: { error: 'Too many uploads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', uploadLimiter);
app.use('/api/documents', docRoutes);
app.use('/api/signatures', signatureRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
  startReminderCron();
});
