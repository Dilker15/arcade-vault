"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

export interface Session {
  name: string;
}

export interface SavedScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface SessionContextValue {
  user: Session | null;
  login: (name: string) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScoreEntry, "at">) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Sincronización con el `localStorage["av_user"]` externo vía useSyncExternalStore
// (en vez de leer en un useEffect) para evitar el desajuste de hidratación sin
// disparar un set de estado extra tras el primer render.
type Listener = () => void;
const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = parseSession(raw);

  const login = (name: string) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify({ name } satisfies Session));
    } catch {}
    emitChange();
  };

  const logout = () => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
    emitChange();
  };

  const saveScore = (entry: Omit<SavedScoreEntry, "at">) => {
    try {
      const all: SavedScoreEntry[] = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  };

  return (
    <SessionContext.Provider value={{ user, login, logout, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
