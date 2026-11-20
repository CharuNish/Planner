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
    lifeSheetId: process.env.LIFE_SHEET_ID || "",
    calendarIds: (process.env.GOOGLE_CALENDAR_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
  },
  // Either one number for every day ("4"), or 7 numbers for Mon,Tue,Wed,Thu,Fri,Sat,Sun ("2,2,3,2,2,6,6").
  studyTargetsByWeekday: (() => {
    const parts = (process.env.STUDY_TARGET_HOURS || "4").split(",").map((x) => Number(x.trim())).filter((n) => !isNaN(n));
    return parts.length === 7 ? parts : Array(7).fill(parts[0] ?? 4);
  })(),
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  cronSecret: process.env.CRON_SECRET || "",
  geminiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  youtubeKey: process.env.YOUTUBE_API_KEY || "",
  weightGoalKg: Number(process.env.WEIGHT_GOAL_KG || 0),
  heightCm: Number(process.env.HEIGHT_CM || 0),
  sleepTarget: Number(process.env.SLEEP_TARGET_HOURS || 7),
  waterTarget: Number(process.env.WATER_TARGET_GLASSES || 8),
};

export const hasGoogle = () => Boolean(config.google.clientEmail && config.google.privateKey);
// Demo mode: when a data source is not set up yet, the app shows sample data so you can try it.
export const financeIsDemo = () => !hasGoogle() || !config.google.financeSheetId;
export const studiesIsDemo = () => !hasGoogle() || !config.google.studiesSheetId;
export const calendarIsDemo = () => !hasGoogle() || config.google.calendarIds.length === 0;
export const lifeIsDemo = () => !hasGoogle() || !config.google.lifeSheetId;
