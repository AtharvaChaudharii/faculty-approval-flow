import { useState, useCallback, useSyncExternalStore } from 'react';
import type { Document, Placement, AuditEntry, User } from './mock-data';
import { fetchWithAuth } from './api';

let documents: Document[] = [];
let isLoaded = false;
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

// Background poller/fetcher
export async function refreshDocuments() {
  try {
    const data = await fetchWithAuth('/documents');
    // Map Prisma schema format back to what the frontend expects if necessary:
    // Our Prisma schema creates camelCase nested models, and mock-data uses some snake_case.
    // Let's coerce them for frontend compatibility without rewriting the entire frontend.
    documents = data.map((d: any) => ({
      ...d,
      sender: d.sender,
      approval_chain: d.approvalChain.map((step: any) => ({
         ...step,
         approver: step.approver,
         order_index: step.orderIndex,
         acted_at: step.actedAt,
      })),
      audit_log: d.auditLog.map((audit: any) => ({
         ...audit,
         actor: audit.actor
      })),
      version_history: d.versionHistory?.map((ver: any) => ({
         ...ver,
         file_name: ver.fileName,
         uploaded_at: ver.uploadedAt
      })) || [],
      file_name: d.fileName
    }));
    isLoaded = true;
    notify();
  } catch (err) {
    console.error('Failed to load documents:', err);
  }
}

export function useDocuments() {
  const docs = useSyncExternalStore(subscribe, getSnapshot);

  // Auto-fetch if not loaded
  if (!isLoaded && typeof window !== 'undefined') {
    refreshDocuments();
  }

  const getDoc = useCallback((id: string) => docs.find(d => d.id === id), [docs]);

  const approveDocument = useCallback(async (docId: string, placements: Placement[]) => {
    try {
      await fetchWithAuth(`/documents/${docId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ placements })
      });
      refreshDocuments();
    } catch (err) {
      console.error('Approval failed', err);
    }
  }, []);

  const rejectDocument = useCallback(async (docId: string, comment: string) => {
    try {
      await fetchWithAuth(`/documents/${docId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      refreshDocuments();
    } catch (err) {
      console.error('Rejection failed', err);
    }
  }, []);

  const reviseDocument = useCallback((docId: string, newFileName: string) => {
    // Left as stub for now, would typically be a multipart/form-data POST
    console.warn("Revise document not fully implemented in API yet");
    refreshDocuments();
  }, []);

  const submitDocument = useCallback(async (newDocData: any) => {
    // newDocData might contain File, mapped to FormData
    try {
      const formData = new FormData();
      formData.append('file', newDocData.file);
      formData.append('category', newDocData.category);
      formData.append('approvalChainIds', JSON.stringify(newDocData.approvalChain.map((s:any) => s.approver.id)));

      await fetchWithAuth('/documents', {
        method: 'POST',
        body: formData
      });
      refreshDocuments();
    } catch (err) {
      console.error('Submission failed', err);
    }
  }, []);

  return {
    documents: docs, // API already filters visible docs based on token!
    allDocuments: docs,
    getDoc,
    approveDocument,
    rejectDocument,
    reviseDocument,
    submitDocument,
  };
}
