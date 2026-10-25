"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createId, emptyData, loadData, saveData } from "@/lib/storage";
import type { Customer, Project, TimeEntry, TimeregData } from "@/lib/types";

export function useTimereg() {
  const [data, setData] = useState<TimeregData>(emptyData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveData(data);
  }, [data, ready]);

  const update = useCallback((updater: (prev: TimeregData) => TimeregData) => {
    setData((prev) => updater(prev));
  }, []);

  const addCustomer = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const customer: Customer = {
        id: createId(),
        name: trimmed,
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        customers: [...prev.customers, customer],
      }));
    },
    [update],
  );

  const renameCustomer = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      update((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? { ...c, name: trimmed } : c,
        ),
      }));
    },
    [update],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      update((prev) => {
        const projectIds = new Set(
          prev.projects.filter((p) => p.customerId === id).map((p) => p.id),
        );
        return {
          customers: prev.customers.filter((c) => c.id !== id),
          projects: prev.projects.filter((p) => p.customerId !== id),
          entries: prev.entries.filter((e) => !projectIds.has(e.projectId)),
        };
      });
    },
    [update],
  );

  const addProject = useCallback(
    (customerId: string, name: string, hourlyRate?: number) => {
      const trimmed = name.trim();
      if (!trimmed || !customerId) return;
      const project: Project = {
        id: createId(),
        customerId,
        name: trimmed,
        hourlyRate:
          hourlyRate !== undefined && !Number.isNaN(hourlyRate)
            ? hourlyRate
            : undefined,
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        projects: [...prev.projects, project],
      }));
    },
    [update],
  );

  const updateProject = useCallback(
    (id: string, name: string, hourlyRate?: number) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      update((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                name: trimmed,
                hourlyRate:
                  hourlyRate !== undefined && !Number.isNaN(hourlyRate)
                    ? hourlyRate
                    : undefined,
              }
            : p,
        ),
      }));
    },
    [update],
  );

  const deleteProject = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        entries: prev.entries.filter((e) => e.projectId !== id),
      }));
    },
    [update],
  );

  const addEntry = useCallback(
    (input: Omit<TimeEntry, "id" | "createdAt">) => {
      if (!input.projectId || input.hours <= 0 || !input.description.trim()) {
        return;
      }
      const entry: TimeEntry = {
        ...input,
        description: input.description.trim(),
        id: createId(),
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        entries: [entry, ...prev.entries],
      }));
    },
    [update],
  );

  const updateEntry = useCallback(
    (id: string, input: Omit<TimeEntry, "id" | "createdAt">) => {
      if (!input.projectId || input.hours <= 0 || !input.description.trim()) {
        return;
      }
      update((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === id
            ? {
                ...e,
                ...input,
                description: input.description.trim(),
              }
            : e,
        ),
      }));
    },
    [update],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        entries: prev.entries.filter((e) => e.id !== id),
      }));
    },
    [update],
  );

  const totals = useMemo(() => {
    const totalHours = data.entries.reduce((sum, e) => sum + e.hours, 0);
    const totalValue = data.entries.reduce((sum, e) => {
      const project = data.projects.find((p) => p.id === e.projectId);
      return sum + e.hours * (project?.hourlyRate ?? 0);
    }, 0);
    return { totalHours, totalValue, entryCount: data.entries.length };
  }, [data.entries, data.projects]);

  return {
    ready,
    ...data,
    totals,
    addCustomer,
    renameCustomer,
    deleteCustomer,
    addProject,
    updateProject,
    deleteProject,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
