# Project Analysis Report: Faculty Approval Flow

---

## 1. Project Overview

An internal, AI-powered document approval platform for colleges. Faculty upload PDFs, which route through strict hierarchical approvals with drag-and-drop digital signatures. The system preserves document integrity with immutable storage (Cloudinary), uses Groq AI (Llama 3.3) for title/summary generation, and enforces role-based access (Director is approve-only).

**Tech Stack (Actual):**

| Layer | PRD Says | Actually Used |
|-------|----------|---------------|
| Frontend | React (Next.js) | React 18 + Vite + React Router 6 |
| Backend | Express / NestJS | Express 5 |
| Database | PostgreSQL | PostgreSQL via Supabase + Prisma ORM |
| Storage | S3-compatible | Cloudinary |
| PDF Rendering | PDF.js | iframe-based viewer |
| AI | LLM API | Groq (Llama 3.3 70B) |

---

## 2. Backend Summary

**Architecture:** Express.js monolith with 3 route files, 1 middleware, Prisma ORM.

**Database Models (7):** User, Document, ApprovalStep, AuditEntry, DocumentVersion, SignatureItem, Placement

### All API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Email-only login, returns JWT |
| `GET` | `/api/auth/me` | Get current user from token |
| `GET` | `/api/users` | List all users (for approver picker) |
| `PUT` | `/api/users/me/profile-photo` | Update profile image (base64) |
| `GET` | `/api/documents` | Get user's documents (as sender or chain participant) |
| `GET` | `/api/documents/:id` | Get single document details |
| `POST` | `/api/documents` | Upload document + create approval chain |
| `POST` | `/api/documents/analyze` | AI-analyze PDF (title + summary via Groq) |
| `POST` | `/api/documents/:id/approve` | Approve current step with signature placements |
| `POST` | `/api/documents/:id/reject` | Reject with optional comment |
| `GET` | `/health` | Health check |

### Authentication

- Email-only login (no password verification)
- JWT with 7-day expiry
- Hardcoded fallback secret `'supersecret123'`
- Token passed via `Authorization: Bearer <token>` header

### Business Logic

- **Approval Chain:** Ordered approvers, first=pending, rest=waiting, sequential progression
- **Signature Placement:** x/y coordinates + page number stored per approval step
- **AI Integration:** Groq Llama 3.3 generates title + summary from extracted PDF text
- **Audit Logging:** All actions (submitted, approved, rejected) logged with timestamps
- **File Storage:** PDFs uploaded to Cloudinary (`faculty-approval-docs` folder)
- **Access Control:** `canAccessDocument()` checks if user is sender or in approval chain

### Environment Variables Required

