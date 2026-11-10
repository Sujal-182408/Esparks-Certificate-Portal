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
      {/* Gold band: measured orange-gold (#c9951a body). The first gradient runs
          ACROSS the band (paper edge -> navy edge); the "gloss" one runs ALONG
          it and adds the shiny highlight. */}
      <linearGradient id="cert-gold-band" gradientUnits="userSpaceOnUse" x1="1345" y1="162" x2="1380" y2="129">
        <stop offset="0" stopColor="#f0c445" />
        <stop offset="0.18" stopColor="#dda021" />
        <stop offset="0.5" stopColor="#f7cd4e" />
        <stop offset="0.78" stopColor="#d39318" />
        <stop offset="1" stopColor="#9a6408" />
      </linearGradient>
      <linearGradient id="cert-gold-band-bl" gradientUnits="userSpaceOnUse" x1="136" y1="845" x2="110" y2="868">
        <stop offset="0" stopColor="#f0c445" />
        <stop offset="0.18" stopColor="#dda021" />
        <stop offset="0.5" stopColor="#f7cd4e" />
        <stop offset="0.78" stopColor="#d39318" />
        <stop offset="1" stopColor="#9a6408" />
      </linearGradient>
      <linearGradient id="cert-gold-gloss-tr" gradientUnits="userSpaceOnUse" x1="1190" y1="0" x2="1500" y2="325">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.55" stopColor="#fff2c0" stopOpacity="0.3" />
        <stop offset="0.75" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="cert-gold-gloss-bl" gradientUnits="userSpaceOnUse" x1="272" y1="1000" x2="0" y2="690">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.55" stopColor="#fff2c0" stopOpacity="0.3" />
        <stop offset="0.75" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      {/* Navy: sampled #0c3a6c beside the band, darkening to #001d39 in the tip */}
      <linearGradient id="cert-navy-tr" gradientUnits="userSpaceOnUse" x1="1380" y1="140" x2="1490" y2="10">
        <stop offset="0" stopColor="#0c3a6c" />
        <stop offset="1" stopColor="#001d39" />
      </linearGradient>
      <linearGradient id="cert-navy-bl" gradientUnits="userSpaceOnUse" x1="110" y1="868" x2="10" y2="990">
        <stop offset="0" stopColor="#0c3a6c" />
        <stop offset="1" stopColor="#001d39" />
      </linearGradient>
      <filter id="cert-blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      {/* userSpaceOnUse: one gradient across the whole band, so every line fades at the same x */}
      <linearGradient id="cert-fine" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="520" y2="0">
        <stop offset="0" stopColor="#c3ccd8" stopOpacity="0.55" />
        <stop offset="0.6" stopColor="#c9d1dc" stopOpacity="0.4" />
        <stop offset="1" stopColor="#d3dae4" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="cert-fine-right" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1476" y2="0">
        <stop offset="0" stopColor="#c3ccd8" stopOpacity="0" />
        <stop offset="0.35" stopColor="#c3ccd8" stopOpacity="0.45" />
        <stop offset="1" stopColor="#c9d1dc" stopOpacity="0.4" />
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
        <stop offset="0" stopColor="#d8e0e9" />
        <stop offset="1" stopColor="#c9d3de" />
      </linearGradient>
      <radialGradient id="cert-paper" cx="0.5" cy="0.45" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#f6f8fb" />
      </radialGradient>
    </defs>
  );
}

/**
 * Top-right corner, measured from the approved sample:
 *  - gold band: outer (paper) edge from (1190, 0) to (1500, 325),
 *    inner (navy) edge from (1261, 0) to (1500, 281)
 *  - navy sampled at #0c3a6c next to the band, darkening to #001d39 in the tip
 *  - the gold is glossy: a bright hairline on the paper edge, a dark
 *    bronze hairline on the navy edge, and a soft highlight along the band
 */
function Corner() {
  return (
    <g>
      <polygon points="1172,0 1190,0 1500,325 1500,345" fill="#0a1f45" opacity="0.22" filter="url(#cert-blur)" />
      <polygon points="1261,0 1500,0 1500,281" fill="url(#cert-navy-tr)" />
      <polygon points="1330,0 1384,0 1500,123 1500,180" fill="#1d5596" opacity="0.28" />
      <polygon points="1190,0 1261,0 1500,281 1500,325" fill="url(#cert-gold-band)" />
      <polygon points="1190,0 1261,0 1500,281 1500,325" fill="url(#cert-gold-gloss-tr)" />
      <line x1="1261" y1="0" x2="1500" y2="281" stroke="#7a4b04" strokeWidth="1.6" />
      <line x1="1190" y1="0" x2="1500" y2="325" stroke="#fff1b8" strokeWidth="1.3" />
    </g>
  );
}

