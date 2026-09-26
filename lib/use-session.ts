'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { SESSION_KEY, parseSession, type DemoSession } from './session';
const eventName = 'nervon-session-change';
let memory: string | null = null;
let storageAvailable = true;
const listeners = new Set<() => void>();
function snapshot() {
  try { const value = localStorage.getItem(SESSION_KEY); storageAvailable = true; return value; }
  catch { storageAvailable = false; return memory; }
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage',callback);
  window.addEventListener(eventName,callback);
  return () => { listeners.delete(callback); window.removeEventListener('storage',callback); window.removeEventListener(eventName,callback); };
}
export function writeSession(session: DemoSession) {
  memory = JSON.stringify(session);
  try { localStorage.setItem(SESSION_KEY,memory); storageAvailable = true; }
  catch { storageAvailable = false; }
  // In-memory state must still work if storage is unavailable or full.
  for (const notify of listeners) notify();
  window.dispatchEvent(new Event(eventName));
}
export function currentSession(): DemoSession {
  return parseSession(storageAvailable ? snapshot() : memory) ?? {version:1,id:crypto.randomUUID(),attempts:[]};
}
export function useSession() {
  const raw = useSyncExternalStore(subscribe, () => storageAvailable ? snapshot() : memory, () => null);
  const session = useMemo(() => parseSession(raw),[raw]);
  return {session,storageAvailable};
}