```
DATABASE_URL          - PostgreSQL connection string (Supabase)
DIRECT_URL            - Direct PostgreSQL connection for Prisma migrations (Supabase)
JWT_SECRET            - JWT signing key (REQUIRED, no fallback)
PORT                  - Server port (defaults to 5001)
CLOUDINARY_CLOUD_NAME - Cloudinary account name
CLOUDINARY_API_KEY    - Cloudinary API key
CLOUDINARY_API_SECRET - Cloudinary API secret
GROQ_API_KEY          - Groq API key for AI analysis (free tier)
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Database schema (7 models) |
| `backend/prisma/seed.ts` | Seeds 6 mock users |
| `backend/src/server.ts` | Express app setup, routes registration, health check |
| `backend/src/middleware/auth.ts` | JWT verification middleware |
| `backend/src/routes/auth.ts` | Login & me endpoints |
| `backend/src/routes/users.ts` | User listing & profile photo update |
| `backend/src/routes/documents.ts` | Core business logic (6 main endpoints + helpers) |

---

## 3. Frontend Summary

**Framework:** React 18 + Vite + React Router 6 + TanStack Query + Shadcn/UI + Tailwind CSS

### Pages & Routes

| Route | Page | Auth | Role Restriction |
|-------|------|------|-----------------|
| `/login` | Login | No | — |
| `/` | Dashboard | Yes | "Submitted by Me" hidden for Director |
| `/upload` | UploadDocument | Yes | Blocked for Director |
| `/document/:id` | DocumentReview | Yes | Actions only for current approver |
| `/archive` | Archive | Yes | — |
| `/settings` | SettingsPage | Yes | — |

### State Management

4 custom stores using `useSyncExternalStore` + localStorage:

| Store | File | Persistence |
|-------|------|-------------|
| Auth Store | `src/lib/auth-store.ts` | localStorage (token + user) |
| Document Store | `src/lib/document-store.ts` | In-memory, fetched from API |
| Signature Store | `src/lib/signature-store.ts` | In-memory only (lost on refresh) |
| Profile Photo Store | `src/lib/profile-photo-store.ts` | localStorage (base64 images) |

### API Endpoints Actually Called from Frontend

| Method | Endpoint | Used In | Purpose |
|--------|----------|---------|---------|
| `POST` | `/auth/login` | auth-store | Login by email |
| `GET` | `/auth/me` | auth-store | Session validation |
| `GET` | `/documents` | document-store | Fetch all documents |
| `POST` | `/documents` | UploadDocument | Submit new document |
| `POST` | `/documents/analyze` | UploadDocument | AI analysis (title+summary) |
| `POST` | `/documents/{id}/approve` | DocumentReview | Approve with signatures |
| `POST` | `/documents/{id}/reject` | DocumentReview | Reject with comment |
| `GET` | `/users` | UploadDocument | Fetch approvers list |

### Key Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Router config, AuthGuard, ProtectedUpload |
| `src/pages/Login.tsx` | Email login + demo buttons |
| `src/pages/Dashboard.tsx` | Stats, filters, document list |
| `src/pages/UploadDocument.tsx` | 3-step wizard: upload → AI → chain |
| `src/pages/DocumentReview.tsx` | Multi-panel review, sign, approve/reject |
| `src/pages/Archive.tsx` | Approved documents, read-only |
| `src/pages/SettingsPage.tsx` | Profile photo, signature gallery |
| `src/components/AppLayout.tsx` | Sidebar + header layout |
| `src/components/DocumentCard.tsx` | Document preview card |
| `src/components/UserAvatar.tsx` | Profile photo or initials fallback |
| `src/components/StatusBadge.tsx` | Status chip display |
| `src/lib/api.ts` | `fetchWithAuth()` utility, base URL config |

### Role-Based UI Logic

1. **ProtectedUpload (App.tsx):** Director role cannot access `/upload` → redirects to `/`
2. **Dashboard filters:** "Submitted by Me" filter hidden for Director role
3. **AppLayout nav:** "Upload Document" nav item hidden for Director role
4. **DocumentReview:** Current approver sees action buttons; others see "locked" state
5. **Settings:** All roles can upload signatures/photos

---

## 4. Feature Mapping (PRD vs Code)

### Fully Implemented Features

| Feature | Notes |
|---------|-------|
| PDF Upload | Cloudinary storage, PDF-only validation |
| AI Title & Summary | Groq Llama 3.3 with fallback to text snippet |
| Hierarchical Approval Chain Builder | Ordered selection, search by name/role, avatar display, scrollable list (max-height 360px) |
| Sequential Approval Flow | First=pending, rest=waiting, moves sequentially |
| Signature Placement (drag-and-drop) | x/y coordinates, page number, multiple signatures per step |
|i am Comment | Optional comment, status update, audit entry |
| Role-Based Interface (Director) | Upload hidden in nav + route blocked, "Submitted by Me" hidden |
| Audit Logging | Actions logged: submitted, approved, rejected with timestamps |
| Document Status Lifecycle | Pending → Approved / Rejected |
| Archive View | Shows approved documents, read-only, search + category filter |
| Profile Photo (localStorage) | Upload/remove, displayed in sidebar & user avatars |
| Signature/Stamp Gallery | Upload PNG/JPEG/SVG, manage, select during approval |
| Dashboard Filters | All, Action Required, Submitted by Me, Pending, Approved, Rejected |
| Dashboard Stats Cards | Action Required, Pending, Approved, Rejected counts |
| Demo Login Buttons | Quick role-based testing with pre-seeded users |
| Approver Search | Filter approvers by name or role in real-time |

### Partially Implemented Features

| Feature | What's Done | What's Missing |
|---------|-------------|----------------|
| Revision Flow | UI allows file upload on rejected docs | `reviseDocument()` is a stub — no API call, no version increment, no chain reset |
| Document Versioning | `DocumentVersion` model exists + initial version record created on upload | No endpoint to list versions, no version increment on revision, no UI for viewing past versions |
| Email Notifications | Not found in codebase | PRD requires: email to first approver on submission, sequential notifications to next approver, AI-generated rejection email to sender — **none implemented** |
| Three-Panel Review Layout | Left panel (summary + chain + audit), Center (PDF iframe), Right (action buttons) | Not a true 3-column as designed; left panel combines multiple sections vertically |
| Profile Photo Backend Sync | `PUT /users/me/profile-photo` endpoint exists in backend | Frontend stores photos in localStorage only, never calls this endpoint |
| Document Access Control | `canAccessDocument()` checks sender or chain membership | No department-level isolation, no cross-department blocking |
| Approval Chain Avatar Display | Avatars shown with name and role | Selection order number badge not overlaid on avatar as specified in design guidelines |

### Missing Features

| Feature | PRD Reference | Status |
|---------|---------------|--------|
| Email Notifications (all types) | Core Feature #5 — Sequential Notifications | Not implemented |
| Reminder Automation (Cron Job) | Core Feature #6 — Hourly cron, 2-day inactivity check | Not implemented |
| Final PDF Merge (on download) | Core Feature #7 — Overlay signatures onto original PDF | Not implemented |
| Document Download | Core Feature #7 — Stream merged PDF to user | Not implemented |
| Secure Archive Backend Enforcement | Core Feature #8 — Document becomes read-only after final approval | Archive page exists but no backend immutability enforcement |
| Full Revision System | Core Feature #4 — Version increment, chain reset, restart from first approver | Stub function only |
| Password Authentication | Phase 1 — Implement user authentication (email + password) | Email-only login, no password |
| Proper Logout | Implied by auth system | No `logout()` function; nav link doesn't clear auth state |
| Document Status: "Archived" | Status Lifecycle — Approved → Archived | Only pending/approved/rejected exist; no archived transition |
| Document Status: "Draft" | Status Lifecycle — Draft → Pending | Code skips straight to Pending on upload |
| AI-Generated Rejection Email | Core Feature #4 — AI drafts rejection notification | Not implemented |
| Reminder Logging | Core Feature #6 — Log reminder timestamps | Not implemented |
| Version History UI | Document Details page — version list, rejection comments, reminder logs | Partial: audit log shown, but no dedicated version history view |
| Signature Ownership Enforcement | Security — Only account owner can use their signatures | No validation that placed signature belongs to current user |

---

## 5. Integration Gaps

### Backend Endpoints NOT Used by Frontend

| Endpoint | Purpose | Gap |
|----------|---------|-----|
| `PUT /api/users/me/profile-photo` | Save profile photo server-side | Frontend uses localStorage instead; endpoint is orphaned |
| `GET /api/documents/:id` | Get single document by ID | Frontend fetches all documents via `GET /documents` and filters client-side |

### Frontend Features WITHOUT Backend Support

| Feature | Gap |
|---------|-----|
| Signature persistence across sessions | `signature-store.ts` is in-memory only; `SignatureItem` model exists in DB but **no CRUD endpoints** for signatures |
| Document revision upload | UI allows file upload on rejected docs but no backend revision endpoint exists |
| Profile photo removal | Frontend can remove photo from localStorage but no backend delete endpoint |
| Category-based filtering (Archive) | Frontend filters by category but `category` field is optional and rarely populated |

### Broken / Inconsistent Flows

| Flow | Issue |
|------|-------|
| **Signatures vanish on refresh** | Stored in-memory (`signature-store.ts`), not synced to backend `SignatureItem` table |
| **Revision flow dead-ends** | User can select a file on rejected document but `reviseDocument()` logs a warning and does nothing |
| **Logout doesn't work** | Clicking logout icon navigates to `/login` but doesn't clear token/state from localStorage; user remains "logged in" |
| **Password field is cosmetic** | Login page renders a password input field that is collected but never sent to the API |
| **Profile photos are device-local** | Switching browsers/devices loses the photo; backend endpoint exists but is never called |
| **Approver chain IDs sent as JSON string** | `UploadDocument.tsx` sends `approvalChainIds` as a JSON-stringified array inside FormData — fragile contract |

---

## 6. Risks & Issues

### Critical

| Issue | Location | Impact |
|-------|----------|--------|
| **No password authentication** | `
backend/src/routes/auth.ts` | Anyone with a valid email can impersonate any user |
| **Hardcoded JWT secret fallback** | `backend/src/middleware/auth.ts` line 4 — `'supersecret123'` | Token forgery if env var missing in production |
| **Signatures lost on page refresh** | `frontend/src/lib/signature-store.ts` | Users must re-upload signatures every browser session |
| **Logout is broken** | `frontend/src/components/AppLayout.tsx` line 105 | Users cannot securely sign out; token persists in localStorage |

### High

| Issue | Location | Impact |
|-------|----------|--------|
| Multiple `new PrismaClient()` instances | Each route file creates its own instance | Connection pool exhaustion under load |
| No transaction handling in approval flow | `backend/src/routes/documents.ts` | Inconsistent DB state if partial failure during approve/reject |
| No input validation on rejection comments | `backend/src/routes/documents.ts` | Data injection or DoS via arbitrarily large payloads |
| Signature placement lacks ownership validation | `backend/src/routes/documents.ts` approve endpoint | User could theoretically place another user's signature |
| No rate limiting on any endpoint | All routes | Brute force login or upload abuse |
| API base URL hardcoded to `localhost:5001` | `frontend/src/lib/api.ts` | Breaks in any non-local deployment |

### Medium

| Issue | Location | Impact |
|-------|----------|--------|
| Express body limit 50MB, no per-file validation | `backend/src/server.ts` | Memory exhaustion on large uploads |
| Groq response parsing is regex-based | `backend/src/routes/documents.ts` analyze endpoint | AI analysis fails on unexpected response format |
| `bcryptjs` imported but unused | `backend/package.json` | Misleading dependency suggesting password hashing exists |
| No structured error responses from backend | All route handlers | Inconsistent frontend error handling, poor debugging |
| No error toast notifications for failed API calls | Frontend stores | Users see silent failures on network errors |
| Frontend data mapping inconsistencies | `frontend/src/lib/document-store.ts` | camelCase/snake_case mismatch between mock-data types and backend |
| No validation on placement coordinates | `frontend/src/pages/DocumentReview.tsx` | Allows duplicate signatures at same position, out-of-bounds placements |

### Low

| Issue | Impact |
|-------|--------|
| PDF viewer uses raw iframe (not PDF.js) | No annotation support, less control over rendering |
| `bcryptjs` in dependencies but no password model field | Dead dependency |
| No audit log for failed approval attempts | Incomplete audit trail |
| Large number of unused Shadcn/UI components installed (~60+) | Bundle size bloat |
| No `.env.example` file found | Onboarding friction for new developers |

---

## 7. Suggested Next Steps (Prioritized)

### P0 — Security & Critical Fixes

| # | Task | Effort |
|---|------|--------|
| 1 | **Implement password authentication** — add password field to User model, use bcryptjs (already installed) for hashing, require password in login endpoint | Medium |
| 2 | **Remove hardcoded JWT secret** — require `JWT_SECRET` env var, fail on startup if missing | Small |
| 3 | **Fix logout** — add `logout()` function to auth-store that clears localStorage token + user and resets state | Small |
| 4 | **Persist signatures to backend** — add CRUD endpoints for `SignatureItem` model, sync `signature-store` with DB on load/save | Medium |

### P1 — Core Missing Features

| # | Task | Effort |
|---|------|--------|
| 5 | **Implement revision flow end-to-end** — backend endpoint for version upload + chain reset + version increment; wire up frontend `reviseDocument()` | Large |
| 6 | **Implement email notifications** — use nodemailer; notify first approver on submission, next approver on each step, sender on rejection | Large |
| 7 | **Build PDF merge/download endpoint** — use pdf-lib to overlay stored signature placements onto original PDF, stream merged result | Medium |
| 8 | **Add Draft and Archived document statuses** — implement full lifecycle: Draft → Pending → Approved → Archived, with backend enforcement | Medium |

### P2 — Integration & Quality

| # | Task | Effort |
|---|------|--------|
| 9 | **Use singleton PrismaClient** — create shared `lib/prisma.ts` instance instead of per-route instantiation | Small |
| 10 | **Sync profile photos to backend** — frontend should call `PUT /users/me/profile-photo` on upload and read from server response, not just localStorage | Small |
| 11 | **Add backend input validation** — validate file types, comment lengths, signature ownership, placement coordinate bounds | Medium |
| 12 | **Make API base URL configurable** — use Vite env variable (`VITE_API_URL`) instead of hardcoded `localhost:5001` | Small |
| 13 | **Wrap multi-step DB operations in Prisma transactions** — especially the approval flow (step update + next step + audit entry) | Medium |

### P3 — Polish & Hardening

| # | Task | Effort |
|---|------|--------|
| 14 | **Add error handling UI** — show toast notifications (Sonner) on API failures, not just console.log | Small |
| 15 | **Add rate limiting** — `express-rate-limit` on login and upload endpoints | Small |
| 16 | **Implement reminder cron job** — hourly check for pending documents inactive 48+ hours, send reminder email, log timestamp | Medium |
| 17 | **Remove cosmetic password field from Login UI** — or implement real password auth (covered in P0) | Small |
| 18 | **Replace iframe PDF viewer with PDF.js** — better rendering control, annotation support for signature placement overlay | Large |
| 19 | **Add `.env.example` files** — document required environment variables for both frontend and backend | Small |
| 20 | **Clean up unused Shadcn components** — remove ~40+ unused UI component files to reduce bundle size | Small |

---

## Appendix A: Data Flow Diagram

```
User Uploads PDF
    |
    v
