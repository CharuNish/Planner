"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

export async function login(_: unknown, form: FormData) {
  const pw = String(form.get("password") || "");
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) return { error: "No password set yet. Add APP_PASSWORD to your settings (see SETUP.md)." };
  const a = Buffer.from(pw), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "Wrong password, try again." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
