import type { Customer, Project, TimeEntry } from "./types";
import { formatDate, formatHours, formatMoney } from "./format";

export type MonthKey = `${number}-${string}`;

export function monthKeyFromDate(isoDate: string): MonthKey {
  return isoDate.slice(0, 7) as MonthKey;
}

export function currentMonthKey(): MonthKey {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as MonthKey;
}

export function formatMonthLabel(monthKey: MonthKey): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function collectMonthKeys(entries: TimeEntry[]): MonthKey[] {
  const keys = new Set<MonthKey>();
  for (const entry of entries) {
    keys.add(monthKeyFromDate(entry.date));
  }
  keys.add(currentMonthKey());
  return [...keys].sort((a, b) => b.localeCompare(a));
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "kunde"
  );
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type DocWithAutoTable = {
  lastAutoTable?: { finalY: number };
};

type PdfLibs = {
  jsPDF: typeof import("jspdf").jsPDF;
  autoTable: typeof import("jspdf-autotable").default;
};

async function loadPdfLibs(): Promise<PdfLibs> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  return { jsPDF, autoTable };
}

function groupEntriesByProject(options: {
  entries: TimeEntry[];
  projects: Project[];
  projectIds: Set<string>;
}): Array<{
  project: Project;
  entries: TimeEntry[];
  hours: number;
}> {
  const projects = options.projects
    .filter((p) => options.projectIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return projects
    .map((project) => {
      const entries = options.entries
        .filter((e) => e.projectId === project.id)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt),
        );
      const hours = entries.reduce((sum, e) => sum + e.hours, 0);
      return { project, entries, hours };
    })
    .filter((group) => group.entries.length > 0);
}