Optional: POST /api/documents/analyze
    |-- pdf-parse extracts text
    |-- Groq generates title/summary (or fallback)
    '-- Returns {title, summary}

User Submits with Approval Chain
    |
    v
POST /api/documents
    |-- File --> Cloudinary
    |-- Document created with status='pending'
    |-- ApprovalSteps created (first='pending', rest='waiting')
    |-- AuditEntry created ('submitted')
    |-- DocumentVersion created
    '-- Returns document + chain

Approver Reviews
    |
    v
GET /api/documents (filtered client-side)

Approver Acts
    |
    |-- POST /api/documents/:id/approve
    |   |-- Find current pending step
    |   |-- Verify approver is current step's approver
    |   |-- Create Placements for signatures
    |   |-- Update step status='approved', set actedAt
    |   |-- Create AuditEntry ('approved')
    |   '-- If last step: mark document='approved'
    |       Else: mark next step='pending'
    |
    '-- POST /api/documents/:id/reject
        |-- Mark current step='rejected'
        |-- Mark document='rejected'
        |-- Create AuditEntry ('rejected') with comment
        '-- Workflow stops
```

---

## Appendix B: Database Schema Summary

```
User
  - id (UUID, PK)
  - name, email (unique), role, department
  - avatar, profileImage
  --> has many: Documents, ApprovalSteps, SignatureItems, AuditEntries, DocumentVersions

