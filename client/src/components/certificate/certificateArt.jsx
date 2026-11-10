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
      {/* userSpaceOnUse: one gradient across the whole band, so every line fades at the same x */}
      <linearGradient id="cert-fine" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="780" y2="0">
        <stop offset="0" stopColor="#cdd5e1" stopOpacity="0.9" />
        <stop offset="0.6" stopColor="#d3dae5" stopOpacity="0.7" />
        <stop offset="1" stopColor="#dde3ec" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="cert-fine-right" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1476" y2="0">
        <stop offset="0" stopColor="#cdd5e1" stopOpacity="0" />
        <stop offset="0.35" stopColor="#cdd5e1" stopOpacity="0.85" />
        <stop offset="1" stopColor="#d3dae5" stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="cert-glow" gradientUnits="userSpaceOnUse" x1="900" y1="0" x2="1476" y2="0">
        <stop offset="0" stopColor="#e6edf7" stopOpacity="0" />
        <stop offset="0.5" stopColor="#e6edf7" stopOpacity="0.9" />
        <stop offset="1" stopColor="#eef2f8" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="cert-sheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="cert-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ebeef2" />
        <stop offset="1" stopColor="#d9dee5" />
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

// ---- Background decoration (matches the approved sample) ----
// Two "fans" of hair-thin silver lines, like guilloché on banknotes:
//   * top-left: lines spread wide at the left edge and converge as they
//     sweep up towards the header
//   * right: lines start together under the paragraph and spread out
//     towards the right edge, passing below the laurel and above the QR
// Each fan fades out with a gradient stroke, and soft white/blue sheens
// sit along them. Geometry is computed once at module load.
const lerp = (a, b, t) => a + (b - a) * t;

const TOP_LEFT_FAN = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const y0 = lerp(175, 420, t); // spread at the left edge
  return `M 30 ${y0.toFixed(1)} C 230 ${(y0 - 25).toFixed(1)}, 430 ${lerp(165, 215, t).toFixed(1)}, 780 ${lerp(150, 172, t).toFixed(1)}`;
});

const RIGHT_FAN = Array.from({ length: 24 }, (_, i) => {
  const t = i / 23;
  return `M 930 ${lerp(782, 796, t).toFixed(1)} C 1130 ${lerp(760, 790, t).toFixed(1)}, 1300 ${lerp(640, 720, t).toFixed(1)}, 1476 ${lerp(430, 610, t).toFixed(1)}`;
});

function Decorations() {
  return (
    <g>
      {/* soft sheens */}
      <path d="M 30 210 C 260 180, 480 140, 760 120 L 760 150 C 480 190, 260 300, 30 440 Z" fill="url(#cert-sheen)" />
      <path d="M 30 560 C 110 690, 200 820, 390 976 L 320 976 C 170 850, 90 740, 30 650 Z" fill="url(#cert-sheen)" />
      <path d="M 900 800 C 1120 770, 1290 660, 1476 470 L 1476 560 C 1300 700, 1130 790, 900 806 Z" fill="url(#cert-glow)" />

      {/* hair-thin lines; gradient strokes make each fan fade out */}
      <g fill="none" strokeWidth="0.75">
        <g stroke="url(#cert-fine)">
          {TOP_LEFT_FAN.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g stroke="url(#cert-fine-right)">
          {RIGHT_FAN.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
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
// The branch is a rounded arc (like the sample): a thin stem tail at the
// bottom-left, bulging out to the right, curving back left at the top.
// p1 is a Bézier control point — it pulls the curve but is not on it.
const LAUREL_CURVE = { p0: [1178, 694], p1: [1520, 452], p2: [1270, 228] };

// One full leaf pointing along +x from (0,0): broad in the middle,
// pointed at both ends (about 2 : 1 length to width).
const LEAF_PATH = "M 0 0 C 14 -21, 46 -21, 72 0 C 46 21, 14 21, 0 0 Z";

// Leaves alternate sides and are largest in the middle of the branch.
const LAUREL_LEAVES = Array.from({ length: 11 }, (_, index) => {
  const base = 0.16 + index * 0.072; // leave the bottom of the stem bare (the "tail")
  const size = 0.62 + 0.42 * Math.sin(Math.PI * Math.min(1, (base - 0.1) / 0.85));
  return [
    { tilt: -36, t: base },
    { tilt: 36, t: base + 0.032 },
  ].map(({ tilt, t }) => {
    const { x, y, angle } = bezier(t, LAUREL_CURVE.p0, LAUREL_CURVE.p1, LAUREL_CURVE.p2);
    return {
      key: `${index}${tilt}`,
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(angle + tilt).toFixed(1)}) scale(${size.toFixed(3)})`,
    };
  });
}).flat();

// The tip leaf continues the stem's direction at the top.
const LAUREL_TIP = (() => {
  const { x, y, angle } = bezier(1, LAUREL_CURVE.p0, LAUREL_CURVE.p1, LAUREL_CURVE.p2);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(0.7)`;
})();

function Leaf({ transform }) {
  return (
    <g transform={transform}>
      <path d={LEAF_PATH} fill="url(#cert-leaf)" />
      {/* pale midrib for a subtle embossed look */}
      <line x1="8" y1="0" x2="60" y2="0" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.2" />
    </g>
  );
}

/** Large faint laurel branch on the right side. */
function Laurel() {
  const { p0, p1, p2 } = LAUREL_CURVE;
  return (
    <g>
      <path
        d={`M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`}
        fill="none"
        stroke="#dfe4ea"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {LAUREL_LEAVES.map(({ key, transform }) => (
        <Leaf key={key} transform={transform} />
      ))}
      <Leaf transform={LAUREL_TIP} />
    </g>
  );
}

/** Full-size background: paper, margin decorations, laurel, border and corners. */
export const CertificateBackground = memo(function CertificateBackground() {
  return (
    <svg className="cert-layer" viewBox="0 0 1500 1000" width="1500" height="1000" aria-hidden="true">
      <GoldGradients />
      <rect width="1500" height="1000" fill="url(#cert-paper)" />
      <Decorations />
      <Laurel />
      {/* single gold border with rounded corners (as in the sample) */}
      <rect x="24" y="24" width="1452" height="952" rx="24" fill="none" stroke="url(#cert-gold)" strokeWidth="3.5" />
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
