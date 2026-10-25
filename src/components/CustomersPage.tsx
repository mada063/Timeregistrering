"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTimeregStore } from "@/context/TimeregContext";
import { formatHours } from "@/lib/format";
import styles from "./shared.module.css";

export default function CustomersPage() {
  const store = useTimeregStore();
  const [customerName, setCustomerName] = useState("");

  const sortedCustomers = useMemo(
    () =>
      [...store.customers].sort((a, b) => a.name.localeCompare(b.name, "nb")),
    [store.customers],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    store.addCustomer(customerName);
    setCustomerName("");
  }

  if (!store.ready) {
    return <div className={styles.loading}>Laster…</div>;
  }

  return (
    <div className={styles.stack}>
      <section className={styles.adminBlock}>
        <h2 className={styles.sectionTitle}>Legg til kunde</h2>
        <form
          className={`${styles.inlineForm} ${styles.inlineFormCustomer}`}
          onSubmit={handleSubmit}
        >
          <label className={styles.field}>
            <span className={styles.label}>Navn</span>
            <input
              className={styles.input}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </label>
          <button className={styles.submitBtn} type="submit">
            Legg til
          </button>
        </form>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Alle kunder</h2>
        {sortedCustomers.length === 0 ? (
          <p className={styles.empty}>Ingen kunder ennå.</p>
        ) : (
          <div className={styles.customerList}>
            {sortedCustomers.map((customer) => {
              const projectCount = store.projects.filter(
                (p) => p.customerId === customer.id,
              ).length;
              const hours = store.entries
                .filter((e) => {
                  const project = store.projects.find(
                    (p) => p.id === e.projectId,
                  );
                  return project?.customerId === customer.id;
                })
                .reduce((sum, e) => sum + e.hours, 0);

              return (
                <div key={customer.id} className={styles.entityRow}>
                  <div>
                    <p className={styles.entityName}>{customer.name}</p>
                    <p className={styles.entitySub}>
                      {projectCount} prosjekt{projectCount === 1 ? "" : "er"}
                      {" · "}
                      <span className="num">{formatHours(hours)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.linkBtn} ${styles.linkBtnDanger}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Slette «${customer.name}» og tilhørende prosjekter/timer?`,
                        )
                      ) {
                        store.deleteCustomer(customer.id);
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
