const nbDate = new Intl.DateTimeFormat("nb-NO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const nbCurrency = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return nbDate.format(date);
}

export function formatHours(hours: number): string {
  return `${hours.toLocaleString("nb-NO", {
    minimumFractionDigits: hours % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })} t`;
}

export function formatMoney(amount: number): string {
  return nbCurrency.format(amount);
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default: when added. Also support sorting by work date. */
export type SortMode = "added" | "date-desc" | "date-asc";

export const SORT_MODES: SortMode[] = ["added", "date-desc", "date-asc"];

export function nextSortMode(mode: SortMode): SortMode {
  const index = SORT_MODES.indexOf(mode);
  return SORT_MODES[(index + 1) % SORT_MODES.length];
}

export function sortModeLabel(mode: SortMode): string {
  switch (mode) {
    case "added":
      return "Sortert etter når lagt til";
    case "date-desc":
      return "Sortert etter dato (nyeste først)";
    case "date-asc":
      return "Sortert etter dato (eldste først)";
  }
}

export function compareEntries(
  a: { date: string; createdAt: string },
  b: { date: string; createdAt: string },
  mode: SortMode,
): number {
  if (mode === "added") {
    return b.createdAt.localeCompare(a.createdAt);
  }
  const dir = mode === "date-asc" ? 1 : -1;
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate * dir;
  return a.createdAt.localeCompare(b.createdAt) * dir;
}
