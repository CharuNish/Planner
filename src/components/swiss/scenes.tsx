/* One code-drawn Swiss scene per tab. Each scene is layers of SVG wrapped in <Depth>, so they slide
 * at different speeds when the cursor moves (or the phone tilts), plus small looping animations. */
import { at, Birds, Chalet, Cloud, Depth, Glow, H, Peak, Pines, Range, Reflect, ridge, rng, Shimmer, Sky, Snowfall, Stars, toPath, W } from "./kit";

export type SceneKey = "matterhorn" | "matterhorn-night" | "zurich" | "glacier-express" | "lucerne" | "jungfrau" | "meadow" | "village" | "lauterbrunnen" | "geneva";

/* ───────────── Home: Matterhorn at sunrise over a mirror lake ───────────── */
const MATTERHORN = "M380,770 L470,640 L560,560 L640,470 L700,392 L735,330 L770,262 L792,214 L806,186 L820,168 L834,176 L846,194 L858,226 L880,280 L912,330 L950,382 L1000,430 L1060,478 L1130,530 L1220,590 L1300,640 L1400,770 L380,770 Z";
const MATTERHORN_SHADE = "M820,168 L834,176 L846,194 L858,226 L880,280 L912,330 L950,382 L1000,430 L1060,478 L1130,530 L1220,590 L1300,640 L1400,770 L900,770 L860,420 L840,300 Z";

function Matterhorn({ night = false }: { night?: boolean }) {
  const far = ridge(11, 640, 140, [{ x: 250, h: 260, w: 260 }, { x: 1380, h: 230, w: 280 }]);
  const mid = ridge(12, 700, 90, [{ x: 140, h: 160, w: 220 }, { x: 1500, h: 170, w: 260 }], 0.6);
  const shore = ridge(13, 742, 26, [], 0.5);
  const peakFill = night ? "#2a3150" : "#3a3550";
  return (
    <>
      <Sky stops={night ? ["#04050d", "#0b1030", "#1b2350", "#2a2f5c"] : ["#0d1030", "#2b2a62", "#7a4a86", "#e48a8a", "#ffc79a"]} />
      <Depth d={0.1}>
        {night ? <><Stars n={170} maxY={620} /><circle cx={1240} cy={170} r={34} fill="#f3f1e3" /><Glow cx={1240} cy={170} r={180} color="#c9d4ff" opacity={0.35} /></>
          : <><Stars n={50} maxY={260} /><Glow cx={800} cy={640} r={520} color="#ffb48a" opacity={0.55} /></>}
      </Depth>
      <Depth d={0.25}>
        <Range pts={far} fill={night ? "#1a2040" : "#4b3f68"} haze={night ? "#262c55" : "#8a5f86"} snow={night ? "#9fb2e8" : "#f5c4c4"} shade={0.25} peaks={[{ x: 250, h: 260, w: 260 }, { x: 1380, h: 230, w: 280 }]} />
      </Depth>
      <Depth d={0.4}>
        <path d={MATTERHORN} fill={peakFill} />
        <path d={MATTERHORN} fill={night ? "url(#mh-snow-n)" : "url(#mh-snow)"} />
        <path d={MATTERHORN_SHADE} fill="url(#mh-shade)" />
        <defs>
          <linearGradient id="mh-snow" x1="0" y1="168" x2="0" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffd2b8" /><stop offset=".45" stopColor="#ff9f9f" stopOpacity=".7" /><stop offset="1" stopColor="#ff9f9f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mh-shade" x1="0" y1="168" x2="0" y2="760" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" stopOpacity=".32" /><stop offset="1" stopColor="#000" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="mh-snow-n" x1="0" y1="168" x2="0" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#dfe7ff" /><stop offset=".5" stopColor="#9fb2e8" stopOpacity=".55" /><stop offset="1" stopColor="#9fb2e8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Cloud x={980} y={300} s={0.9} opacity={night ? 0.12 : 0.35} color={night ? "#c9d4ff" : "#ffd9d0"} dur={110} />
      </Depth>
      <Depth d={0.55}>
        <Range pts={mid} fill={night ? "#121733" : "#2c2547"} haze={night ? "#1a2045" : "#4a3660"} />
        <Pines seed={4} y0={0} onRidge={(x) => at(mid, x) + 18} n={70} color={night ? "#0b0f24" : "#1c1734"} />
      </Depth>
      <Depth d={0.55}>
        <rect x={-100} y={742} width={W + 200} height={300} fill={night ? "#0a0e22" : "#3a2c4e"} />
        <Reflect y={742} opacity={night ? 0.35 : 0.42}>
          <path d={MATTERHORN} fill={peakFill} transform="translate(0,102)" />
          <path d={MATTERHORN} fill={night ? "url(#mh-snow-n)" : "url(#mh-snow)"} transform="translate(0,102)" />
        </Reflect>
        <Shimmer seed={5} y0={760} y1={980} color={night ? "#c9d4ff" : "#ffd2b8"} n={50} />
      </Depth>
      <Depth d={0.85}>
        <path d={toPath(shore.map(([x, y]) => [x, y + 220]))} fill={night ? "#05070f" : "#140f22"} />
        <Pines seed={9} y0={0} onRidge={(x) => shore[Math.round((x + 60) / 12)]?.[1] + 220 || 960} x0={-40} x1={330} n={16} size={2.2} color={night ? "#05070f" : "#140f22"} />
        <Pines seed={10} y0={0} onRidge={(x) => shore[Math.round((x + 60) / 12)]?.[1] + 220 || 960} x0={1290} x1={1660} n={16} size={2.2} color={night ? "#05070f" : "#140f22"} />
      </Depth>
      {!night && <Birds x={300} y={330} n={5} color="#2b2240" dur={48} />}
    </>
  );
}

