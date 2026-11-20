"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/tabs";

export function Nav() {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      {/* Top bar (computers and tablets) */}
      <header className="hidden md:block sticky top-0 z-30 border-b backdrop-blur-xl" style={{ background: "rgba(7,9,18,.72)" }}>
        <div className="max-w-7xl mx-auto px-8 flex items-center gap-6 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-sm" style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", boxShadow: "0 0 18px rgba(139,92,246,.6)" }}>✦</span>
            <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Charu&apos;s <span className="gradient-text">Dashboard</span></span>
          </Link>
          <nav className="flex gap-0.5 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const on = active(t.href);
              return (
                <Link key={t.href} href={t.href}
                  className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${on ? "text-white" : "muted hover:text-white"} ${t.soon ? "opacity-50" : ""}`}>
                  <span className="mr-1">{t.icon}</span>{t.label}
                  {on && <span className="absolute left-3 right-3 -bottom-[11px] h-[2px] rounded-full" style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", boxShadow: "0 0 10px #8b5cf6" }} />}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {/* Bottom bar (phones) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl" style={{ background: "rgba(7,9,18,.85)" }}>
        <div className="flex overflow-x-auto no-scrollbar px-2 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center min-w-16 px-2 py-2 text-[11px] ${active(t.href) ? "font-semibold text-white" : "muted"} ${t.soon ? "opacity-60" : ""}`}>
              <span className="text-lg leading-none mb-0.5" style={active(t.href) ? { filter: "drop-shadow(0 0 6px #8b5cf6)" } : undefined}>{t.icon}</span>{t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
