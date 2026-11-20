# My Planner 🌸

A private, free, daily-updated personal planner dashboard.

**Stage 1 (this version):** password login, installable phone app, Home "Today" summary, Finance tracker, Calendar, Studies & Research, and optional morning Telegram reminders.

**Stage 2:** Updates (GitHub trending, papers, Medium, YouTube), Opportunities (jobs, PhD, MSc, schools), Weight & real recipes, Habits, Mini goals.

**Coming next:** a techy 3D redesign, then Content Creation stats.

👉 **Start with [SETUP.md](SETUP.md).** Sheet templates are in [`templates/`](templates/).

## How it works

- **Next.js** app hosted free on **Vercel**.
- Your data stays in **your Google Sheets and Google Calendar**. A Google service account (shared only on your files) reads them, so nothing is public.
- Tabs show sample data until a data source is connected.

| Folder | What's inside |
|---|---|
| `src/app/(app)/` | The pages: Home, Finance, Calendar, Studies |
| `src/lib/` | Reading Google data and the analysis (budget, anomalies, on-track checks, priorities) |
| `src/components/` | Charts, forms and shared UI |
| `src/app/api/cron/reminders` | The daily Telegram message |
| `templates/` | Google Sheet templates to copy |