/* ───────────── Finance: Zurich old town on the Limmat at dusk ───────────── */
function Building({ x, w, h, roof = "gable", color, lit, seed, base = 760 }: { x: number; w: number; h: number; roof?: "gable" | "flat" | "step"; color: string; lit: string; seed: number; base?: number }) {
  const r = rng(seed);
  const y = base - h;
  const cols = Math.max(2, Math.floor(w / 18)), rows = Math.max(2, Math.floor(h / 26));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} />
      {roof === "gable" && <path d={`M${x - 3},${y} L${x + w / 2},${y - w * 0.55} L${x + w + 3},${y} Z`} fill={color} />}
      {roof === "step" && <path d={`M${x},${y} L${x},${y - 14} L${x + w * 0.2},${y - 14} L${x + w * 0.2},${y - 28} L${x + w * 0.4},${y - 28} L${x + w * 0.4},${y - 42} L${x + w * 0.6},${y - 42} L${x + w * 0.6},${y - 28} L${x + w * 0.8},${y - 28} L${x + w * 0.8},${y - 14} L${x + w},${y - 14} L${x + w},${y} Z`} fill={color} />}
      {Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => {
        const on = r() < 0.42;
        return on ? <rect key={`${i}-${j}`} x={x + 6 + i * ((w - 12) / cols)} y={y + 10 + j * 24} width={7} height={11} fill={lit} opacity={0.55 + r() * 0.45}
          className={r() < 0.15 ? "sw-flicker" : undefined} style={{ animationDelay: `${(r() * 8).toFixed(1)}s` }} /> : null;
      }))}
    </g>
  );
}

function Zurich() {
  const alps = ridge(21, 600, 60, [{ x: 300, h: 150, w: 220 }, { x: 620, h: 190, w: 200 }, { x: 1100, h: 170, w: 240 }, { x: 1420, h: 140, w: 200 }], 0.55, 10);
  const lit = "#ffcf7a";
  const city = (
    <g>
      {/* Grossmünster twin towers */}
      <g fill="#241d33">
        <rect x={700} y={430} width={46} height={330} /><rect x={772} y={430} width={46} height={330} />
        <path d="M700,430 Q723,370 746,430 Z" /><path d="M772,430 Q795,370 818,430 Z" />
        <rect x={720} y={350} width={6} height={30} /><rect x={792} y={350} width={6} height={30} />
        <rect x={690} y={560} width={140} height={200} />
        <rect x={713} y={470} width={20} height={34} rx={10} fill={lit} opacity=".75" /><rect x={785} y={470} width={20} height={34} rx={10} fill={lit} opacity=".75" />
      </g>
      {/* Fraumünster slender green spire */}
      <g><rect x={1010} y={480} width={34} height={280} fill="#22293a" /><path d="M1004,480 L1027,330 L1050,480 Z" fill="#2f6b5e" /><circle cx={1027} cy={520} r={10} fill={lit} opacity=".8" /></g>
      {/* St. Peter clock tower */}
      <g><rect x={460} y={470} width={40} height={290} fill="#262036" /><path d="M456,470 L480,400 L504,470 Z" fill="#2f6b5e" /><circle cx={480} cy={500} r={13} fill="#f2e6c8" /><circle cx={480} cy={500} r={13} fill="none" stroke="#000" strokeOpacity=".4" /><line x1={480} y1={500} x2={480} y2={491} stroke="#333" strokeWidth={2} /><line x1={480} y1={500} x2={487} y2={503} stroke="#333" strokeWidth={2} /></g>
      {[[-40, 120, 210, "gable"], [80, 90, 170, "step"], [170, 110, 240, "gable"], [280, 80, 180, "gable"], [360, 95, 200, "flat"], [505, 85, 190, "gable"], [590, 100, 230, "step"],
        [840, 80, 200, "gable"], [920, 85, 170, "flat"], [1060, 110, 210, "gable"], [1170, 90, 250, "step"], [1260, 120, 190, "gable"], [1380, 90, 220, "gable"], [1470, 160, 180, "flat"]]
        .map(([x, w, h, roof], i) => <Building key={i} x={x as number} w={w as number} h={h as number} roof={roof as "gable"} color={["#2a2238", "#30263f", "#272033", "#33293f"][i % 4]} lit={lit} seed={30 + i} />)}
    </g>
  );
  return (
    <>
      <Sky stops={["#0c0f2a", "#28245a", "#6d3f78", "#d77a6a", "#f6b47a"]} />
      <Depth d={0.1}><Stars n={60} maxY={300} /><Glow cx={1150} cy={600} r={500} color="#ffad7a" opacity={0.45} /></Depth>
      <Depth d={0.2}><Range pts={alps} fill="#55456e" haze="#b0707e" snow="#f9c9c0" shade={0.2} peaks={[{ x: 620, h: 190, w: 200 }, { x: 1100, h: 170, w: 240 }]} /></Depth>
      <Depth d={0.3}><Cloud x={300} y={250} opacity={0.25} color="#ffc6b0" dur={120} /><Cloud x={1100} y={180} s={0.7} opacity={0.2} color="#ffc6b0" dur={95} delay={40} /></Depth>
      <Depth d={0.5}>
        {city}
        <rect x={-100} y={760} width={W + 200} height={300} fill="#1b1730" />
        <Reflect y={760} opacity={0.5} blur={3}>{city}</Reflect>
        <Shimmer seed={22} y0={772} y1={990} n={70} color="#ffcf7a" />
        {/* Quai with street lamps */}
        <rect x={-100} y={756} width={W + 200} height={8} fill="#120f1f" />
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}><rect x={60 + i * 140} y={724} width={3} height={34} fill="#120f1f" /><circle cx={61.5 + i * 140} cy={722} r={4} fill="#ffe2a8" /><Glow cx={61.5 + i * 140} cy={722} r={26} color="#ffcf7a" opacity={0.6} /></g>
        ))}
      </Depth>
      <Depth d={0.75}>
        {/* Tram crossing the bridge */}
        <path d="M-100,880 Q800,830 1700,880 L1700,900 Q800,850 -100,900 Z" fill="#100d1b" />
        <g className="sw-tram"><g transform="translate(0,836)"><rect x={0} y={0} width={180} height={34} rx={8} fill="#2e6fd1" /><rect x={0} y={20} width={180} height={14} rx={4} fill="#f2f2f2" opacity=".9" />{[12, 52, 92, 132].map((x) => <rect key={x} x={x} y={5} width={30} height={11} rx={2} fill="#ffe7a8" />)}</g></g>
      </Depth>
    </>
  );
}

