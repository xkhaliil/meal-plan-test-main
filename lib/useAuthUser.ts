"use client";

import { useSyncExternalStore } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

/**
 * Reads the signed-in user from localStorage.
 *
 * The snapshot is cached against the raw string so repeated calls return the
 * same object reference — useSyncExternalStore re-renders forever otherwise.
 * On the server there is no session to read, so signed-out is the SSR state and
 * the real value lands on hydration.
 */
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("mealplan:auth", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("mealplan:auth", onChange);
  };
}

function getSnapshot(): AuthUser | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("user");
  } catch {
    return null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
