import { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Search, Send, User } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import type { DocumentStatus } from '@/lib/mock-data';
import { useDocuments } from '@/lib/document-store';
import DocumentCard from '@/components/DocumentCard';
import StatsCard from '@/components/StatsCard';
import { cn } from '@/lib/utils';

const filters: { label: string; value: DocumentStatus | 'all' | 'action_required' | 'submitted_by_me' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Action Required', value: 'action_required' },
  { label: 'Submitted by Me', value: 'submitted_by_me' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function Dashboard() {
  const { documents } = useDocuments();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const actionRequired = documents.filter(
    (d) => d.status === 'pending' && d.approval_chain.some(s => s.approver.id === currentUser.id && s.status === 'pending')
  );
  const submittedByMe = documents.filter(d => d.sender.id === currentUser.id);
  const pending = documents.filter(d => d.status === 'pending');
  const approved = documents.filter(d => d.status === 'approved' || d.status === 'archived');
  const rejected = documents.filter(d => d.status === 'rejected');

  const filteredDocs = documents
    .filter(d => {
      if (activeFilter === 'action_required') return actionRequired.some(a => a.id === d.id);
      if (activeFilter === 'submitted_by_me') return d.sender.id === currentUser.id;
      if (activeFilter === 'all') return d.status !== 'archived';
      return d.status === activeFilter;
    })
    .filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.sender.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {currentUser.name.split(' ')[0]}. {actionRequired.length > 0
            ? `You have ${actionRequired.length} document${actionRequired.length > 1 ? 's' : ''} awaiting your review.`
            : "You're all caught up."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Action Required" value={actionRequired.length} icon={Clock} variant="warning" />
        <StatsCard label="Pending" value={pending.length} icon={FileText} variant="default" />
        <StatsCard label="Approved" value={approved.length} icon={CheckCircle2} variant="success" />
        <StatsCard label="Rejected" value={rejected.length} icon={XCircle} variant="destructive" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                activeFilter === f.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
              {f.value === 'action_required' && actionRequired.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] text-warning-foreground">
                  {actionRequired.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="institutional-card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No documents found.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {activeFilter === 'action_required' ? "You're all caught up. No documents waiting for your review." :
               activeFilter === 'submitted_by_me' ? "You haven't submitted any documents yet." :
               'Try adjusting your filters or search terms.'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)
        )}
      </div>
    </div>
  );
}