/* ───────────── Calendar: red Glacier Express crossing the Landwasser viaduct ───────────── */
function GlacierExpress() {
  const fp: Peak[] = [{ x: 380, h: 300, w: 260, s: 0.25 }, { x: 860, h: 250, w: 240, s: -0.2 }, { x: 1250, h: 330, w: 300, s: 0.15 }];
  const far = ridge(41, 560, 120, fp);
  const mid = ridge(42, 720, 160, [{ x: 150, h: 260, w: 280 }, { x: 1450, h: 300, w: 300 }], 0.5);
  const deck = 640;
  const arches = Array.from({ length: 10 }, (_, i) => 260 + i * 110);
  return (
    <>
      <Sky stops={["#123a6b", "#3b78b0", "#8cc0e0", "#f2e3c6"]} />
      <Depth d={0.1}><Glow cx={1250} cy={180} r={340} color="#ffe9a8" opacity={0.7} /><circle cx={1250} cy={180} r={42} fill="#fff3c4" /></Depth>
      <Depth d={0.22}><Range pts={far} fill="#5d7a9c" haze="#a9c3d6" snow="#ffffff" snowLine={420} shade={0.3} peaks={fp} /></Depth>
      <Depth d={0.3}><Cloud x={300} y={240} opacity={0.6} dur={100} /><Cloud x={900} y={330} s={0.8} opacity={0.5} dur={130} delay={60} /></Depth>
      <Depth d={0.45}>
        <Range pts={mid} fill="#2e4a52" haze="#3f6066" />
        <Pines seed={43} y0={0} onRidge={(x) => at(mid, x) + 20} n={110} color="#1d3438" />
      </Depth>
      <Depth d={0.6}>
        {/* Train (behind the parapet) */}
        <g className="sw-train">
          <g transform={`translate(0,${deck - 34})`}>
            {Array.from({ length: 5 }, (_, i) => (
              <g key={i} transform={`translate(${-i * 134},-10)`}>
                <rect x={0} y={0} width={130} height={44} rx={i === 0 ? 18 : 6} fill="#c8102e" />
                <rect x={8} y={5} width={114} height={18} rx={6} fill="#bfe3ff" opacity=".9" />
                <rect x={0} y={33} width={130} height={5} fill="#fff" opacity=".85" />
              </g>
            ))}
          </g>
        </g>
        {/* Curved stone viaduct with tall arches */}
        <path d={`M-100,${deck} L1330,${deck} L1330,${deck + 22} L-100,${deck + 22} Z`} fill="#a3978a" /><path d={`M-100,${deck - 6} L1330,${deck - 6} L1330,${deck} L-100,${deck} Z`} fill="#6e655b" />
        {arches.map((x, i) => (
          <path key={i} d={`M${x - 55},${deck + 20} L${x + 55},${deck + 20} L${x + 55},1020 L${x + 38},1020 L${x + 38},${deck + 90} Q${x},${deck + 36} ${x - 38},${deck + 90} L${x - 38},1020 L${x - 55},1020 Z`} fill={i % 2 ? "#8a7f72" : "#93887a"} />
        ))}
        <path d={`M-100,${deck + 20} L205,${deck + 20} L205,1020 L-100,1020 Z`} fill="#8a7f72" />
        {arches.map((x, i) => <rect key={i} x={x + 38} y={deck + 20} width={10} height={500} fill="#000" opacity=".14" />)}
        {/* Cliff with tunnel on the right */}
        <path d="M1320,1020 L1320,580 Q1360,500 1440,480 L1520,430 L1700,400 L1700,1020 Z" fill="#4a4752" />
        <path d="M1320,580 Q1360,500 1440,480 L1520,430 L1700,400 L1700,450 L1520,480 Q1420,520 1350,620 Z" fill="#000" opacity=".22" />
        <Pines seed={46} y0={0} onRidge={(x) => (x < 1440 ? 580 - (x - 1320) * 0.8 : 480 - (x - 1440) * 0.4) + 6} x0={1340} x1={1690} n={14} color="#1d3438" />
        <path d="M1320,640 L1320,570 Q1360,540 1400,570 L1400,640 Z" fill="#0b0b10" />
      </Depth>
      <Depth d={0.9}>
        <Pines seed={44} y0={940} y1={1010} n={30} size={2.6} color="#11221f" x0={-60} x1={500} />
        <Pines seed={45} y0={940} y1={1010} n={22} size={2.6} color="#11221f" x0={1150} x1={1660} />
      </Depth>
    </>
  );
}

