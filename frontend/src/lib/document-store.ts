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
      created_at: d.createdAt || d.created_at,
      updated_at: d.updatedAt || d.updated_at,
      approval_chain: (d.approvalChain || d.approval_chain || []).map((step: any) => ({
         ...step,
         approver: step.approver,
         order_index: step.orderIndex ?? step.order_index,
         acted_at: step.actedAt ?? step.acted_at,
      })),
      audit_log: (d.auditLog || d.audit_log || []).map((audit: any) => ({
         ...audit,
         actor: audit.actor
      })),
      version_history: (d.versionHistory || d.version_history || [])?.map((ver: any) => ({
         ...ver,
         file_name: ver.fileName ?? ver.file_name,
         uploaded_at: ver.uploadedAt ?? ver.uploaded_at
      })) || [],
      file_name: d.fileName ?? d.file_name
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
      throw err;
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
      throw err;
    }
  }, []);

  const reviseDocument = useCallback(async (docId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await fetchWithAuth(`/documents/${docId}/revise`, {
        method: 'POST',
        body: formData,
      });
      refreshDocuments();
    } catch (err) {
      console.error('Revision failed', err);
      throw err;
    }
  }, []);

  const submitDocument = useCallback(async (newDocData: any) => {
    // newDocData might contain File, mapped to FormData
    try {
      const formData = new FormData();
      formData.append('file', newDocData.file);
      formData.append('category', newDocData.category);
      if (newDocData.title) formData.append('title', newDocData.title);
      if (newDocData.summary) formData.append('summary', newDocData.summary);
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
