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
      <header className="hidden md:block sticky top-0 z-20 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
        <div className="max-w-7xl mx-auto px-8 flex items-center gap-6 h-14">
          <Link href="/" className="font-semibold shrink-0">🌸 My Planner</Link>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${active(t.href) ? "soft font-semibold" : "hover:bg-black/5 dark:hover:bg-white/5"} ${t.soon ? "opacity-50" : ""}`}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* Bottom bar (phones) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t backdrop-blur" style={{ background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
        <div className="flex overflow-x-auto px-2 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center min-w-16 px-2 py-2 text-[11px] ${active(t.href) ? "font-semibold text-accent" : "muted"} ${t.soon ? "opacity-60" : ""}`}>
              <span className="text-lg leading-none mb-0.5">{t.icon}</span>{t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
