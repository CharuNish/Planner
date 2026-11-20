"use server";
import { revalidatePath } from "next/cache";
import { config, financeIsDemo } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { appendRow, ensureTab } from "@/lib/google";
import { INV_DROPDOWNS, INV_HEADERS, INV_TAB } from "@/lib/investments";

type Result = { ok?: string; error?: string } | null;

/** Adds one FD / investment row to the Investments tab (creating the tab first if needed). */
export async function addInvestment(_: Result, f: FormData): Promise<Result> {
  if (financeIsDemo()) return { error: "Connect your finance sheet first (see SETUP.md)." };
  const g = (k: string) => String(f.get(k) || "").trim();
  const amount = Number(g("amount"));
  if (!amount || amount <= 0) return { error: "Enter the amount you put in." };
  const type = g("type") || "Fixed Deposit";
  const start = g("start") || todayISO();
  const status = g("status") || (start > todayISO() ? "Planned" : "Active");
  // Same order as INV_HEADERS: Name, Type, Institution, Amount, Rate %, Start Date, Term (Months), Maturity Date, Interest Payout, Auto Renew, Current Value, Status, Notes
  const row = [g("name") || type, type, g("institution"), amount, g("rate"), start, g("term"), g("maturity"), g("payout") || "At Maturity", g("renew") ? "Yes" : "No", g("current"), status, g("notes")];
  try {
    await ensureTab(config.google.financeSheetId, INV_TAB, INV_HEADERS, INV_DROPDOWNS);
    await appendRow(config.google.financeSheetId, INV_TAB, row);
  } catch (e) { return { error: String(e) }; }
  revalidatePath("/finance");
  return { ok: status === "Planned" ? "Planned FD saved 🌱 I'll remind you when it's time" : "Saved to your Investments tab ✓ Money making money!" };
}
