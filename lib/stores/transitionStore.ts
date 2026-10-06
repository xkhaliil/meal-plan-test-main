"use client";

import { create } from "zustand";

interface TransitionState {
  /** Where the fruit transition is taking the visitor, while it plays. */
  destination: string | null;
  /**
   * Drops the fruit over the page, then opens `destination` under the dark
   * panel and lifts it. Played by FruitTransition, mounted in the root layout
   * so it outlives the page that asked for it.
   */
  enterKitchen: (destination: string) => void;
  finish: () => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  destination: null,
  enterKitchen: (destination) => set({ destination }),
  finish: () => set({ destination: null }),
}));
