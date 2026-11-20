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
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/drive.readonly"],
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
    if (res.status === 403) throw new Error(url.includes("/drive/") ? "Google Drive says no access (403). Share the Content folder with the robot's email, and turn on the Google Drive API (SETUP.md step 10)." : "Google says no access (403). Share the sheet/calendar with the robot's email, and check the Sheets and Calendar APIs are enabled.");
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

/** Like readSheet, but each row also has "__row" = its row number in the sheet (for updating it later). */
export async function readSheetRows(sheetId: string, tab: string): Promise<Row[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const data = await gfetch(url);
  const values: unknown[][] = data.values || [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h).trim().toLowerCase());
  return values.slice(1).map((r, i): Row => ({ ...Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ""])), __row: i + 2 }))
    .filter((r) => headers.some((h) => r[h] !== ""));
}

const colLetter = (i: number) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/** Changes some cells of one row, by header name (e.g. { views: 1200, likes: 80 }). Unknown headers are ignored. */
export async function updateRow(sheetId: string, tab: string, rowNumber: number, values: Record<string, unknown>) {
  const head = await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab + "!1:1")}`);
  const headers: string[] = (head.values?.[0] || []).map((h: unknown) => String(h).trim().toLowerCase());
  const data = Object.entries(values).map(([k, v]) => ({ i: headers.indexOf(k.toLowerCase()), v })).filter((x) => x.i >= 0)
    .map(({ i, v }) => ({ range: `${tab}!${colLetter(i)}${rowNumber}`, values: [[v]] }));
  if (!data.length) return;
  return gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }) });
}

// ───── Google Drive (read-only): your content folders ─────
export type DriveFile = { id: string; name: string; mimeType: string; createdTime: string; size?: string; description?: string; webViewLink?: string; thumbnailLink?: string; videoMediaMetadata?: { durationMillis?: string } };
export async function driveList(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = []; let pageToken = "";
  do {
    const q = new URLSearchParams({ q: `'${folderId}' in parents and trashed = false`, fields: "nextPageToken, files(id,name,mimeType,createdTime,size,description,webViewLink,thumbnailLink,videoMediaMetadata(durationMillis))", pageSize: "200", orderBy: "createdTime", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    if (pageToken) q.set("pageToken", pageToken);
    const d = await gfetch(`https://www.googleapis.com/drive/v3/files?${q}`);
    out.push(...(d.files || [])); pageToken = d.nextPageToken || "";
  } while (pageToken);
  return out;
}
export async function driveFile(id: string): Promise<DriveFile> {
  return gfetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,createdTime,size,description,webViewLink,thumbnailLink&supportsAllDrives=true`);
}
/** Downloads a Drive file's bytes (used to let Gemini watch short videos). */
export async function driveDownload(id: string): Promise<ArrayBuffer> {
  const { token } = await auth().getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return res.arrayBuffer();
}
/** Fetches a private Drive thumbnail with the robot's login (thumbnail links need auth). */
export async function driveThumb(link: string): Promise<Response> {
  const { token } = await auth().getAccessToken();
  return fetch(link.replace(/=s\d+$/, "=s480"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}

export async function appendRow(sheetId: string, tab: string, row: unknown[]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}:append?valueInputOption=USER_ENTERED`;
  return gfetch(url, { method: "POST", body: JSON.stringify({ values: [row] }) });
}

/** Appends a row, creating the tab (with headers) first if it doesn't exist yet. */
export async function appendRowCreatingTab(sheetId: string, tab: string, headers: string[], row: unknown[]) {
  try { return await appendRow(sheetId, tab, row); } catch (e) {
    if (!/parse range|misnamed/i.test(String(e))) throw e;
    await gfetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }) });
    await appendRow(sheetId, tab, headers);
    return appendRow(sheetId, tab, row);
  }
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