/**
 * Bottom-left corner, measured from the sample. Its gold band keeps an
 * EVEN width (~50 px): outer edge (0, 690)–(272, 1000), inner edge
 * (0, 735)–(220, 1000). (It previously widened to 88 px at the bottom.)
 */
function CornerBottomLeft() {
  return (
    <g>
      <polygon points="0,675 0,690 272,1000 290,1000" fill="#0a1f45" opacity="0.2" filter="url(#cert-blur)" />
      <polygon points="0,735 0,1000 220,1000" fill="url(#cert-navy-bl)" />
      <polygon points="0,815 0,860 124,1000 76,1000" fill="#1d5596" opacity="0.28" />
      <polygon points="0,690 0,735 220,1000 272,1000" fill="url(#cert-gold-band-bl)" />
      <polygon points="0,690 0,735 220,1000 272,1000" fill="url(#cert-gold-gloss-bl)" />
      <line x1="0" y1="735" x2="220" y2="1000" stroke="#7a4b04" strokeWidth="1.6" />
      <line x1="0" y1="690" x2="272" y2="1000" stroke="#fff1b8" strokeWidth="1.3" />
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

const TOP_LEFT_FAN = Array.from({ length: 22 }, (_, i) => {
  const t = i / 21;
  // Diagonal band: from the left border (y 200–380) up towards the logo.
  return `M 30 ${lerp(200, 380, t).toFixed(1)} Q 220 ${lerp(176, 300, t).toFixed(1)} 520 ${lerp(150, 190, t).toFixed(1)}`;
});

const RIGHT_FAN = Array.from({ length: 18 }, (_, i) => {
  const t = i / 17;
  return `M 930 ${lerp(782, 796, t).toFixed(1)} C 1130 ${lerp(760, 790, t).toFixed(1)}, 1300 ${lerp(640, 720, t).toFixed(1)}, 1476 ${lerp(430, 610, t).toFixed(1)}`;
});

function Decorations() {
  return (
    <g>
      {/* soft sheens (white light streaks) */}
      <path d="M 30 300 Q 270 240 600 140 L 600 160 Q 280 290 30 470 Z" fill="url(#cert-sheen)" />
      <path d="M 30 560 C 110 690, 200 820, 390 976 L 320 976 C 170 850, 90 740, 30 650 Z" fill="url(#cert-sheen)" />
      <path d="M 900 800 C 1120 770, 1290 660, 1476 470 L 1476 560 C 1300 700, 1130 790, 900 806 Z" fill="url(#cert-glow)" />

      {/* hair-thin lines; gradient strokes make each fan fade out */}
      <g fill="none" strokeWidth="0.6">
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

// ---- Laurel: MEASURED from the approved reference image ----
// Each leaf below was extracted automatically from the reference
// (threshold the leaf colour, erode away the thin stem, then take every
// leaf's centre, axis angle, length and width from its pixel moments),
// and converted to the 1500 × 1000 certificate grid. So the leaves sit
// exactly where they are in the design instead of being approximated.
//
// [centre x, centre y, angle ° (pointing from the stem to the leaf tip), length, width]
const LAUREL_LEAVES = [
  [1282, 252, -147, 58, 24], // tip pair
  [1333, 267, -109, 57, 23],
  [1306, 299, -160, 58, 22],
  [1376, 310, -92, 58, 24],
  [1336, 344, -156, 60, 23],
  [1406, 365, -79, 58, 25],
  [1358, 393, -145, 58, 24],
  [1420, 426, -65, 61, 26],
  [1367, 448, -126, 55, 25],
  [1415, 489, -47, 59, 26],
  [1358, 500, -109, 54, 24],
  [1395, 546, -30, 59, 24],
  [1334, 547, -95, 55, 23],
  [1300, 587, -84, 55, 23],
  [1362, 598, -18, 61, 24],
  [1258, 619, -72, 55, 23],
  [1316, 642, -8, 59, 22],
];

// Stem: a smooth curve (Catmull-Rom) through the measured leaf bases,
// starting with the bare tail at the bottom-left.
const LAUREL_STEM =
  "M 1201 679 C 1214 672, 1259 651, 1280 638 C 1301 625, 1312 615, 1325 601 C 1338 587, 1351 571, 1361 555 C 1371 539, 1380 522, 1385 504 C 1390 486, 1394 466, 1394 447 C 1394 428, 1391 406, 1386 388 C 1381 370, 1371 352, 1362 336 C 1353 320, 1340 302, 1331 291 C 1322 280, 1310 272, 1306 268";

// A leaf 2 units long, centred on (0, 0): the base (x = -1) is at the stem,
// it is widest about a third of the way out and tapers to a sharp tip
// (x = +1) — the shape of the leaves in the reference. Max width ≈ 0.88.
const LEAF_UNIT = "M -1 0 C -0.72 -0.58, 0.2 -0.6, 1 0 C 0.2 0.6, -0.72 0.58, -1 0 Z";
const LEAF_UNIT_WIDTH = 0.88;

// Size correction: pixel moments assume a rectangle; for a pointed,
// lens-shaped leaf the true length is ~1.25× and width ~1.3× larger
// (checked by overlaying the result on the reference).
const LEAF_LENGTH_FACTOR = 1.25;
const LEAF_WIDTH_FACTOR = 1.3;

const LEAF_TRANSFORMS = LAUREL_LEAVES.map(
  ([x, y, angle, length, width]) =>
    `translate(${x} ${y}) rotate(${angle}) scale(${((length * LEAF_LENGTH_FACTOR) / 2).toFixed(2)} ${((width * LEAF_WIDTH_FACTOR) / LEAF_UNIT_WIDTH).toFixed(2)})`,
);

/** Large faint laurel branch on the right side (measured colours: #ced7e2–#d3dbe5, crisp darker edge). */
function Laurel() {
  return (
    <g>
      <path d={LAUREL_STEM} fill="none" stroke="#b7c3d1" strokeWidth="6.6" strokeLinecap="round" />
      <path d={LAUREL_STEM} fill="none" stroke="#d2dae4" strokeWidth="4.4" strokeLinecap="round" />
      {LEAF_TRANSFORMS.map((transform) => (
        // vector-effect keeps the outline 1 px wide despite the non-uniform scale
        <path
          key={transform}
          d={LEAF_UNIT}
          fill="url(#cert-leaf)"
          stroke="#b7c3d1"
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
          transform={transform}
        />
      ))}
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
      <CornerBottomLeft />
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

// ---- ISO mark: the top half of a globe (a dome) above the lettering ----
// Matches the official-style mark in the reference: a circular cap
// (chord 88, height 28 → circle radius 48.6, centre (44, 50.6)) with the
// central meridian, two pairs of curved meridians and one parallel.
// The bold slab-serif "ISO" below it is HTML text (see the CSS).
const ISO_DOME_PATHS = [
  "M 0 30 A 48.6 48.6 0 0 1 88 30", // outline
  "M 15 30 A 32 48.6 0 0 1 73 30", // outer meridians
  "M 29.5 30 A 16 48.6 0 0 1 58.5 30", // inner meridians
  "M 44 2 V 30", // central meridian
  "M 9.9 16 Q 44 21 78.1 16", // parallel
];

export function IsoGlobe() {
  return (
    <svg viewBox="-2 0 92 32" width="92" height="32" aria-hidden="true">
      <g fill="none" stroke="#23338f" strokeWidth="2.6" strokeLinecap="round">
        {ISO_DOME_PATHS.map((d) => (
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
// The reference has ~24 LARGE, rounded scallops.
const SEAL_BUMP_COUNT = 24;
const SEAL_BUMPS = Array.from({ length: SEAL_BUMP_COUNT }, (_, i) => {
  const a = (2 * Math.PI * i) / SEAL_BUMP_COUNT;
  return { cx: SEAL_CX + 87 * Math.cos(a), cy: SEAL_CY + 87 * Math.sin(a) };
});

// Laurel wreath, measured from the reference seal: two branches at
// ~0.62 R climbing to ~30° from the top; their stems cross at the bottom.
// Each node has a PAIR of sharp leaves growing from the stem in a V,
// pointing up the branch (like an ear of wheat).
// θ is measured clockwise from 12 o'clock.
const WREATH_RADIUS = 60;
const WREATH_STEPS = Array.from({ length: 11 }, (_, i) => 160 - i * 12.4); // 160° -> 36°

// Leaf: base at (0,0), sharp tip at (15,0).
const SEAL_LEAF = "M 0 0 C 4 -4.2, 10 -4, 15 0 C 10 4, 4 4.2, 0 0 Z";

const SEAL_WREATH = WREATH_STEPS.flatMap((deg, i) =>
  [-1, 1].flatMap((side) => {
    const a = (deg * Math.PI) / 180;
    const x = SEAL_CX + side * WREATH_RADIUS * Math.sin(a);
    const y = SEAL_CY - WREATH_RADIUS * Math.cos(a);
    // direction along the branch towards its tip
    const up = side === 1 ? deg + 180 : -deg;
    return [-36, 36].map((spread) => ({
      key: `${side}${spread}${i}`,
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(up + spread).toFixed(1)})`,
    }));
  }),
);

// The tip leaf at the top end of each branch continues the branch.
const SEAL_WREATH_TIPS = [-1, 1].map((side) => {
  const deg = 34;
  const a = (deg * Math.PI) / 180;
  const x = SEAL_CX + side * WREATH_RADIUS * Math.sin(a);
  const y = SEAL_CY - WREATH_RADIUS * Math.cos(a);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${side === 1 ? deg + 180 : -deg})`;
});

// Stems run from 204° (past the bottom, so the two visibly cross) up to 36°.
const WREATH_STEMS = [-1, 1].map((side) =>
  Array.from({ length: 43 }, (_, i) => {
    const a = ((204 - i * 4.0) * Math.PI) / 180;
    return `${(SEAL_CX + side * WREATH_RADIUS * Math.sin(a)).toFixed(1)},${(SEAL_CY - WREATH_RADIUS * Math.cos(a)).toFixed(1)}`;
  }).join(" "),
);

// Monogram: 750 × 415 artwork scaled to 78 px wide, centred on the medal.
const MONO_SCALE = 78 / 750;
const MONO_X = SEAL_CX - 39;
const MONO_Y = SEAL_CY - (415 * MONO_SCALE) / 2;

/**
 * One navy ribbon tail (the right one is mirrored). Measured from the
 * reference: wide tails (~0.6 R) hanging almost straight down to 1.6 R
 * below the centre, with a gold stripe along both long edges and a V-notch.
 */
function RibbonTail(props) {
  return (
    <g {...props}>
      <polygon points="52,157 108,175 80,263 58,235 24,245" fill="url(#seal-ribbon)" />
      <g stroke="#e0b64e" strokeWidth="2.4" fill="none">
        <line x1="103" y1="173" x2="76" y2="257" />
        <line x1="57" y1="159" x2="31" y2="242" />
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
        {/* measured monogram colour: #965907 (orange-bronze) */}
        <linearGradient id="seal-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8650c" />
          <stop offset="1" stopColor="#7c4606" />
        </linearGradient>
        {/* measured ribbon navy: #0c2f60 */}
        <linearGradient id="seal-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#173f7a" />
          <stop offset="1" stopColor="#0a2550" />
        </linearGradient>
        {/* shaded wreath leaves: lighter along one edge, like the embossed reference */}
        <linearGradient id="seal-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b77a1e" />
          <stop offset="1" stopColor="#7c4407" />
        </linearGradient>
        <linearGradient id="seal-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.5" stopColor="#f2bf34" />
          <stop offset="1" stopColor="#b8820f" />
        </linearGradient>
      </defs>

      {/* ribbons first, so the medal covers their tops */}
      <RibbonTail />
      <RibbonTail transform="translate(220 0) scale(-1 1)" />

      {/* scalloped rim */}
      <g fill="url(#seal-gold)">
        <circle cx={cx} cy={cy} r="90" />
        {SEAL_BUMPS.map((bump) => (
          <circle key={`${bump.cx}`} cx={bump.cx} cy={bump.cy} r="11" />
        ))}
      </g>

      {/* measured rings: bright raised rim band 0.86–0.94 R, dark groove at 0.82 R, face inside */}
      <circle cx={cx} cy={cy} r="88.5" fill="none" stroke="url(#seal-rim)" strokeWidth="8" />
      <circle cx={cx} cy={cy} r="82" fill="url(#seal-face)" stroke="#8a5a0e" strokeWidth="2" />

      {/* laurel wreath */}
      <g fill="none" stroke="#91500a" strokeWidth="2">
        {WREATH_STEMS.map((points) => (
          <polyline key={points.slice(0, 12)} points={points} />
        ))}
      </g>
      <g fill="url(#seal-leaf)" stroke="#6e3c05" strokeWidth="0.5">
        {SEAL_WREATH.map(({ key, transform }) => (
          <path key={key} d={SEAL_LEAF} transform={transform} />
        ))}
        {SEAL_WREATH_TIPS.map((transform) => (
          <path key={transform} d={SEAL_LEAF} transform={transform} />
        ))}
      </g>

      {/* Engraved ES monogram (as in the reference): a dark copy shifted UP
          and a light copy shifted DOWN peek out around the letters, so the
          top edges look shadowed and the bottom edges catch the light. */}
      <g transform={`translate(${MONO_X} ${MONO_Y - 1.4}) scale(${MONO_SCALE})`} fill="#4f2c03">
        <path d={ES_PATHS.e} />
        <path d={ES_PATHS.s} />
      </g>
      <g transform={`translate(${MONO_X} ${MONO_Y + 1.6}) scale(${MONO_SCALE})`} fill="#fff0b8">
        <path d={ES_PATHS.e} />
        <path d={ES_PATHS.s} />
      </g>
      <g transform={`translate(${MONO_X} ${MONO_Y}) scale(${MONO_SCALE})`} fill="url(#seal-bronze)">
        <path d={ES_PATHS.e} />
        <path d={ES_PATHS.s} />
        {/* measured accent: orange #e86c15 */}
        <path d={ES_PATHS.accent} fill="#e86c15" />
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
