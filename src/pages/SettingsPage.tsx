import { useState } from 'react';
import { Pen, Upload, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentUser, roleLabels } from '@/lib/mock-data';

export default function SettingsPage() {
  const [signatures, setSignatures] = useState<{ id: string; name: string; type: 'signature' | 'stamp' }[]>([
    { id: '1', name: 'Official Signature', type: 'signature' },
    { id: '2', name: 'Department Stamp', type: 'stamp' },
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile and signature collection.</p>
      </div>

      {/* Profile */}
      <div className="institutional-card p-6">
        <h3 className="mb-4">Profile Information</h3>
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
            <p className="text-xs text-muted-foreground mt-0.5">Manage your digital signatures and stamps for document approval.</p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add New
          </Button>
        </div>

        <div className="space-y-3">
          {signatures.map((sig) => (
            <div key={sig.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-16 w-24 items-center justify-center rounded bg-muted">
                <Pen className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{sig.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{sig.type}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
