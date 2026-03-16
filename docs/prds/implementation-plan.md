implementation-plan.md

⸻

Build Philosophy
- Ship small.
- Test early.
- Automate friction.
- Protect document integrity at all costs.

⸻

Step-by-Step Build Sequence (Mindless Micro-Tasks)

⸻

Phase 1 — Foundation Setup
- Create project repositories (frontend + backend).
- Set up PostgreSQL database.
- Configure object storage (immutable bucket).
- Implement user authentication (email + password).
- Add role field to user model (Faculty, HOD, Principal, Director, etc.).
- Implement auth-store.ts:
  - Store logged-in user object
  - Derive user role from matched email account
  - Expose useCurrentUser() hook to all components
- Implement demo login buttons for role-based testing.
- Handle unrecognized email → display error message.
- Implement role-based UI rendering logic:
  - Director → approve-only interface
  - Faculty / HOD / Principal → full interface

Checkpoint

✔ Users can log in securely. Role is detected and correct interface loads.

⸻

Phase 2 — Document Upload Flow
- Build PDF upload UI (hidden for Director role).
- Validate file type (PDF only).
- Store original PDF in secure storage.
- Extract text from PDF.
- Send extracted text to LLM API.
- Save AI-generated:
  - Title
  - Summary
- Create initial Document record (status: Pending Draft).

Checkpoint

✔ Upload → AI title + summary saved successfully.

⸻

Phase 3 — Approval Chain Builder
- Build approver list with avatar display:
  - Render profile photo (or default avatar) beside each approver name
  - Display selection order number badge on avatar
  - Display name and role label
- Implement inline search field to filter approvers by name or role.
- Implement scrollable approver list (max-height: 360px).
- Enforce ordered selection.
- Prevent duplicate approvers.
- Save ApprovalStep records with order_index.
- Change document status to Pending.
- Trigger email to first approver.

Checkpoint

✔ First approver receives notification. Approval chain displays avatars and is searchable.

⸻

Phase 4 — Review Interface (Core Screen)

Build 3-panel layout:
- Left: AI Summary
- Center: PDF Viewer
- Right: Hidden initially (signature panel appears when needed)
- Add "Approve" and "Reject" buttons.
- Detect if user is current approver.
- Lock UI if it is not their turn.
- Suppress upload/submission controls for Director role.

Checkpoint

✔ Approver sees correct document with clear action options.

⸻

Phase 5 — Signature System
- Create signature upload system (profile section).
- Store signature/stamp images securely.
- Build scrollable signature gallery.
- Enable drag-and-drop over PDF canvas.
- Track:
  - Page number
  - X/Y coordinates
- Add "Confirm Placement" button.
- Lock placement after confirmation.
- Add final "Approve" button.

On final approval:
- Save signature placements.
- Update ApprovalStep → Approved.
- Move to next approver.
- Send next notification email.

Checkpoint

✔ Document moves sequentially with saved coordinates.

⸻

Phase 6 — Rejection Flow
- Implement Reject modal.
- Add optional comment field.
- Save rejection reason.
- Update document status → Rejected.
- Send AI-generated rejection email to sender.
- Stop workflow progression.

Checkpoint

✔ Rejected document exits approval chain properly.

⸻

Phase 7 — Revision System
- Allow sender to upload new version.
- Store new PDF (new file path).
- Increment version number.
- Log entry in DocumentHistory.
- Reset all ApprovalStep statuses.
- Restart chain from first approver.
- Send new notification email.

Checkpoint

✔ Full workflow restart works cleanly.

⸻

Phase 8 — Reminder Automation
- Create cron job (runs hourly).
- Query documents:
  - Status: Pending
  - Same approver
  - Inactive for 48+ hours
- Send reminder email.
- Log reminder timestamp.
- Prevent duplicate reminders within 2-day window.

Checkpoint

✔ Reminder system works without spam.

⸻

Phase 9 — Final PDF Merge
- Build on-demand PDF merge endpoint.
- Retrieve:
  - Original PDF
  - All signature placements
- Overlay signature images at stored coordinates.
- Stream merged PDF to user.
- Keep original file unchanged.

Checkpoint

✔ Download produces correctly signed document.

⸻

Phase 10 — Archive & Permissions
- Lock document when fully approved.
- Make archive read-only.
- Enforce access control:
  - Sender
  - All chain participants
- Add audit logging:
  - Approval timestamps
  - Rejection timestamps
  - Version uploads

Checkpoint

✔ Secure archive functioning correctly.

⸻

Phase 11 — Profile Photo & Global Avatar System
- Build Settings page profile photo upload UI:
  - Hover state reveals "Upload Photo" overlay on avatar
  - File picker opens on click (image files only)
  - On selection, store image in localStorage under user identity key
  - Immediately reflect new photo across all visible surfaces
- Implement avatar rendering utility:
  - Reads photo from localStorage via useCurrentUser()
  - Returns custom photo if present; returns default avatar if absent
- Apply avatar rendering to all identity display surfaces:
  - Sidebar user profile
  - Notifications
  - Document cards
  - Approval chain selector
  - Audit log entries
  - Document Details / History view
  - All other contexts where user name appears
- Validate fallback: default avatar renders correctly when localStorage entry is missing or empty.

Checkpoint

✔ Profile photo uploads successfully. Avatar appears consistently across all platform surfaces. Default avatar renders correctly as fallback.

⸻

Checkpoints Summary

- Authentication (with role detection)
- Upload system
- AI summary generation
- Database schema setup

⸻

- Approval chain logic (with avatar display and search)
- Email notifications
- Review interface

⸻

- Signature placement system
- Coordinate storage
- Sequential routing

⸻

- Rejection + revision logic

⸻

- Profile photo upload (localStorage)
- Global avatar rendering

⸻

- Final PDF merge
- Archive system
- Security audit
- Internal testing

⸻

Team Roles

⸻

Product Lead
- Defines workflow rules
- Reviews usability weekly

⸻

Backend Developer
- Workflow logic
- Database management
- PDF merging
- Cron jobs

⸻

Frontend Developer
- Review interface
- Drag-and-drop signature placement
- Dashboard UI
- Role-based UI rendering (Director vs. standard)
- Profile photo upload and global avatar system
- Approval chain search and scroll
- auth-store.ts and useCurrentUser() hook

⸻

DevOps Engineer
- Secure storage configuration
- Deployment
- Backup strategy

⸻

Recommended Rituals

⸻

Bi-Weekly 30-Minute Usability Test

Test with:
- 1 Faculty
- 1 HOD
- 1 Principal
- 1 Director (approve-only interface)

Ask:
- Where did you hesitate?
- What confused you?
- What felt slow?

Fix the top 3 usability issues immediately.

⸻

Monthly Security Review
- Role access audit
- Signature ownership verification
- Storage integrity check
- Verify Director route restrictions are enforced server-side as well as client-side

⸻

Optional Integrations (Future)
- College ERP integration
- LDAP / SSO login
- Digital certificate-based signing
- WhatsApp notifications (internal)
- Analytics dashboard for approval time
- Server-side profile photo storage (replace localStorage for cross-device persistence)

⸻

Stretch Goals
- AI suggests approval chain automatically.
- SLA tracking (average approval time by role).
- Bulk approvals for administrative batches.
- Compliance export report (for audits).