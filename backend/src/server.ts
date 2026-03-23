import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import docRoutes from './routes/documents';
import userRoutes from './routes/users';
import { startReminderCron } from './lib/cron';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', docRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
  startReminderCron();
});
