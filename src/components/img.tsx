"use client";
import { useState } from "react";

/** Image that falls back to a soft gradient with an emoji if it fails to load. */
export function SafeImg({ src, alt, emoji = "✨", className = "" }: { src: string; alt: string; emoji?: string; className?: string }) {
  const [bad, setBad] = useState(!src);
  if (bad) return <div className={`grid place-items-center text-4xl ${className}`} style={{ background: "linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--series-3) 25%, transparent))" }}>{emoji}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className={`object-cover ${className}`} />;
}
