"use client";

import type { ReactNode } from "react";
import styles from "./Collapse.module.css";

type CollapseProps = {
  open: boolean;
  children: ReactNode;
};

export default function Collapse({ open, children }: CollapseProps) {
  return (
    <div
      className={`${styles.collapse} ${open ? styles.collapseOpen : ""}`}
      aria-hidden={!open}
    >
      <div className={styles.collapseInner}>{children}</div>
    </div>
  );
}
