# C's Place 🌸

A private, free, daily-updated personal planner dashboard.

**Stage 1 (this version):** password login, installable phone app, Home "Today" summary, Finance tracker, Calendar, Studies & Research, and optional morning Telegram reminders.

**Stage 2:** Updates (GitHub trending, papers, Medium, YouTube), Opportunities (jobs, PhD, MSc, schools), Weight & real recipes, Habits, Mini goals.

**Content tab:** a pink analytics page for your 7 accounts: followers, growth and likes charts, days since your last post (with nudges), top posts and collabs, all from your sheet (SETUP.md step 10).

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
| `src/app/api/cron/tick` | Telegram bot schedule (morning / midday / evening / night, times in src/lib/bot.ts + vercel.json) |
| `src/app/api/cron/reminders` | Send the morning message now (manual test, `?dry=1` to preview) |
| `templates/` | Google Sheet templates to copy |