async function buildCustomerPdf(options: {
  monthKey: MonthKey;
  customer: Customer;
  entries: TimeEntry[];
  projects: Project[];
  includeValue: boolean;
}): Promise<{ filename: string; blob: Blob } | null> {
  const projectIds = new Set(
    options.projects
      .filter((p) => p.customerId === options.customer.id)
      .map((p) => p.id),
  );

  const monthEntries = options.entries.filter(
    (e) =>
      monthKeyFromDate(e.date) === options.monthKey &&
      projectIds.has(e.projectId),
  );

  if (monthEntries.length === 0) return null;

  const groups = groupEntriesByProject({
    entries: monthEntries,
    projects: options.projects,
    projectIds,
  });

  const totalHours = groups.reduce((sum, g) => sum + g.hours, 0);
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(options.customer.name, 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Timereg — ${formatMonthLabel(options.monthKey)}`, 14, 23);
  doc.text(`Totalt: ${formatHours(totalHours)}`, 14, 30);

  let cursorY = 38;
  const head = options.includeValue
    ? [["Dato", "Beskrivelse", "Timer", "Verdi"]]
    : [["Dato", "Beskrivelse", "Timer"]];

  for (const group of groups) {
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(group.project.name, 14, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(formatHours(group.hours), 196, cursorY, { align: "right" });
    cursorY += 3;

    const body = group.entries.map((entry) => {
      const row = [
        formatDate(entry.date),
        entry.description,
        formatHours(entry.hours),
      ];
      if (options.includeValue) {
        row.push(
          group.project.hourlyRate !== undefined
            ? formatMoney(entry.hours * group.project.hourlyRate)
            : "—",
        );
      }
      return row;
    });

    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        textColor: [40, 44, 47],
      },
      headStyles: {
        fillColor: [40, 44, 47],
        textColor: [237, 237, 237],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: options.includeValue
        ? {
            0: { cellWidth: 28, font: "courier" },
            2: { cellWidth: 22, halign: "right", font: "courier" },
            3: { cellWidth: 28, halign: "right", font: "courier" },
          }
        : {
            0: { cellWidth: 28, font: "courier" },
            2: { cellWidth: 22, halign: "right", font: "courier" },
          },
    });

    const table = doc as unknown as DocWithAutoTable;
    cursorY = (table.lastAutoTable?.finalY ?? cursorY) + 10;
  }

  const filename = `timereg-${options.monthKey}-${slugify(options.customer.name)}.pdf`;
  return { filename, blob: doc.output("blob") };
}

export async function exportMonthPdfs(options: {
  monthKey: MonthKey;
  customerId: string | "all";
  entries: TimeEntry[];
  projects: Project[];
  customers: Customer[];
  includeValue?: boolean;
}): Promise<number> {
  const includeValue = options.includeValue ?? false;
  const customers =
    options.customerId === "all"
      ? [...options.customers].sort((a, b) => a.name.localeCompare(b.name, "nb"))
      : options.customers.filter((c) => c.id === options.customerId);

  let exported = 0;

  for (const customer of customers) {
    const result = await buildCustomerPdf({
      monthKey: options.monthKey,
      customer,
      entries: options.entries,
      projects: options.projects,
      includeValue,
    });
    if (!result) continue;
    downloadBlob(result.filename, result.blob);
    exported += 1;
    if (customers.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return exported;
}

export async function exportOverviewPdf(options: {
  entries: TimeEntry[];
  projects: Project[];
  customers: Customer[];
  monthKey?: MonthKey | "all";
  includeValue?: boolean;
}): Promise<boolean> {
  const monthKey = options.monthKey ?? "all";
  const includeValue = options.includeValue ?? false;
  const filteredEntries =
    monthKey === "all"
      ? options.entries
      : options.entries.filter((e) => monthKeyFromDate(e.date) === monthKey);

  if (filteredEntries.length === 0) return false;

  const customers = [...options.customers].sort((a, b) =>
    a.name.localeCompare(b.name, "nb"),
  );

  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
  const periodLabel =
    monthKey === "all" ? "Alle perioder" : formatMonthLabel(monthKey);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Timereg — Oversikt", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(periodLabel, 14, 23);
  doc.text(`Totalt: ${formatHours(totalHours)}`, 14, 30);

  let cursorY = 38;
  const head = includeValue
    ? [["Dato", "Beskrivelse", "Timer", "Verdi"]]
    : [["Dato", "Beskrivelse", "Timer"]];

  for (const customer of customers) {
    const projectIds = new Set(
      options.projects
        .filter((p) => p.customerId === customer.id)
        .map((p) => p.id),
    );
    const groups = groupEntriesByProject({
      entries: filteredEntries,
      projects: options.projects,
      projectIds,
    });

    if (groups.length === 0) continue;

    const customerHours = groups.reduce((sum, g) => sum + g.hours, 0);

    if (cursorY > 250) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(customer.name, 14, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(formatHours(customerHours), 196, cursorY, { align: "right" });
    cursorY += 6;

    for (const group of groups) {
      if (cursorY > 250) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(group.project.name, 14, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(formatHours(group.hours), 196, cursorY, { align: "right" });
      cursorY += 3;

      const body = group.entries.map((entry) => {
        const row = [
          formatDate(entry.date),
          entry.description,
          formatHours(entry.hours),
        ];
        if (includeValue) {
          row.push(
            group.project.hourlyRate !== undefined
              ? formatMoney(entry.hours * group.project.hourlyRate)
              : "—",
          );
        }
        return row;
      });

      autoTable(doc, {
        startY: cursorY,
        head,
        body,
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          textColor: [40, 44, 47],
        },
        headStyles: {
          fillColor: [40, 44, 47],
          textColor: [237, 237, 237],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: includeValue
          ? {
              0: { cellWidth: 26, font: "courier" },
              2: { cellWidth: 20, halign: "right", font: "courier" },
              3: { cellWidth: 26, halign: "right", font: "courier" },
            }
          : {
              0: { cellWidth: 26, font: "courier" },
              2: { cellWidth: 20, halign: "right", font: "courier" },
            },
      });

      const table = doc as unknown as DocWithAutoTable;
      cursorY = (table.lastAutoTable?.finalY ?? cursorY) + 8;
    }

    cursorY += 4;
  }

  const suffix = monthKey === "all" ? "alle" : monthKey;
  downloadBlob(`timereg-oversikt-${suffix}.pdf`, doc.output("blob"));
  return true;
}
