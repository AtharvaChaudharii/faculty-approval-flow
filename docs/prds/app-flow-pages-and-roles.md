app-flow-pages-and-roles.md

⸻

Site Map (Top-Level Pages Only)
- Login
- Dashboard
- Upload Document *(restricted by role — not accessible to Director)*
- Document Review
- Document Details (History View)
- Archive
- Profile & Signatures
- Settings *(includes profile photo upload)*
- Admin Settings (Optional – Future Phase)

⸻

Purpose of Each Page

⸻

1. Login

Provides secure access to the internal platform.
Only authorized faculty members can log in.

Authentication Behavior:
- User email is matched against registered accounts in the authentication store (auth-store.ts).
- The system determines the user's role from the matched account.
- Role detection drives which interface variant is rendered post-login.
- Demo login buttons are available for quick role-based testing.
- An unrecognized email displays an error message and prevents access.

⸻

2. Dashboard

Displays an overview of:
- Documents submitted by you *(hidden for Director role)*
- Documents waiting for your approval
- Current status indicators

Primary Goal:
Immediately show what requires your attention.

Role-Based Behavior:
- Director: "Submitted by Me" filter is not displayed. Dashboard focuses on documents pending the Director's approval.
- All other roles: Full dashboard with all filters visible.

⸻

3. Upload Document

Allows faculty to:
- Upload a PDF
- View AI-generated title and summary
- Define hierarchical approval chain
- Submit document into workflow

Primary Action:
"Start Approval Process"

Approval Chain UI:
- Each approver entry displays:
  - Profile avatar (custom photo or default avatar)
  - Selection order number
  - Name and role
- Users can search approvers by name or role via an inline search field.
- The approver list is scrollable with a maximum height of 360px.

Access Restriction:
- This page is not accessible to users with the Director role.
- The Upload Document navigation option is hidden for Director accounts.
- Direct route access is blocked for Director accounts.

⸻

4. Document Review (Core Screen)

Used by approvers.

Three-Panel Layout
- Left → AI Summary
- Center → PDF Viewer
- Right → Signature Panel (opens when approving)

Primary Actions
- Approve
- Reject

The interface is locked if it is not the user's turn in the hierarchy.

Director Behavior:
- The Director may access this screen when they are an active approver in the chain.
- The Director can approve (with signature) or reject documents.
- No upload or submission controls are visible on this screen for the Director.

⸻

5. Document Details (History View)

Displays:
- Version number
- Approval chain progress (with approver avatars)
- Who approved and when
- Rejection comments (if any)
- Reminder logs

Read-only when document is archived.

⸻

6. Archive

Contains:
- Fully approved documents
- Read-only access
- Downloadable merged signed PDF
- Search and filter functionality

⸻

7. Profile & Signatures

Users can:
- Upload signature images
- Upload official stamp
- Manage signature gallery

Only the account owner can use their uploaded signatures.

⸻

8. Settings

Users can:
- Update account preferences
- Upload or change their profile photo

Profile Photo Upload Behavior:
- Users hover over their current avatar to reveal the "Upload Photo" control.
- Clicking "Upload Photo" opens a file picker for image selection.
- The selected image is stored in localStorage.
- The uploaded photo is immediately reflected across all platform surfaces where the user's identity is displayed (sidebar, notifications, document cards, approval chain, audit logs, upload page).
- If no photo has been uploaded, the system displays a default avatar.

⸻

9. Admin Settings (Optional – Future)

For system administrators:
- Manage user roles
- Define hierarchy rules
- Configure reminder intervals
- View system analytics

⸻

User Roles & Access Levels

⸻

1. Faculty (Sender)

Can:
- Upload documents
- Define approval chain
- View status of their own documents
- Upload revised versions
- Download final approved PDF

Cannot:
- Approve their own document
- View unrelated documents

⸻

2. Approver (Assistant Professor / HOD / Principal)

Can:
- View documents assigned to them
- Approve with signature placement
- Reject with comment
- View archived documents they participated in

Cannot:
- Edit original PDF
- Skip hierarchy order
- Access unrelated documents

⸻

3. Director

Can:
- View documents pending their approval
- Approve documents (with signature placement)
- Reject documents (with optional comment)
- Participate in the approval chain

Cannot:
- Upload documents
- Access the Upload Document page
- View the "Submitted by Me" dashboard filter
- Edit original PDF
- Skip hierarchy order
- Access unrelated documents

Interface Behavior:
- Upload Document navigation item is hidden.
- Upload page route is blocked.
- "Submitted by Me" dashboard filter is not rendered.
- All other approval-related functionality is fully available.

⸻

4. System Admin (Optional Role)

Can:
- Manage user roles
- View audit logs
- Configure system settings

Cannot:
- Modify document contents
- Override approval decisions (unless explicitly designed later)

⸻

Authentication & Role Detection

Auth Store (auth-store.ts)

The frontend authentication store is responsible for:
- Storing the currently logged-in user object
- Determining the user's role based on the matched email account
- Providing user context (including role and profile photo) to all components via the useCurrentUser() hook

All platform components consume user identity through useCurrentUser() rather than static imports.

Role-Driven UI Rendering

On successful login:
- If the authenticated user holds the Director role → Director interface is loaded (approve-only).
- If the authenticated user holds Faculty / HOD / Principal role → Full interface is loaded.

⸻

Primary User Journeys (Maximum 3 Steps Each)

⸻

Journey 1 — Faculty Submits Document
1. Upload PDF → AI generates summary
2. Select approval chain in order (search by name/role; avatars displayed)
3. Click "Start Approval"

Outcome:
First approver receives notification.

⸻

Journey 2 — Approver Reviews & Approves
1. Open pending document from dashboard
2. Place signature → Confirm placement
3. Click Final Approve

Outcome:
Document moves to next approver.

⸻

Journey 3 — Approver Rejects
1. Open document
2. Click Reject → Add optional comment
3. Confirm rejection

Outcome:
Sender is notified. Workflow ends.

⸻

Journey 4 — Faculty Revises After Rejection
1. Open rejected document
2. Upload revised PDF (version incremented)
3. Restart approval chain

Outcome:
Workflow begins again from the first approver.

⸻

Journey 5 — Final Approval Completion
1. Last approver signs and approves
2. System marks document as Approved
3. Sender downloads merged signed PDF

Outcome:
Document is archived permanently.

⸻

Journey 6 — Director Approves a Document
1. Director logs in → approve-only interface loads
2. Opens pending document from dashboard
3. Places signature → Confirms placement → Clicks Final Approve

Outcome:
Document progresses to the next approver or is fully approved.

⸻

Role-Based Visibility Rules

Users can see only:
- Documents they submitted
- Documents where they are part of the approval chain
- Archived documents only if they were part of the chain

Additional rules:
- No cross-department browsing
- All actions logged with timestamps
- Director role does not have access to document submission surfaces

⸻

Status Lifecycle (Simple Mental Model)

Draft → Pending → Approved (Final) → Archived

OR

Draft → Pending → Rejected → Revised → Pending

There are no hidden states.

⸻

This completes the app flow and role structure.