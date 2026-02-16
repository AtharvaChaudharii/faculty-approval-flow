import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, FileText, Check, X, User, Clock, CheckCircle2, XCircle, Sparkles, Download, Pen, Move, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockDocuments, currentUser, roleLabels } from '@/lib/mock-data';
import type { Placement, SignatureItem } from '@/lib/mock-data';
import { useSignatures } from '@/lib/signature-store';
import StatusBadge from '@/components/StatusBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type ReviewPhase = 'idle' | 'gallery' | 'placing' | 'placed';

export default function DocumentReview() {
  const { id } = useParams();
  const doc = mockDocuments.find(d => d.id === id);
  const { signatures } = useSignatures();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null);
  const [phase, setPhase] = useState<ReviewPhase>('idle');
  const [selectedSig, setSelectedSig] = useState<SignatureItem | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  const handleSelectSignature = (sig: SignatureItem) => {
    setSelectedSig(sig);
    setPhase('placing');
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'placing' || !selectedSig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlacements(prev => [...prev, {
      id: `p-${Date.now()}`,
      signatureId: selectedSig.id,
      x, y,
    }]);
    setPhase('placed');
    setSelectedSig(null);
  };

  const handleMouseDown = (e: React.MouseEvent, placementId: string) => {
    if (actionTaken) return;
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 });
    setDragging(placementId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    setPlacements(prev => prev.map(p => p.id === dragging ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p));
  };

  const handleMouseUp = () => setDragging(null);

  const removePlacement = (id: string) => {
    setPlacements(prev => prev.filter(p => p.id !== id));
  };

  const handleConfirmSign = () => {
    setActionTaken('approved');
    setPhase('idle');
  };

  const getSignatureById = (sigId: string) => signatures.find(s => s.id === sigId);
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="max-w-6xl animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl">{doc.title}</h1>
            <StatusBadge status={actionTaken ? actionTaken : doc.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={doc.sender.avatar} />
                <AvatarFallback className="text-[8px]">{initials(doc.sender.name)}</AvatarFallback>
              </Avatar>
              {doc.sender.name}
            </span>
            <span>{doc.category}</span>
            <span>Version {doc.version}</span>
            <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" /> Download PDF
        </Button>
      </div>

      {/* Banners */}
      {actionTaken && (
        <div className={cn('mb-6 rounded-lg p-4 flex items-center gap-3 animate-fade-in', actionTaken === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
          {actionTaken === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <p className="text-sm font-medium">{actionTaken === 'approved' ? 'Document approved and signed successfully.' : 'Document has been rejected.'}</p>
        </div>
      )}
      {phase === 'placing' && (
        <div className="mb-6 rounded-lg p-4 flex items-center gap-3 bg-primary/5 text-primary animate-fade-in">
          <Move className="h-5 w-5" />
          <p className="text-sm font-medium">Click on the document to place your {selectedSig?.type || 'signature'}.</p>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setPhase(placements.length > 0 ? 'placed' : 'idle'); setSelectedSig(null); }}>Cancel</Button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left - AI Summary + Approval Chain */}
        <div className="lg:col-span-3 space-y-4">
          <div className="institutional-card p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" /> AI Summary
            </div>
            <p className="text-sm leading-relaxed">{doc.summary}</p>
          </div>

          <div className="institutional-card p-5">
            <h4 className="text-sm font-medium mb-4">Approval Chain</h4>
            <div className="space-y-3">
              {doc.approval_chain.map((step, i) => {
                const stepStatus = actionTaken && step.approver.id === currentUser.id ? actionTaken : step.status;
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Avatar className={cn('h-7 w-7 ring-2', stepStatus === 'approved' ? 'ring-success/30' : stepStatus === 'rejected' ? 'ring-destructive/30' : stepStatus === 'pending' ? 'ring-warning/30' : 'ring-muted')}>
                        <AvatarImage src={step.approver.avatar} />
                        <AvatarFallback className={cn('text-[9px] font-semibold', stepStatus === 'approved' ? 'bg-success/10 text-success' : stepStatus === 'rejected' ? 'bg-destructive/10 text-destructive' : stepStatus === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground')}>
                          {stepStatus === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepStatus === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : stepStatus === 'pending' ? <Clock className="h-3.5 w-3.5" /> : initials(step.approver.name)}
                        </AvatarFallback>
                      </Avatar>
                      {i < doc.approval_chain.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium">{step.approver.name}</p>
                      <p className="text-[11px] text-muted-foreground">{roleLabels[step.approver.role]}</p>
                      {step.acted_at && <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(step.acted_at), 'MMM d, h:mm a')}</p>}
                      {step.comment && <p className="mt-1 text-xs text-destructive bg-destructive/5 rounded px-2 py-1">"{step.comment}"</p>}
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
            className={cn('institutional-card aspect-[3/4] flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden select-none', phase === 'placing' && 'cursor-crosshair ring-2 ring-primary/30')}
            onClick={handlePdfClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <FileText className="h-16 w-16 text-muted-foreground/20" />
            <p className="mt-4 text-sm text-muted-foreground">PDF Viewer</p>
            <p className="mt-1 text-xs text-muted-foreground/60">{doc.file_name}</p>

            {/* Placed signatures/stamps */}
            {placements.map((p) => {
              const sig = getSignatureById(p.signatureId);
              return (
                <div
                  key={p.id}
                  className={cn('absolute group', !actionTaken && 'cursor-grab active:cursor-grabbing')}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => handleMouseDown(e, p.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded border-2 border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 relative">
                    {sig?.preview ? (
                      <img src={sig.preview} alt={sig.name} className="h-8 w-auto max-w-[80px] object-contain" />
                    ) : (
                      <>
                        <p className="text-[10px] font-semibold text-primary whitespace-nowrap">{currentUser.name}</p>
                        <p className="text-[8px] text-primary/60">{sig?.type === 'stamp' ? 'STAMP' : roleLabels[currentUser.role]}</p>
                      </>
                    )}
                    {!actionTaken && (
                      <button
                        className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); removePlacement(p.id); }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {!actionTaken && (
                      <GripVertical className="absolute -left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="lg:col-span-3 space-y-4">
          {canAct && (phase === 'idle' || phase === 'placed') && (
            <div className="institutional-card p-5 space-y-4">
              <h4 className="text-sm font-medium">Your Action</h4>
              <p className="text-xs text-muted-foreground">
                {placements.length > 0
                  ? `${placements.length} placement${placements.length > 1 ? 's' : ''} on document. Add more or confirm.`
                  : 'Select a signature or stamp to place on the document.'}
              </p>

              {placements.length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <Avatar className="h-8 w-8 mx-auto mb-1">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="text-[10px]">{initials(currentUser.name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-semibold">{currentUser.name}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabels[currentUser.role]}</p>
                </div>
              )}

              <div className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => setPhase('gallery')}>
                  <Pen className="h-4 w-4 mr-1.5" /> {placements.length > 0 ? 'Add Another Signature' : 'Place Signature & Approve'}
                </Button>
                {placements.length > 0 && (
                  <Button className="w-full" onClick={handleConfirmSign}>
                    <Check className="h-4 w-4 mr-1.5" /> Confirm & Approve
                  </Button>
                )}
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={() => setShowRejectModal(true)}>
                  <X className="h-4 w-4 mr-1.5" /> Reject
                </Button>
              </div>
            </div>
          )}

          {phase === 'placing' && canAct && (
            <div className="institutional-card p-5 space-y-3 animate-fade-in">
              <h4 className="text-sm font-medium">Placing: {selectedSig?.name}</h4>
              <p className="text-xs text-muted-foreground">Click anywhere on the document to place it.</p>
            </div>
          )}

          {!canAct && !actionTaken && phase === 'idle' && (
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
              <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{doc.category}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Version</dt><dd>v{doc.version}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Submitted</dt><dd>{format(new Date(doc.created_at), 'MMM d, yyyy')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Last Updated</dt><dd>{format(new Date(doc.updated_at), 'MMM d, yyyy')}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      {/* Signature Gallery Sheet */}
      <Sheet open={phase === 'gallery'} onOpenChange={(open) => { if (!open) setPhase(placements.length > 0 ? 'placed' : 'idle'); }}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Select Signature or Stamp</SheetTitle>
            <SheetDescription>Choose from your uploaded signatures and stamps to place on this document.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {signatures.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Pen className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No signatures yet.</p>
                  <Link to="/settings" className="text-xs text-primary hover:underline mt-1 inline-block">Upload in Profile</Link>
                </div>
              ) : (
                signatures.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => handleSelectSignature(sig)}
                    className="flex flex-col items-center gap-2 rounded-lg border p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
                  >
                    <div className="flex h-14 w-full items-center justify-center rounded bg-muted overflow-hidden">
                      {sig.preview ? (
                        <img src={sig.preview} alt={sig.name} className="h-full w-full object-contain p-1" />
                      ) : sig.type === 'stamp' ? (
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      ) : (
                        <Pen className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium truncate max-w-full">{sig.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{sig.type}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>Please provide a reason for rejection. The sender will be notified.</DialogDescription>
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
            <Button variant="destructive" onClick={() => { setShowRejectModal(false); setActionTaken('rejected'); }}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
