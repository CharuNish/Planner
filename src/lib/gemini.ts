import { config } from "./config";

// Google's Gemini (free key from https://aistudio.google.com/apikey) writes the short summaries.
export const hasGemini = () => Boolean(config.geminiKey);

type GeminiOpts = { search?: boolean; temperature?: number };

export async function gemini(prompt: string, opts: GeminiOpts = {}): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  if (!config.geminiKey) throw new Error("No GEMINI_API_KEY set");
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: opts.temperature ?? 0.4, ...(opts.search ? {} : { responseMimeType: "application/json" }) },
  };
  if (opts.search) body.tools = [{ google_search: {} }];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000), cache: "no-store",
  });
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
