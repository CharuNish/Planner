import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Every page needs you to be logged in, except the login page, the phone-app files and the cron job.
const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js", "/icons", "/api/cron", "/api/queue", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
