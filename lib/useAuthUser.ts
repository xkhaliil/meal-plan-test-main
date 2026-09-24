"use client";

/**
 * Kept as the public name for "who is signed in". The implementation moved to
 * the zustand store, which also owns the token and the sign-in/out actions.
 */
export { useAuthUser } from "@/lib/stores/authStore";
export type { AuthUser } from "@/lib/stores/authStore";
