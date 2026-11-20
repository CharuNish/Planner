import { JWT } from "google-auth-library";
import { config } from "./config";

// One "service account" (a robot Google user) reads your sheets and calendar.
// You share each sheet/calendar with its email address, so nothing is public.
let client: JWT | null = null;
function auth() {
  if (!client) {
    client = new JWT({
      email: config.google.clientEmail,
      key: config.google.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar.events"],
    });
  }
  return client;
}

async function gfetch(url: string, init: RequestInit = {}) {
  const { token } = await auth().getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    // Friendly explanations for the most common setup mistakes.
    if (body.includes("must not be an Office file")) throw new Error("This is an uploaded Excel (.xlsx) file, not a Google Sheet. Open it, click File → Save as Google Sheets, share the new copy with the robot email, and use the new copy's ID.");
    if (res.status === 403) throw new Error("Google says no access (403). Share the sheet/calendar with the robot's email, and check the Sheets and Calendar APIs are enabled.");
    if (res.status === 404) throw new Error("Not found (404). The sheet or calendar ID is probably wrong.");
    if (body.includes("Unable to parse range")) throw new Error("A tab is missing or misnamed. Check the tab names match the template exactly (e.g. Transactions, Budgets, Bills).");
    throw new Error(`Google API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export type Row = Record<string, unknown>;

/** Reads a tab and returns rows as objects keyed by the header row (lower-cased). */
export async function readSheet(sheetId: string, tab: string): Promise<Row[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const data = await gfetch(url);
  const values: unknown[][] = data.values || [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim().toLowerCase());
  return values.slice(1)
    .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

export async function appendRow(sheetId: string, tab: string, row: unknown[]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}:append?valueInputOption=USER_ENTERED`;
  return gfetch(url, { method: "POST", body: JSON.stringify({ values: [row] }) });
}

export type GEvent = {
  id: string; summary?: string; description?: string; location?: string; colorId?: string;
  start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string };
};

export async function listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GEvent[]> {
  const q = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
  const data = await gfetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${q}`);
  return data.items || [];
}

export async function insertEvent(calendarId: string, event: object) {
  return gfetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST", body: JSON.stringify(event),
  });
}

export const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};
export const str = (v: unknown) => String(v ?? "").trim();
