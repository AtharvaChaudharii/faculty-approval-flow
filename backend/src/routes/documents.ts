import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();
const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'faculty-approval-docs',
    allowed_formats: ['pdf'],
  } as any,
});

const upload = multer({ storage: storage });
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Helper to check if user should see a document
const canAccessDocument = async (docId: string, userId: string): Promise<boolean> => {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { approvalChain: true }
  });
  if (!doc) return false;
  if (doc.senderId === userId) return true;
  return doc.approvalChain.some((step: any) => step.approverId === userId);
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

// POST to analyze document text via AI
router.post('/analyze', authMiddleware, memoryUpload.single('file'), async (req: any, res) => {
  try {
    if (req.user.role === 'director') return res.status(403).json({ error: 'Directors are not permitted to upload' });
    console.log(`[Analyze] Received file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const pdfBuffer = req.file.buffer;
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('[Analyze] Empty file buffer');
      return res.status(400).json({ error: 'File buffer is empty' });
    }

    let data;
    try {
      data = await pdfParse(pdfBuffer);
    } catch (parseError) {
      console.error('[Analyze] PDF Parse Error:', parseError);
      return res.status(400).json({ error: 'Could not parse PDF content' });
    }

    const fullText = data.text;
    console.log(`[Analyze] Parsed text length: ${fullText.length} chars`);
    
    let title = `Analysis of ${req.file.originalname}`;
    let summary = `Automated summary of ${req.file.originalname}.`;

    try {
      const isPlaceholderKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_gemini_key');
      
      if (!process.env.GEMINI_API_KEY || isPlaceholderKey) { // Added explicit check for placeholder key
        console.warn('GEMINI_API_KEY is missing or is a placeholder. Using fallback mock.');
        title = `Analysis of ${req.file.originalname}`;
        // Extract a meaningful snippet for the summary fallback
        const snippet = fullText.trim().substring(0, 180).replace(/\n/g, ' ') + '...';
        summary = `Automated extraction summary: ${snippet} (AI Fallback active - Set GEMINI_API_KEY for full analysis)`;
      } else {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-1.5-flash as the latest standard fast model matching prompt intent
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyze the following document text and provide:
1. A concise, professional title (max 60 characters).
2. A brief summary (2-3 sentences max) of its core message or purpose.

Document Text:
${fullText.substring(0, 25000)}

Please return the response as a valid JSON object matching this schema:
{
  "title": "Document Title",
  "summary": "Document Summary"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Strip out any markdown code blocks that the LLM might have used
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        const rawJsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

        const aiData = JSON.parse(rawJsonText);
        
        if (aiData.title) title = aiData.title;
        if (aiData.summary) summary = aiData.summary;
      }
    } catch (aiError) {
      console.error('Failed to generate LLM content, using fallback:', aiError);
    }

    res.json({ title, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

// POST to Upload a new document and start flow
router.post('/', authMiddleware, upload.single('file'), async (req: any, res) => {
  try {
    // Role guard: Director cannot upload documents
    if (req.user.role === 'director') {
      return res.status(403).json({ error: 'Directors are not permitted to upload documents' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Parse chain from JSON body
    const { category, approvalChainIds, title, summary } = req.body;
    const chainIds: string[] = JSON.parse(approvalChainIds || '[]');

    if (chainIds.length === 0) return res.status(400).json({ error: 'Approval chain is required' });

    const doc = await prisma.document.create({
      data: {
        title,
        summary,
        senderId: req.user.id,
        category: category || 'General',
        fileName: req.file.path, // Cloudinary URL
        version: 1,
        status: 'pending',
        approvalChain: {
          create: chainIds.map((approverId: string, index: number) => ({
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
            fileName: req.file.path, // Cloudinary URL
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
    const currentStepIndex = doc.approvalChain.findIndex((step: any) => step.status === 'pending');
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

    const currentStep = doc.approvalChain.find((step: any) => step.status === 'pending');
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
