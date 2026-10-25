"use client";

import { nextSortMode, sortModeLabel, type SortMode } from "@/lib/format";
import styles from "./shared.module.css";

type SortButtonProps = {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
};

export default function SortButton({ mode, onChange }: SortButtonProps) {
  return (
    <button
      type="button"
      className={styles.iconBtn}
      onClick={() => onChange(nextSortMode(mode))}
      title={sortModeLabel(mode)}
      aria-label={sortModeLabel(mode)}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={styles.iconSvg}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {mode === "added" ? (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4.5L15 15" />
          </>
        ) : (
          <>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M4 9h16M8 3v4M16 3v4" />
            {mode === "date-desc" ? (
              <path d="M12 12v5M10 15l2 2 2-2" />
            ) : (
              <path d="M12 17v-5M10 14l2-2 2 2" />
            )}
          </>
        )}
      </svg>
    </button>
  );
}
