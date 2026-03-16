export type UserRole = 'faculty' | 'assistant_professor' | 'hod' | 'principal' | 'director';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'archived' | 'draft';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export interface ApprovalStep {
  id: string;
  approver: User;
  order_index: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
  acted_at?: string;
  comment?: string;
  placements?: Placement[];
}

export interface AuditEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'revised' | 'archived' | 'reminder_sent';
  actor: User;
  timestamp: string;
  details?: string;
  version?: number;
}

export interface DocumentVersion {
  version: number;
  file_name: string;
  uploaded_at: string;
  uploaded_by: User;
}

export interface Document {
  id: string;
  title: string;
  summary: string;
  sender: User;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  version: number;
  approval_chain: ApprovalStep[];
  category: string;
  file_name: string;
  audit_log: AuditEntry[];
  version_history: DocumentVersion[];
}

export interface SignatureItem {
  id: string;
  name: string;
  type: 'signature' | 'stamp';
  preview?: string;
}

export interface Placement {
  id: string;
  signatureId: string;
  x: number;
  y: number;
}

export const defaultSignatures: SignatureItem[] = [
  { id: 'sig-1', name: 'Official Signature', type: 'signature' },
  { id: 'sig-2', name: 'Department Stamp', type: 'stamp' },
];

export const currentUser: User = {
  id: '1',
  name: 'Dr. Priya Sharma',
  email: 'priya.sharma@college.edu',
  role: 'hod',
  department: 'Computer Science',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=1e3a5f&textColor=ffffff',
};

