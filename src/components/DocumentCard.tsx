import { Link } from 'react-router-dom';
import { FileText, ArrowRight, User } from 'lucide-react';
import type { Document } from '@/lib/mock-data';
import { roleLabels } from '@/lib/mock-data';
import StatusBadge from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentCard({ doc }: { doc: Document }) {
  const currentStep = doc.approval_chain.find(s => s.status === 'pending');
  const completedSteps = doc.approval_chain.filter(s => s.status === 'approved').length;
  const totalSteps = doc.approval_chain.length;

  return (
    <Link
      to={`/document/${doc.id}`}
      className="institutional-card block p-5 group animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-snug truncate pr-4 group-hover:text-primary transition-colors">
              {doc.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {doc.sender.name}
          </span>
          <span>{doc.category}</span>
          <span>v{doc.version}</span>
        </div>
        <span>{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
      </div>

      {/* Approval progress */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {completedSteps}/{totalSteps}
        </span>
      </div>

      {currentStep && doc.status === 'pending' && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-warning">
          <ArrowRight className="h-3 w-3" />
          Awaiting {roleLabels[currentStep.approver.role]}
        </div>
      )}
    </Link>
  );
}
