// Real recipes from TheMealDB (free, with photos and original source links),
// filtered to what you can cook with a gas cooker, rice cooker, sandwich maker and air fryer.
import { unstable_cache } from "next/cache";
import { getJSON } from "./fetchx";
import { geminiJSON, hasGemini } from "./gemini";

export type Recipe = {
  id: string; name: string; image: string; category: string; area: string; source: string; youtube: string;
  appliances: string[]; tip: string; ingredients: string[]; minutesHint: string;
};

type Meal = Record<string, string | null>;
const API = "https://www.themealdb.com/api/json/v1/1";
const HEALTHY_CATEGORIES = ["Chicken", "Seafood", "Vegetarian", "Vegan", "Breakfast", "Pasta", "Miscellaneous"];

const NEEDS_OVEN = /\b(oven|bake[ds]?|baking|roast(?:ing)?|broil|preheat)\b/i;
const IMPOSSIBLE = /\b(slow cooker|crock ?pot|pressure cooker|instant pot|food processor|blender|blitz|stand mixer|electric mixer|barbecue|bbq|deep[- ]?fr(y|ied|ying)|deep fat|smoker|microwave)\b/i;
const UNHEALTHY = /\b(double cream|heavy cream|condensed milk|icing sugar|lard|suet)\b/gi;

function parseMeal(m: Meal): Recipe & { instructions: string } {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m[`strIngredient${i}`] || "").trim();
    if (ing) ingredients.push(`${(m[`strMeasure${i}`] || "").trim()} ${ing}`.trim());
  }
  return {
    id: m.idMeal || "", name: m.strMeal || "", image: m.strMealThumb || "", category: m.strCategory || "", area: m.strArea || "",
    source: m.strSource || `https://www.themealdb.com/meal/${m.idMeal}`, youtube: m.strYoutube || "",
    appliances: [], tip: "", ingredients, minutesHint: "", instructions: m.strInstructions || "",
  };
}

function classify(r: ReturnType<typeof parseMeal>): { ok: boolean; maybeAirFryer: boolean } {
  const text = r.instructions;
  if (IMPOSSIBLE.test(text)) return { ok: false, maybeAirFryer: false };
  if ((text.match(UNHEALTHY) || []).length + (r.ingredients.join(" ").match(UNHEALTHY) || []).length >= 2) return { ok: false, maybeAirFryer: false };
  const apps = new Set<string>();
  if (/air[- ]?fr/i.test(text)) apps.add("Air fryer");
  if (/sandwich|toastie|panini|toasted/i.test(text + r.name)) apps.add("Sandwich maker");
  if (/\brice\b/i.test(r.ingredients.join(" ")) && /\b(cook|boil|simmer|steam)/i.test(text)) apps.add("Rice cooker");
  if (/\b(pan|pot|wok|saucepan|skillet|frying|fry|simmer|boil|saut|stir|heat the oil|heat oil|griddle)/i.test(text)) apps.add("Gas cooker");
  r.appliances = [...apps];
  if (NEEDS_OVEN.test(text) && !apps.has("Air fryer")) return { ok: false, maybeAirFryer: true };
  return { ok: apps.size > 0, maybeAirFryer: false };
}

async function pool(): Promise<string[]> {
  const lists = await Promise.all(HEALTHY_CATEGORIES.map((c) => getJSON<{ meals: Meal[] | null }>(`${API}/filter.php?c=${c}`).then((d) => (d.meals || []).map((m) => m.idMeal || "")).catch(() => [])));
  return [...new Set(lists.flat().filter(Boolean))].sort();
}

async function lookup(id: string) {
  const d = await getJSON<{ meals: Meal[] | null }>(`${API}/lookup.php?i=${id}`);
  return d.meals?.[0] ? parseMeal(d.meals[0]) : null;
}

function shuffle<T>(xs: T[], seedStr: string) {
  let seed = [...seedStr].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

async function pickRecipes(seed: string, count = 9): Promise<Recipe[]> {
  const ids = shuffle(await pool(), seed).slice(0, 36);
  if (!ids.length) throw new Error("Couldn't reach TheMealDB");
  const meals = (await Promise.all(ids.map((id) => lookup(id).catch(() => null)))).filter(Boolean) as ReturnType<typeof parseMeal>[];
  const good: Recipe[] = [], ovenOnes: ReturnType<typeof parseMeal>[] = [];
  for (const m of meals) {
    const c = classify(m);
    if (c.ok) good.push(m); else if (c.maybeAirFryer) ovenOnes.push(m);
  }
  // Ask Gemini which oven recipes work in a small air fryer, with a short tip.
  if (hasGemini() && ovenOnes.length && good.length < count) {
    try {
      const { data } = await geminiJSON<{ id: string; airFryer: boolean; tip: string }[]>(
        `For each recipe, can the oven steps be done in a home air fryer (about 4–5 litres) without losing the dish? If yes, give a one-line tip with temperature and time.\n` +
        `Return JSON: [{"id": "...", "airFryer": true/false, "tip": "..."}]\n\n` + ovenOnes.slice(0, 15).map((m) => `[${m.id}] ${m.name}: ${m.instructions.slice(0, 700)}`).join("\n\n"));
      for (const d of data) {
        const m = ovenOnes.find((o) => o.id === d.id);
        if (m && d.airFryer) { m.appliances = [...new Set(["Air fryer", ...m.appliances])]; m.tip = `Instead of the oven: ${d.tip}`; good.push(m); }
      }
    } catch { /* skip */ }
  }
  // Prefer variety in appliances
  return good.slice(0, count).map((m) => ({ ...m, instructions: undefined } as unknown as Recipe));
}

const cachedPicks = unstable_cache(async (seed: string) => pickRecipes(seed), ["recipes", "v1"], { revalidate: 60 * 60 * 24 * 8 });
export const getRecipes = (seed: string) => cachedPicks(seed);

export async function searchRecipes(q: string): Promise<Recipe[]> {
  const d = await getJSON<{ meals: Meal[] | null }>(`${API}/search.php?s=${encodeURIComponent(q)}`);
  return (d.meals || []).map(parseMeal).filter((m) => classify(m).ok).slice(0, 12).map((m) => ({ ...m, instructions: undefined } as unknown as Recipe));
}

export function isoWeek(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
