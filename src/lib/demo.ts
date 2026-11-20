// Sample data used until your Google Sheets are connected ("demo mode").
import { addDays, todayISO } from "./dates";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function demoTransactions() {
  const r = rng(42);
  const today = todayISO();
  const rows: { date: string; type: string; category: string; amount: number; description: string; method: string }[] = [];
  const daily: [string, number, number, string][] = [
    ["Food", 0.8, 900, "Lunch"], ["Transport", 0.6, 450, "Bus / PickMe"], ["Groceries", 0.25, 3500, "Keells"],
    ["Entertainment", 0.08, 2500, "Movie"], ["Shopping", 0.07, 6000, "Clothes"], ["Health", 0.04, 3000, "Pharmacy"],
  ];
  for (let i = 150; i >= 0; i--) {
    const d = addDays(today, -i);
    const dom = Number(d.slice(8, 10));
    if (dom === 1) {
      rows.push({ date: d, type: "Income", category: "Salary", amount: 185000, description: "Monthly salary", method: "Bank" });
      rows.push({ date: d, type: "Expense", category: "Rent", amount: 45000, description: "Room rent", method: "Bank" });
    }
    if (dom === 15 && r() > 0.4) rows.push({ date: d, type: "Income", category: "Freelance", amount: Math.round(20000 + r() * 30000), description: "Video editing gig", method: "Bank" });
    if (dom === 5) rows.push({ date: d, type: "Expense", category: "Utilities", amount: Math.round(7000 + r() * 3000), description: "Electricity + water", method: "Card" });
    if (dom === 10) rows.push({ date: d, type: "Expense", category: "Subscriptions", amount: 3290, description: "Medium + Spotify + iCloud", method: "Card" });
    for (const [cat, p, base, desc] of daily) {
      if (r() < p) rows.push({ date: d, type: "Expense", category: cat, amount: Math.round(base * (0.6 + r() * 0.8)), description: desc, method: r() > 0.5 ? "Cash" : "Card" });
    }
  }
  // A deliberately odd purchase so the anomaly detector has something to show.
  rows.push({ date: addDays(today, -3), type: "Expense", category: "Food", amount: 8900, description: "Birthday dinner", method: "Card" });
  return rows;
}

export const demoBudgets = [
  { category: "Food", budget: 25000 }, { category: "Transport", budget: 9000 }, { category: "Groceries", budget: 22000 },
  { category: "Rent", budget: 45000 }, { category: "Utilities", budget: 10000 }, { category: "Shopping", budget: 10000 },
  { category: "Entertainment", budget: 5000 }, { category: "Health", budget: 5000 }, { category: "Subscriptions", budget: 3500 },
];

export function demoBills() {
  const t = todayISO();
  return [
    { name: "Room rent", amount: 45000, type: "Bill", frequency: "Monthly", nextDue: addDays(t, 6), category: "Rent" },
    { name: "Electricity (CEB)", amount: 6500, type: "Bill", frequency: "Monthly", nextDue: addDays(t, 2), category: "Utilities" },
    { name: "Medium", amount: 1500, type: "Subscription", frequency: "Monthly", nextDue: addDays(t, 9), category: "Subscriptions" },
    { name: "Spotify", amount: 990, type: "Subscription", frequency: "Monthly", nextDue: addDays(t, 13), category: "Subscriptions" },
    { name: "Gym membership", amount: 12000, type: "Subscription", frequency: "Quarterly", nextDue: addDays(t, 20), category: "Health" },
  ];
}

export function demoDeadlines() {
  const t = todayISO();
  return [
    { title: "Computer Vision final exam", type: "Exam", subject: "Computer Vision", due: addDays(t, 18), notes: "Hall A" },
    { title: "XAI paper review", type: "Submission", subject: "XAI", due: addDays(t, 6), notes: "Submit on Moodle" },
    { title: "Cognitive Neuroscience quiz", type: "Exam", subject: "Neuroscience", due: addDays(t, 3), notes: "" },
    { title: "Research proposal draft", type: "Submission", subject: "Research", due: addDays(t, 30), notes: "Send to supervisor" },
  ];
}

