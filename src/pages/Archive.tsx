import { useState } from 'react';
import { Search, Archive as ArchiveIcon, FileText, Download, LayoutGrid, List } from 'lucide-react';
import { useDocuments } from '@/lib/document-store';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const categories = ['All', 'Academic', 'Financial', 'Administrative', 'Procurement'];

export default function Archive() {
  const { documents } = useDocuments();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All');

  const archivedDocs = documents
    .filter(d => d.status === 'archived' || d.status === 'approved')
    .filter(d => activeCategory === 'All' || d.category === activeCategory)
    .filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.sender.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1>Document Archive</h1>
        <p className="mt-1 text-muted-foreground">Browse completed and archived documents. All documents here are read-only.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeCategory === cat ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search archive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setView('grid')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView('list')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {archivedDocs.length === 0 ? (
        <div className="institutional-card p-16 text-center">
          <ArchiveIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No archived documents found.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Documents appear here after receiving final approval.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {archivedDocs.map((doc) => (
            <Link key={doc.id} to={`/document/${doc.id}`} className="institutional-card p-5 group animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{doc.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
              <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{doc.sender.name}</span>
                <span>{format(new Date(doc.updated_at), 'MMM d, yyyy')}</span>
              </div>
              {doc.version > 1 && (
                <p className="mt-2 text-[10px] text-muted-foreground">Version {doc.version}</p>
              )}
              <div className="mt-3 flex items-center gap-1.5">
                {doc.approval_chain.map((step) => (
                  <div key={step.id} className="h-1.5 flex-1 rounded-full bg-success" />
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {archivedDocs.map((doc) => (
            <Link key={doc.id} to={`/document/${doc.id}`} className="institutional-card flex items-center gap-4 p-4 group animate-fade-in">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.sender.name} • {doc.category} • v{doc.version} • {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                </p>
              </div>
              <StatusBadge status={doc.status} />
              <div className="flex items-center gap-1 w-20">
                {doc.approval_chain.map((step) => (
                  <div key={step.id} className="h-1.5 flex-1 rounded-full bg-success" />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
