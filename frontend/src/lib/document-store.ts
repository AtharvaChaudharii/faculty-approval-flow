import { useState, useCallback, useSyncExternalStore } from 'react';
import type { Document, Placement, AuditEntry, User } from './mock-data';
import { fetchWithAuth } from './api';

let documents: Document[] = [];
let isLoaded = false;
let isLoading = false;
let loadError: string | null = null;
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
  isLoading = true;
  loadError = null;
  notify();
  try {
    const data = await fetchWithAuth('/documents');
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
    loadError = null;
  } catch (err: any) {
    console.error('Failed to load documents:', err);
    loadError = err?.message || 'Failed to load documents';
  } finally {
    isLoading = false;
    notify();
  }
}

export function useDocuments() {
  const docs = useSyncExternalStore(subscribe, getSnapshot);

  // Auto-fetch if not loaded
  if (!isLoaded && !isLoading && typeof window !== 'undefined') {
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
      throw err;
    }
  }, []);

  const bulkAction = useCallback(async (documentIds: string[], action: 'approve' | 'reject', comment?: string) => {
    try {
      const result = await fetchWithAuth('/documents/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ documentIds, action, comment }),
      });
      refreshDocuments();
      return result;
    } catch (err) {
      console.error('Bulk action failed', err);
      throw err;
    }
  }, []);

  return {
    documents: docs,
    allDocuments: docs,
    isLoading,
    isLoaded,
    loadError,
    getDoc,
    approveDocument,
    rejectDocument,
    reviseDocument,
    submitDocument,
    bulkAction,
    retry: refreshDocuments,
  };
}
