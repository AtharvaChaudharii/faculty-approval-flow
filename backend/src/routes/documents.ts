import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../lib/prisma';
import { sendEmail, stepAdvanceEmail, fullyApprovedEmail, rejectionEmail, approvalProgressEmail, chainUpdateEmail } from '../lib/email';

const router = Router();

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
    resource_type: 'raw',
    allowed_formats: ['pdf'],
  } as any,
});

const upload = multer({ storage: storage });
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Groq LLM helper (OpenAI-compatible API, free tier)
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_groq')) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

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

    const cleanName = req.file.originalname.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    let title = cleanName.substring(0, 60);
    let summary = `Document: ${cleanName}`;

    // If text is too short, the PDF is likely scanned/image-based — skip AI, use filename
    if (fullText.trim().length < 30) {
      console.warn('[Analyze] Very little text extracted — PDF is likely scanned/image-based.');
      return res.json({
        title,
        summary: `${cleanName}. This document appears to be image-based (scanned). Please review the PDF directly and edit the title/summary as needed.`,
      });
    }

    try {
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

      const responseText = await callGroq(prompt);

      // Strip out any markdown code blocks that the LLM might have used
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const rawJsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

      const aiData = JSON.parse(rawJsonText);

      if (aiData.title) title = aiData.title;
      if (aiData.summary) summary = aiData.summary;
    } catch (aiError: any) {
      console.warn('[AI Analysis] Groq API failed, using text extraction fallback:', aiError?.status || aiError?.message || aiError);
      // Fallback: extract title from first line, summary from first few lines
      const lines = fullText.trim().split('\n').filter((l: string) => l.trim().length > 0);
      if (lines.length > 0) {
        title = lines[0].trim().substring(0, 60) || title;
      }
      const snippet = fullText.trim().substring(0, 300).replace(/\n/g, ' ').trim();
      if (snippet) {
        summary = snippet.length >= 300 ? snippet + '...' : snippet;
      }
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

    // Sender cannot be in their own approval chain
    if (chainIds.includes(req.user.id)) {
      return res.status(400).json({ error: 'You cannot approve your own document' });
    }

    // Prevent duplicate approvers
    const uniqueIds = new Set(chainIds);
    if (uniqueIds.size !== chainIds.length) {
      return res.status(400).json({ error: 'Duplicate approvers are not allowed in the chain' });
    }

    // Validate hierarchy order: Faculty < Asst Prof < HOD < Principal < Director
    const ROLE_RANK: Record<string, number> = {
      faculty: 0, assistant_professor: 1, hod: 2, principal: 3, director: 4,
    };
    const chainUsers = await prisma.user.findMany({
      where: { id: { in: chainIds } },
      select: { id: true, role: true },
    });
    const chainWithRanks = chainIds.map(id => {
      const user = chainUsers.find(u => u.id === id);
      return { id, rank: ROLE_RANK[user?.role || ''] ?? 0 };
    });
    for (let i = 1; i < chainWithRanks.length; i++) {
      if (chainWithRanks[i].rank < chainWithRanks[i - 1].rank) {
        return res.status(400).json({
          error: 'Approval chain must follow hierarchy order: Faculty → Asst. Professor → HOD → Principal → Director',
        });
      }
    }

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

    // Email first approver
    const firstApprover = doc.approvalChain.find((s: any) => s.orderIndex === 0);
    if (firstApprover) {
      const email = stepAdvanceEmail(
        firstApprover.approver.name,
        req.user.name,
        doc.title,
        doc.id
      );
      email.to = firstApprover.approver.email;
      sendEmail(email); // fire-and-forget
    }

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
    const { placements } = req.body; // e.g. [{ x: 50, y: 30, pageNumber: 1, signatureId: '...' }]

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: true,
        approvalChain: {
          include: { approver: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Archive immutability: prevent actions on finalized documents
    if (doc.status === 'approved' || doc.status === 'rejected') {
      return res.status(400).json({ error: `Document is already ${doc.status} and cannot be modified` });
    }

    // Find the current pending step
    const currentStepIndex = doc.approvalChain.findIndex((step: any) => step.status === 'pending');
    if (currentStepIndex === -1) return res.status(400).json({ error: 'Workflow not active' });

    const currentStep = doc.approvalChain[currentStepIndex];

    if (currentStep.approverId !== req.user.id) {
      return res.status(403).json({ error: 'Not your turn to approve' });
    }

    // Require at least one signature placement
    if (!placements || placements.length === 0) {
      return res.status(400).json({ error: 'At least one signature placement is required to approve' });
    }
    if (placements.length > 20) {
      return res.status(400).json({ error: 'Too many signature placements (max 20)' });
    }

    // Wrap all DB mutations in a transaction
    const isLastStep = currentStepIndex === doc.approvalChain.length - 1;

    await prisma.$transaction(async (tx) => {
      // Save signature placements with x/y coordinates per page per approver
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'approved',
          actedAt: new Date(),
          placements: {
            create: placements?.map((p: any) => ({
              signatureId: p.signatureId,
              signatureImage: p.signatureImage || null,
              x: parseFloat(p.x),
              y: parseFloat(p.y),
              pageNumber: parseInt(p.pageNumber) || 1
            })) || []
          }
        }
      });

      // Add Audit Log
      await tx.auditEntry.create({
        data: {
          action: 'approved',
          documentId: id,
          actorId: req.user.id
        }
      });

      if (isLastStep) {
        await tx.document.update({
          where: { id },
          data: { status: 'approved' }
        });
      } else {
        // Advance to next approver
        const nextStep = doc.approvalChain[currentStepIndex + 1];
        await tx.approvalStep.update({
          where: { id: nextStep.id },
          data: { status: 'pending' }
        });
      }
    });

    // Emails sent outside transaction (fire-and-forget, shouldn't roll back DB on failure)
    const approvedSteps = doc.approvalChain
      .filter((s: any, i: number) => s.status === 'approved' || i === currentStepIndex)
      .map((s: any) => ({ name: s.approver.name, role: s.approver.role }));
    const totalSteps = doc.approvalChain.length;
    const currentApprover = currentStep.approver;
    const approverRole = currentApprover.role.replace('_', ' ');

    // Notify sender about approval progress
    const progressEmail = approvalProgressEmail(
      doc.sender.name,
      currentApprover.name,
      approverRole,
      doc.title,
      approvedSteps.length,
      totalSteps,
      doc.id
    );
    progressEmail.to = doc.sender.email;
    sendEmail(progressEmail);

    // Notify all previous approvers
    const previousApprovers = doc.approvalChain.slice(0, currentStepIndex);
    for (const prevStep of previousApprovers) {
      if ((prevStep as any).status === 'approved') {
        const updateEmail = chainUpdateEmail(
          (prevStep as any).approver.name,
          currentApprover.name,
          approverRole,
          doc.title,
          doc.sender.name,
          approvedSteps,
          totalSteps,
          doc.id
        );
        updateEmail.to = (prevStep as any).approver.email;
        sendEmail(updateEmail);
      }
    }

    if (isLastStep) {
      const approvedEmail = fullyApprovedEmail(doc.sender.name, doc.title, doc.id);
      approvedEmail.to = doc.sender.email;
      sendEmail(approvedEmail);
    } else {
      const nextStep = doc.approvalChain[currentStepIndex + 1];
      const advanceEmail = stepAdvanceEmail(
        nextStep.approver.name,
        doc.sender.name,
        doc.title,
        doc.id
      );
      advanceEmail.to = nextStep.approver.email;
      sendEmail(advanceEmail);
    }

    res.json({ success: true, isComplete: isLastStep });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve document' });
  }
});

