"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** False until the browser's copy has been read; see `hydrate`. */
  hydrated: boolean;

  hydrate: () => void;
  signIn: (user: AuthUser, token: string) => void;
  signOut: () => Promise<void>;
  patchUser: (patch: Partial<AuthUser>) => void;
  /** The header every authenticated fetch needs, in one place. */
  authHeaders: () => Record<string, string>;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in session.
 *
 * The token and user were read straight from `localStorage` in two dozen
 * places, so every page re-implemented "am I signed in" and any change to the
 * storage shape meant touching all of them.
 *
 * Nothing is read during the initial render: the server has no session, so the
 * store starts empty and `hydrate()` fills it after mount. Reading storage in
 * the initial state would make the first client render disagree with the
 * server's HTML.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    set({
      user: readUser(),
      token: localStorage.getItem(TOKEN_KEY),
      hydrated: true,
    });
  },

  signIn: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token, hydrated: true });
    // Other tabs listen for this.
    window.dispatchEvent(new Event("mealplan:auth"));
  },

  signOut: async () => {
    // The cookie the proxy reads is httpOnly, so only the server can drop it.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, hydrated: true });
    window.dispatchEvent(new Event("mealplan:auth"));
  },

  patchUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const next = { ...current, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    set({ user: next });
    window.dispatchEvent(new Event("mealplan:auth"));
  },

  authHeaders: () => {
    // Falls back to storage: a caller can fire before `hydrate()` has run.
    const token = get().token ?? localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },
}));

/** Convenience for the common case of "who is signed in". */
export function useAuthUser() {
  return useAuthStore((s) => s.user);
}
