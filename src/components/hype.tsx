import { Bebas_Neue, Caveat, Pacifico, Permanent_Marker, Righteous } from "next/font/google";

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"] });
const caveat = Caveat({ weight: "700", subsets: ["latin"] });
const righteous = Righteous({ weight: "400", subsets: ["latin"] });

const STYLES = [
  { font: pacifico.className, size: "text-2xl md:text-3xl", grad: "linear-gradient(90deg,#f472b6,#c084fc)", rot: -3, align: "justify-start" },
  { font: bebas.className, size: "text-4xl md:text-5xl tracking-wide", grad: "linear-gradient(90deg,#22d3ee,#a78bfa)", rot: 2, align: "justify-end" },
  { font: marker.className, size: "text-2xl md:text-3xl", grad: "linear-gradient(90deg,#fbbf24,#f472b6)", rot: -1.5, align: "justify-center" },
  { font: caveat.className, size: "text-3xl md:text-4xl", grad: "linear-gradient(90deg,#34d399,#22d3ee)", rot: 2.5, align: "justify-start" },
  { font: righteous.className, size: "text-2xl md:text-3xl", grad: "linear-gradient(90deg,#fb7185,#fbbf24)", rot: -2, align: "justify-end" },
];

/** A big, bold hype line that sits between sections. `i` picks the font/colour/tilt. */
export function Hype({ text, i }: { text?: string; i: number }) {
  if (!text) return null;
  const s = STYLES[i % STYLES.length];
  return (
    <div className={`flex ${s.align} px-1 md:px-6 py-1 pointer-events-none select-none`} aria-label={text}>
      <p className={`hype ${s.font} ${s.size} leading-tight max-w-3xl`} style={{ transform: `rotate(${s.rot}deg)`, animationDelay: `${i * 0.25}s`, backgroundImage: s.grad }}>
        {text.split(/(\p{Extended_Pictographic}(?:[\uFE0F\u200D]\p{Extended_Pictographic}?)*\uFE0F?)/u).map((part, j) =>
          /\p{Extended_Pictographic}/u.test(part) ? <span key={j} className="hype-emoji">{part}</span> : part)}
      </p>
    </div>
  );
}
