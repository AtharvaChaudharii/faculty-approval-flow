import { useState } from 'react';
import { Upload, FileText, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { roleLabels, currentUser, users } from '@/lib/mock-data';
import type { UserRole, Document } from '@/lib/mock-data';
import { useDocuments } from '@/lib/document-store';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const availableApprovers = users.filter(u => u.id !== currentUser.id);

type UploadStep = 'upload' | 'analysis' | 'chain' | 'confirm';

export default function UploadDocument() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submitDocument } = useDocuments();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [aiTitle, setAiTitle] = useState('');
  const [aiSummary, setAiSummary] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') {
      setFile(f);
      simulateAnalysis(f.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      simulateAnalysis(f.name);
    }
  };

  const simulateAnalysis = (fileName: string) => {
    setStep('analysis');
    setTimeout(() => {
      setAiTitle('Revised Curriculum Framework for Data Science Track');
      setAiSummary(
        'This document proposes modifications to the existing data science curriculum, including the addition of two new elective courses focused on applied machine learning and statistical modeling. The proposal includes faculty requirements, lab infrastructure needs, and a phased implementation timeline.'
      );
      setStep('chain');
    }, 2000);
  };

  const toggleApprover = (id: string) => {
    setSelectedApprovers(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!file || selectedApprovers.length === 0) return;

    const now = new Date().toISOString();
    const docId = `doc-${Date.now()}`;
    const approvers = selectedApprovers.map(id => users.find(u => u.id === id)!);

    const newDoc: Document = {
      id: docId,
      title: aiTitle,
      summary: aiSummary,
      sender: currentUser,
      status: 'pending',
      created_at: now,
      updated_at: now,
      version: 1,
      category: 'Academic',
      file_name: file.name,
      approval_chain: approvers.map((a, i) => ({
        id: `${docId}-s${i}`,
        approver: a,
        order_index: i,
        status: i === 0 ? 'pending' as const : 'waiting' as const,
      })),
      audit_log: [{
        id: `${docId}-audit-1`,
        action: 'submitted',
        actor: currentUser,
        timestamp: now,
        version: 1,
      }],
      version_history: [{
        version: 1,
        file_name: file.name,
        uploaded_at: now,
        uploaded_by: currentUser,
      }],
    };

    submitDocument(newDoc);
    setStep('confirm');
  };

  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success/10">
          <Check className="h-8 w-8 text-success" />
        </div>
        <h2 className="mt-6">Document Submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your document has been submitted for approval. The first approver has been notified.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
          <Button onClick={() => { setStep('upload'); setFile(null); setSelectedApprovers([]); setAiTitle(''); setAiSummary(''); }}>
            Upload Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1>Upload Document</h1>
        <p className="mt-1 text-muted-foreground">Upload your document and define the approval order.</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {(['upload', 'analysis', 'chain'] as UploadStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px]',
              step === s ? 'bg-primary text-primary-foreground' :
              (['upload', 'analysis', 'chain'].indexOf(step) > i) ? 'bg-success text-success-foreground' :
              'bg-muted text-muted-foreground'
            )}>
              {(['upload', 'analysis', 'chain'].indexOf(step) > i) ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn(step === s ? 'text-foreground' : 'text-muted-foreground')}>
              {s === 'upload' ? 'Upload PDF' : s === 'analysis' ? 'AI Analysis' : 'Approval Chain'}
            </span>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'institutional-card flex flex-col items-center justify-center p-16 border-2 border-dashed transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium">Drag & drop your PDF here</p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse • PDF files only</p>
          <input id="file-input" type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {/* Analysis */}
      {step === 'analysis' && (
        <div className="institutional-card p-8 text-center animate-fade-in">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/5">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium">Analyzing document...</p>
          <p className="mt-1 text-xs text-muted-foreground">Extracting text and generating AI summary</p>
          <div className="mt-6 flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {file?.name}
          </div>
        </div>
      )}

      {/* Chain builder */}
      {step === 'chain' && (
        <div className="space-y-6 animate-fade-in">
          <div className="institutional-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-Generated
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Title</label>
              <input
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Summary</label>
              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div className="institutional-card p-5">
            <h3 className="mb-1">Approval Chain</h3>
            <p className="text-xs text-muted-foreground mb-4">Select approvers in hierarchical order. Documents will be routed sequentially.</p>
            <div className="space-y-2">
              {availableApprovers.map((a) => {
                const isSelected = selectedApprovers.includes(a.id);
                const order = selectedApprovers.indexOf(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleApprover(a.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {isSelected ? order + 1 : ''}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{roleLabels[a.role]}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={selectedApprovers.length === 0}>Submit for Approval</Button>
          </div>
        </div>
      )}
    </div>
  );
}
