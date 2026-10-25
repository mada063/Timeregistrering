"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TimeregProvider } from "@/context/TimeregContext";
import styles from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Timer" },
  { href: "/oversikt", label: "Oversikt" },
  { href: "/kunder", label: "Kunder" },
  { href: "/prosjekter", label: "Prosjekter" },
] as const;

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.brandTitle}>
            Time<span>reg</span>
          </h1>
          <p className={styles.brandSubtitle}>
            Velg kunde, deretter prosjekt, og registrer timer.
          </p>
        </div>

        <nav className={styles.nav} aria-label="Hovedmeny">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TimeregProvider>
      <Shell>{children}</Shell>
    </TimeregProvider>
  );
}
