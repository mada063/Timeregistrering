"use client";

import { FormEvent, MouseEvent, useMemo, useState } from "react";
import Link from "next/link";
import Collapse from "@/components/Collapse";
import SortButton from "@/components/SortButton";
import { useTimeregStore } from "@/context/TimeregContext";
import {
  compareEntries,
  formatDate,
  formatHours,
  todayIso,
  type SortMode,
} from "@/lib/format";
import {
  collectMonthKeys,
  currentMonthKey,
  exportMonthPdfs,
  formatMonthLabel,
  type MonthKey,
} from "@/lib/pdf";
import styles from "./shared.module.css";

type ProjectFormState = {
  date: string;
  hours: string;
  description: string;
};

const emptyProjectForm = (): ProjectFormState => ({
  date: todayIso(),
  hours: "",
  description: "",
});

function toggleId(prev: Set<string>, id: string, multi: boolean): Set<string> {
  if (multi) {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  if (prev.has(id) && prev.size === 1) return new Set();
  return new Set([id]);
}

export default function RegisterPage() {
  const store = useTimeregStore();
  const [openCustomerIds, setOpenCustomerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [forms, setForms] = useState<Record<string, ProjectFormState>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [exportMonth, setExportMonth] = useState<MonthKey>(currentMonthKey());
  const [exportCustomerId, setExportCustomerId] = useState<string>("all");
  const [exportIncludeValue, setExportIncludeValue] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [hidePrevious, setHidePrevious] = useState(false);

  const monthKeys = useMemo(
    () => collectMonthKeys(store.entries),
    [store.entries],
  );

  const sortedCustomers = useMemo(
    () =>
      [...store.customers].sort((a, b) => a.name.localeCompare(b.name, "nb")),
    [store.customers],
  );

  function getForm(projectId: string): ProjectFormState {
    return forms[projectId] ?? emptyProjectForm();
  }

  function setForm(projectId: string, next: ProjectFormState) {
    setForms((prev) => ({ ...prev, [projectId]: next }));
  }

  function toggleCustomer(id: string, event: MouseEvent) {
    const multi = event.shiftKey;
    setOpenCustomerIds((prev) => toggleId(prev, id, multi));
    if (!multi) {
      setOpenProjectIds(new Set());
      setEditingEntryId(null);
    }
  }

  function toggleProject(id: string, event: MouseEvent) {
    const multi = event.shiftKey;
    setOpenProjectIds((prev) => toggleId(prev, id, multi));
    if (!multi) {
      setEditingEntryId(null);
    }
    setForms((prev) => ({
      ...prev,
      [id]: prev[id] ?? emptyProjectForm(),
    }));
  }

  function startEdit(
    projectId: string,
    entry: { id: string; date: string; hours: number; description: string },
  ) {
    setEditingEntryId(entry.id);
    setOpenProjectIds((prev) => new Set(prev).add(projectId));
    setForm(projectId, {
      date: entry.date,
      hours: String(entry.hours),
      description: entry.description,
    });
    if (hidePrevious) setHidePrevious(false);
  }

  function cancelEdit(projectId: string) {
    setEditingEntryId(null);
    setForm(projectId, emptyProjectForm());
  }

  function handleEntrySubmit(projectId: string, event: FormEvent) {
    event.preventDefault();
    const form = getForm(projectId);
    const hours = Number(form.hours.replace(",", "."));
    const description = form.description.trim();
    if (!form.date || !(hours > 0) || !description) return;

    const payload = {
      projectId,
      date: form.date,
      hours,
      description,
    };

    const editingThisProject =
      editingEntryId !== null &&
      store.entries.some(
        (e) => e.id === editingEntryId && e.projectId === projectId,
      );

    if (editingThisProject && editingEntryId) {
      store.updateEntry(editingEntryId, payload);
    } else {
      store.addEntry(payload);
    }

    setEditingEntryId(null);
    setForm(projectId, emptyProjectForm());
  }

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    try {
      const count = await exportMonthPdfs({
        monthKey: exportMonth,
        customerId: exportCustomerId === "all" ? "all" : exportCustomerId,
        entries: store.entries,
        projects: store.projects,
        customers: store.customers,
        includeValue: exportIncludeValue,
      });
      if (count === 0) {
        setExportMessage("Ingen timer for valgt måned/kunde.");
      } else if (count === 1) {
        setExportMessage("PDF lastet ned.");
      } else {
        setExportMessage(`${count} PDF-er lastet ned (én per kunde).`);
      }
    } finally {
      setExporting(false);
    }
  }

  if (!store.ready) {
    return <div className={styles.loading}>Laster…</div>;
  }

  return (
    <div className={styles.stack}>
      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Registrer timer</h2>
          <div className={styles.toolbar}>
            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={hidePrevious}
                onChange={(e) => setHidePrevious(e.target.checked)}
              />
              <span>Skjul tidligere</span>
            </label>
            <SortButton mode={sortMode} onChange={setSortMode} />
          </div>
        </div>

        {sortedCustomers.length === 0 ? (
          <p className={styles.empty}>
            Ingen kunder ennå.{" "}
            <Link href="/kunder" className={styles.linkBtn}>
              Legg til kunde
            </Link>
          </p>
        ) : (
          <div className={styles.customerList}>
            {sortedCustomers.map((customer) => {
              const projects = store.projects
                .filter((p) => p.customerId === customer.id)
                .sort((a, b) => a.name.localeCompare(b.name, "nb"));
              const customerHours = store.entries
                .filter((e) => projects.some((p) => p.id === e.projectId))
                .reduce((sum, e) => sum + e.hours, 0);
              const isCustomerOpen = openCustomerIds.has(customer.id);

              return (
                <div key={customer.id}>
                  <button
                    type="button"
                    className={`${styles.rowButton} ${
                      isCustomerOpen ? styles.rowButtonOpen : ""
                    }`}
                    onClick={(e) => toggleCustomer(customer.id, e)}
                    aria-expanded={isCustomerOpen}
                  >
                    <span className={styles.rowLabel}>
                      <span
                        className={`${styles.chevron} ${
                          isCustomerOpen ? styles.chevronOpen : ""
                        }`}
                      >
                        ▸
                      </span>
                      <span className={styles.rowLabelText}>
                        {customer.name}
                      </span>
                    </span>
                    <span className={`${styles.rowMeta} num`}>
                      {formatHours(customerHours)}
                    </span>
                  </button>

                  <Collapse open={isCustomerOpen}>
                    <div
                      className={`${styles.nested} ${
                        isCustomerOpen ? styles.nestedOpen : ""
                      }`}
                    >
                      {projects.length === 0 ? (
                        <p className={styles.empty}>
                          Ingen prosjekter.{" "}
                          <Link href="/prosjekter" className={styles.linkBtn}>
                            Legg til prosjekt
                          </Link>
                        </p>
                      ) : (
                        projects.map((project) => {
                          const entries = store.entries
                            .filter((e) => e.projectId === project.id)
                            .sort((a, b) => compareEntries(a, b, sortMode));
                          const projectHours = entries.reduce(
                            (sum, e) => sum + e.hours,
                            0,
                          );
                          const isProjectOpen = openProjectIds.has(project.id);
                          const form = getForm(project.id);
                          const isEditingHere =
                            editingEntryId !== null &&
                            entries.some((e) => e.id === editingEntryId);

                          return (
                            <div key={project.id}>
                              <button
                                type="button"
                                className={`${styles.rowButton} ${
                                  isProjectOpen ? styles.rowButtonOpen : ""
                                }`}
                                onClick={(e) => toggleProject(project.id, e)}
                                aria-expanded={isProjectOpen}
                              >
                                <span className={styles.rowLabel}>
                                  <span
                                    className={`${styles.chevron} ${
                                      isProjectOpen ? styles.chevronOpen : ""
                                    }`}
                                  >
                                    ▸
                                  </span>
                                  <span className={styles.rowLabelText}>
                                    {project.name}
                                  </span>
                                </span>
                                <span className={`${styles.rowMeta} num`}>
                                  {formatHours(projectHours)}
                                </span>
                              </button>

                              <Collapse open={isProjectOpen}>
                                <div className={styles.projectPanel}>
                                  {!hidePrevious && (
                                    <div className={styles.entries}>
                                      {entries.length === 0 ? (
                                        <p className={styles.empty}>
                                          Ingen timer registrert.
                                        </p>
                                      ) : (
                                        entries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className={styles.entry}
                                          >
                                            <span
                                              className={`${styles.entryDate} num`}
                                            >
                                              {formatDate(entry.date)}
                                            </span>
                                            <span
                                              className={`${styles.entryHours} num`}
                                            >
                                              {formatHours(entry.hours)}
                                            </span>
                                            <span className={styles.entryDesc}>
                                              {entry.description || "—"}
                                            </span>
                                            <span
                                              className={styles.entryActions}
                                            >
                                              <button
                                                type="button"
                                                className={styles.linkBtn}
                                                onClick={() =>
                                                  startEdit(project.id, entry)
                                                }
                                              >
                                                Rediger
                                              </button>
                                              <button
                                                type="button"
                                                className={`${styles.linkBtn} ${styles.linkBtnDanger}`}
                                                onClick={() =>
                                                  store.deleteEntry(entry.id)
                                                }
                                              >
                                                Slett
                                              </button>
                                            </span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}

                                  <form
                                    className={styles.entryForm}
                                    onSubmit={(e) =>
                                      handleEntrySubmit(project.id, e)
                                    }
                                  >
                                    <label
                                      className={`${styles.field} ${styles.fieldDate}`}
                                    >
                                      <span className={styles.label}>Dato</span>
                                      <input
                                        className={`${styles.input} num`}
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) =>
                                          setForm(project.id, {
                                            ...form,
                                            date: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                    <label
                                      className={`${styles.field} ${styles.fieldHours}`}
                                    >
                                      <span className={styles.label}>
                                        Timer
                                      </span>
                                      <input
                                        className={`${styles.input} num`}
                                        type="number"
                                        min="0.25"
                                        step="0.25"
                                        required
                                        placeholder="2.5"
                                        value={form.hours}
                                        onChange={(e) =>
                                          setForm(project.id, {
                                            ...form,
                                            hours: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                    <div className={styles.formActions}>
                                      <button
                                        className={styles.submitBtn}
                                        type="submit"
                                      >
                                        {isEditingHere ? "Lagre" : "Legg til"}
                                      </button>
                                      {isEditingHere && (
                                        <button
                                          type="button"
                                          className={styles.linkBtn}
                                          onClick={() =>
                                            cancelEdit(project.id)
                                          }
                                        >
                                          Avbryt
                                        </button>
                                      )}
                                    </div>
                                    <label
                                      className={`${styles.field} ${styles.entryFormDesc}`}
                                    >
                                      <span className={styles.label}>
                                        Hva ble gjort
                                      </span>
                                      <input
                                        className={styles.input}
                                        type="text"
                                        required
                                        placeholder="Kort beskrivelse"
                                        value={form.description}
                                        onChange={(e) =>
                                          setForm(project.id, {
                                            ...form,
                                            description: e.target.value,
                                          })
                                        }
                                      />
                                    </label>
                                  </form>
                                </div>
                              </Collapse>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>
        )}
        <p className={styles.hint}>
          Tips: hold Shift og klikk for å åpne flere samtidig.
        </p>
      </section>

      <section className={styles.adminBlock}>
        <h2 className={styles.sectionTitle}>Eksporter måned</h2>
        <form
          className={`${styles.inlineForm} ${styles.inlineFormExport}`}
          onSubmit={(e) => {
            e.preventDefault();
            void handleExport();
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>Måned</span>
            <select
              className={styles.select}
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value as MonthKey)}
            >
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Kunde</span>
            <select
              className={styles.select}
              value={exportCustomerId}
              onChange={(e) => setExportCustomerId(e.target.value)}
            >
              <option value="all">Alle kunder (hver sin PDF)</option>
              {sortedCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            <span>Inkluder verdi</span>
          </label>
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={exporting}
          >
            {exporting ? "Eksporterer…" : "Last ned PDF"}
          </button>
        </form>
        <p className={styles.hint}>
          Én PDF per kunde, gruppert per prosjekt
          {exportMessage ? ` · ${exportMessage}` : "."}
        </p>
      </section>
    </div>
  );
}
