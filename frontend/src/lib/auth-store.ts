import { useSyncExternalStore } from 'react';
import type { User } from './mock-data';
import { fetchWithAuth } from './api';

// Initial state, let's grab from localStorage if we saved it before
let currentUser: User | null = (() => {
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
})();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function getSnapshot() {
  return currentUser as User;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export async function loginByEmail(email: string): Promise<User | null> {
  try {
    const res = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    // Store token
    localStorage.setItem('token', res.token);
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    
    currentUser = res.user;
    notify();
    return res.user;
  } catch (err) {
    console.error('Login failed:', err);
    return null;
  }
}

export async function checkSession() {
  if (localStorage.getItem('token')) {
    try {
      const res = await fetchWithAuth('/auth/me');
      currentUser = res.user;
      localStorage.setItem('currentUser', JSON.stringify(res.user));
      notify();
    } catch (err) {
      console.warn('Session expired or invalid');
      localStorage.removeItem('token');
    }
  }
}

export function getCurrentUser(): User {
  return currentUser as User;
}

export function useCurrentUser(): User {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Kick off session validation on load
checkSession();
