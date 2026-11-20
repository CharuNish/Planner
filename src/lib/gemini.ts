import { config } from "./config";

// Google's Gemini (free key from https://aistudio.google.com/apikey) writes the short summaries.
export const hasGemini = () => Boolean(config.geminiKey);

type GeminiOpts = { search?: boolean; temperature?: number };

/**
 * Google retires Gemini model names over time, so instead of hard-coding one we ask Google
 * which models this key can use and pick the newest stable "flash" model (fast and free).
 * Set GEMINI_MODEL in Vercel to force a specific one.
 */
let chosenModel: string | null = null;
const retired = new Set<string>(); // models that answered "not available" for this key
async function pickModel(): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (chosenModel) return chosenModel;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${config.geminiKey}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Gemini model list ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const names = (data.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/lite|image|tts|audio|live|thinking|embedding|8b/.test(n) && !retired.has(n));
  const version = (n: string) => parseFloat(n.match(/^gemini-([\d.]+)/)?.[1] || "0");
  const unstable = (n: string) => (/preview|exp/.test(n) ? 1 : 0);
  names.sort((a, b) => unstable(a) - unstable(b) || version(b) - version(a) || a.length - b.length);
  if (!names.length) throw new Error("No Gemini flash model available for this key");
  chosenModel = names[0];
  return chosenModel;
}

export async function gemini(prompt: string, opts: GeminiOpts = {}): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  if (!config.geminiKey) throw new Error("No GEMINI_API_KEY set");
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: opts.temperature ?? 0.4, ...(opts.search ? {} : { responseMimeType: "application/json" }) },
  };
  if (opts.search) body.tools = [{ google_search: {} }];
  const call = async (model: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000), cache: "no-store",
  });
  let model = await pickModel();
  let res = await call(model);
  // If Google says a model is retired, try the next newest one (up to 3 times).
  for (let i = 0; i < 3 && res.status === 404 && !process.env.GEMINI_MODEL; i++) {
    retired.add(model); chosenModel = null;
    model = await pickModel();
    res = await call(model);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
