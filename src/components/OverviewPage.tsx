"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTimeregStore } from "@/context/TimeregContext";
import {
  compareEntries,
  formatDate,
  formatHours,
  formatMoney,
  type SortMode,
} from "@/lib/format";
import {
  collectMonthKeys,
  exportOverviewPdf,
  formatMonthLabel,
  monthKeyFromDate,
  type MonthKey,
} from "@/lib/pdf";
import SortButton from "@/components/SortButton";
import styles from "./shared.module.css";

export default function OverviewPage() {
  const store = useTimeregStore();
  const [monthFilter, setMonthFilter] = useState<MonthKey | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [exportIncludeValue, setExportIncludeValue] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const monthKeys = useMemo(
    () => collectMonthKeys(store.entries),
    [store.entries],
  );

  const filteredEntries = useMemo(() => {
    if (monthFilter === "all") return store.entries;
    return store.entries.filter(
      (e) => monthKeyFromDate(e.date) === monthFilter,
    );
  }, [store.entries, monthFilter]);

  const overview = useMemo(() => {
    const customers = [...store.customers].sort((a, b) =>
      a.name.localeCompare(b.name, "nb"),
    );

    return customers
      .map((customer) => {
        const projects = store.projects
          .filter((p) => p.customerId === customer.id)
          .sort((a, b) => a.name.localeCompare(b.name, "nb"))
          .map((project) => {
            const entries = filteredEntries
              .filter((e) => e.projectId === project.id)
              .sort((a, b) => compareEntries(a, b, sortMode));
            const hours = entries.reduce((sum, e) => sum + e.hours, 0);
            const value =
              project.hourlyRate !== undefined
                ? hours * project.hourlyRate
                : undefined;
            return { project, entries, hours, value };
          })
          .filter((p) => p.entries.length > 0);

        const hours = projects.reduce((sum, p) => sum + p.hours, 0);
        const value = projects.reduce((sum, p) => sum + (p.value ?? 0), 0);

        return { customer, projects, hours, value };
      })
      .filter((c) => c.projects.length > 0);
  }, [store.customers, store.projects, filteredEntries, sortMode]);

  const totals = useMemo(() => {
    const hours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    const value = filteredEntries.reduce((sum, e) => {
      const project = store.projects.find((p) => p.id === e.projectId);
      return sum + e.hours * (project?.hourlyRate ?? 0);
    }, 0);
    return {
      hours,
      value,
      entries: filteredEntries.length,
      customers: overview.length,
      projects: overview.reduce((sum, c) => sum + c.projects.length, 0),
    };
  }, [filteredEntries, store.projects, overview]);

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    try {
      const ok = await exportOverviewPdf({
        entries: store.entries,
        projects: store.projects,
        customers: store.customers,
        monthKey: monthFilter,
        includeValue: exportIncludeValue,
      });
      setExportMessage(ok ? "PDF lastet ned." : "Ingen timer å eksportere.");
    } finally {
      setExporting(false);
    }
  }

  if (!store.ready) {
    return <div className={styles.loading}>Laster…</div>;
  }

  return (
    <div className={styles.stack}>
      <section className={styles.adminBlock}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Oversikt</h2>
          <SortButton mode={sortMode} onChange={setSortMode} />
        </div>
        <div className={`${styles.inlineForm} ${styles.inlineFormExport}`}>
          <label className={styles.field}>
            <span className={styles.label}>Periode</span>
            <select
              className={styles.select}
              value={monthFilter}
              onChange={(e) =>
                setMonthFilter(e.target.value as MonthKey | "all")
              }
            >
              <option value="all">Alle perioder</option>
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={exportIncludeValue}
              onChange={(e) => setExportIncludeValue(e.target.checked)}
            />
            <span>Inkluder verdi i PDF</span>
          </label>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? "Eksporterer…" : "Eksporter PDF"}
          </button>
        </div>
        {exportMessage && <p className={styles.hint}>{exportMessage}</p>}
      </section>

      <section>
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span>Timer</span>
            <span className="num">{formatHours(totals.hours)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span>Registreringer</span>
            <span className="num">{totals.entries}</span>
          </div>
          <div className={styles.summaryItem}>
            <span>Kunder</span>
            <span className="num">{totals.customers}</span>
          </div>
          <div className={styles.summaryItem}>
            <span>Prosjekter</span>
            <span className="num">{totals.projects}</span>
          </div>
          {totals.value > 0 && (
            <div className={styles.summaryItem}>
              <span>Est. verdi</span>
              <span className="num">{formatMoney(totals.value)}</span>
            </div>
          )}
        </div>

        {overview.length === 0 ? (
          <p className={styles.empty}>
            Ingen timer i valgt periode.{" "}
            <Link href="/" className={styles.linkBtn}>
              Registrer timer
            </Link>
          </p>
        ) : (
          overview.map(({ customer, projects, hours, value }) => (
            <div key={customer.id} className={styles.overviewGroup}>
              <div className={styles.overviewCustomer}>
                <span className={styles.overviewCustomerName}>
                  {customer.name}
                </span>
                <span className={`${styles.rowMeta} num`}>
                  {formatHours(hours)}
                  {value > 0 ? ` · ${formatMoney(value)}` : ""}
                </span>
              </div>

              {projects.map(
                ({
                  project,
                  entries,
                  hours: projectHours,
                  value: projectValue,
                }) => (
                  <div key={project.id} className={styles.overviewProject}>
                    <div className={styles.overviewProjectHead}>
                      <span>{project.name}</span>
                      <span className="num">
                        {formatHours(projectHours)}
                        {projectValue !== undefined
                          ? ` · ${formatMoney(projectValue)}`
                          : ""}
                      </span>
                    </div>
                    {entries.map((entry) => (
                      <div key={entry.id} className={styles.overviewEntry}>
                        <span className="num">{formatDate(entry.date)}</span>
                        <span className="num">{formatHours(entry.hours)}</span>
                        <span>{entry.description}</span>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
