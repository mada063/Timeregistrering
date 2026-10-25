export type Customer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Project = {
  id: string;
  customerId: string;
  name: string;
  hourlyRate?: number;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  createdAt: string;
};

export type TimeregData = {
  customers: Customer[];
  projects: Project[];
  entries: TimeEntry[];
};
