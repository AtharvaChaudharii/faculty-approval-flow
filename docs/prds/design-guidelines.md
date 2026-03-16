design-guidelines.md

⸻

Emotional Tone

The system should feel like a calm administrative chamber — structured, respectful, and quietly authoritative.

Guiding philosophy:
- Technology should feel kind.
- Authority should not feel intimidating.
- Efficiency should not remove humanity.

This system must feel:
- Clear
- Stable
- Professional
- Supportive under pressure

Never flashy. Never chaotic.

⸻

Visual System

⸻

Typography

Emotional Goal

Clarity + Institutional Trust

Font Strategy
- Primary: Geometric Sans (Inter-style)
  → Clean, modern, neutral
- Secondary (Optional for headings): Light serif for subtle authority accents

⸻

Type Scale (8pt-Based Modular Rhythm)

| Level   | Size  | Weight | Usage           |
|---------|-------|--------|-----------------|
| H1      | 32px  | 600    | Page titles     |
| H2      | 24px  | 600    | Section titles  |
| H3      | 18px  | 500    | Card headers    |
| H4      | 16px  | 500    | Subsections     |
| Body    | 14px  | 400    | Primary content |
| Caption | 12px  | 400    | Metadata        |

Rules
- Line-height ≥ 1.6
- Maximum 70 characters per line
- WCAG AA+ contrast required

Tone Effects
- Slightly tighter headings → confidence
- Comfortable body spacing → calm reading

⸻

Color System

Emotional Direction

Muted institutional tones. Avoid corporate blue overload.

⸻

Primary Palette

| Role          | Hex     | RGB          | Purpose         |
|---------------|---------|--------------|-----------------|
| Primary Blue  | #1E3A5F | 30, 58, 95   | Primary actions |
| Deep Slate    | #2F3E46 | 47, 62, 70   | Headers         |
| Light Gray    | #F4F6F8 | 244, 246, 248| Background      |
| Surface White | #FFFFFF | 255, 255, 255| Cards           |

⸻

Accent Colors

| Role     | Hex     | RGB          | Usage         |
|----------|---------|--------------|---------------|
| Success  | #2E7D32 | 46, 125, 50  | Approved      |
| Warning  | #ED6C02 | 237, 108, 2  | Pending       |
| Rejected | #C62828 | 198, 40, 40  | Rejection     |
| Info     | #0288D1 | 2, 136, 209  | Notifications |

Contrast ratio must remain ≥ 4.5:1 in all states.

⸻

Dark Mode (Optional Future)
- Deep Background: #121417
- Muted Surface: #1E2226
- Text: #E6E8EA

Maintain emotional consistency — avoid "cyberpunk dark."

⸻

Spacing & Layout

Grid System
- 8pt spacing grid
- Consistent vertical rhythm across screens

Spacing Scale
- 8px → micro spacing
- 16px → default gap
- 24px → section separation
- 32px+ → major layout break

⸻

Review Screen Layout (Core Page)

Three-column structure:
- Left Sidebar → 25% (AI Summary)
- Center → 50% (PDF Viewer)
- Right Sidebar → 25% (Signature Panel)

Responsive behavior:
- Collapses into stacked layout on tablet/mobile
- Summary becomes collapsible
- Signature panel slides up from bottom

⸻

Avatar & User Identity Display

Profile photos are a persistent identity element rendered across the platform. The following rules govern their display.

Avatar Dimensions & Shape
- All avatars are displayed as circular crops.
- Standard size: 32×32px in lists and inline contexts; 48×48px in profile and settings contexts.
- Maintain consistent sizing across all surfaces.

Fallback Behavior
- When no custom photo has been uploaded, the system renders a default avatar placeholder.
- The default avatar must meet the same contrast and sizing requirements as a custom photo.
- The fallback must never display a broken image state.

Avatar Display Contexts
The user's profile photo (or default avatar) must appear consistently across:
- Sidebar user profile section
- Notification items
- Document cards
- Approval chain selector (Upload page)
- Audit log entries
- Document Details / History view
- Anywhere the user's name is displayed

Approval Chain Avatar Specification
Each approver entry in the approval chain selector displays:
- Circular profile avatar (custom photo or default)
- Selection order number badge (overlaid on avatar, bottom-right)
- Full name (Body, 14px)
- Role label (Caption, 12px, muted)

