import { useState, useCallback, useEffect } from 'react';
import type { SignatureItem } from './mock-data';
import { fetchWithAuth } from './api';

let globalSignatures: SignatureItem[] = [];
let isLoaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

async function loadSignatures() {
  try {
    const data = await fetchWithAuth('/signatures');
    globalSignatures = data;
    isLoaded = true;
    notify();
  } catch (err) {
    console.error('Failed to load signatures:', err);
  }
}

export function useSignatures() {
  const [, setTick] = useState(0);

  const subscribe = useCallback(() => {
    const rerender = () => setTick(t => t + 1);
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  // Auto-fetch on first use
  useEffect(() => {
    if (!isLoaded && localStorage.getItem('token')) {
      loadSignatures();
    }
  }, []);

  const addSignature = useCallback(async (sig: SignatureItem) => {
    try {
      const created = await fetchWithAuth('/signatures', {
        method: 'POST',
        body: JSON.stringify({ name: sig.name, type: sig.type, preview: sig.preview }),
      });
      globalSignatures = [...globalSignatures, created];
      notify();
    } catch (err) {
      console.error('Failed to save signature:', err);
    }
  }, []);

  const removeSignature = useCallback(async (id: string) => {
    try {
      await fetchWithAuth(`/signatures/${id}`, { method: 'DELETE' });
      globalSignatures = globalSignatures.filter(s => s.id !== id);
      notify();
    } catch (err) {
      console.error('Failed to delete signature:', err);
    }
  }, []);

  const refreshSignatures = useCallback(() => {
    loadSignatures();
  }, []);

  return {
    signatures: globalSignatures,
    addSignature,
    removeSignature,
    refreshSignatures,
  };
}
