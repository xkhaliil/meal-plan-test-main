"use client";

import { create } from "zustand";

export type ToastTone = "error" | "success";

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
}

/** Long enough to read a sentence; errors linger, confirmations don't. */
const LIFETIME_MS: Record<ToastTone, number> = {
  error: 7000,
  success: 4000,
};

/** Beyond this the stack covers the page it is reporting on. */
const MAX_VISIBLE = 3;

let counter = 0;

/**
 * Transient messages for actions that have no error slot of their own.
 *
 * Forms keep their inline errors — a message about a field belongs beside the
 * field. This is for buttons: delete, save, upgrade, cancel, send, where the
 * only previous signal that something had gone wrong was that nothing changed.
 *
 * Removal is scheduled here rather than in the component so a toast still
 * expires while its page is navigating away.
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (tone, message) => {
    const text = message.trim();
    if (!text) return;

    // A retried action that fails the same way twice shouldn't stack.
    if (get().toasts.some((t) => t.message === text && t.tone === tone)) return;

    counter += 1;
    const id = `toast-${counter}`;

    set({
      toasts: [...get().toasts, { id, tone, message: text }].slice(
        -MAX_VISIBLE
      ),
    });

    setTimeout(() => get().dismiss(id), LIFETIME_MS[tone]);
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/**
 * The calling convention everywhere else: `toast.error("…")`.
 *
 * Reads the store through `getState`, so it works from event handlers and from
 * store actions, neither of which is a React render.
 */
export const toast = {
  error: (message: string) => useToastStore.getState().push("error", message),
  success: (message: string) =>
    useToastStore.getState().push("success", message),
};