The order number badge uses Primary Blue (#1E3A5F) background with white text, sized 18×18px, positioned at the bottom-right of the avatar circle.

⸻

Settings — Profile Photo Upload Interaction

Hover State
- Hovering over the avatar in Settings reveals an "Upload Photo" overlay on the avatar.
- Overlay: semi-transparent dark scrim with centered camera icon and "Upload Photo" label.

Upload Flow
- Clicking the overlay opens the system file picker (image files only).
- On selection, the image is stored in localStorage under the user's identity key.
- The new photo is immediately reflected across all platform surfaces without a page reload.

⸻

Approval Chain — Search & Scroll Interaction

Search Field
- An inline search input appears above the approver list.
- Filters approvers in real time by name or role as the user types.
- Placeholder text: "Search by name or role"
- Uses standard Body type (14px) with 8px internal padding.

Scrollable List
- The approver list container has a maximum height of 360px.
- Overflow scrolls vertically with a visible, styled scrollbar.
- Smooth scroll behavior; no pagination.

⸻

Motion & Interaction

Inspired by kindness-focused interaction design.

Motion Rules
- Duration: 150–250ms
- Easing: Ease-out cubic
- No bounce unless celebratory

⸻

Microinteractions

Approve Button
- Subtle darken on hover
- Slight elevation increase

Signature Drag
- Smooth snap-to-canvas feel
- No jitter

Reject Modal
- Soft fade + slight upward motion

Completion State
- Gentle fade-in confirmation banner
- No confetti (institutional tone)

Avatar Upload
- Immediate preview on selection (no reload required)
- Subtle fade transition when photo updates across the interface

⸻

Voice & Tone

Personality
- Professional
- Respectful
- Clear
- Calm

Never sarcastic. Never playful.

⸻

Microcopy Examples

Onboarding
"Upload your document and define the approval order."

Success
"Document approved successfully."

Rejection
"This document was not approved. Please review the comments and resubmit."

Profile Photo
"Hover over your photo to upload a new image."

Search Approvers
"Search by name or role"

No blame language.

⸻

System Consistency

Repeating Patterns
- Single primary action per screen
- Status chip always top-right
- Version number always near document title
- Audit log always collapsible at bottom
- User avatar always left of user name in any list context

Style Anchors
- Linear-style dashboard clarity
- Apple-level spacing discipline
- shadcn/ui structural consistency

⸻

Role-Based Interface Consistency

Director Interface
- Upload Document navigation item must be completely absent from the DOM (not merely hidden via CSS) to prevent route access.
- "Submitted by Me" filter must not render in the Director dashboard.
- All approval-related controls remain fully styled and functional.

Standard Interface
- No visual distinction from the current design baseline.
- All upload, submission, and filtering controls are rendered as normal.

⸻

Accessibility Standards
- Semantic headings (H1–H4)
- Landmark regions (nav, main, aside)
- Keyboard-navigable signature selection
- Keyboard-navigable approver search field
- Visible focus states (2px outline)
- ARIA roles for modals and drag components
- Avatar images must include descriptive alt text (e.g., "Profile photo of [Name]")
- Default avatar must include alt text: "Default avatar"

Screen reader support required for:
- Status updates
- Approval state changes
- Avatar upload confirmation

Color must never be the sole indicator of status — always include text labels.

⸻

Emotional Audit Checklist

After each design iteration, validate:
- Does this screen feel calm under pressure?
- Does rejection feel informative, not punishing?
- Does approval feel satisfying but restrained?
- Would a Principal feel confident using this?
- Does the Director interface feel purposeful, not restrictive?

If not — simplify.

⸻

Technical QA Checklist
- Typography aligns to 8pt rhythm
- All color contrasts meet WCAG AA+
- Hover, active, and disabled states clearly distinct
- Motion remains within 150–300ms
- Drag placement remains precise across zoom levels
- Avatar fallback renders correctly when localStorage is empty
- Profile photo update reflects immediately on all visible surfaces
- Approver search filters correctly by both name and role
- Approval chain scroll engages at correct list height threshold
- Director role renders no upload controls on any screen

⸻

Adaptive System Memory

If future college applications are built:
- Reuse muted palette for institutional continuity
- Maintain approval flow layout consistency
- Keep status chip placement identical
- Reuse avatar display patterns (circular crop, fallback behavior, order badge) for any future people-selection flows

Consistency builds trust.

⸻

Design Snapshot

⸻

🎨 Color Palette
- Primary Blue: #1E3A5F
- Deep Slate: #2F3E46
- Light Gray: #F4F6F8
- Surface White: #FFFFFF
- Success: #2E7D32
- Warning: #ED6C02
- Rejected: #C62828
- Info: #0288D1

⸻

🅰️ Typography Scale

| Element | Size / Weight |
|---------|---------------|
| H1      | 32px / 600    |
| H2      | 24px / 600    |
| H3      | 18px / 500    |
| H4      | 16px / 500    |
| Body    | 14px / 400    |
| Caption | 12px / 400    |

Line-height: 1.6
Grid system: 8pt

⸻

📐 Layout System
- 3-column review layout
- 8pt spacing grid
- Single primary CTA per screen
- Collapsible side panels on mobile
- Approval chain: max-height 360px, scrollable

⸻

🧠 Emotional Thesis

This platform feels structured, respectful, and calm — like a well-run institution that values clarity over noise.

⸻

Design Integrity Review

The emotional intent (calm authority + kindness) aligns strongly with the technical structure (clear hierarchy, single-action screens, restrained motion). The system avoids over-celebration and maintains institutional professionalism.

The Director interface reinforces the principle of "Don't Make Me Think" — by removing irrelevant controls entirely rather than disabling them, the Director sees only what they need to act on.

Improvement Suggestion

Introduce subtle contextual guidance tooltips for first-time users to reduce onboarding hesitation without cluttering the interface.