/* ───────────── Studies: Lucerne's Chapel Bridge at blue hour ───────────── */
function Lucerne() {
  const pilatus = ridge(51, 640, 70, [{ x: 360, h: 260, w: 300 }, { x: 560, h: 300, w: 160 }, { x: 640, h: 270, w: 140 }, { x: 1250, h: 180, w: 300 }], 0.6, 8);
  const town = ridge(52, 700, 20, [], 0.5);
  const lantern = (x: number, y: number, i: number) => (
    <g key={i}><Glow cx={x} cy={y} r={22} color="#ffcf7a" opacity={0.85} /><circle cx={x} cy={y} r={3} fill="#fff0c8" className="sw-flicker" style={{ animationDelay: `${(i * 0.7) % 5}s` }} /></g>
  );
  // Bridge runs diagonally from left-front to the water tower.
  const bx0 = -60, by0 = 900, bx1 = 1060, by1 = 690;
  const along = (t: number) => [bx0 + (bx1 - bx0) * t, by0 + (by1 - by0) * t] as const;
  return (
    <>
      <Sky stops={["#050a1f", "#0e1b44", "#1f3a73", "#3b5c94"]} />
      <Depth d={0.1}><Stars n={160} maxY={560} /><circle cx={1300} cy={150} r={30} fill="#f4f1e0" /><circle cx={1312} cy={144} r={28} fill="#1a2c5c" /><Glow cx={1300} cy={150} r={160} color="#c8d6ff" opacity={0.3} /></Depth>
      <Depth d={0.25}><Range pts={pilatus} fill="#1a2a52" snow="#a9bce8" snowLine={520} shade={0.3} peaks={[{ x: 560, h: 300, w: 160 }]} /></Depth>
      <Depth d={0.4}>
        <path d={toPath(town)} fill="#131d3c" />
        {Array.from({ length: 26 }, (_, i) => { const r = rng(60 + i); const x = i * 64 - 20, h = 40 + r() * 60; return (
          <g key={i}><rect x={x} y={700 - h} width={52} height={h} fill="#16214a" /><path d={`M${x - 2},${700 - h} L${x + 26},${700 - h - 26} L${x + 54},${700 - h} Z`} fill="#121b3d" />
            {r() < 0.7 && <rect x={x + 10} y={700 - h + 12} width={7} height={9} fill="#ffcf7a" opacity=".8" />}{r() < 0.5 && <rect x={x + 32} y={700 - h + 12} width={7} height={9} fill="#ffcf7a" opacity=".7" />}</g>); })}
        {/* Jesuit church twin domes */}
        <g fill="#18234d"><rect x={1260} y={560} width={30} height={140} /><rect x={1330} y={560} width={30} height={140} /><circle cx={1275} cy={556} r={16} /><circle cx={1345} cy={556} r={16} /><rect x={1270} y={520} width={10} height={24} /><rect x={1340} y={520} width={10} height={24} /><rect x={1255} y={610} width={110} height={90} /></g>
      </Depth>
      <Depth d={0.55}>
        <rect x={-100} y={700} width={W + 200} height={340} fill="#0c1636" />
        <Shimmer seed={53} y0={712} y1={990} n={70} color="#ffcf7a" />
        <Shimmer seed={54} y0={712} y1={990} n={40} color="#9fb7ff" />
      </Depth>
      <Depth d={0.7}>
        {/* Water tower (octagonal, red roof) */}
        <g><rect x={1040} y={560} width={70} height={150} fill="#7a6250" /><rect x={1040} y={560} width={24} height={150} fill="#000" opacity=".2" /><path d="M1032,560 L1075,500 L1118,560 Z" fill="#8a3b2e" /><path d="M1070,500 L1075,470 L1080,500 Z" fill="#3b2b26" /><rect x={1066} y={610} width={10} height={16} fill="#ffcf7a" opacity=".8" /></g>
        {/* Covered bridge: deck, flower boxes, roof */}
        <path d={`M${bx0},${by0} L${bx1},${by1} L${bx1},${by1 + 10} L${bx0},${by0 + 14} Z`} fill="#4a3424" />
        <path d={`M${bx0},${by0 - 52} L${bx1},${by1 - 34} L${bx1},${by1 - 26} L${bx0},${by0 - 38} Z`} fill="#6a2e26" />
        <path d={`M${bx0},${by0 - 60} L${bx1},${by1 - 40} L${bx1},${by1 - 34} L${bx0},${by0 - 52} Z`} fill="#8a3b2e" />
        {Array.from({ length: 22 }, (_, i) => { const [x, y] = along(i / 21); return <rect key={i} x={x} y={y - 38 + (i / 21) * 4} width={3} height={38 - (i / 21) * 14} fill="#3b2a1d" />; })}
        {Array.from({ length: 30 }, (_, i) => { const [x, y] = along(i / 29); return <circle key={i} cx={x} cy={y - 2} r={4 - (i / 29) * 2} fill={["#e94c6b", "#ff8fa3", "#f7d046"][i % 3]} />; })}
        {Array.from({ length: 8 }, (_, i) => { const [x, y] = along((i + 0.5) / 8); return lantern(x, y - 24, i); })}
        {Array.from({ length: 14 }, (_, i) => { const [x, y] = along(i / 13); return <rect key={i} x={x - 2} y={y + 10} width={4} height={1020 - y} fill="#2a1d14" />; })}
      </Depth>
    </>
  );
}

