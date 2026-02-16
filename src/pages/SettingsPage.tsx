import { useState, useRef } from 'react';
import { Pen, Trash2, Plus, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentUser, roleLabels } from '@/lib/mock-data';
import { useSignatures } from '@/lib/signature-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signatures, addSignature, removeSignature } = useSignatures();
  const [addingType, setAddingType] = useState<'signature' | 'stamp' | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !addingType) return;
    const reader = new FileReader();
    reader.onload = () => {
      addSignature({
        id: Date.now().toString(),
        name: file.name.replace(/\.[^.]+$/, ''),
        type: addingType,
        preview: reader.result as string,
      });
      setAddingType(null);
      toast({ title: `${addingType === 'signature' ? 'Signature' : 'Stamp'} added successfully.` });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    removeSignature(id);
    toast({ title: 'Removed successfully.' });
  };

  const startUpload = (type: 'signature' | 'stamp') => {
    setAddingType(type);
    fileInputRef.current?.click();
  };

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1>Profile & Signatures</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile and signature collection.</p>
      </div>

      {/* Profile */}
      <div className="institutional-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3>{currentUser.name}</h3>
            <p className="text-sm text-muted-foreground">{roleLabels[currentUser.role]} · {currentUser.department}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Full Name</label>
            <p className="text-sm font-medium mt-0.5">{currentUser.name}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <p className="text-sm font-medium mt-0.5">{currentUser.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <p className="text-sm font-medium mt-0.5">{roleLabels[currentUser.role]}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Department</label>
            <p className="text-sm font-medium mt-0.5">{currentUser.department}</p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="institutional-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3>Signature & Stamp Gallery</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Upload digital signatures and stamps for document approval.</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleFileUpload} className="hidden" />
        <div className="space-y-3">
          {signatures.map((sig) => (
            <div key={sig.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-16 w-24 items-center justify-center rounded bg-muted overflow-hidden">
                {sig.preview ? (
                  <img src={sig.preview} alt={sig.name} className="h-full w-full object-contain" />
                ) : (
                  <Pen className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{sig.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{sig.type}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(sig.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => startUpload('signature')}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Signature
          </Button>
          <Button variant="outline" size="sm" onClick={() => startUpload('stamp')}>
            <Image className="h-4 w-4 mr-1.5" /> Add Stamp
          </Button>
        </div>
      </div>
    </div>
  );
}