Document
  - id (UUID, PK)
  - title, summary, category (optional)
  - senderId (FK -> User)
  - status (pending/approved/rejected)
  - version (Int, default 1)
  - fileName (Cloudinary URL)
  - createdAt, updatedAt, completedAt
  --> has many: ApprovalSteps, AuditEntries, DocumentVersions

ApprovalStep
  - id (UUID, PK)
  - documentId (FK -> Document)
  - approverId (FK -> User)
  - orderIndex (Int)
  - status (waiting/pending/approved/rejected)
  - actedAt, comment
  --> has many: Placements

SignatureItem
  - id (UUID, PK)
  - name, type (signature/stamp)
  - preview (optional base64)
  - userId (FK -> User)

Placement
  - id (UUID, PK)
  - approvalStepId (FK -> ApprovalStep)
  - signatureId (String)
  - x, y (Float coordinates)
  - pageNumber (Int)

AuditEntry
  - id (UUID, PK)
  - action (submitted/approved/rejected)
  - actorId (FK -> User)
  - documentId (FK -> Document)
  - timestamp, details, version

DocumentVersion
  - id (UUID, PK)
  - documentId (FK -> Document)
  - version (Int)
  - fileName (Cloudinary URL)
  - uploadedAt
  - uploadedBy (FK -> User)
```
