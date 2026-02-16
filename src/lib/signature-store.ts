import { useState, useCallback } from 'react';
import type { SignatureItem } from './mock-data';
import { defaultSignatures } from './mock-data';

// Simple shared state for signatures (would be replaced by DB in production)
let globalSignatures: SignatureItem[] = [...defaultSignatures];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
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

  const addSignature = useCallback((sig: SignatureItem) => {
    globalSignatures = [...globalSignatures, sig];
    notify();
  }, []);

  const removeSignature = useCallback((id: string) => {
    globalSignatures = globalSignatures.filter(s => s.id !== id);
    notify();
  }, []);

  return {
    signatures: globalSignatures,
    addSignature,
    removeSignature,
  };
}
