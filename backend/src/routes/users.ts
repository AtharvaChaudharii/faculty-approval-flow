import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all users for approval chain dropdown
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        profileImage: true,
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update profile photo
router.put('/me/profile-photo', authMiddleware, async (req: any, res) => {
  try {
    const { profileImage } = req.body; // Expecting base64
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage },
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
});

export default router;
