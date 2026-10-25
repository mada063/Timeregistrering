"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTimereg } from "@/hooks/useTimereg";

type TimeregStore = ReturnType<typeof useTimereg>;

const TimeregContext = createContext<TimeregStore | null>(null);

export function TimeregProvider({ children }: { children: ReactNode }) {
  const store = useTimereg();
  return (
    <TimeregContext.Provider value={store}>{children}</TimeregContext.Provider>
  );
}

export function useTimeregStore() {
  const ctx = useContext(TimeregContext);
  if (!ctx) {
    throw new Error("useTimeregStore must be used within TimeregProvider");
  }
  return ctx;
}
