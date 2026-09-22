"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  console.log("[CHAOS render] Home");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/recipes");
    } else {
      router.push("/login");
    }
  }, [router]);

  return null;
}