export function demoTasks() {
  const t = todayISO();
  const mk = (subject: string, task: string, deadline: string, status: string, hours: number, doneOn = "", priority = "") => ({ subject, task, deadline, status, hours, doneOn, priority });
  return [
    mk("Computer Vision", "L1 Image formation", "Computer Vision final exam", "Done", 2, addDays(t, -20)),
    mk("Computer Vision", "L2 Filtering & edges", "Computer Vision final exam", "Done", 3, addDays(t, -15)),
    mk("Computer Vision", "L3 Feature detection (SIFT, ORB)", "Computer Vision final exam", "Done", 3, addDays(t, -9)),
    mk("Computer Vision", "L4 CNNs", "Computer Vision final exam", "Todo", 4),
    mk("Computer Vision", "L5 Object detection", "Computer Vision final exam", "Todo", 4, "", "High"),
    mk("Computer Vision", "L6 Segmentation", "Computer Vision final exam", "Todo", 3),
    mk("Computer Vision", "Past paper 2024", "Computer Vision final exam", "Todo", 3),
    mk("XAI", "Read the paper twice", "XAI paper review", "Done", 3, addDays(t, -4)),
    mk("XAI", "Write summary + critique", "XAI paper review", "Todo", 4),
    mk("XAI", "Proofread & format", "XAI paper review", "Todo", 1),
    mk("Neuroscience", "Week 6-7 slides", "Cognitive Neuroscience quiz", "Todo", 3),
    mk("Neuroscience", "Week 8 slides", "Cognitive Neuroscience quiz", "Done", 2, addDays(t, -2)),
    mk("Research", "Literature review (10 papers)", "Research proposal draft", "Todo", 10),
    mk("Research", "Method section", "Research proposal draft", "Todo", 6),
  ];
}

export function demoStudyLog() {
  const r = rng(7);
  const t = todayISO();
  const out: { date: string; hours: number; subject: string }[] = [];
  const subs = ["Computer Vision", "XAI", "Neuroscience", "Research"];
  for (let i = 27; i >= 1; i--) {
    const h = r() < 0.15 ? 0 : Math.round((1 + r() * 5) * 2) / 2;
    if (h > 0) out.push({ date: addDays(t, -i), hours: h, subject: subs[Math.floor(r() * subs.length)] });
  }
  return out;
}

export function demoEvents() {
  const t = todayISO();
  const ev = (offset: number, time: string | null, title: string, category: string, durMin = 60, location = "") => ({
    id: `${offset}-${title}`, date: addDays(t, offset), time, endTime: time ? addMinutes(time, durMin) : null, title, category, location, source: "demo",
  });
  return [
    ev(0, "07:00", "Gym - legs day", "Gym", 75, "PowerWorld"),
    ev(0, "10:00", "Computer Vision lecture", "Lecture", 120, "Room 204"),
    ev(0, "16:30", "Supervisor meeting", "Meeting", 30, "Zoom"),
    ev(1, "09:00", "Neuroscience lecture", "Lecture", 120),
    ev(1, "18:00", "Gym - upper body", "Gym", 75),
    ev(2, null, "Electricity bill due", "Bill"),
    ev(3, "13:00", "Cognitive Neuroscience quiz", "Exam", 60),
    ev(4, "19:00", "Cousin's wedding", "Function", 240, "Galle Face Hotel"),
    ev(6, null, "XAI paper review deadline", "Deadline"),
    ev(6, null, "Room rent due", "Bill"),
    ev(9, null, "Medium renewal", "Subscription"),
    ev(11, "15:00", "Content shoot: Ane Manda", "Event", 180),
    ev(18, "09:00", "Computer Vision final exam", "Exam", 180, "Hall A"),
  ];
}

function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
