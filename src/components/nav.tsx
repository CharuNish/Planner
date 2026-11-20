"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/tabs";



export function Nav() {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <aside className="hidden md:flex flex-col gap-1 w-56 shrink-0 p-4 sticky top-0 h-dvh">
        <div className="px-3 py-4 text-lg font-semibold">🌸 My Planner</div>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active(t.href) ? "soft font-semibold" : "hover:bg-black/5 dark:hover:bg-white/5"} ${t.soon ? "opacity-60" : ""}`}>
            <span>{t.icon}</span>{t.label}{t.soon && <span className="ml-auto text-[10px] muted">soon</span>}
          </Link>
        ))}
      </aside>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
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