// POST Bulk approve/reject multiple documents
router.post('/bulk-action', authMiddleware, async (req: any, res) => {
  try {
    const { documentIds, action, comment } = req.body;
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'No documents selected' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }
    if (documentIds.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 documents per bulk action' });
    }

    const results: { docId: string; success: boolean; error?: string }[] = [];

    for (const docId of documentIds) {
      try {
        const doc = await prisma.document.findUnique({
          where: { id: docId },
          include: {
            sender: true,
            approvalChain: {
              include: { approver: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        });

        if (!doc || doc.status !== 'pending') {
          results.push({ docId, success: false, error: 'Not found or not pending' });
          continue;
        }

        const currentStep = doc.approvalChain.find((s: any) => s.status === 'pending');
        if (!currentStep || currentStep.approverId !== req.user.id) {
          results.push({ docId, success: false, error: 'Not your turn' });
          continue;
        }

        if (action === 'approve') {
          await prisma.$transaction(async (tx) => {
            await tx.approvalStep.update({
              where: { id: currentStep.id },
              data: { status: 'approved', actedAt: new Date() },
            });
            await tx.auditEntry.create({
              data: { action: 'approved', documentId: docId, actorId: req.user.id },
            });
            const isLast = doc.approvalChain.indexOf(currentStep) === doc.approvalChain.length - 1;
            if (isLast) {
              await tx.document.update({ where: { id: docId }, data: { status: 'approved' } });
            } else {
              const nextStep = doc.approvalChain[doc.approvalChain.indexOf(currentStep) + 1];
              await tx.approvalStep.update({ where: { id: nextStep.id }, data: { status: 'pending' } });
            }
          });
        } else {
          await prisma.$transaction(async (tx) => {
            await tx.approvalStep.update({
              where: { id: currentStep.id },
              data: { status: 'rejected', actedAt: new Date(), comment: comment || 'Bulk rejected' },
            });
            await tx.document.update({ where: { id: docId }, data: { status: 'rejected' } });
            await tx.auditEntry.create({
              data: { action: 'rejected', documentId: docId, actorId: req.user.id, details: comment || 'Bulk rejected' },
            });
          });
        }

        results.push({ docId, success: true });
      } catch (err) {
        results.push({ docId, success: false, error: 'Internal error' });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ results, summary: { succeeded, failed, total: documentIds.length } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Bulk action failed' });
  }
});

// Helper: generate AI-drafted rejection email body via LLM
async function generateRejectionEmailBody(
  docTitle: string,
  docSummary: string,
  rejectorName: string,
  rejectorRole: string,
  comment: string
): Promise<string> {
  try {
    const prompt = `You are an administrative email assistant for a college document approval system.
A document has been rejected. Draft a brief, professional, and empathetic email body paragraph (2-3 sentences) informing the sender.
Do NOT include a greeting or sign-off — just the body paragraph wrapped in <p> tags.

Document title: "${docTitle}"
Document summary: "${docSummary}"
Rejected by: ${rejectorName} (${rejectorRole})
Rejection reason: "${comment}"

The tone should be neutral, informative, and supportive — never accusatory.`;

    const text = await callGroq(prompt);
    // If the LLM returned raw text without <p> tags, wrap it
    if (!text.startsWith('<p')) return `<p>${text}</p>`;
    return text;
  } catch (err: any) {
    console.warn('[AI Rejection Email] Fallback used:', err?.status || err?.message);
    return `<p>Your document <strong>"${docTitle}"</strong> has been returned by ${rejectorName} (${rejectorRole}) and requires revision before it can proceed through the approval chain.</p>`;
  }
}

// POST Reject
router.post('/:id/reject', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: true,
        approvalChain: {
          include: { approver: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Archive immutability: prevent actions on finalized documents
    if (doc.status === 'approved' || doc.status === 'rejected') {
      return res.status(400).json({ error: `Document is already ${doc.status} and cannot be modified` });
    }

    const currentStep = doc.approvalChain.find((step: any) => step.status === 'pending');
    if (!currentStep || currentStep.approverId !== req.user.id) {
      return res.status(403).json({ error: 'Not your turn to act' });
    }

    // Validate comment length
    if (comment && comment.length > 2000) {
      return res.status(400).json({ error: 'Comment too long (max 2000 characters)' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'rejected',
          actedAt: new Date(),
          comment
        }
      });

      await tx.document.update({
        where: { id },
        data: { status: 'rejected' }
      });

      await tx.auditEntry.create({
        data: {
          action: 'rejected',
          documentId: id,
          actorId: req.user.id,
          details: comment
        }
      });
    });

    // Generate AI-drafted rejection email and send to sender
    const rejectorRole = currentStep.approver.role;
    const aiBody = await generateRejectionEmailBody(
      doc.title,
      doc.summary,
      req.user.name,
      rejectorRole,
      comment || 'No specific reason provided.'
    );

    const rejectEmail = rejectionEmail(
      doc.sender.name,
      doc.title,
      req.user.name,
      rejectorRole,
      comment || 'No specific reason provided.',
      aiBody
    );
    rejectEmail.to = doc.sender.email;
    sendEmail(rejectEmail); // fire-and-forget

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

// POST Revise — sender uploads new version of a rejected document, resets approval chain
router.post('/:id/revise', authMiddleware, upload.single('file'), async (req: any, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: true,
        approvalChain: {
          include: { approver: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.status !== 'rejected') {
      return res.status(400).json({ error: 'Only rejected documents can be revised' });
    }
    if (doc.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Only the sender can revise this document' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const newVersion = doc.version + 1;

    // Reset all approval steps: first = pending, rest = waiting
    // Delete old placements for all steps
    for (const step of doc.approvalChain) {
      await prisma.placement.deleteMany({ where: { approvalStepId: step.id } });
      await prisma.approvalStep.update({
        where: { id: step.id },
        data: {
          status: step.orderIndex === 0 ? 'pending' : 'waiting',
          actedAt: null,
          comment: null,
        },
      });
    }

    // Update document
    await prisma.document.update({
      where: { id },
      data: {
        status: 'pending',
        version: newVersion,
        fileName: req.file.path,
      },
    });

    // Create version history entry
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        version: newVersion,
        fileName: req.file.path,
        uploadedBy: req.user.id,
      },
    });

    // Audit log
    await prisma.auditEntry.create({
      data: {
        action: 'revised',
        documentId: id,
        actorId: req.user.id,
        version: newVersion,
        details: `Revised to version ${newVersion}`,
      },
    });

    // Email first approver about revised document
    const firstApprover = doc.approvalChain.find((s: any) => s.orderIndex === 0);
    if (firstApprover) {
      const email = stepAdvanceEmail(
        firstApprover.approver.name,
        doc.sender.name,
        doc.title,
        doc.id
      );
      email.to = firstApprover.approver.email;
      sendEmail(email);
    }

    res.json({ success: true, version: newVersion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to revise document' });
  }
});

// GET signed/merged PDF — overlays approver signatures onto original PDF
router.get('/:id/signed-pdf', (req: any, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authMiddleware, async (req: any, res) => {
  try {
    const hasAccess = await canAccessDocument(req.params.id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        approvalChain: {
          include: { approver: true, placements: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Fetch original PDF from Cloudinary
    const pdfResponse = await fetch(doc.fileName);
    if (!pdfResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch PDF from storage' });
    }

    const originalBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    const pdfDoc = await PDFDocument.load(originalBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Overlay signatures from approved steps
    for (const step of doc.approvalChain) {
      if (step.status !== 'approved' || !step.placements?.length) continue;

      for (const placement of step.placements) {
        const pageIndex = (placement.pageNumber || 1) - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        // Convert percentage coordinates to absolute positions
        // x/y are stored as percentages (0-100) from top-left
        const x = (placement.x / 100) * width;
        const y = height - (placement.y / 100) * height; // PDF coords are bottom-up

        // If actual signature image exists, embed it
        if (placement.signatureImage) {
          try {
            // Extract base64 data from data URL (data:image/png;base64,...)
            const base64Match = placement.signatureImage.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
            if (base64Match) {
              const imageBytes = Buffer.from(base64Match[2], 'base64');
              const isPng = base64Match[1] === 'png';

              const embeddedImage = isPng
                ? await pdfDoc.embedPng(imageBytes)
                : await pdfDoc.embedJpg(imageBytes);

              // Scale image to fit within a reasonable box while preserving aspect ratio
              const maxWidth = 120;
              const maxHeight = 60;
              const imgAspect = embeddedImage.width / embeddedImage.height;
              let drawWidth = maxWidth;
              let drawHeight = drawWidth / imgAspect;
              if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = drawHeight * imgAspect;
              }

              page.drawImage(embeddedImage, {
                x: x - drawWidth / 2,
                y: y - drawHeight / 2,
                width: drawWidth,
                height: drawHeight,
              });

              // Add small name label below the signature image
              page.drawText(`${step.approver.name}`, {
                x: x - drawWidth / 2,
                y: y - drawHeight / 2 - 10,
                size: 6,
                font: font,
                color: rgb(0.3, 0.3, 0.3),
              });

              continue; // Skip the text fallback
            }
          } catch (imgErr) {
            console.warn('[Signed PDF] Failed to embed signature image, using text fallback:', imgErr);
          }
        }

        // Fallback: draw text-based signature box
        const boxWidth = 140;
        const boxHeight = 40;
        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight / 2;

        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          color: rgb(0.95, 0.97, 1),
          borderColor: rgb(0.12, 0.23, 0.37),
          borderWidth: 1,
        });

        page.drawText(step.approver.name, {
          x: boxX + 6,
          y: boxY + boxHeight - 14,
          size: 9,
          font: boldFont,
          color: rgb(0.12, 0.23, 0.37),
        });

        page.drawText(step.approver.role.replace('_', ' ').toUpperCase(), {
          x: boxX + 6,
          y: boxY + boxHeight - 26,
          size: 7,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });

        if (step.actedAt) {
          const dateStr = new Date(step.actedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
          });
          page.drawText(dateStr, {
            x: boxX + 6,
            y: boxY + 4,
            size: 6,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }
    }

    const mergedBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.title.replace(/[^a-zA-Z0-9 ]/g, '')}_signed.pdf"`);
    res.setHeader('Content-Length', mergedBytes.length);
    res.send(Buffer.from(mergedBytes));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate signed PDF' });
  }
});

// GET PDF proxy - serves Cloudinary PDF inline for iframe embedding
// Supports ?token= query param since iframes cannot send Authorization headers
router.get('/:id/pdf', (req: any, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authMiddleware, async (req: any, res) => {
  try {
    const hasAccess = await canAccessDocument(req.params.id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { fileName: true }
    });

    if (!doc || !doc.fileName) return res.status(404).json({ error: 'Document not found' });

    // Fetch PDF from Cloudinary
    const pdfResponse = await fetch(doc.fileName);
    if (!pdfResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch PDF from storage' });
    }

    const buffer = Buffer.from(await pdfResponse.arrayBuffer());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to serve PDF' });
  }
});

export default router;
