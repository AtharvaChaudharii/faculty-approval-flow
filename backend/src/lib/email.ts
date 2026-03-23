import nodemailer from 'nodemailer';

// Configure transporter
// For production: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
// For development: uses JSON transport (logs emails to console)
let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const hasSmtpConfig = process.env.SMTP_HOST
      && process.env.SMTP_USER
      && process.env.SMTP_PASS
      && !process.env.SMTP_PASS.includes('your-');

    if (hasSmtpConfig) {
      const smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      try {
        await smtpTransporter.verify();
        console.log(`[Email] Connected to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`);
        return smtpTransporter;
      } catch (err: any) {
        console.warn(`[Email] SMTP auth failed (${err.message}). Using console logger.`);
      }
    } else {
      console.log('[Email] No SMTP configured. Using console logger (emails printed to terminal).');
    }

    // Fallback: JSON/stream transport that logs to console (no network needed)
    return nodemailer.createTransport({ jsonTransport: true });
  })();

  return transporterPromise;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"DocFlow System" <noreply@docflow.college.edu>',
      to,
      subject,
      html,
    });

    // JSON transport returns message as JSON string — log a readable summary
    if (info.message) {
      const parsed = JSON.parse(info.message);
      const toAddr = parsed.to?.value ? parsed.to.value.map((v: any) => v.address).join(', ') : parsed.to?.text || to;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Email] TO: ${toAddr}`);
      console.log(`[Email] SUBJECT: ${parsed.subject}`);
      // Strip HTML tags for a readable preview
      const textPreview = parsed.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
      console.log(`[Email] BODY: ${textPreview}...`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      console.log(`[Email] Sent to ${to}: ${subject}`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Email] Preview: ${previewUrl}`);
      }
    }
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err);
  }
}

// --- Email templates ---

export function stepAdvanceEmail(approverName: string, senderName: string, docTitle: string, docId: string): SendEmailOptions & { to: string } {
  return {
    to: '', // caller sets this
    subject: `Action Required: "${docTitle}" awaits your approval`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #1E3A5F; margin-bottom: 8px;">Document Pending Your Approval</h2>
        <p>Dear ${approverName},</p>
        <p><strong>${senderName}</strong> has submitted a document that requires your review:</p>
        <div style="background: #F4F6F8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">${docTitle}</p>
        </div>
        <p>Please log in to review and take action on this document.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}

export function fullyApprovedEmail(senderName: string, docTitle: string, docId: string): SendEmailOptions {
  return {
    to: '', // caller sets this
    subject: `Approved: "${docTitle}" has been fully approved`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #2E7D32; margin-bottom: 8px;">Document Fully Approved</h2>
        <p>Dear ${senderName},</p>
        <p>Your document has been approved by all approvers in the chain:</p>
        <div style="background: #F4F6F8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">${docTitle}</p>
        </div>
        <p>The document is now archived. You can download the final signed version from your dashboard.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}

export function rejectionEmail(
  senderName: string,
  docTitle: string,
  rejectorName: string,
  rejectorRole: string,
  comment: string,
  aiDraftedBody: string
): SendEmailOptions {
  return {
    to: '', // caller sets this
    subject: `Document Returned: "${docTitle}" requires revision`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #C62828; margin-bottom: 8px;">Document Returned for Revision</h2>
        <p>Dear ${senderName},</p>
        ${aiDraftedBody}
        <div style="background: #FFF3F3; border-left: 3px solid #C62828; border-radius: 4px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px;">Comment from ${rejectorName} (${rejectorRole}):</p>
          <p style="margin: 0; font-style: italic;">"${comment}"</p>
        </div>
        <p>You may upload a revised version from your dashboard to restart the approval process.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}

// Notify sender that an approver has approved their document (progress update)
export function approvalProgressEmail(
  senderName: string,
  approverName: string,
  approverRole: string,
  docTitle: string,
  approvedCount: number,
  totalCount: number,
  docId: string
): SendEmailOptions {
  const remaining = totalCount - approvedCount;
  const progressPercent = Math.round((approvedCount / totalCount) * 100);
  return {
    to: '',
    subject: `Update: "${docTitle}" approved by ${approverName} (${approvedCount}/${totalCount})`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #1E3A5F; margin-bottom: 8px;">Approval Progress Update</h2>
        <p>Dear ${senderName},</p>
        <p>Your document has been approved by <strong>${approverName}</strong> (${approverRole}):</p>
        <div style="background: #F4F6F8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">${docTitle}</p>
          <div style="background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background: #2E7D32; height: 100%; width: ${progressPercent}%; border-radius: 4px;"></div>
          </div>
          <p style="margin: 8px 0 0; font-size: 13px; color: #666;">${approvedCount} of ${totalCount} approvals complete — ${remaining} remaining</p>
        </div>
        <p>You will be notified when the next approver takes action.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}

// Notify all previous approvers in the chain about a new approval
export function chainUpdateEmail(
  recipientName: string,
  approverName: string,
  approverRole: string,
  docTitle: string,
  senderName: string,
  approvedSteps: { name: string; role: string }[],
  totalCount: number,
  docId: string
): SendEmailOptions {
  const stepsHtml = approvedSteps
    .map(s => `<li style="margin: 4px 0;"><strong>${s.name}</strong> (${s.role}) — <span style="color: #2E7D32;">Approved</span></li>`)
    .join('');
  return {
    to: '',
    subject: `Chain Update: "${docTitle}" approved by ${approverName}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #1E3A5F; margin-bottom: 8px;">Approval Chain Update</h2>
        <p>Dear ${recipientName},</p>
        <p>The document <strong>"${docTitle}"</strong> (submitted by ${senderName}) has received a new approval from <strong>${approverName}</strong> (${approverRole}).</p>
        <div style="background: #F4F6F8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px;">Verification Status (${approvedSteps.length}/${totalCount}):</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">${stepsHtml}</ul>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}

export function reminderEmail(approverName: string, senderName: string, docTitle: string, pendingDays: number): SendEmailOptions {
  return {
    to: '', // caller sets this
    subject: `Reminder: "${docTitle}" has been awaiting your action for ${pendingDays} days`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2F3E46;">
        <h2 style="color: #ED6C02; margin-bottom: 8px;">Pending Approval Reminder</h2>
        <p>Dear ${approverName},</p>
        <p>The following document from <strong>${senderName}</strong> has been awaiting your action for <strong>${pendingDays} days</strong>:</p>
        <div style="background: #F4F6F8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600;">${docTitle}</p>
        </div>
        <p>Please log in to review and take action at your earliest convenience.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">— DocFlow Approval System</p>
      </div>
    `,
  };
}
