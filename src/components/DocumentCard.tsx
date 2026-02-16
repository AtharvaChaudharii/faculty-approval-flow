import { Link } from 'react-router-dom';
import { FileText, ArrowRight, Clock } from 'lucide-react';
import type { Document } from '@/lib/mock-data';
import { currentUser, roleLabels } from '@/lib/mock-data';
import StatusBadge from './StatusBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, differenceInDays } from 'date-fns';

export default function DocumentCard({ doc }: { doc: Document }) {
  const currentStep = doc.approval_chain.find(s => s.status === 'pending');
  const completedSteps = doc.approval_chain.filter(s => s.status === 'approved').length;
  const totalSteps = doc.approval_chain.length;
  const isActionRequired = doc.status === 'pending' && doc.approval_chain.some(
    s => s.approver.id === currentUser.id && s.status === 'pending'
  );

  // Calculate pending duration
  const lastActionDate = doc.audit_log?.length
    ? new Date(doc.audit_log[doc.audit_log.length - 1].timestamp)
    : new Date(doc.updated_at);
  const pendingDays = doc.status === 'pending' ? differenceInDays(new Date(), lastActionDate) : 0;

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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium leading-snug truncate pr-4 group-hover:text-primary transition-colors">
                {doc.title}
              </h3>
              {doc.version > 1 && (
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  v{doc.version}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isActionRequired && (
            <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />
          )}
          <StatusBadge status={doc.status} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={doc.sender.avatar} />
              <AvatarFallback className="text-[7px]">{doc.sender.name.split(' ').map(n => n[0]).join('').slice(0,2)}</AvatarFallback>
            </Avatar>
            {doc.sender.name}
          </span>
          <span>{doc.category}</span>
        </div>
        <div className="flex items-center gap-3">
          {pendingDays >= 2 && doc.status === 'pending' && (
            <span className="flex items-center gap-1 text-warning text-[11px]">
              <Clock className="h-3 w-3" />
              Pending {pendingDays}d
            </span>
          )}
          <span>{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Approval progress */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {doc.approval_chain.map((step) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                step.status === 'approved' ? 'bg-success' :
                step.status === 'rejected' ? 'bg-destructive' :
                step.status === 'pending' ? 'bg-warning' :
                'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {completedSteps}/{totalSteps}
        </span>
      </div>

      {currentStep && doc.status === 'pending' && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-warning">
          <ArrowRight className="h-3 w-3" />
          Awaiting {roleLabels[currentStep.approver.role]}
          {currentStep.approver.id === currentUser.id && (
            <span className="ml-1 font-semibold">(You)</span>
          )}
        </div>
      )}
    </Link>
  );
}
