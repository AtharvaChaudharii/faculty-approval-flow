import { useState, useCallback, useSyncExternalStore } from 'react';
import type { Document, Placement, AuditEntry, User } from './mock-data';
import { initialMockDocuments, currentUser } from './mock-data';

// Deep clone to avoid mutation issues
let documents: Document[] = JSON.parse(JSON.stringify(initialMockDocuments));
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function getSnapshot() {
  return documents;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useDocuments() {
  const docs = useSyncExternalStore(subscribe, getSnapshot);

  const getDoc = useCallback((id: string) => docs.find(d => d.id === id), [docs]);

  const approveDocument = useCallback((docId: string, placements: Placement[]) => {
    documents = documents.map(doc => {
      if (doc.id !== docId) return doc;

      const now = new Date().toISOString();
      const updatedChain = doc.approval_chain.map((step, i, arr) => {
        if (step.approver.id === currentUser.id && step.status === 'pending') {
          return { ...step, status: 'approved' as const, acted_at: now, placements };
        }
        // Advance next waiting step to pending
        if (step.status === 'waiting') {
          const prevStep = arr[i - 1];
          const prevApproved = prevStep?.approver.id === currentUser.id;
          if (prevApproved || (prevStep?.status === 'approved' && i === arr.findIndex(s => s.status === 'waiting'))) {
            return { ...step, status: 'pending' as const };
          }
        }
        return step;
      });

      // Check if all approved (final approval)
      const allApproved = updatedChain.every(s => s.status === 'approved');
      const newStatus = allApproved ? 'approved' as const : doc.status;

      const auditEntry: AuditEntry = {
        id: `audit-${Date.now()}`,
        action: 'approved',
        actor: currentUser,
        timestamp: now,
        details: `Approved by ${currentUser.name}`,
      };

      const archiveEntry: AuditEntry[] = allApproved ? [{
        id: `audit-${Date.now()}-archive`,
        action: 'archived',
        actor: currentUser,
        timestamp: now,
        details: 'Auto-archived after final approval',
      }] : [];

      return {
        ...doc,
        approval_chain: updatedChain,
        status: allApproved ? 'archived' as const : newStatus,
        updated_at: now,
        audit_log: [...doc.audit_log, auditEntry, ...archiveEntry],
      };
    });
    notify();
  }, []);

  const rejectDocument = useCallback((docId: string, comment: string) => {
    documents = documents.map(doc => {
      if (doc.id !== docId) return doc;

      const now = new Date().toISOString();
      const updatedChain = doc.approval_chain.map(step => {
        if (step.approver.id === currentUser.id && step.status === 'pending') {
          return { ...step, status: 'rejected' as const, acted_at: now, comment };
        }
        return step;
      });

      const auditEntry: AuditEntry = {
        id: `audit-${Date.now()}`,
        action: 'rejected',
        actor: currentUser,
        timestamp: now,
        details: comment,
      };

      return {
        ...doc,
        approval_chain: updatedChain,
        status: 'rejected' as const,
        updated_at: now,
        audit_log: [...doc.audit_log, auditEntry],
      };
    });
    notify();
  }, []);

  const reviseDocument = useCallback((docId: string, newFileName: string) => {
    documents = documents.map(doc => {
      if (doc.id !== docId) return doc;

      const now = new Date().toISOString();
      const newVersion = doc.version + 1;

      // Reset all approval steps
      const resetChain = doc.approval_chain.map((step, i) => ({
        ...step,
        status: (i === 0 ? 'pending' : 'waiting') as 'pending' | 'waiting',
        acted_at: undefined,
        comment: undefined,
        placements: undefined,
      }));

      const auditEntry: AuditEntry = {
        id: `audit-${Date.now()}`,
        action: 'revised',
        actor: currentUser,
        timestamp: now,
        version: newVersion,
        details: `Uploaded revised version ${newVersion}`,
      };

      return {
        ...doc,
        version: newVersion,
        file_name: newFileName,
        status: 'pending' as const,
        updated_at: now,
        approval_chain: resetChain,
        audit_log: [...doc.audit_log, auditEntry],
        version_history: [
          ...doc.version_history,
          { version: newVersion, file_name: newFileName, uploaded_at: now, uploaded_by: currentUser },
        ],
      };
    });
    notify();
  }, []);

  const submitDocument = useCallback((newDoc: Document) => {
    documents = [...documents, newDoc];
    notify();
  }, []);

  // Role-based visibility: only docs where user is sender or in chain
  const visibleDocs = docs.filter(d =>
    d.sender.id === currentUser.id ||
    d.approval_chain.some(s => s.approver.id === currentUser.id)
  );

  return {
    documents: visibleDocs,
    allDocuments: docs,
    getDoc,
    approveDocument,
    rejectDocument,
    reviseDocument,
    submitDocument,
  };
}