/* ───────────── Updates: cable car gliding past the Eiger & Jungfrau ───────────── */
function Jungfrau() {
  const peaks: Peak[] = [{ x: 360, h: 430, w: 300, s: 0.45 }, { x: 780, h: 440, w: 300, s: -0.1 }, { x: 1220, h: 500, w: 340, s: -0.3 }];
  const far = ridge(61, 760, 120, peaks, 0.6, 8);
  const mid = ridge(62, 860, 140, [{ x: 100, h: 230, w: 240 }, { x: 1500, h: 260, w: 260 }], 0.55);
  return (
    <>
      <Sky stops={["#082040", "#14467a", "#3f86bf", "#a8d4ee"]} />
      <Depth d={0.1}><Glow cx={300} cy={120} r={340} color="#ffeaa0" opacity={0.65} /><circle cx={300} cy={120} r={40} fill="#fff1c0" /></Depth>
      <Depth d={0.25}>
        <Range pts={far} fill="#5f7896" haze="#9fbdd6" snow="#ffffff" snowLine={560} shade={0.32} peaks={peaks} />
        <Cloud x={600} y={520} s={1.4} opacity={0.55} dur={140} /><Cloud x={1300} y={470} s={1.1} opacity={0.5} dur={110} delay={50} />
      </Depth>
      <Depth d={0.45}>
        <Range pts={mid} fill="#2b4459" haze="#36566c" snow="#e6eef6" snowLine={720} />
        <Pines seed={63} y0={0} onRidge={(x) => at(mid, x) + 30} n={90} color="#1a2d3a" />
      </Depth>
      <Depth d={0.65}>
        {/* Cable car */}
        <line x1={-100} y1={940} x2={1700} y2={240} stroke="#0d1520" strokeWidth={2.5} />
        <line x1={-100} y1={952} x2={1700} y2={252} stroke="#0d1520" strokeWidth={1.2} opacity=".7" />
        <g className="sw-gondola">
          <g transform="translate(0,940)">
            <line x1={0} y1={0} x2={0} y2={30} stroke="#0d1520" strokeWidth={3} />
            <rect x={-34} y={28} width={68} height={50} rx={10} fill="#c8102e" />
            <rect x={-28} y={34} width={56} height={22} rx={5} fill="#cfe9ff" opacity=".9" />
            <path d="M-6,62 h12 M0,56 v12" stroke="#fff" strokeWidth={3} />
          </g>
        </g>
        <g className="sw-gondola sw-gondola-2">
          <g transform="translate(0,940)">
            <line x1={0} y1={0} x2={0} y2={24} stroke="#0d1520" strokeWidth={2} />
            <rect x={-24} y={22} width={48} height={36} rx={8} fill="#c8102e" opacity=".85" />
            <rect x={-19} y={27} width={38} height={15} rx={4} fill="#cfe9ff" opacity=".8" />
          </g>
        </g>
      </Depth>
      <Depth d={0.9}><Pines seed={64} y0={960} y1={1020} n={26} size={2.8} color="#0e1b24" /></Depth>
    </>
  );
}

