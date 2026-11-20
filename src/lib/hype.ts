// Sassy hype lines for the Weight tab, built from your real numbers. A different mix every day.
import { config } from "./config";
import { daysBetween, todayISO } from "./dates";
import type { analyseMeasurements, analyseWeight, WeightEntry } from "./life";

type W = NonNullable<ReturnType<typeof analyseWeight>>;
type M = ReturnType<typeof analyseMeasurements>;

/** Seeded shuffle so the picks change every day but stay the same all day. */
export function dailyShuffle<T>(list: T[], seedText: string): T[] {
  let seed = [...seedText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function weightHype(a: W | null, entries: WeightEntry[], m: M, date = todayISO()): string[] {
  const ex = config.exName;
  const lines: string[] = [];
  const always = [
    "Bitch. You got this. 💪",
    "Oh youuu super model 📸✨",
    "Main character energy ONLY. 🎬",
    "Hydrate. Slay. Repeat. 💧",
    "Your future self just screamed THANK YOU 🗣️",
    "Not a snack. The whole buffet. 🍱👑",
    "Mirror mirror on the wall… oh it's obviously you. 🪞",
    "Discipline looks SO good on you. 🫡",
    "Girl, the glow up is LOADING ▓▓▓▓▓░ 💅",
    "Sweat now, strut later. 👠",
  ];
  if (ex) always.push(
    `Imagine how ${ex} would regret it when he sees you. The REGRET. 😌`,
    `${ex} who? Never heard of him. 💁‍♀️`,
    `Somewhere ${ex} is crying and he doesn't even know why yet. 🥲`,
    `Glow up so loud ${ex} will hear it from across the island. 📢`,
  );

  if (a) {
    const days = Math.max(1, daysBetween(a.start.date, a.current.date));
    if (a.lost > 0) {
      lines.push(`OMG girl you've lost ${a.lost} kg in just ${days} days 😱`);
      lines.push(`${a.lost} kg GONE. Like your ex's chances. 👋`);
      lines.push(`That's ${Math.round(a.lost / 0.25)} cups of rice worth of you… gone. Iconic. 🍚`);
    }
    const weekAgo = [...entries].reverse().find((e) => daysBetween(e.date, a.current.date) >= 6);
    const week = weekAgo ? r1(weekAgo.kg - a.current.kg) : 0;
    if (week > 0) lines.push(`${week} kg down this week?? Who IS she 💅`);
    if (a.goal && a.toGo > 0) lines.push(`Only ${r1(a.toGo)} kg to go. That's literally a bag of sugar. Carry on, queen 👑`);
    if (a.goal && a.toGo <= 0) lines.push("GOAL. WEIGHT. REACHED. Somebody call Vogue. 📞📸");
    if (a.mood === "steady") lines.push("Hang in there girl. Plateaus are just your body buffering ⏳");
    if (a.mood === "gaining") lines.push("Okay, a tiny bump. Still hot. Still unstoppable. Back at it tomorrow 🔥", "Hang in there girl. Water weight is a liar. 💧🙄");
    if (a.daysSinceLast > 5) lines.push(`${a.daysSinceLast} days without a weigh-in?? The scale misses you, babe. ⚖️💔`);
    if (entries.length >= 5) lines.push(`${entries.length} weigh-ins logged. Consistency queen. 👑`);
  }
  if (m) {
    if (m.totalLost > 0) lines.push(`${m.totalLost} cm gone from your body in total. Inches don't lie 📏`);
    if (m.change.waist < 0) lines.push(`Waist down ${r1(-m.change.waist)} cm. Your jeans are SHOOK 👖`);
    if (m.change.hip < 0) lines.push(`Hips ${r1(-m.change.hip)} cm smaller. Shakira who? 💃`);
    if (m.change.belly < 0) lines.push(`Belly down ${r1(-m.change.belly)} cm. Crop tops, we're coming back 🫶`);
    if (m.change.arms < 0) lines.push(`Arms ${r1(-m.change.arms)} cm slimmer. Wave hello to toned 👋`);
    if (m.change.thigh < 0) lines.push(`Thighs down ${r1(-m.change.thigh)} cm. Strut mode activated 🚶‍♀️✨`);
  }
  // Mostly real-number lines, topped up with general hype; a fresh mix each day.
  const real = dailyShuffle(lines, date + "r");
  const fun = dailyShuffle(always, date + "f");
  const picks = [...real.slice(0, 3), ...fun].slice(0, 5);
  return dailyShuffle(picks, date + "o");
}
