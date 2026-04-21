# Faculty Approval Flow — Issues, Bugs & Roadmap

> **Last Updated:** April 2, 2026  
> **Project:** Notice Approval Management Platform  
> **Stack:** React 18 + Vite | Express + TypeScript | PostgreSQL (Neon) | Prisma ORM | Cloudinary | Groq AI

---

## Table of Contents

1. [Critical Bugs](#1-critical-bugs)
2. [UI/UX Issues](#2-uiux-issues)
3. [Infrastructure & DevOps Issues](#3-infrastructure--devops-issues)
4. [Feature Gaps (Remaining Work)](#4-feature-gaps-remaining-work)
5. [Production Readiness Checklist](#5-production-readiness-checklist)
6. [Priority Matrix](#6-priority-matrix)

---

## 1. Critical Bugs

### 🔴 BUG-001: Dashboard Shows 0 Documents Initially, Then Loads After Delay

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Frontend — [Dashboard.tsx](file:///Users/atharva/Desktop/faculty-approval-flow/frontend/src/pages/Dashboard.tsx), [document-store.ts](file:///Users/atharva/Desktop/faculty-approval-flow/frontend/src/lib/document-store.ts)

**Description:**  
On page load, all stats cards (Action Required, Pending, Approved, Rejected) display `0`. After a few seconds, the actual counts appear. This creates a jarring flash-of-empty-content and gives the impression the app is broken.

**Root Cause:**  
The `document-store.ts` uses a `useSyncExternalStore` pattern with a module-level `documents` array initialized to `[]`. The `refreshDocuments()` call is triggered *inside* the `useDocuments()` hook body (not in a `useEffect`), and the data is fetched asynchronously. Until the API responds, the UI renders with the empty array.

```ts
// document-store.ts — line 62-64
if (!isLoaded && typeof window !== 'undefined') {
  refreshDocuments(); // async, no loading state exposed
}
```

**Impact:** Users see all-zero dashboard with no loading indication, then data pops in suddenly.

**Fix Required:**
- Add a `loading` state to the document store
- Show skeleton loaders on Dashboard while `loading === true`
- Consider using `useEffect` + `Suspense` or `React Query` for proper data fetching lifecycle

---

### 🔴 BUG-002: Data Inconsistency — Backend Running But UI Shows 0 Documents

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Backend → Frontend data flow

**Description:**  
Even when the backend is running and has documents in the database, the UI intermittently shows 0 documents. The data was showing earlier but stopped.

**Root Cause (suspected):**
- The `isLoaded` flag is a module-level boolean. If the first `refreshDocuments()` call fails (network issue, CORS, backend restart), `isLoaded` remains `false` but the error is silently caught and logged. The next render re-triggers `refreshDocuments()` but there's no retry backoff or user notification.
- If the backend was restarted, any in-flight requests would fail, and the `catch` block in `refreshDocuments()` only `console.error`'s — no re-fetch logic.
- The NeonDB serverless database may cold-start, causing the first query to timeout.

**Fix Required:**
- Implement proper retry logic with exponential backoff
- Add error state to document store with user-visible error message
- Add a "Retry" button when data fails to load
- Consider polling or WebSocket for real-time updates

---

### 🔴 BUG-003: "Submit for Approval" Button Requires Double Click & Creates Duplicate Requests

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Frontend — [UploadDocument.tsx](file:///Users/atharva/Desktop/faculty-approval-flow/frontend/src/pages/UploadDocument.tsx) → Backend — `POST /api/documents`

**Description:**  
The "Submit for Approval" button on the upload page requires two clicks to work. Additionally, sometimes two approval requests are generated for the same document, creating duplicate entries in the database.

**Root Cause:**  
The `handleSubmit` function in `UploadDocument.tsx` (line 93) calls `submitDocument()` which in turn calls `fetchWithAuth('/documents', ...)`. There is **no loading/disabled state management** during submission — the button remains clickable during the async operation. No debouncing or `isSubmitting` guard is in place. The backend `POST /api/documents` has no idempotency check.

```tsx
// UploadDocument.tsx — line 280
<Button onClick={handleSubmit} disabled={selectedApprovers.length === 0}>
  Submit for Approval
</Button>
// Missing: disabled={isSubmitting || selectedApprovers.length === 0}
```

**Fix Required:**
- Add `isSubmitting` state to prevent double-click
- Disable the button and show spinner during submission
- Add backend-side idempotency check (e.g., file hash + sender + timestamp window)

---

### 🔴 BUG-004: Signed PDF Download Fails — "Too many uploads. Please try again later."

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Backend — `GET /api/documents/:id/signed-pdf`, [server.ts](file:///Users/atharva/Desktop/faculty-approval-flow/backend/src/server.ts) rate limiter

**Description:**  
When trying to download a signed PDF, the user receives: `{"error":"Too many uploads. Please try again later."}`

**Root Cause:**  
The `uploadLimiter` rate limiter in `server.ts` is applied to the **entire** `/api/documents` route prefix:

```ts
// server.ts — lines 41-42
app.use('/api/documents', uploadLimiter); // Catches ALL /api/documents/* requests!
app.use('/api/documents', docRoutes);
```

This means **GET** requests like `/api/documents/:id/signed-pdf`, `/api/documents/:id/pdf` (iframe loads), and even `GET /api/documents` (dashboard listing) **all count toward** the upload rate limit of 30 requests per 15 minutes. With dashboard polling and iframe PDF loads, this limit is easily exhausted.

**Fix Required:**
- Apply `uploadLimiter` only to `POST /api/documents` routes, not the entire prefix
- Create separate rate limiters for read vs. write operations
- Example fix:
  ```ts
  // In routes/documents.ts instead of server.ts:
  router.post('/', uploadLimiter, authMiddleware, upload.single('file'), async (req, res) => { ... });
  ```

---

### 🔴 BUG-005: Signed PDF Is Identical to Original — No Signature Changes Visible

**Severity:** Critical  
**Status:** Intermittent  
**Affected Area:** Backend — `GET /api/documents/:id/signed-pdf` in [documents.ts](file:///Users/atharva/Desktop/faculty-approval-flow/backend/src/routes/documents.ts#L654-L808)

**Description:**  
Sometimes the downloaded "signed PDF" is identical to the originally uploaded document — no signature overlays, boxes, or names are visible.

**Root Cause (suspected):**
- If no `placements` were saved during the approval step (e.g., approver approved without placing a signature, or placements failed to save), the signed-pdf endpoint loops through approved steps but finds no placements to render, returning the original PDF unchanged.
- The approval endpoint (`POST /api/documents/:id/approve`) allows approval with an empty `placements` array (`placements?.map(...)  || []`), meaning approvers **can** approve without placing any signature.

**Fix Required:**
- Require at least one signature placement for approval (backend validation)
- Show a warning in the UI if no placements exist before allowing "Confirm & Approve"
- Add a visual indicator on the signed PDF showing it was digitally approved even if no image signature was placed (e.g., an approval seal/watermark)

---

### 🔴 BUG-006: Multi-Page PDF Signing — Signature Placed on Wrong Page

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Frontend — [DocumentReview.tsx](file:///Users/atharva/Desktop/faculty-approval-flow/frontend/src/pages/DocumentReview.tsx#L90-L103), Backend — signed-pdf generation

**Description:**  
For documents with more than 1 page, when a user places their signature (e.g., scrolls to the last page and clicks), the signature appears on the first page in the final signed PDF. Users are unable to sign specific pages of multi-page documents.

**Root Cause:**  
The frontend PDF viewer uses a single iframe to display the PDF. The signature placement system overlays a transparent `<div>` on top of this iframe. When the user clicks to place a signature, the coordinates are captured as percentage positions relative to the **entire iframe element**, but **`pageNumber` is hardcoded to `1`**:

```tsx
// DocumentReview.tsx — lines 95-101
setPlacements(prev => [...prev, {
  id: `p-${Date.now()}`,
  signatureId: selectedSig.id,
  x, y,
  pageNumber: 1,  // ← ALWAYS page 1!
}]);
```

The backend correctly uses `pageNumber` for coordinate mapping, but since it's always `1`, all signatures go to the first page regardless of where the user scrolled.

**Fix Required:**
- Implement page-aware PDF viewing (e.g., using `react-pdf` / `pdfjs-dist` to render individual pages)
- Track which page the user is viewing and assign the correct `pageNumber` to placements
- Allow page navigation with page number indicator
- Show placed signatures only on their respective pages

---

### 🔴 BUG-007: AI Summary Not Working — GROQ_API_KEY Not Configured

**Severity:** High  
**Status:** Open  
**Affected Area:** Backend — `POST /api/documents/analyze` in [documents.ts](file:///Users/atharva/Desktop/faculty-approval-flow/backend/src/routes/documents.ts#L32-L60)

**Description:**  
The AI document analysis fails with: `GROQ_API_KEY not configured`. The summary shown in the UI is just raw extracted text from the PDF (the fallback behavior), not an actual AI-generated summary.

**Root Cause:**  
The code was migrated from Google Gemini to Groq API, but the `GROQ_API_KEY` environment variable is not set in the backend `.env` file. The `.env` file has `GEMINI_API_KEY` but the code now uses `callGroq()`. The error handling log message still says "Gemini API failed" which is misleading:

```ts
// documents.ts — line 193
console.warn('[AI Analysis] Gemini API failed, using text extraction fallback:', ...);
// But it's actually Groq that failed
```

**Fix Required:**
- Add `GROQ_API_KEY` to the `.env` file with a valid Groq API key (free tier at [console.groq.com](https://console.groq.com))
- OR: revert to using the Gemini API since `GEMINI_API_KEY` is already configured
- Fix the misleading log message to say "Groq API failed"

---

## 2. UI/UX Issues

### 🟡 UI-001: UI Is Not Responsive / Not Aligned

**Severity:** Medium  
**Status:** Open  
**Affected Area:** Global layout, all pages

**Description:**  
The UI breaks on smaller screen sizes. Elements overlap, text truncates improperly, and the layout does not adapt well to tablets and mobile devices.

**Specific Issues:**
- Dashboard stats cards don't scale properly on medium breakpoints
- Document review page three-column layout collapses poorly on tablets
- Sidebar overlaps content on certain screen sizes
- AI Summary text overflows its container (visible in screenshots)
- "View Original" link text truncates with `max-w-[140px]` which cuts off on mobile
- Action buttons in document review are too small on touch devices

**Fix Required:**
- Audit all pages with responsive breakpoints (320px, 768px, 1024px, 1440px)
- Fix the document review 3-column layout to stack properly on smaller screens
- Make sidebar fully collapsible with hamburger menu on mobile
- Ensure all touch targets are at least 44×44px
- Fix text overflow in AI Summary panel

---

### 🟡 UI-002: Laggy / Slow UI Performance

**Severity:** Medium  
**Status:** Open  
**Affected Area:** Frontend — all pages

**Description:**  
The UI feels sluggish and laggy. Actions like navigating between pages, clicking filters, and scrolling through documents have noticeable delay.

**Root Cause (suspected):**
- `useDocuments()` hook triggers `refreshDocuments()` on every render when `isLoaded` is false
- PDF iframe loading in background (even when not viewing a document)
- No virtualization for long document lists
- Full document list (with nested approval chains, audit logs, version history) is fetched for the dashboard — very heavy payload
- `useSyncExternalStore` triggers re-renders on every document update globally

**Fix Required:**
- Implement pagination or virtual scrolling for document lists
- Lazy-load document details (don't include approval chains/audit logs in list endpoint)
- Add proper loading states and skeleton screens
- Memoize expensive computations with `useMemo`
- Consider `React Query` with caching and stale-while-revalidate

---

## 3. Infrastructure & DevOps Issues

### 🔴 INFRA-001: Email System Not Functional — No Production Mail Account

**Severity:** Critical  
**Status:** Open  
**Affected Area:** Backend — [email.ts](file:///Users/atharva/Desktop/faculty-approval-flow/backend/src/lib/email.ts)

**Description:**  
The email notification system is configured to use `jsonTransport` (console logging) as a fallback since no SMTP credentials are configured. No actual emails are being sent to users. The system needs a dedicated platform email account.

**Current State:**
- No `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env`
- Emails are printed to the terminal console only
- All notification features (approval, rejection, reminders) are non-functional for real users

**Fix Required:**
- Create a dedicated platform email account (e.g., `noreply@docflow-platform.com`)
- Options for production mail service:

  | Service | Free Tier | Best For |
  |---------|-----------|----------|
  | **Amazon SES** | 62K emails/month (from EC2) | AWS deployment |
  | **SendGrid** | 100 emails/day | Quick setup |
  | **Resend** | 100 emails/day | Modern API, React Email |
  | **Gmail SMTP** | 500/day | Small deployments |

- Configure SMTP credentials in `.env`
- Update the `from` address in `email.ts` from `noreply@docflow.college.edu` to the real address
- Add email delivery status tracking

---

### 🔴 INFRA-002: Database Migration — NeonDB to Supabase

**Severity:** Critical  
**Status:** Not Started  
**Affected Area:** Backend — Database, Prisma, `.env`

**Description:**  
The project needs to migrate from NeonDB to Supabase PostgreSQL for better reliability, built-in auth features, and real-time capabilities.

**Current State:**
- Using NeonDB serverless PostgreSQL (connection string in `.env`)
- Prisma ORM with PostgreSQL provider
- NeonDB has cold-start latency issues causing intermittent connection failures

**Migration Steps:**
1. Create Supabase project and get PostgreSQL connection string
2. Update `DATABASE_URL` in `.env` to Supabase connection string
3. Add `DIRECT_URL` for Prisma migrations (Supabase uses connection pooling)
4. Update `schema.prisma`:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
5. Run `npx prisma migrate dev` to apply schema to Supabase
6. Run seed script to populate initial users
7. Test all CRUD operations
8. Remove NeonDB connection

---

### 🔴 INFRA-003: AWS Deployment Readiness

**Severity:** Critical  
**Status:** Not Started  
**Affected Area:** Entire project

**Description:**  
The project needs to be deployed on AWS for production use. Currently it runs only on `localhost`.

**Deployment Architecture Required:**

| Component | AWS Service | Details |
|-----------|-------------|---------|
| Frontend | S3 + CloudFront | Static site hosting with CDN |
| Backend | EC2 / ECS / Lambda | Express API server |
| Database | Supabase (external) or RDS | PostgreSQL |
| File Storage | Cloudinary (existing) or S3 | PDF storage |
| Email | Amazon SES | Transactional emails |
| Domain/SSL | Route 53 + ACM | Custom domain with HTTPS |
| CI/CD | GitHub Actions | Auto-deploy on push |

**Work Required:**
1. **Dockerize** the backend (create `Dockerfile`)
2. **Build** the frontend for production (`npm run build`)
3. **Environment management** — separate `.env.production` from `.env.development`
4. **CORS configuration** — update from `app.use(cors())` to restrict origins
5. **Security hardening** — see Production Readiness Checklist
6. **Health checks** — enhance `/health` endpoint for load balancer
7. **Logging** — structured logging (e.g., Winston/Pino) instead of `console.log`
8. **Process manager** — PM2 or container orchestration for zero-downtime restarts

---

## 4. Feature Gaps (Remaining Work)

### 🟡 FEAT-001: Admin Settings Panel
**Priority:** Medium | **Effort:** Large  
- Manage user roles and accounts (CRUD)
- Define hierarchy rules and approval chain templates
- Configure reminder intervals
- View system-wide analytics
- User invitation system

### 🟡 FEAT-002: Analytics Dashboard
**Priority:** Medium | **Effort:** Medium  
- Average approval time metrics
- Bottleneck identification (who delays most)
- Department-level statistics
- Approval rate tracking (approved vs. rejected)
- Exportable reports (CSV/PDF)

### 🟡 FEAT-003: Document Category Selection During Upload
**Priority:** High | **Effort:** Small  
The upload form hardcodes `category: 'Academic'` (line 112 in `UploadDocument.tsx`). Users should be able to select from: Academic, Financial, Administrative, Procurement, General.

### 🟡 FEAT-004: Strict Role-Based Hierarchy Enforcement
**Priority:** Medium | **Effort:** Medium  
- Backend enforcement that approval chains follow institutional hierarchy
- Currently any user can be placed in any order in the chain
- Should enforce: Faculty → Asst. Professor → HOD → Principal → Director

### 🟡 FEAT-005: User Registration / Self-Service Account Creation
**Priority:** High | **Effort:** Medium  
- Currently only seeded users can log in
- Need registration flow with email verification
- Admin approval for new accounts
- Department and role assignment

### 🟡 FEAT-006: Dark Mode Toggle
**Priority:** Low | **Effort:** Small  
- `next-themes` is installed but dark mode toggle is not exposed in the UI
- Need a toggle in the sidebar or settings page

### 🟡 FEAT-007: Real-Time Notifications
**Priority:** Medium | **Effort:** Medium  
- Currently notifications only update on page refresh
- Need WebSocket or Server-Sent Events (SSE) for live updates
- Bell icon badge should update in real-time

### 🟡 FEAT-008: Mobile-Optimized Interface
**Priority:** Low | **Effort:** Large  
- Dedicated mobile views
- Touch-optimized signature placement
- Push notifications via service workers

### 🟡 FEAT-009: Bulk Document Approval
**Priority:** Low | **Effort:** Medium  
- Approve multiple documents at once from dashboard
- Batch signature placement

### 🟡 FEAT-010: Document Search & Advanced Filters
**Priority:** Medium | **Effort:** Small  
- Date range filtering
- Department-level grouping
- Priority/urgency indicators
- Full-text search across document content

### 🟡 FEAT-011: Dedicated Audit Log Viewer (Admin)
**Priority:** Medium | **Effort:** Small  
- System-wide audit log page for admins
- Filter by action type, user, date range
- Export audit logs

---

## 5. Production Readiness Checklist

### Security

| Item | Status | Details |
|------|--------|---------|
| JWT Secret hardened | ❌ | Currently `supersecret123` — must use strong random secret |
| CORS restricted | ❌ | Currently `app.use(cors())` — allows ALL origins |
| Rate limiting scoped | ❌ | Upload limiter applied to all `/api/documents` routes |
| API keys secured | ❌ | Keys in `.env` but `.env` must not be committed to git |
| Password requirements | ❌ | No password strength validation (min length, complexity) |
| Input sanitization | ⚠️ | Basic validation exists but no XSS/injection protection |
| HTTPS enforcement | ❌ | Not configured |
| Helmet.js headers | ❌ | No security headers middleware |
| File upload validation | ⚠️ | PDF type checked but no magic-byte content verification |
| SQL injection protection | ✅ | Prisma ORM handles parameterized queries |

### Performance

| Item | Status | Details |
|------|--------|---------|
| Response compression | ❌ | No gzip/brotli compression |
| Database connection pooling | ❌ | Default Prisma connection without pooling config |
| API response pagination | ❌ | All documents fetched in single query |
| Frontend code splitting | ⚠️ | Vite handles basic splitting but no lazy routes |
| Image/asset optimization | ❌ | No CDN cache headers |
| Database indexing | ❌ | No custom indexes on frequently queried fields |

### Reliability

| Item | Status | Details |
|------|--------|---------|
| Error monitoring (Sentry) | ❌ | No error tracking service |
| Structured logging | ❌ | Using `console.log/error` only |
| Health check enhanced | ⚠️ | Basic `/health` exists but doesn't check DB/Cloudinary |
| Graceful shutdown | ❌ | No cleanup on SIGTERM/SIGINT |
| Database backups | ❌ | No backup strategy configured |
| Retry logic for external services | ❌ | Cloudinary/Groq calls have no retry mechanism |

---

## 6. Priority Matrix

### 🚨 P0 — Fix Immediately (Blocking Production)

| # | Issue | Type | Est. Effort |
|---|-------|------|-------------|
| 1 | BUG-003: Double-click submit creates duplicate requests | Bug | 1 hour |
| 2 | BUG-004: Rate limiter blocks PDF downloads | Bug | 30 min |
| 3 | BUG-006: Multi-page PDF signing puts signatures on page 1 | Bug | 1-2 days |
| 4 | INFRA-002: Migrate NeonDB → Supabase | Infra | 2-3 hours |
| 5 | Security: Change JWT secret, restrict CORS, add Helmet | Security | 1 hour |

### 🔴 P1 — Fix Before Deployment

| # | Issue | Type | Est. Effort |
|---|-------|------|-------------|
| 6 | BUG-001: Dashboard shows 0, then loads | Bug | 2-3 hours |
| 7 | BUG-002: Intermittent data inconsistency | Bug | 3-4 hours |
| 8 | BUG-005: Signed PDF identical to original | Bug | 2-3 hours |
| 9 | BUG-007: AI summary not working (GROQ key) | Bug | 30 min |
| 10 | INFRA-001: Set up production email (SES/SendGrid) | Infra | 2-3 hours |
| 11 | INFRA-003: AWS deployment (Docker + S3 + EC2) | Infra | 1-2 days |
| 12 | FEAT-003: Category selection in upload | Feature | 1 hour |

### 🟡 P2 — Post-Launch Enhancements

| # | Issue | Type | Est. Effort |
|---|-------|------|-------------|
| 13 | UI-001: Responsive design fixes | UI/UX | 1-2 days |
| 14 | UI-002: Performance optimization | UI/UX | 1-2 days |
| 15 | FEAT-001: Admin panel | Feature | 3-5 days |
| 16 | FEAT-002: Analytics dashboard | Feature | 2-3 days |
| 17 | FEAT-004: Hierarchy enforcement | Feature | 1-2 days |
| 18 | FEAT-005: User registration | Feature | 2-3 days |

### ⚪ P3 — Future Roadmap

| # | Issue | Type | Est. Effort |
|---|-------|------|-------------|
| 19 | FEAT-006: Dark mode toggle | Feature | 2 hours |
| 20 | FEAT-007: Real-time notifications | Feature | 2-3 days |
| 21 | FEAT-008: Mobile-optimized interface | Feature | 1 week |
| 22 | FEAT-009: Bulk approval | Feature | 2-3 days |
| 23 | FEAT-010: Advanced search & filters | Feature | 1-2 days |
| 24 | FEAT-011: Admin audit log viewer | Feature | 1-2 days |
| 25 | IP logging & digital certificates | Security | 2-3 days |
| 26 | Blockchain hash storage | Feature | 1 week |
| 27 | College ERP integration | Feature | 2+ weeks |

---

> [!IMPORTANT]
> **Total Issues:** 7 Bugs • 2 UI/UX Issues • 3 Infrastructure • 11 Feature Gaps • 16 Security/Performance/Reliability Items  
> **Estimated Effort to Production:** ~3-4 weeks with focused development
