// Keeps the last successful result of a daily feed in Vercel Blob (free), so a bad day
// (for example Gemini's free limit) shows yesterday's list instead of an empty box.
// Does nothing if Blob storage isn't switched on (BLOB_READ_WRITE_TOKEN, SETUP.md "Wins photos").

import { blobToken } from "./blob";

const path = (key: string) => `cache/${key}.json`;

export async function saveLastGood<T>(key: string, data: T) {
  const token = blobToken(); if (!token) return;
  try {
    const { put } = await import("@vercel/blob");
    await put(path(key), JSON.stringify({ savedAt: new Date().toISOString(), data }), {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60, token,
    });
  } catch { /* optional */ }
}

export async function loadLastGood<T>(key: string): Promise<{ savedAt: string; data: T } | null> {
  const token = blobToken(); if (!token) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: path(key), limit: 1, token });
    if (!blobs[0]) return null;
    const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}