/* ───────────── Body & Health: alpine meadow hike ───────────── */
function Meadow() {
  const peaks: Peak[] = [{ x: 280, h: 300, w: 260, s: 0.2 }, { x: 760, h: 220, w: 220, s: -0.3 }, { x: 1250, h: 340, w: 300, s: -0.15 }];
  const far = ridge(71, 580, 60, peaks, 0.6, 8);
  const hill1 = ridge(72, 640, 50, [], 0.4, 16);
  const hill2 = ridge(73, 800, 70, [], 0.35, 16);
  const r = rng(74);
  return (
    <>
      <Sky stops={["#0f3a68", "#2f78b5", "#86c3e6", "#d8efe8"]} />
      <Depth d={0.1}><Glow cx={1180} cy={150} r={380} color="#ffe9a0" opacity={0.7} /><circle cx={1180} cy={150} r={44} fill="#fff2b8" />
        <g className="sw-rays" style={{ transformOrigin: "1180px 150px" }}>{Array.from({ length: 12 }, (_, i) => <path key={i} d="M1180,150 L1172,-200 L1188,-200 Z" fill="#fff8d8" opacity=".12" transform={`rotate(${i * 30} 1180 150)`} />)}</g></Depth>
      <Depth d={0.22}><Range pts={far} fill="#6f8aa8" haze="#b8d3dc" snow="#ffffff" snowLine={420} shade={0.28} peaks={peaks} /></Depth>
      <Depth d={0.3}><Cloud x={500} y={260} opacity={0.75} dur={90} /><Cloud x={1450} y={330} s={0.7} opacity={0.6} dur={120} delay={30} /></Depth>
      <Depth d={0.45}>
        <path d={toPath(hill1)} fill="#4f8f4a" />
        <Pines seed={75} y0={0} onRidge={(x) => at(hill1, x) + 14} x0={-40} x1={420} n={22} color="#2c5a35" />
        {/* Little chapel */}
        <g transform={`translate(1080,${at(hill1, 1080) + 6})`}><rect x={-18} y={-30} width={36} height={30} fill="#f3eee2" /><path d="M-22,-30 L0,-46 L22,-30 Z" fill="#8a3b2e" /><rect x={-6} y={-70} width={12} height={40} fill="#f3eee2" /><path d="M-8,-70 L0,-90 L8,-70 Z" fill="#3b2b26" /></g>
      </Depth>
      <Depth d={0.6}>
        <path d={toPath(hill2)} fill="#6aae55" />
        {/* Winding hiking trail */}
        <path d="M640,1020 C700,940 900,900 860,860 C820,820 980,800 1060,770" fill="none" stroke="#e8dcb8" strokeWidth={10} strokeLinecap="round" opacity=".85" />
        {/* Swiss cow */}
        <g transform={`translate(360,${at(hill2, 360) + 40})`} className="sw-graze">
          <ellipse cx={0} cy={0} rx={34} ry={18} fill="#f4f0e8" /><ellipse cx={-10} cy={-4} rx={12} ry={9} fill="#6b3f2a" /><ellipse cx={14} cy={5} rx={9} ry={7} fill="#6b3f2a" />
          <rect x={-26} y={12} width={6} height={16} fill="#f4f0e8" /><rect x={18} y={12} width={6} height={16} fill="#f4f0e8" />
          <g className="sw-cowhead"><ellipse cx={-40} cy={2} rx={11} ry={9} fill="#6b3f2a" /><circle cx={-35} cy={14} r={4} fill="#d9a520" /></g>
        </g>
      </Depth>
      <Depth d={0.85}>
        <path d={toPath(hill2.map(([x, y]) => [x, y + 160]))} fill="#5c9e48" />
        {Array.from({ length: 140 }, (_, i) => {
          const x = r() * W, y = 900 + r() * 110;
          return <g key={i} className="sw-sway" style={{ animationDelay: `${(r() * 3).toFixed(2)}s`, transformOrigin: `${x}px ${y + 12}px` }}>
            <line x1={x} y1={y} x2={x} y2={y + 14} stroke="#3f7a33" strokeWidth={1.5} />
            <circle cx={x} cy={y} r={3 + r() * 2} fill={["#ffffff", "#f7d046", "#e94c6b", "#b88cff", "#ff9a3c"][i % 5]} />
          </g>;
        })}
      </Depth>
      <Birds x={200} y={260} n={3} color="#20324a" dur={55} />
    </>
  );
}

/* ───────────── Habits: snowy chalet village at dusk ───────────── */
function Village() {
  const peaks: Peak[] = [{ x: 420, h: 330, w: 280, s: 0.25 }, { x: 820, h: 200, w: 220 }, { x: 1180, h: 300, w: 300, s: -0.2 }];
  const far = ridge(81, 600, 100, peaks, 0.6, 8);
  const slope = ridge(82, 820, 90, [], 0.35, 16);
  const front = ridge(83, 930, 40, [], 0.3, 16);
  const houses = [[220, 0.9, 1], [420, 1.1, 2], [610, 0.8, 3], [900, 1.2, 4], [1120, 0.95, 5], [1330, 1.05, 6]] as const;
  return (
    <>
      <Sky stops={["#0a0e2c", "#1d2459", "#4b3f7d", "#9c6f9a", "#e3a9a3"]} />
      <Depth d={0.1}><Stars n={90} maxY={360} /></Depth>
      <Depth d={0.25}><Range pts={far} fill="#5a5a8a" haze="#9a86b0" snow="#f1e7f5" snowLine={480} shade={0.28} peaks={peaks} /></Depth>
      <Depth d={0.4}>
        <path d={toPath(slope)} fill="#c9cfe6" />
        <path d={toPath(slope)} fill="url(#vg-shade)" />
        <defs><linearGradient id="vg-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8e97c6" stopOpacity="0" /><stop offset="1" stopColor="#5e6aa3" stopOpacity=".7" /></linearGradient></defs>
        <Pines seed={84} y0={0} onRidge={(x) => at(slope, x) + 10} n={60} color="#2b335e" />
        {/* Church with onion spire */}
        <g transform={`translate(760,${at(slope, 760) + 30})`}><rect x={-22} y={-50} width={44} height={50} fill="#eee8f2" /><rect x={-9} y={-110} width={18} height={60} fill="#eee8f2" /><path d="M-11,-110 Q0,-140 11,-110 Z" fill="#3b3a66" /><rect x={-1} y={-150} width={2} height={20} fill="#3b3a66" /><circle cx={0} cy={-90} r={5} fill="#ffcf7a" /></g>
      </Depth>
      <Depth d={0.6}>
        {houses.map(([x, s, seed]) => {
          const y = at(slope, x) + 70 + seed * 6;
          return <g key={seed}>
            <g className="sw-smoke" style={{ animationDelay: `${seed * 0.9}s` }}>{[0, 1, 2].map((k) => <circle key={k} cx={x + 22 * s + k * 6} cy={y - 78 * s - k * 18} r={6 + k * 4} fill="#d8d6ea" opacity={0.35 - k * 0.08} />)}</g>
            <rect x={x + 18 * s} y={y - 74 * s} width={8 * s} height={16 * s} fill="#2b1d18" />
            <Chalet x={x} y={y} s={s} snow="#f4f2fb" seed={seed} />
            <Glow cx={x} cy={y - 20 * s} r={70 * s} color="#ffb85a" opacity={0.25} />
          </g>;
        })}
      </Depth>
      <Depth d={0.85}>
        <path d={toPath(front)} fill="#e3e6f4" />
        <Pines seed={85} y0={0} onRidge={(x) => at(front, x) + 20} x0={-60} x1={280} n={10} size={2.4} color="#1d2346" />
        <Pines seed={86} y0={0} onRidge={(x) => at(front, x) + 20} x0={1360} x1={1660} n={10} size={2.4} color="#1d2346" />
      </Depth>
    </>
  );
}

