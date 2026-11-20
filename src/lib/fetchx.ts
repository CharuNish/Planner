// Small helpers for fetching and reading feeds from the web.
export async function getText(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": "Mozilla/5.0 (personal planner dashboard)", Accept: "*/*", ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.text();
}

export async function getJSON<T = unknown>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  return JSON.parse(await getText(url, { ...init, headers: { Accept: "application/json", ...(init.headers || {}) } }, timeoutMs));
}

export function decodeEntities(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export const stripTags = (s: string) => decodeEntities(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Returns the inner text of each <tag>…</tag> block. */
export function blocks(xml: string, tag: string) {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "g");
  return xml.match(re) || [];
}

export function tagText(xml: string, tag: string) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1]).trim() : "";
}

export const settle = async <T,>(p: Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try { return { ok: true, data: await p }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
};
