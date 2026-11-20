// All settings come from environment variables (see .env.example).
export const config = {
  appPassword: process.env.APP_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-secret-change-me-please-32chars",
  timezone: process.env.TIMEZONE || "Asia/Colombo",
  currency: process.env.CURRENCY || "Rs",
  ownerName: process.env.OWNER_NAME || "Charuka",
  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
    // Vercel stores newlines as "\n" text, so turn them back into real newlines.
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    financeSheetId: process.env.FINANCE_SHEET_ID || "",
    studiesSheetId: process.env.STUDIES_SHEET_ID || "",
    calendarIds: (process.env.GOOGLE_CALENDAR_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
  },
  studyTargetHoursPerDay: Number(process.env.STUDY_TARGET_HOURS || 4),
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  cronSecret: process.env.CRON_SECRET || "",
};

export const hasGoogle = () => Boolean(config.google.clientEmail && config.google.privateKey);
// Demo mode: when a data source is not set up yet, the app shows sample data so you can try it.
export const financeIsDemo = () => !hasGoogle() || !config.google.financeSheetId;
export const studiesIsDemo = () => !hasGoogle() || !config.google.studiesSheetId;
export const calendarIsDemo = () => !hasGoogle() || config.google.calendarIds.length === 0;
