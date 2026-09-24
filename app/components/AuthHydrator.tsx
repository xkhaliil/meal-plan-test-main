"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Fills the auth store from the browser after mount, and keeps it in step with
 * other tabs.
 *
 * Mounted once in the root layout. It runs after hydration on purpose: the
 * server renders signed-out, so reading storage any earlier would make the
 * first client render disagree with the server's HTML.
 */
export default function AuthHydrator() {
  useEffect(() => {
    const hydrate = useAuthStore.getState().hydrate;
    hydrate();

    // `storage` fires in *other* tabs; the custom event covers this one.
    window.addEventListener("storage", hydrate);
    window.addEventListener("mealplan:auth", hydrate);
    return () => {
      window.removeEventListener("storage", hydrate);
      window.removeEventListener("mealplan:auth", hydrate);
    };
  }, []);

  return null;
}
