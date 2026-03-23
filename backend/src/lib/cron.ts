import cron from 'node-cron';
import prisma from './prisma';
import { sendEmail, reminderEmail } from './email';

export function startReminderCron() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running 48-hour reminder check...');
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Find approval steps that are 'pending' and have been idle for 48+ hours
      const staleSteps = await prisma.approvalStep.findMany({
        where: {
          status: 'pending',
          document: { status: 'pending' },
          // The step became pending either when document was created or when previous step was approved.
          // We use document.updatedAt as proxy for when this step became active.
        },
        include: {
          approver: true,
          document: { include: { sender: true } },
        },
      });

      for (const step of staleSteps) {
        // Check if the document has been updated more than 48 hours ago
        const lastActivity = step.document.updatedAt;
        if (lastActivity > twoDaysAgo) continue;

        // Spam prevention: don't send if we sent a reminder in the last 48 hours
        if (step.lastReminder && step.lastReminder > twoDaysAgo) {
          continue;
        }

        const daysPending = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        const email = reminderEmail(
          step.approver.name,
          step.document.sender.name,
          step.document.title,
          daysPending
        );
        email.to = step.approver.email;

        await sendEmail(email);

        // Update lastReminder to prevent spam
        await prisma.approvalStep.update({
          where: { id: step.id },
          data: { lastReminder: now },
        });

        // Log the reminder in audit
        await prisma.auditEntry.create({
          data: {
            action: 'reminder_sent',
            documentId: step.documentId,
            actorId: step.approverId,
            details: `Automated reminder sent after ${daysPending} days of inactivity`,
          },
        });

        console.log(`[Cron] Reminder sent to ${step.approver.name} for "${step.document.title}"`);
      }
    } catch (err) {
      console.error('[Cron] Reminder job failed:', err);
    }
  });

  console.log('[Cron] 48-hour reminder job scheduled (runs every hour)');
}
