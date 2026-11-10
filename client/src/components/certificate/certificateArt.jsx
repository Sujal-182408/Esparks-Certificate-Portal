// ============================================================
// certificateArt.jsx — the certificate's artwork (pure SVG)
// ============================================================
//
// Everything decorative is drawn as SVG (vector), so it stays sharp at
// any zoom level and in the PDF. Text is NOT drawn inside these SVGs:
// when html2canvas converts the certificate to a PDF it renders SVGs as
// images, and images cannot use the page's web fonts. So all text sits
// in normal HTML on top of the artwork (see CertificateDocument.jsx).
//
// Coordinates use the certificate's master size: 1500 × 1000 px.
//
// PERFORMANCE: all geometry (leaf positions, seal teeth) is computed once
// at module load, and the static background is wrapped in React.memo, so
// re-rendering a page never recalculates or re-renders the artwork.
// ============================================================

import { memo } from "react";

const NAVY = "#12305f";
const NAVY_MID = "#1d4a8f";
const ORANGE = "#f7802a";

/** Shared gradients. Rendered once inside <CertificateBackground>. */
function GoldGradients() {
  return (
    <defs>
      <linearGradient id="cert-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6e3a1" />
        <stop offset="0.35" stopColor="#d2a33a" />
        <stop offset="0.6" stopColor="#f2d47c" />
        <stop offset="1" stopColor="#a8791c" />
      </linearGradient>
      <linearGradient id="cert-navy" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0a1f45" />
        <stop offset="1" stopColor="#173d7a" />
      </linearGradient>
      <radialGradient id="cert-paper" cx="0.5" cy="0.45" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#f1f4f9" />
      </radialGradient>
    </defs>
  );
}

/**
 * One decorative corner (top-right). The bottom-left corner is the same
 * drawing rotated 180°, so both always match.
 */
function Corner(props) {
  return (
    <g {...props}>
      {/* gold band next to the white paper */}
      <polygon points="1188,0 1240,0 1500,232 1500,282" fill="url(#cert-gold)" />
      {/* mid-blue band */}
      <polygon points="1240,0 1302,0 1500,176 1500,232" fill={NAVY_MID} />
      {/* dark navy tip */}
      <polygon points="1302,0 1500,0 1500,176" fill="url(#cert-navy)" />
      {/* thin gold highlight inside the navy */}
      <line x1="1350" y1="0" x2="1500" y2="134" stroke="url(#cert-gold)" strokeWidth="4" />
    </g>
  );
}

/** Faint flowing lines across the paper. */
function Waves() {
  const lower = [560, 585, 610, 635, 660, 685];
  const upper = [150, 172, 194];
  return (
    <g fill="none" stroke="#e3e9f1" strokeWidth="1.4">
      {lower.map((y) => (
        <path key={`l${y}`} d={`M -40 ${y} C 380 ${y - 90}, 760 ${y + 110}, 1540 ${y - 50}`} />
      ))}
      {upper.map((y) => (
        <path key={`u${y}`} d={`M -40 ${y} C 420 ${y + 70}, 900 ${y - 80}, 1540 ${y + 30}`} />
      ))}
    </g>
  );
}

/** Point + direction on a quadratic Bézier curve (used to place laurel leaves). */
function bezier(t, p0, p1, p2) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    y: mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
    // derivative -> tangent angle in degrees
    angle:
      (Math.atan2(
        2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
        2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
      ) *
        180) /
      Math.PI,
  };
}

// ---- Laurel geometry: computed ONCE when the module loads ----
// (Doing this maths inside the component would repeat it on every render.)
const LAUREL_CURVE = { p0: [1255, 700], p1: [1440, 470], p2: [1330, 215] };

