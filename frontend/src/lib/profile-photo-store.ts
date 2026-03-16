import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'docflow-profile-photos';

// Map of userId -> base64 data URL
let photoMap: Record<string, string> = {};

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) photoMap = JSON.parse(stored);
} catch { /* ignore */ }

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photoMap));
  } catch { /* ignore */ }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return photoMap;
}

export function useProfilePhotos() {
  const photos = useSyncExternalStore(subscribe, getSnapshot);

  const setPhoto = useCallback((userId: string, dataUrl: string) => {
    photoMap = { ...photoMap, [userId]: dataUrl };
    persist();
    notify();
  }, []);

  const removePhoto = useCallback((userId: string) => {
    const { [userId]: _, ...rest } = photoMap;
    photoMap = rest;
    persist();
    notify();
  }, []);

  const getPhoto = useCallback((userId: string) => {
    return photos[userId] || null;
  }, [photos]);

  return { photos, setPhoto, removePhoto, getPhoto };
}
