import { config } from "./config";

// Google's Gemini (free key from https://aistudio.google.com/apikey) writes the short summaries.
export const hasGemini = () => Boolean(config.geminiKey);

type GeminiOpts = { search?: boolean; temperature?: number; media?: { mimeType: string; data: string } };

/**
 * Google retires Gemini model names over time, so instead of hard-coding one we ask Google
 * which models this key can use and pick the newest stable "flash" model (fast and free).
 * Set GEMINI_MODEL in Vercel to force a specific one.
 */
// Remembered separately for plain text and for web search, since a model can be free for one but not the other.
const chosen: Record<"text" | "search", string | null> = { text: null, search: null };
const retired: Record<"text" | "search", Set<string>> = { text: new Set(), search: new Set() };
async function pickModel(mode: "text" | "search"): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (chosen[mode]) return chosen[mode]!;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${config.geminiKey}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Gemini model list ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const names = (data.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    // Web search is allowed to fall back to the "lite" models too: their free search allowance is separate.
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !(mode === "text" ? /lite|image|tts|audio|live|thinking|embedding|8b/ : /image|tts|audio|live|thinking|embedding|8b/).test(n) && !retired[mode].has(n));
  const version = (n: string) => parseFloat(n.match(/^gemini-([\d.]+)/)?.[1] || "0");
  const unstable = (n: string) => (/preview|exp/.test(n) ? 1 : 0);
  const lite = (n: string) => (/lite/.test(n) ? 1 : 0);
  // Summaries: newest stable full flash model. Web search: newest first, lite right after its full sibling,
  // because old 2.x models are often listed but switched off ("no longer available to new users").
  names.sort(mode === "text"
    ? (a, b) => lite(a) - lite(b) || unstable(a) - unstable(b) || version(b) - version(a) || a.length - b.length
    : (a, b) => version(b) - version(a) || lite(a) - lite(b) || unstable(a) - unstable(b) || a.length - b.length);
  if (!names.length) throw new Error(`No free Gemini model available for ${mode === "search" ? "web search" : "summaries"} with this key`);
  chosen[mode] = names[0];
  return names[0];
}

export async function gemini(prompt: string, opts: GeminiOpts = {}): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  if (!config.geminiKey) throw new Error("No GEMINI_API_KEY set");
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [...(opts.media ? [{ inline_data: { mime_type: opts.media.mimeType, data: opts.media.data } }] : []), { text: prompt }] }],
    generationConfig: { temperature: opts.temperature ?? 0.4, ...(opts.search ? {} : { responseMimeType: "application/json" }) },
  };
  if (opts.search) body.tools = [{ google_search: {} }];
  const call = async (model: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000), cache: "no-store",
  });
  const mode = opts.search ? "search" : "text";
  let model = await pickModel(mode);
  let res = await call(model);
  const tries = mode === "search" ? 15 : 4;
  const trail: string[] = [];
  for (let i = 0; i < tries && !res.ok && !process.env.GEMINI_MODEL; i++) {
    const errText = await res.clone().text();
    trail.push(`${model} ${res.status}`);
    // 404 = retired model; 429 with "limit: 0" = no free allowance; 429 "PerDay" = this model's daily free allowance is used up.
    // Free allowances are per model, so in all these cases another model may still work.
    // Web search ("grounding") has its own, much smaller free allowance that Google often reports with only a bare
    // "exceeded your current quota" message, so for search ANY 429 means: move on to the next model.
    const notFree = res.status === 404 || (res.status === 429 && (mode === "search" || /limit:\s*0\b|PerDay/i.test(errText)));
    if (notFree) {
      // This model isn't available (or has no free allowance) for this key: try the next newest one.
      retired[mode].add(model); chosen[mode] = null;
      // Google sometimes names the replacement ("Please update your code to use models/X"): go straight there.
      const suggested = errText.match(/use models\/(gemini-[\w.-]+?)(?=[\s"\\,]|$| for)/)?.[1];
      model = suggested && !retired[mode].has(suggested) ? suggested : await pickModel(mode);
      res = await call(model);
    } else if (res.status === 429 && i === 0) {
      // Real "too many requests right now": wait a little once, then retry.
      const wait = Math.min(20, Number(errText.match(/"retryDelay":\s*"(\d+)/)?.[1] || 10));
      await new Promise((r) => setTimeout(r, wait * 1000));
      res = await call(model);
    } else break;
  }
  if (!res.ok) {
    const t = await res.text();
    const quota = t.match(/"quotaId":\s*"([^"]+)"/)?.[1];
    const msg = t.match(/"message":\s*"([^"]{0,160})/)?.[1] || t.slice(0, 160);
    throw new Error(`Gemini ${res.status} (${model}${quota ? `, ${quota}` : ""}): ${msg}${trail.length ? ` [tried: ${trail.join(", ")}]` : ""}`);
  }
  const data = await res.json();
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
  const sources = (cand?.groundingMetadata?.groundingChunks || [])
    .map((c: { web?: { title?: string; uri?: string } }) => ({ title: c.web?.title || "", uri: c.web?.uri || "" }))
    .filter((s: { uri: string }) => s.uri);
  return { text, sources };
}

/** Asks Gemini for JSON and parses it (tolerates ```json fences). */
export async function geminiJSON<T>(prompt: string, opts: GeminiOpts = {}): Promise<{ data: T; sources: { title: string; uri: string }[] }> {
  const { text, sources } = await gemini(prompt, opts);
  const cleaned = text.replace(/^[\s\S]*?```(?:json)?\s*/i, (m) => (m.includes("```") ? "" : m)).replace(/```[\s\S]*$/, "").trim();
  const start = cleaned.search(/[[{]/);
  const json = start >= 0 ? cleaned.slice(start) : cleaned;
  return { data: JSON.parse(json) as T, sources };
}