const users: User[] = [
  currentUser,
  { id: '2', name: 'Prof. Rajesh Kumar', email: 'rajesh@college.edu', role: 'faculty', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RK&backgroundColor=2d5a3d&textColor=ffffff' },
  { id: '3', name: 'Dr. Anita Desai', email: 'anita@college.edu', role: 'assistant_professor', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=5a2d4f&textColor=ffffff' },
  { id: '4', name: 'Dr. Sunil Mehta', email: 'sunil@college.edu', role: 'principal', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SM&backgroundColor=4a3d1e&textColor=ffffff' },
  { id: '5', name: 'Prof. Kavita Rao', email: 'kavita@college.edu', role: 'director', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=1e4a5a&textColor=ffffff' },
  { id: '6', name: 'Dr. Amit Patel', email: 'amit@college.edu', role: 'faculty', department: 'Mathematics', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AP&backgroundColor=3d2d1e&textColor=ffffff' },
];

export { users };

export const initialMockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Revised Curriculum Framework for AI & ML Electives',
    summary: 'Proposes restructuring the final-year elective track to include dedicated modules on machine learning foundations, neural network architectures, and ethical AI considerations.',
    sender: users[1],
    status: 'pending',
    created_at: '2026-02-10T09:30:00Z',
    updated_at: '2026-02-12T14:20:00Z',
    version: 1,
    category: 'Academic',
    file_name: 'curriculum-framework-aiml.pdf',
    approval_chain: [
      { id: 's1', approver: users[2], order_index: 0, status: 'approved', acted_at: '2026-02-11T10:00:00Z' },
      { id: 's2', approver: currentUser, order_index: 1, status: 'pending' },
      { id: 's3', approver: users[3], order_index: 2, status: 'waiting' },
      { id: 's4', approver: users[4], order_index: 3, status: 'waiting' },
    ],
    audit_log: [
      { id: 'a1', action: 'submitted', actor: users[1], timestamp: '2026-02-10T09:30:00Z', version: 1 },
      { id: 'a2', action: 'approved', actor: users[2], timestamp: '2026-02-11T10:00:00Z', details: 'Approved by Asst. Professor' },
    ],
    version_history: [
      { version: 1, file_name: 'curriculum-framework-aiml.pdf', uploaded_at: '2026-02-10T09:30:00Z', uploaded_by: users[1] },
    ],
  },
  {
    id: 'doc-2',
    title: 'Faculty Development Program Budget Allocation',
    summary: 'Requests budget approval for a three-day faculty workshop covering modern pedagogical methods and research tools. Includes accommodation and travel costs.',
    sender: users[5],
    status: 'pending',
    created_at: '2026-02-08T11:00:00Z',
    updated_at: '2026-02-11T16:00:00Z',
    version: 1,
    category: 'Financial',
    file_name: 'fdp-budget-2026.pdf',
    approval_chain: [
      { id: 's5', approver: users[2], order_index: 0, status: 'approved', acted_at: '2026-02-09T09:00:00Z' },
      { id: 's6', approver: currentUser, order_index: 1, status: 'pending' },
      { id: 's7', approver: users[3], order_index: 2, status: 'waiting' },
    ],
    audit_log: [
      { id: 'a3', action: 'submitted', actor: users[5], timestamp: '2026-02-08T11:00:00Z', version: 1 },
      { id: 'a4', action: 'approved', actor: users[2], timestamp: '2026-02-09T09:00:00Z' },
    ],
    version_history: [
      { version: 1, file_name: 'fdp-budget-2026.pdf', uploaded_at: '2026-02-08T11:00:00Z', uploaded_by: users[5] },
    ],
  },
  {
    id: 'doc-3',
    title: 'Research Lab Equipment Procurement Notice',
    summary: 'Notice for procurement of GPU servers and networking equipment for the advanced research computing laboratory.',
    sender: users[1],
    status: 'approved',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-02-05T17:00:00Z',
    version: 2,
    category: 'Procurement',
    file_name: 'lab-equipment-notice-v2.pdf',
    approval_chain: [
      { id: 's8', approver: users[2], order_index: 0, status: 'approved', acted_at: '2026-01-22T10:00:00Z' },
      { id: 's9', approver: currentUser, order_index: 1, status: 'approved', acted_at: '2026-01-25T11:00:00Z' },
      { id: 's10', approver: users[3], order_index: 2, status: 'approved', acted_at: '2026-02-01T09:00:00Z' },
      { id: 's11', approver: users[4], order_index: 3, status: 'approved', acted_at: '2026-02-05T17:00:00Z' },
    ],
    audit_log: [
      { id: 'a5', action: 'submitted', actor: users[1], timestamp: '2026-01-15T10:00:00Z', version: 1 },
      { id: 'a6', action: 'rejected', actor: users[2], timestamp: '2026-01-17T14:00:00Z', details: 'Missing vendor quotes' },
      { id: 'a7', action: 'revised', actor: users[1], timestamp: '2026-01-20T10:00:00Z', version: 2, details: 'Added vendor quotes and comparison' },
      { id: 'a8', action: 'approved', actor: users[2], timestamp: '2026-01-22T10:00:00Z' },
      { id: 'a9', action: 'approved', actor: currentUser, timestamp: '2026-01-25T11:00:00Z' },
      { id: 'a10', action: 'approved', actor: users[3], timestamp: '2026-02-01T09:00:00Z' },
      { id: 'a11', action: 'approved', actor: users[4], timestamp: '2026-02-05T17:00:00Z' },
      { id: 'a12', action: 'archived', actor: users[4], timestamp: '2026-02-05T17:00:00Z', details: 'Auto-archived after final approval' },
    ],
    version_history: [
      { version: 1, file_name: 'lab-equipment-notice.pdf', uploaded_at: '2026-01-15T10:00:00Z', uploaded_by: users[1] },
      { version: 2, file_name: 'lab-equipment-notice-v2.pdf', uploaded_at: '2026-01-20T10:00:00Z', uploaded_by: users[1] },
    ],
  },
  {
    id: 'doc-4',
    title: 'Student Industrial Visit Proposal — Bangalore Tech Hub',
    summary: 'Proposal for organizing a 3-day industrial visit for final-year students to technology companies in Bangalore.',
    sender: users[2],
    status: 'rejected',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-06T13:00:00Z',
    version: 1,
    category: 'Academic',
    file_name: 'iv-proposal-blr.pdf',
    approval_chain: [
      { id: 's12', approver: currentUser, order_index: 0, status: 'rejected', acted_at: '2026-02-06T13:00:00Z', comment: 'Budget details insufficient. Please provide itemized cost breakdown.' },
      { id: 's13', approver: users[3], order_index: 1, status: 'waiting' },
    ],
    audit_log: [
      { id: 'a13', action: 'submitted', actor: users[2], timestamp: '2026-02-01T08:00:00Z', version: 1 },
      { id: 'a14', action: 'rejected', actor: currentUser, timestamp: '2026-02-06T13:00:00Z', details: 'Budget details insufficient. Please provide itemized cost breakdown.' },
    ],
    version_history: [
      { version: 1, file_name: 'iv-proposal-blr.pdf', uploaded_at: '2026-02-01T08:00:00Z', uploaded_by: users[2] },
    ],
  },
  {
    id: 'doc-5',
    title: 'Annual Academic Calendar 2026-27',
    summary: 'Draft academic calendar proposing semester dates, examination schedules, and holiday breaks for the upcoming academic year.',
    sender: currentUser,
    status: 'pending',
    created_at: '2026-02-12T07:00:00Z',
    updated_at: '2026-02-12T07:00:00Z',
    version: 1,
    category: 'Administrative',
    file_name: 'academic-calendar-2026-27.pdf',
    approval_chain: [
      { id: 's14', approver: users[3], order_index: 0, status: 'pending' },
      { id: 's15', approver: users[4], order_index: 1, status: 'waiting' },
    ],
    audit_log: [
      { id: 'a15', action: 'submitted', actor: currentUser, timestamp: '2026-02-12T07:00:00Z', version: 1 },
    ],
    version_history: [
      { version: 1, file_name: 'academic-calendar-2026-27.pdf', uploaded_at: '2026-02-12T07:00:00Z', uploaded_by: currentUser },
    ],
  },
  {
    id: 'doc-6',
    title: 'Guest Lecture Series on Quantum Computing',
    summary: 'Memo requesting approval for a series of guest lectures by industry experts on quantum computing fundamentals and applications.',
    sender: users[1],
    status: 'archived',
    created_at: '2025-12-15T09:00:00Z',
    updated_at: '2026-01-10T14:00:00Z',
    version: 1,
    category: 'Academic',
    file_name: 'guest-lecture-quantum.pdf',
    approval_chain: [
      { id: 's16', approver: users[2], order_index: 0, status: 'approved', acted_at: '2025-12-18T10:00:00Z' },
      { id: 's17', approver: currentUser, order_index: 1, status: 'approved', acted_at: '2025-12-22T09:00:00Z' },
      { id: 's18', approver: users[3], order_index: 2, status: 'approved', acted_at: '2026-01-05T11:00:00Z' },
    ],
    audit_log: [
      { id: 'a16', action: 'submitted', actor: users[1], timestamp: '2025-12-15T09:00:00Z', version: 1 },
      { id: 'a17', action: 'approved', actor: users[2], timestamp: '2025-12-18T10:00:00Z' },
      { id: 'a18', action: 'approved', actor: currentUser, timestamp: '2025-12-22T09:00:00Z' },
      { id: 'a19', action: 'approved', actor: users[3], timestamp: '2026-01-05T11:00:00Z' },
      { id: 'a20', action: 'archived', actor: users[3], timestamp: '2026-01-10T14:00:00Z' },
    ],
    version_history: [
      { version: 1, file_name: 'guest-lecture-quantum.pdf', uploaded_at: '2025-12-15T09:00:00Z', uploaded_by: users[1] },
    ],
  },
];

export const roleLabels: Record<UserRole, string> = {
  faculty: 'Faculty',
  assistant_professor: 'Asst. Professor',
  hod: 'Head of Department',
  principal: 'Principal',
  director: 'Director',
};

export const statusLabels: Record<DocumentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
  draft: 'Draft',
};
