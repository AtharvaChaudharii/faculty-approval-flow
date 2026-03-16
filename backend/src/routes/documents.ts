import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({ dest: path.join(__dirname, '../../uploads') });

// Helper to check if user should see a document
const canAccessDocument = async (docId: string, userId: string): Promise<boolean> => {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { approvalChain: true }
  });
  if (!doc) return false;
  if (doc.senderId === userId) return true;
  return doc.approvalChain.some(step => step.approverId === userId);
};

// GET /api/documents (dashboard)
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;
    // Find documents the user created, OR is in the approval chain for
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { senderId: userId },
          {
            approvalChain: {
              some: { approverId: userId }
            }
          }
        ]
      },
      include: {
        sender: true,
        approvalChain: {
          include: { approver: true, placements: true },
          orderBy: { orderIndex: 'asc' }
        },
        auditLog: { include: { actor: true }, orderBy: { timestamp: 'asc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET Document Details
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const hasAccess = await canAccessDocument(req.params.id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        sender: true,
        approvalChain: {
          include: { approver: true, placements: true },
          orderBy: { orderIndex: 'asc' }
        },
        auditLog: { include: { actor: true }, orderBy: { timestamp: 'asc' } },
        versionHistory: true
      }
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST to Upload a new document and start flow
router.post('/', authMiddleware, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Parse chain from JSON body
    const { category, approvalChainIds } = req.body;
    const chainIds: string[] = JSON.parse(approvalChainIds || '[]');

    if (chainIds.length === 0) return res.status(400).json({ error: 'Approval chain is required' });

    // Mock AI text extraction and summarization
    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);
    const textSample = data.text.substring(0, 100);
    
    const title = `AI Geneated Title for ${req.file.originalname}`;
    const summary = `AI generated summary reflecting the document content parsing. Based on the preview text: ${textSample}`;

    const doc = await prisma.document.create({
      data: {
        title,
        summary,
        senderId: req.user.id,
        category: category || 'General',
        fileName: req.file.filename,
        version: 1,
        status: 'pending',
        approvalChain: {
          create: chainIds.map((approverId, index) => ({
            approverId,
            orderIndex: index,
            status: index === 0 ? 'pending' : 'waiting'
          }))
        },
        auditLog: {
          create: {
            action: 'submitted',
            actorId: req.user.id,
            version: 1
          }
        },
        versionHistory: {
          create: {
            fileName: req.file.filename,
            version: 1,
            uploadedBy: req.user.id
          }
        }
      },
      include: {
        sender: true,
        approvalChain: { include: { approver: true } }
      }
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST Approve
router.post('/:id/approve', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { placements } = req.body; // e.g. [{ x: 100, y: 200, pageNumber: 1, signatureId: '...' }]
    
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { approvalChain: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Find the current pending step
    const currentStepIndex = doc.approvalChain.findIndex(step => step.status === 'pending');
    if (currentStepIndex === -1) return res.status(400).json({ error: 'Workflow not active' });

    const currentStep = doc.approvalChain[currentStepIndex];
    
    if (currentStep.approverId !== req.user.id) {
      return res.status(403).json({ error: 'Not your turn to approve' });
    }

    // Set placements and approve
    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: 'approved',
        actedAt: new Date(),
        placements: {
          create: placements?.map((p: any) => ({
            signatureId: p.signatureId,
            x: p.x,
            y: p.y,
            pageNumber: p.pageNumber || 1
          })) || []
        }
      }
    });

    // Add Audit Log
    await prisma.auditEntry.create({
      data: {
        action: 'approved',
        documentId: id,
        actorId: req.user.id
      }
    });

    // Determine next step or finish
    const isLastStep = currentStepIndex === doc.approvalChain.length - 1;
    if (isLastStep) {
      await prisma.document.update({
        where: { id },
        data: { status: 'approved' }
      });
      // Further steps: Archive, etc...
    } else {
      const nextStep = doc.approvalChain[currentStepIndex + 1];
      await prisma.approvalStep.update({
        where: { id: nextStep.id },
        data: { status: 'pending' }
      });
    }

    res.json({ success: true, isComplete: isLastStep });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
});

// POST Reject
router.post('/:id/reject', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { approvalChain: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const currentStep = doc.approvalChain.find(step => step.status === 'pending');
    if (!currentStep || currentStep.approverId !== req.user.id) {
      return res.status(403).json({ error: 'Not your turn to act' });
    }

    await prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: 'rejected',
        actedAt: new Date(),
        comment
      }
    });

    await prisma.document.update({
      where: { id },
      data: { status: 'rejected' }
    });

    await prisma.auditEntry.create({
      data: {
        action: 'rejected',
        documentId: id,
        actorId: req.user.id,
        details: comment
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

export default router;
