import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, FileText, Check, X, User, Clock, CheckCircle2, XCircle, Sparkles, Download, Pen, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockDocuments, currentUser, roleLabels } from '@/lib/mock-data';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

type ReviewPhase = 'idle' | 'signing' | 'placed';

export default function DocumentReview() {
  const { id } = useParams();
  const doc = mockDocuments.find(d => d.id === id);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null);
  const [sigPhase, setSigPhase] = useState<ReviewPhase>('idle');
  const [sigPosition, setSigPosition] = useState({ x: 60, y: 75 });

  if (!doc) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">Document not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isCurrentApprover = doc.approval_chain.some(
    s => s.approver.id === currentUser.id && s.status === 'pending'
  );
  const canAct = isCurrentApprover && doc.status === 'pending' && !actionTaken;

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sigPhase !== 'signing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSigPosition({ x, y });
    setSigPhase('placed');
  };

  const handleConfirmSign = () => {
    setActionTaken('approved');
    setSigPhase('idle');
  };

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl">{doc.title}</h1>
            <StatusBadge status={actionTaken ? actionTaken : doc.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{doc.sender.name}</span>
            <span>{doc.category}</span>
            <span>Version {doc.version}</span>
            <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          Download PDF
        </Button>
      </div>

      {/* Action taken banner */}
      {actionTaken && (
        <div className={cn(
          'mb-6 rounded-lg p-4 flex items-center gap-3 animate-fade-in',
          actionTaken === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        )}>
          {actionTaken === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">
            {actionTaken === 'approved' ? 'Document approved and signed successfully.' : 'Document has been rejected.'}
          </p>
        </div>
      )}

      {/* Signing instruction banner */}
      {sigPhase === 'signing' && (
        <div className="mb-6 rounded-lg p-4 flex items-center gap-3 bg-primary/5 text-primary animate-fade-in">
          <Move className="h-5 w-5" />
          <p className="text-sm font-medium">Click on the document to place your signature.</p>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSigPhase('idle')}>Cancel</Button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left - AI Summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="institutional-card p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              AI Summary
            </div>
            <p className="text-sm leading-relaxed">{doc.summary}</p>
          </div>

          {/* Approval Chain */}
          <div className="institutional-card p-5">
            <h4 className="text-sm font-medium mb-4">Approval Chain</h4>
            <div className="space-y-3">
              {doc.approval_chain.map((step, i) => {
                const stepStatus = actionTaken && step.approver.id === currentUser.id
                  ? actionTaken
                  : step.status;
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold',
                        stepStatus === 'approved' ? 'bg-success/10 text-success' :
                        stepStatus === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        stepStatus === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {stepStatus === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         stepStatus === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> :
                         stepStatus === 'pending' ? <Clock className="h-3.5 w-3.5" /> :
                         i + 1}
                      </div>
                      {i < doc.approval_chain.length - 1 && (
                        <div className="w-px h-4 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium">{step.approver.name}</p>
                      <p className="text-[11px] text-muted-foreground">{roleLabels[step.approver.role]}</p>
                      {step.acted_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(step.acted_at), 'MMM d, h:mm a')}
                        </p>
                      )}
                      {step.comment && (
                        <p className="mt-1 text-xs text-destructive bg-destructive/5 rounded px-2 py-1">
                          "{step.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - PDF Viewer */}
        <div className="lg:col-span-6">
          <div
            className={cn(
              'institutional-card aspect-[3/4] flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden',
              sigPhase === 'signing' && 'cursor-crosshair ring-2 ring-primary/30'
            )}
            onClick={handlePdfClick}
          >
            <FileText className="h-16 w-16 text-muted-foreground/20" />
            <p className="mt-4 text-sm text-muted-foreground">PDF Viewer</p>
            <p className="mt-1 text-xs text-muted-foreground/60">{doc.file_name}</p>

            {/* Signature preview overlay */}
            {(sigPhase === 'placed' || actionTaken === 'approved') && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${sigPosition.x}%`, top: `${sigPosition.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="rounded border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-2">
                  <p className="text-[10px] font-semibold text-primary whitespace-nowrap">{currentUser.name}</p>
                  <p className="text-[8px] text-primary/60">{roleLabels[currentUser.role]}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="lg:col-span-3 space-y-4">
          {canAct && sigPhase === 'idle' && (
            <div className="institutional-card p-5 space-y-4">
              <h4 className="text-sm font-medium">Your Action</h4>
              <p className="text-xs text-muted-foreground">
                This document is awaiting your review. Approve with signature placement or reject with comments.
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setSigPhase('signing')}>
                  <Pen className="h-4 w-4 mr-1.5" />
                  Place Signature & Approve
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={() => setShowRejectModal(true)}>
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {canAct && sigPhase === 'placed' && (
            <div className="institutional-card p-5 space-y-4 animate-fade-in">
              <h4 className="text-sm font-medium">Confirm Signature</h4>
              <p className="text-xs text-muted-foreground">
                Your signature has been placed on the document. Confirm to finalize your approval.
              </p>
              <div className="rounded-lg border bg-muted/50 p-3 text-center">
                <p className="text-xs font-semibold">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabels[currentUser.role]}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={handleConfirmSign}>
                  <Check className="h-4 w-4 mr-1.5" />
                  Confirm & Approve
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setSigPhase('signing')}>
                  Reposition
                </Button>
              </div>
            </div>
          )}

          {!canAct && !actionTaken && sigPhase === 'idle' && (
            <div className="institutional-card p-5">
              <p className="text-sm text-muted-foreground">
                {isCurrentApprover ? 'You have already acted on this document.' : 'No action required from you at this time.'}
              </p>
            </div>
          )}

          {/* Document info */}
          <div className="institutional-card p-5">
            <h4 className="text-sm font-medium mb-3">Details</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd>{doc.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd>v{doc.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{format(new Date(doc.created_at), 'MMM d, yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd>{format(new Date(doc.updated_at), 'MMM d, yyyy')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. The sender will be notified.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            placeholder="Add comments for the sender..."
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRejectModal(false);
                setActionTaken('rejected');
              }}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
