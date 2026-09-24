"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Reads the same session the rest of the app uses, rather than poking at
    // localStorage directly.
    useAuthStore.getState().hydrate();
    const { token } = useAuthStore.getState();
    router.replace(token ? "/recipes" : "/landing");
  }, [router]);

  return null;
}
