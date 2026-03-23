import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  // Don't send password hash to frontend
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