/* ───────────── Mini goals: paragliders over Lauterbrunnen valley ───────────── */
function Lauterbrunnen() {
  const jp: Peak[] = [{ x: 800, h: 300, w: 300, s: -0.15 }, { x: 560, h: 200, w: 200, s: 0.3 }, { x: 1040, h: 220, w: 220, s: -0.3 }];
  const jungfrau = ridge(91, 600, 50, jp, 0.6, 8);
  const floor = ridge(92, 860, 24, [], 0.3, 16);
  const glider = (cls: string, color: string, s: number) => (
    <g className={`sw-glide ${cls}`}><g transform={`scale(${s})`}>
      <path d="M-40,0 Q0,-26 40,0 Q0,-14 -40,0 Z" fill={color} /><path d="M-40,0 L0,46 M40,0 L0,46 M-20,-8 L0,46 M20,-8 L0,46" stroke="#1b1b2a" strokeWidth={0.8} opacity=".6" /><circle cx={0} cy={50} r={4} fill="#1b1b2a" />
    </g></g>
  );
  return (
    <>
      <Sky stops={["#123a66", "#3a76b0", "#9cc8e6", "#e6f1ef"]} />
      <Depth d={0.1}><Glow cx={800} cy={260} r={460} color="#fffbe8" opacity={0.45} /></Depth>
      <Depth d={0.22}><Range pts={jungfrau} fill="#7d93b0" haze="#bcd2df" snow="#ffffff" snowLine={470} shade={0.3} peaks={jp} /></Depth>
      <Depth d={0.3}><Cloud x={700} y={470} s={1.3} opacity={0.6} dur={130} /></Depth>
      <Depth d={0.45}>
        <path d={toPath(floor)} fill="#5e9a4c" />
        {[[700, 0.6, 11], [780, 0.5, 12], [860, 0.65, 13], [930, 0.5, 14]].map(([x, s, sd]) => <Chalet key={sd} x={x} y={at(floor, x) + 6} s={s} seed={sd} lit="#fff0c0" />)}
        {/* Church of Lauterbrunnen */}
        <g transform={`translate(640,${at(floor, 640) + 4})`}><rect x={-10} y={-24} width={20} height={24} fill="#f4efe3" /><rect x={-4} y={-56} width={8} height={32} fill="#f4efe3" /><path d="M-5,-56 L0,-74 L5,-56 Z" fill="#3b2b26" /></g>
      </Depth>
      <Depth d={0.6}>
        {/* Vertical cliffs */}
        <path d="M-100,1020 L-100,120 L180,140 L260,260 L320,420 L380,620 L470,820 L560,1020 Z" fill="#4c4a52" />
        <path d="M180,140 L260,260 L320,420 L380,620 L470,820 L560,1020 L470,1020 L380,800 L300,600 L240,420 L190,260 Z" fill="#000" opacity=".25" />
        <path d="M1700,1020 L1700,100 L1440,130 L1360,260 L1300,440 L1230,640 L1140,840 L1060,1020 Z" fill="#55525a" />
        <path d="M1440,130 L1360,260 L1300,440 L1230,640 L1140,840 L1060,1020 L1150,1020 L1250,820 L1320,620 L1380,440 L1430,260 Z" fill="#fff" opacity=".06" />
        <Pines seed={93} y0={0} onRidge={(x) => 140 + (x + 100) * 0.05} x0={-90} x1={170} n={14} color="#2b3b2e" />
        <Pines seed={94} y0={0} onRidge={(x) => 130 - (x - 1440) * 0.04} x0={1450} x1={1690} n={14} color="#2b3b2e" />
        {/* Staubbach falls */}
        <path d="M1352,280 C1342,500 1330,700 1300,900" fill="none" stroke="#eaf6ff" strokeWidth={16} opacity=".18" strokeLinecap="round" />
        {[[0, 3, "6 34", 4.4], [-4, 2, "3 22", 3.2], [5, 2, "10 40", 5.6], [2, 1.5, "2 14", 2.6]].map(([dx, w, da, dur], i) => (
          <path key={i} d={`M${1352 + (dx as number)},280 C${1342 + (dx as number) * 1.5},500 ${1330 + (dx as number) * 2},700 ${1300 + (dx as number) * 3},900`} fill="none" stroke="#ffffff" strokeWidth={w as number} strokeDasharray={da as string} strokeLinecap="round" opacity=".8" className="sw-fall" style={{ animationDuration: `${dur}s` }} />
        ))}
        <Glow cx={1300} cy={900} r={70} color="#ffffff" opacity={0.5} />
      </Depth>
      <Depth d={0.8}>
        {glider("sw-glide-1", "#e63946", 1.2)}
        {glider("sw-glide-2", "#f7b801", 0.8)}
        {glider("sw-glide-3", "#7b2cbf", 0.6)}
      </Depth>
      <Depth d={0.95}><Pines seed={95} y0={970} y1={1020} n={20} size={2.8} color="#1a2a1c" x0={-60} x1={600} /></Depth>
    </>
  );
}

