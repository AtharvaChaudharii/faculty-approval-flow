import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/lib/mock-data';
import { CheckCircle2, Clock, XCircle, Archive } from 'lucide-react';

const config: Record<DocumentStatus, { className: string; icon: typeof Clock; label: string }> = {
  pending: { className: 'status-chip-pending', icon: Clock, label: 'Pending' },
  approved: { className: 'status-chip-approved', icon: CheckCircle2, label: 'Approved' },
  rejected: { className: 'status-chip-rejected', icon: XCircle, label: 'Rejected' },
  archived: { className: 'status-chip-archived', icon: Archive, label: 'Archived' },
  draft: { className: 'status-chip bg-muted text-muted-foreground', icon: Clock, label: 'Draft' },
};

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={cn(c.className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
