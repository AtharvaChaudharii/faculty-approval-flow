import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// GET all signatures for the current user
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const signatures = await prisma.signatureItem.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' },
    });
    res.json(signatures);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// POST create a new signature
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { name, type, preview } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    if (!['signature', 'stamp'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "signature" or "stamp"' });
    }

    const signature = await prisma.signatureItem.create({
      data: {
        name,
        type,
        preview: preview || null,
        userId: req.user.id,
      },
    });
    res.status(201).json(signature);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create signature' });
  }
});

// DELETE a signature
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const sig = await prisma.signatureItem.findUnique({ where: { id: req.params.id } });
    if (!sig) return res.status(404).json({ error: 'Signature not found' });
    if (sig.userId !== req.user.id) return res.status(403).json({ error: 'Not your signature' });

    await prisma.signatureItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete signature' });
  }
});

export default router;
