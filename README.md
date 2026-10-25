# Timereg

Hours register for freelancers. Pick a customer → project → log hours.

Styled after [Dallas Tek](https://www.dallastek.no/).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Cascading customer → project → time entries on **Timer**
- **Kunder** and **Prosjekter** as separate pages
- Quick add with today’s date as default
- Monthly PDF export (one file per customer)
- Data stored in `localStorage`

## Stack

Next.js (App Router), TypeScript, CSS Modules, jsPDF.
