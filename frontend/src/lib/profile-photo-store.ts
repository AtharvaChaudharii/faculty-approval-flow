import { useSyncExternalStore, useCallback } from 'react';
import { fetchWithAuth } from './api';

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

  const setPhoto = useCallback(async (userId: string, dataUrl: string) => {
    // Update locally first for instant feedback
    photoMap = { ...photoMap, [userId]: dataUrl };
    persist();
    notify();
    // Sync to backend
    try {
      await fetchWithAuth('/users/me/profile-photo', {
        method: 'PUT',
        body: JSON.stringify({ profileImage: dataUrl }),
      });
    } catch (err) {
      console.error('Failed to sync profile photo to server:', err);
    }
  }, []);

  const removePhoto = useCallback(async (userId: string) => {
    const { [userId]: _, ...rest } = photoMap;
    photoMap = rest;
    persist();
    notify();
    // Sync removal to backend
    try {
      await fetchWithAuth('/users/me/profile-photo', {
        method: 'PUT',
        body: JSON.stringify({ profileImage: null }),
      });
    } catch (err) {
      console.error('Failed to remove profile photo from server:', err);
    }
  }, []);

  const getPhoto = useCallback((userId: string) => {
    return photos[userId] || null;
  }, [photos]);

  return { photos, setPhoto, removePhoto, getPhoto };
}
