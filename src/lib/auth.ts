import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "planner_session";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-please-32chars");

export async function createSession() {
  return new SignJWT({ ok: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
}

export async function verifySession(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, key());
    return true;
  } catch {
    return false;
  }
}