/* ───────────── Wins: fireworks over Lake Geneva and the Jet d'Eau ───────────── */
function Geneva() {
  const montblanc = ridge(101, 640, 60, [{ x: 1120, h: 200, w: 360 }, { x: 600, h: 120, w: 300 }], 0.6, 8);
  const shore = ridge(102, 690, 14, [], 0.3, 16);
  const r = rng(103);
  const bursts = [[420, 260, "#ff5d8f", 0], [800, 180, "#ffd166", 1.3], [1180, 280, "#7cf3ff", 2.4], [620, 340, "#c39bff", 3.3], [1020, 220, "#ff7b54", 4.4], [1350, 160, "#9cff8a", 5.2]] as const;
  return (
    <>
      <Sky stops={["#03040e", "#0b0f2e", "#1d1f52", "#3b2f62"]} />
      <Depth d={0.1}><Stars n={120} maxY={520} /></Depth>
      <Depth d={0.2}><Range pts={montblanc} fill="#1d1f48" haze="#2a2a5a" snow="#8d94c9" snowLine={540} shade={0.3} peaks={[{ x: 1120, h: 200, w: 360 }]} /></Depth>
      <Depth d={0.35}>
        {bursts.map(([x, y, c, delay], i) => (
          <g key={i} className="sw-burst" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}>
            {Array.from({ length: 18 }, (_, k) => { const a = (k / 18) * Math.PI * 2; return <line key={k} x1={x + Math.cos(a) * 14} y1={y + Math.sin(a) * 14} x2={x + Math.cos(a) * 70} y2={y + Math.sin(a) * 70} stroke={c} strokeWidth={2.5} strokeLinecap="round" />; })}
            {Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2 + 0.2; return <circle key={k} cx={x + Math.cos(a) * 92} cy={y + Math.sin(a) * 92} r={2.5} fill={c} />; })}
            <Glow cx={x} cy={y} r={90} color={c} opacity={0.4} />
          </g>
        ))}
      </Depth>
      <Depth d={0.45}>
        <path d={toPath(shore)} fill="#0c0e26" />
        {Array.from({ length: 90 }, (_, i) => { const x = r() * W; return <rect key={i} x={x} y={at(shore, x) + 2 + r() * 20} width={3} height={4} fill={r() < 0.7 ? "#ffcf7a" : "#bfe3ff"} opacity={0.5 + r() * 0.5} />; })}
      </Depth>
      <Depth d={0.55}>
        <rect x={-100} y={712} width={W + 200} height={340} fill="#070a1e" />
        <Reflect y={712} opacity={0.3} blur={4}>
          {bursts.map(([x, y, c, delay], i) => (
            <g key={i} className="sw-burst" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}><Glow cx={x} cy={y} r={110} color={c} opacity={0.8} /></g>
          ))}
        </Reflect>
        <Shimmer seed={104} y0={724} y1={990} n={70} color="#ffcf7a" />
        <Shimmer seed={105} y0={724} y1={990} n={40} color="#ff8fc8" />
        {/* Jet d'Eau */}
        <g>
          <path d="M792,712 C790,520 800,330 812,220 C820,330 824,520 822,712 Z" fill="url(#jet)" className="sw-jet" style={{ transformOrigin: "807px 712px" }} />
          <path d="M812,220 C840,240 860,300 880,380" fill="none" stroke="#e6f3ff" strokeWidth={8} opacity=".18" />
          <defs><linearGradient id="jet" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".7" stopColor="#d4ecff" stopOpacity=".6" /><stop offset="1" stopColor="#d4ecff" stopOpacity="0" /></linearGradient></defs>
          <Glow cx={807} cy={700} r={80} color="#d4ecff" opacity={0.5} />
        </g>
        {/* Pier */}
        <path d="M600,720 L807,712 L807,718 L600,728 Z" fill="#1b1d3a" />
        {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={610 + i * 26} cy={718 - i * 1} r={2} fill="#fff0c8" />)}
      </Depth>
    </>
  );
}

export const SCENES: Record<SceneKey, () => React.ReactElement> = {
  matterhorn: () => <Matterhorn />,
  "matterhorn-night": () => <Matterhorn night />,
  zurich: Zurich,
  "glacier-express": GlacierExpress,
  lucerne: Lucerne,
  jungfrau: Jungfrau,
  meadow: Meadow,
  village: Village,
  lauterbrunnen: Lauterbrunnen,
  geneva: Geneva,
};

/** Scenes with falling snow on top. */
export const SNOWY: Partial<Record<SceneKey, number>> = { village: 1, "matterhorn-night": 0.5 };

export { Snowfall, H, W };
