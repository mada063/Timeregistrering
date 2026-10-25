"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useTimeregStore } from "@/context/TimeregContext";
import { formatHours, formatMoney } from "@/lib/format";
import styles from "./shared.module.css";

export default function ProjectsPage() {
  const store = useTimeregStore();
  const [projectDraft, setProjectDraft] = useState({
    customerId: "",
    name: "",
    hourlyRate: "",
  });

  const sortedCustomers = useMemo(
    () =>
      [...store.customers].sort((a, b) => a.name.localeCompare(b.name, "nb")),
    [store.customers],
  );

  const sortedProjects = useMemo(
    () =>
      [...store.projects].sort((a, b) => {
        const customerA =
          store.customers.find((c) => c.id === a.customerId)?.name ?? "";
        const customerB =
          store.customers.find((c) => c.id === b.customerId)?.name ?? "";
        const byCustomer = customerA.localeCompare(customerB, "nb");
        if (byCustomer !== 0) return byCustomer;
        return a.name.localeCompare(b.name, "nb");
      }),
    [store.projects, store.customers],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const rate =
      projectDraft.hourlyRate.trim() === ""
        ? undefined
        : Number(projectDraft.hourlyRate.replace(",", "."));
    store.addProject(projectDraft.customerId, projectDraft.name, rate);
    setProjectDraft((prev) => ({ ...prev, name: "", hourlyRate: "" }));
  }

  if (!store.ready) {
    return <div className={styles.loading}>Laster…</div>;
  }

  return (
    <div className={styles.stack}>
      <section className={styles.adminBlock}>
        <h2 className={styles.sectionTitle}>Legg til prosjekt</h2>
        {sortedCustomers.length === 0 ? (
          <p className={styles.empty}>
            Du trenger en kunde først.{" "}
            <Link href="/kunder" className={styles.linkBtn}>
              Gå til kunder
            </Link>
          </p>
        ) : (
          <form
            className={`${styles.inlineForm} ${styles.inlineFormProject}`}
            onSubmit={handleSubmit}
          >
            <label className={styles.field}>
              <span className={styles.label}>Kunde</span>
              <select
                className={styles.select}
                required
                value={projectDraft.customerId}
                onChange={(e) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
              >
                <option value="">Velg</option>
                {sortedCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Prosjekt</span>
              <input
                className={styles.input}
                required
                value={projectDraft.name}
                onChange={(e) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Timesats</span>
              <input
                className={`${styles.input} num`}
                type="number"
                min="0"
                step="50"
                placeholder="valgfritt"
                value={projectDraft.hourlyRate}
                onChange={(e) =>
                  setProjectDraft((prev) => ({
                    ...prev,
                    hourlyRate: e.target.value,
                  }))
                }
              />
            </label>
            <button className={styles.submitBtn} type="submit">
              Legg til
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Alle prosjekter</h2>
        {sortedProjects.length === 0 ? (
          <p className={styles.empty}>Ingen prosjekter ennå.</p>
        ) : (
          <div className={styles.customerList}>
            {sortedProjects.map((project) => {
              const customer = store.customers.find(
                (c) => c.id === project.customerId,
              );
              const hours = store.entries
                .filter((e) => e.projectId === project.id)
                .reduce((sum, e) => sum + e.hours, 0);

              return (
                <div key={project.id} className={styles.entityRow}>
                  <div>
                    <p className={styles.entityName}>{project.name}</p>
                    <p className={styles.entitySub}>
                      {customer?.name ?? "Ukjent kunde"}
                      {" · "}
                      <span className="num">{formatHours(hours)}</span>
                      {project.hourlyRate !== undefined && (
                        <>
                          {" · "}
                          <span className="num">
                            {formatMoney(project.hourlyRate)}/t
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.linkBtn} ${styles.linkBtnDanger}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Slette prosjektet «${project.name}» og tilhørende timer?`,
                        )
                      ) {
                        store.deleteProject(project.id);
                      }
                    }}
                  >
                    Slett
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
