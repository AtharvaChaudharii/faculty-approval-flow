import { useState } from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Search, RefreshCw, AlertTriangle, Check, X, Filter } from 'lucide-react';
import { useCurrentUser } from '@/lib/auth-store';
import type { DocumentStatus } from '@/lib/mock-data';
import { useDocuments } from '@/lib/document-store';
import DocumentCard from '@/components/DocumentCard';
import StatsCard from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const allFilters: { label: string; value: DocumentStatus | 'all' | 'action_required' | 'submitted_by_me'; hideForRoles?: string[] }[] = [
  { label: 'All', value: 'all' },
  { label: 'Action Required', value: 'action_required' },
  { label: 'Submitted by Me', value: 'submitted_by_me', hideForRoles: ['director'] },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const CATEGORIES = ['All', 'Academic', 'Financial', 'Administrative', 'Procurement', 'General'];

function SkeletonCard() {
  return (
    <div className="institutional-card p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="institutional-card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-6 w-8 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { documents, isLoading, isLoaded, loadError, retry, bulkAction } = useDocuments();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const filters = allFilters.filter(f => !f.hideForRoles?.includes(currentUser.role));
  const actionRequired = documents.filter(
    (d) => d.status === 'pending' && d.approval_chain.some(s => s.approver.id === currentUser.id && s.status === 'pending')
  );
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
    .filter(d => categoryFilter === 'All' || d.category === categoryFilter)
    .filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.sender.name.toLowerCase().includes(search.toLowerCase()));

  // Only docs the user can act on are selectable for bulk
  const selectableDocs = filteredDocs.filter(d =>
    d.status === 'pending' && d.approval_chain.some(s => s.approver.id === currentUser.id && s.status === 'pending')
  );

  const toggleSelect = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === selectableDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(selectableDocs.map(d => d.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedDocs.size === 0) return;
    setBulkProcessing(true);
    try {
      const result = await bulkAction(Array.from(selectedDocs), action);
      toast({
        title: `Bulk ${action}: ${result.summary.succeeded} succeeded, ${result.summary.failed} failed`,
        variant: result.summary.failed > 0 ? 'destructive' : 'default',
      });
      setSelectedDocs(new Set());
    } catch {
      toast({ title: `Bulk ${action} failed.`, variant: 'destructive' });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Error state with retry
  if (loadError && !isLoaded) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Welcome back, {currentUser.name.split(' ')[0]}.</p>
        </div>
        <div className="institutional-card p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
          <p className="mt-3 text-sm font-medium">Failed to load documents</p>
          <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1>Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {currentUser.name.split(' ')[0]}. {!isLoading && isLoaded && (actionRequired.length > 0
            ? `You have ${actionRequired.length} document${actionRequired.length > 1 ? 's' : ''} awaiting your review.`
            : "You're all caught up.")}
        </p>
      </div>

      {/* Stats */}
      {isLoading && !isLoaded ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard label="Action Required" value={actionRequired.length} icon={Clock} variant="warning" />
          <StatsCard label="Pending" value={pending.length} icon={FileText} variant="default" />
          <StatsCard label="Approved" value={approved.length} icon={CheckCircle2} variant="success" />
          <StatsCard label="Rejected" value={rejected.length} icon={XCircle} variant="destructive" />
        </div>
      )}

      {/* Filters + Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
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
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn(showFilters && 'bg-muted')}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Filters
            </Button>
          </div>
          {loadError && isLoaded && (
            <Button variant="ghost" size="sm" className="text-warning" onClick={retry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          )}
        </div>

        {/* Category filter row */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-xs text-muted-foreground font-medium">Category:</span>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md border transition-colors',
                  categoryFilter === cat
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectableDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <div className={cn(
              'h-4 w-4 rounded border flex items-center justify-center transition-colors',
              selectedDocs.size === selectableDocs.length ? 'bg-primary border-primary' : 'border-muted-foreground/40'
            )}>
              {selectedDocs.size === selectableDocs.length && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            {selectedDocs.size > 0 ? `${selectedDocs.size} selected` : 'Select all'}
          </button>
          {selectedDocs.size > 0 && (
            <>
              <Button size="sm" disabled={bulkProcessing} onClick={() => handleBulkAction('approve')}>
                <Check className="h-3.5 w-3.5 mr-1" /> Approve ({selectedDocs.size})
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" disabled={bulkProcessing} onClick={() => handleBulkAction('reject')}>
                <X className="h-3.5 w-3.5 mr-1" /> Reject ({selectedDocs.size})
              </Button>
            </>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {isLoading && !isLoaded ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredDocs.length === 0 ? (
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
          filteredDocs.map((doc) => {
            const isSelectable = selectableDocs.some(d => d.id === doc.id);
            return (
              <div key={doc.id} className="flex items-start gap-2">
                {selectableDocs.length > 0 && (
                  <button
                    onClick={() => isSelectable && toggleSelect(doc.id)}
                    className={cn('mt-5 shrink-0', !isSelectable && 'opacity-0 pointer-events-none')}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                      selectedDocs.has(doc.id) ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
                    )}>
                      {selectedDocs.has(doc.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                )}
                <div className="flex-1">
                  <DocumentCard doc={doc} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
