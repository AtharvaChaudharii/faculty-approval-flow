import { useSyncExternalStore } from 'react';
import { users } from './mock-data';
import type { User } from './mock-data';

let currentUser: User = users[0]; // default
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function getSnapshot() {
  return currentUser;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function loginByEmail(email: string): User | null {
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    currentUser = user;
    notify();
    return user;
  }
  return null;
}

export function getCurrentUser(): User {
  return currentUser;
}

export function useCurrentUser(): User {
  return useSyncExternalStore(subscribe, getSnapshot);
}
