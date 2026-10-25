import type { TimeregData } from "./types";

const STORAGE_KEY = "timereg-data-v1";

export const emptyData = (): TimeregData => ({
  customers: [],
  projects: [],
  entries: [],
});

export function loadData(): TimeregData {
  if (typeof window === "undefined") return emptyData();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<TimeregData>;
    return {
      customers: parsed.customers ?? [],
      projects: parsed.projects ?? [],
      entries: parsed.entries ?? [],
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: TimeregData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