const LAUREL_LEAVES = Array.from({ length: 10 }, (_, index) => {
  const i = index + 1;
  const { x, y, angle } = bezier(i / 11, LAUREL_CURVE.p0, LAUREL_CURVE.p1, LAUREL_CURVE.p2);
  const size = 1 - i * 0.035; // leaves get slightly smaller towards the tip
  return [-38, 38].map((tilt) => ({
    key: `${i}${tilt}`,
    x,
    y,
    rx: 34 * size,
    ry: 12 * size,
    transform: `rotate(${angle + tilt} ${x} ${y}) translate(${30 * size} 0)`,
  }));
}).flat();

/** Large faint laurel branch on the right side. */
function Laurel() {
  const { p0, p1, p2 } = LAUREL_CURVE;
  return (
    <g fill="#e6ebf2">
      <path d={`M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke="#e6ebf2" strokeWidth="5" />
      {LAUREL_LEAVES.map(({ key, x, y, rx, ry, transform }) => (
        <ellipse key={key} cx={x} cy={y} rx={rx} ry={ry} transform={transform} />
      ))}
      <ellipse cx={p2[0]} cy={p2[1] - 22} rx="12" ry="30" transform={`rotate(-12 ${p2[0]} ${p2[1]})`} />
    </g>
  );
}

/** Full-size background: paper, waves, laurel, border and corners. */
export const CertificateBackground = memo(function CertificateBackground() {
  return (
    <svg className="cert-layer" viewBox="0 0 1500 1000" width="1500" height="1000" aria-hidden="true">
      <GoldGradients />
      <rect width="1500" height="1000" fill="url(#cert-paper)" />
      <Waves />
      <Laurel />
      <rect x="24" y="24" width="1452" height="952" rx="10" fill="none" stroke="url(#cert-gold)" strokeWidth="3" />
      <rect x="36" y="36" width="1428" height="928" rx="6" fill="none" stroke="#ecdcae" strokeWidth="1" />
      <Corner />
      <Corner transform="rotate(180 750 500)" />
    </svg>
  );
});

// The "ES" company monogram, drawn in a 750 × 415 box
// (same artwork as public/esparks-app-icon.svg). Shared by the header
// logo and the gold seal so the two can never differ.
const ES_PATHS = {
  e: "M0 0H355V100H100V155H231L274 260H100V315H355V415H0Z",
  s: "M460 0H750L724 100H480A27.5 27.5 0 0 0 480 155H660A90 90 0 0 1 750 245V320A95 95 0 0 1 655 415H380V315H635A27.5 27.5 0 0 0 635 260H455A90 90 0 0 1 365 170V95A95 95 0 0 1 460 0Z",
  accent: "M255 155H341L298 256Z",
};

/** "ES" company monogram for the header. */
export function EsMark({ height = 76 }) {
  return (
    <svg viewBox="0 0 750 415" height={height} width={(height * 750) / 415} aria-hidden="true">
      <path fill={NAVY} d={ES_PATHS.e} />
      <path fill={NAVY} d={ES_PATHS.s} />
      <path fill={ORANGE} d={ES_PATHS.accent} />
    </svg>
  );
}

// ---- ISO globe geometry (computed once) ----
// The lettering sits in a horizontal gap (y 30–60) across a globe of
// radius 42 centred at (50, 45). Instead of hiding lines with an SVG mask
// (which the PDF exporter ignores), every curve is drawn as two arcs
// that stop at the gap — plain geometry renders the same everywhere.
const ISO_GAP_TOP = 30;
const ISO_GAP_BOTTOM = 60;
const ISO_HALF_GAP = 15; // distance from the centre line to each gap edge

/** Top + bottom arcs of an ellipse (rx × 42) centred on the globe, with the gap removed. */
function isoArcs(rx) {
  const dx = rx * Math.sqrt(1 - (ISO_HALF_GAP / 42) ** 2); // x where the ellipse meets the gap
  const left = (50 - dx).toFixed(2);
  const right = (50 + dx).toFixed(2);
  return [
    `M ${left} ${ISO_GAP_TOP} A ${rx} 42 0 0 1 ${right} ${ISO_GAP_TOP}`,
    `M ${left} ${ISO_GAP_BOTTOM} A ${rx} 42 0 0 0 ${right} ${ISO_GAP_BOTTOM}`,
  ];
}

const ISO_GLOBE_PATHS = [
  ...isoArcs(42), // outline
  ...isoArcs(33), // outer meridians
  ...isoArcs(17), // inner meridians
  `M 50 3 V ${ISO_GAP_TOP}`, // central meridian (top half)
  `M 50 ${ISO_GAP_BOTTOM} V 87`, // central meridian (bottom half)
  "M 16 20 Q 50 30 84 20", // northern parallel
  "M 16 70 Q 50 60 84 70", // southern parallel
];

/** Globe for the ISO badges, drawn like the official ISO mark (lettering is HTML on top). */
export function IsoGlobe() {
  return (
    <svg viewBox="0 0 100 90" width="100" height="90" aria-hidden="true">
      <g fill="none" stroke="#1f3f8f" strokeWidth="2.2">
        {ISO_GLOBE_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

// ---- Seal geometry: computed ONCE when the module loads ----
// Design (matches the approved sample): scalloped gold medal, laurel
// wreath, engraved ES monogram, two navy ribbons with gold stripes.
const SEAL_CX = 110;
const SEAL_CY = 104;

// Scalloped edge = a circle plus small circles ("bumps") around it.
const SEAL_BUMP_COUNT = 34;
const SEAL_BUMPS = Array.from({ length: SEAL_BUMP_COUNT }, (_, i) => {
  const a = (2 * Math.PI * i) / SEAL_BUMP_COUNT;
  return { cx: SEAL_CX + 90 * Math.cos(a), cy: SEAL_CY + 90 * Math.sin(a) };
});

// Laurel wreath: two branches climbing from the bottom up each side.
// θ is measured clockwise from 12 o'clock. Each step has an outer and an
// inner leaf, tilted away from the stem.
const WREATH_RADIUS = 57;
const WREATH_STEPS = Array.from({ length: 10 }, (_, i) => 168 - i * 14); // 168° -> 42°

const SEAL_WREATH = WREATH_STEPS.flatMap((deg, i) =>
  [-1, 1].flatMap((side) =>
    [1, -1].map((layer) => {
      const r = WREATH_RADIUS + layer * 6;
      const a = (deg * Math.PI) / 180;
      const x = SEAL_CX + side * r * Math.sin(a);
      const y = SEAL_CY - r * Math.cos(a);
      const tilt = side * (deg + layer * 32);
      return { key: `${side}${layer}${i}`, x, y, transform: `rotate(${tilt} ${x} ${y})` };
    }),
  ),
);

const WREATH_STEMS = [-1, 1].map((side) =>
  Array.from({ length: 33 }, (_, i) => {
    const a = ((172 - i * 4.25) * Math.PI) / 180;
    return `${(SEAL_CX + side * WREATH_RADIUS * Math.sin(a)).toFixed(1)},${(SEAL_CY - WREATH_RADIUS * Math.cos(a)).toFixed(1)}`;
  }).join(" "),
);

// Monogram: 750 × 415 artwork scaled to 78 px wide, centred on the medal.
const MONO_SCALE = 78 / 750;
const MONO_X = SEAL_CX - 39;
const MONO_Y = SEAL_CY - (415 * MONO_SCALE) / 2;

/** One navy ribbon tail with two gold stripes (the right one is mirrored). */
function RibbonTail(props) {
  return (
    <g {...props}>
      {/* tail splays down-left from under the medal; V-notch at the end */}
      <polygon points="66,140 110,160 76,262 58,240 30,250" fill="url(#seal-ribbon)" />
      <g stroke="#d9b04a" strokeWidth="2.2" fill="none">
        <line x1="72" y1="150" x2="38" y2="240" />
        <line x1="103" y1="164" x2="72" y2="250" />
      </g>
    </g>
  );
}

/** Gold medal with navy ribbons. Pure SVG — no text, so it renders identically in the PDF. */
export function GoldSeal() {
  const cx = SEAL_CX;
  const cy = SEAL_CY;

  return (
    <svg viewBox="0 0 220 270" width="220" height="270" aria-hidden="true">
      <defs>
        {/* userSpaceOnUse: every bump shares ONE gradient, so the edge looks like one piece of metal */}
        <radialGradient id="seal-gold" gradientUnits="userSpaceOnUse" cx="85" cy="70" r="140">
          <stop offset="0" stopColor="#fff3c0" />
          <stop offset="0.45" stopColor="#ecc24e" />
          <stop offset="0.8" stopColor="#c99a2c" />
          <stop offset="1" stopColor="#9c7016" />
        </radialGradient>
        <radialGradient id="seal-face" gradientUnits="userSpaceOnUse" cx="92" cy="80" r="95">
          <stop offset="0" stopColor="#fde9a6" />
          <stop offset="0.6" stopColor="#e5b744" />
          <stop offset="1" stopColor="#c4922a" />
        </radialGradient>
        <linearGradient id="seal-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98a24" />
          <stop offset="1" stopColor="#8a5f10" />
        </linearGradient>
        <linearGradient id="seal-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d4a8f" />
          <stop offset="1" stopColor="#0a1f45" />
        </linearGradient>
      </defs>

      {/* ribbons first, so the medal covers their tops */}
      <RibbonTail />
      <RibbonTail transform="translate(220 0) scale(-1 1)" />

      {/* scalloped rim */}
      <g fill="url(#seal-gold)">
        <circle cx={cx} cy={cy} r="90" />
        {SEAL_BUMPS.map((bump) => (
          <circle key={`${bump.cx}`} cx={bump.cx} cy={bump.cy} r="8.5" />
        ))}
      </g>

      {/* raised rings + face */}
      <circle cx={cx} cy={cy} r="82" fill="none" stroke="#a87a1c" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="78" fill="url(#seal-face)" stroke="#fbe7a6" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="71" fill="none" stroke="#b8891f" strokeWidth="1.2" opacity="0.7" />

      {/* laurel wreath */}
      <g fill="none" stroke="#a5761a" strokeWidth="2">
        {WREATH_STEMS.map((points) => (
          <polyline key={points.slice(0, 12)} points={points} />
        ))}
      </g>
      <g fill="#a5761a">
        {SEAL_WREATH.map(({ key, x, y, transform }) => (
          <ellipse key={key} cx={x} cy={y} rx="6.5" ry="2.8" transform={transform} />
        ))}
      </g>

      {/* engraved ES monogram: a light copy offset 1.5 px down gives the embossed edge */}
      <g transform={`translate(${MONO_X} ${MONO_Y + 1.5}) scale(${MONO_SCALE})`} fill="#fff1bd">
        <path d={ES_PATHS.e} />
        <path d={ES_PATHS.s} />
      </g>
      <g transform={`translate(${MONO_X} ${MONO_Y}) scale(${MONO_SCALE})`} fill="url(#seal-bronze)">
        <path d={ES_PATHS.e} />
        <path d={ES_PATHS.s} />
        <path d={ES_PATHS.accent} fill="#fbe7a6" />
      </g>
    </svg>
  );
}

/** Notched gold ribbon behind the subtitle. */
export function TitleRibbon() {
  return (
    <svg viewBox="0 0 720 50" width="720" height="50" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ribbon-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9c766" />
          <stop offset="0.5" stopColor="#c99a2e" />
          <stop offset="1" stopColor="#b48420" />
        </linearGradient>
      </defs>
      <polygon points="0,0 720,0 700,25 720,50 0,50 20,25" fill="url(#ribbon-gold)" />
    </svg>
  );
}
