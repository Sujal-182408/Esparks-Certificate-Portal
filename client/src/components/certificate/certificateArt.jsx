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
      {/* Embossed look for the laurel: a soft grey-blue shadow down-right and
          a white highlight up-left, merged under the shape. */}
      <filter id="cert-emboss" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0.9" dy="1.2" stdDeviation="1" floodColor="#8d9bb0" floodOpacity="0.25" result="shade" />
        <feDropShadow dx="-1" dy="-1.2" stdDeviation="0.8" floodColor="#ffffff" floodOpacity="0.9" />
      </filter>
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

// Stem: measured points (bottom tail -> top), joined by a smooth
// Catmull-Rom curve that passes exactly through every point.
const STEM_POINTS = [
  [1201, 679], [1280, 638], [1325, 601], [1361, 555], [1385, 504],
  [1394, 447], [1386, 388], [1362, 336], [1331, 291], [1306, 268],
];

/** Catmull-Rom -> cubic Bézier control points for segment i. */
function stemSegment(i) {
  const p0 = STEM_POINTS[Math.max(i - 1, 0)];
  const p1 = STEM_POINTS[i];
  const p2 = STEM_POINTS[i + 1];
  const p3 = STEM_POINTS[Math.min(i + 2, STEM_POINTS.length - 1)];
  return [
    p1,
    [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
    [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
    p2,
  ];
}

const STEM_SEGMENTS = STEM_POINTS.slice(0, -1).map((_, i) => stemSegment(i));

const LAUREL_STEM =
  `M ${STEM_POINTS[0].join(" ")} ` +
  STEM_SEGMENTS.map(([, c1, c2, p]) => `C ${c1.map((v) => v.toFixed(1)).join(" ")}, ${c2.map((v) => v.toFixed(1)).join(" ")}, ${p.join(" ")}`).join(" ");

// Dense points along the stem (20 per segment) for "nearest point" lookups.
const STEM_SAMPLES = STEM_SEGMENTS.flatMap(([a, b, c, d]) =>
  Array.from({ length: 20 }, (_, k) => {
    const t = k / 20;
    const u = 1 - t;
    return [
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ];
  }),
);

/** Closest stem sample to (x, y). */
function nearestStemPoint([x, y]) {
  let best = STEM_SAMPLES[0];
  let bestDistance = Infinity;
  for (const point of STEM_SAMPLES) {
    const distance = (point[0] - x) ** 2 + (point[1] - y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return { point: best };
}

// Size correction: pixel moments assume a rectangle; for a pointed,
// lens-shaped leaf the true length is ~1.25× and width ~1.1× larger
// (checked by overlaying the result on the reference).
const LEAF_LENGTH_FACTOR = 1.25;
const LEAF_WIDTH_FACTOR = 1.1;

// ---- Each leaf + its stalk is ONE continuous shape ----
// The BLADE stays exactly where it was measured in the reference (that
// layout was already correct). Measured blade bases sit 1–10 px from the
// stem — in the reference that gap is a short leaf-stalk. So each leaf is
// generated as one outline that:
//  * starts ON the stem, as wide as the stem (seamless joint)
//  * runs as a thin stalk to the measured blade base, curving smoothly
//    into the leaf's direction
//  * swells into an almond blade (widest near the middle) and ends in a
//    sharp tip
const STEM_HALF_WIDTH = 2.9;
const STALK_HALF_WIDTH = 1.4;
const LEAF_SAMPLES = 48; // points per side of the outline

function leafOutline([x, y, angle, length, width]) {
  const bladeLength = length * LEAF_LENGTH_FACTOR;
  const bladeHalfWidth = (width * LEAF_WIDTH_FACTOR) / 2;
  const rad = (angle * Math.PI) / 180;
  const dir = [Math.cos(rad), Math.sin(rad)];

  const base = [x - (bladeLength / 2) * dir[0], y - (bladeLength / 2) * dir[1]];
  const tip = [x + (bladeLength / 2) * dir[0], y + (bladeLength / 2) * dir[1]];
  const { point: start } = nearestStemPoint(base);
  const stalkLength = Math.hypot(base[0] - start[0], base[1] - start[1]);

  // Midrib: cubic Bézier stem -> base -> tip. Control points make it head
  // towards the base first, then leave the base along the leaf direction,
  // so the stalk bends smoothly into the blade (no kink).
  const c1 = [start[0] + (base[0] - start[0]) * 0.8, start[1] + (base[1] - start[1]) * 0.8];
  const c2 = [base[0] + dir[0] * bladeLength * 0.3, base[1] + dir[1] * bladeLength * 0.3];
  const halfWidthAt = (u, stalkShare) => {
    if (u <= stalkShare) {
      const k = stalkShare === 0 ? 1 : u / stalkShare;
      return STEM_HALF_WIDTH + (STALK_HALF_WIDTH - STEM_HALF_WIDTH) * k; // stem width -> stalk width
    }
    const v = (u - stalkShare) / (1 - stalkShare); // 0 at blade base, 1 at tip
    // Almond profile: narrow base, widest near the middle, sides still
    // curving outward into a sharp tip (power slightly < 1 = fuller).
    const swell = Math.sin(Math.PI * v ** 0.92) ** 0.9;
    return bladeHalfWidth * swell + STALK_HALF_WIDTH * (1 - v) ** 4;
  };

  // A Bézier's parameter does NOT move at constant speed (it crawls near
  // clustered control points), so we first sample the curve densely and
  // measure real distance along it. Widths are then applied by DISTANCE,
  // which puts the widest part of the blade where it belongs.
  const dense = Array.from({ length: 121 }, (_, k) => {
    const t = k / 120;
    const m = 1 - t;
    return [
      m ** 3 * start[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * tip[0],
      m ** 3 * start[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * tip[1],
    ];
  });
  const distance = [0];
  for (let k = 1; k < dense.length; k += 1) {
    distance.push(distance[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]));
  }
  const total = distance[distance.length - 1];

  /** Point and unit tangent at distance d along the midrib. */
  const at = (d) => {
    let k = 1;
    while (k < distance.length - 1 && distance[k] < d) k += 1;
    const span = distance[k] - distance[k - 1] || 1;
    const f = Math.min(1, Math.max(0, (d - distance[k - 1]) / span));
    const a = dense[k - 1];
    const b = dense[k];
    const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: (b[0] - a[0]) / tl, ty: (b[1] - a[1]) / tl };
  };

  const arcStalkShare = Math.min(stalkLength, total) / total;
  const left = [];
  const right = [];
  for (let k = 0; k <= LEAF_SAMPLES; k += 1) {
    const u = k / LEAF_SAMPLES;
    const { x: px, y: py, tx, ty } = at(u * total);
    const half = u === 1 ? 0 : halfWidthAt(u, arcStalkShare);
    left.push(`${(px - ty * half).toFixed(1)},${(py + tx * half).toFixed(1)}`);
    right.push(`${(px + ty * half).toFixed(1)},${(py - tx * half).toFixed(1)}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
}

const LAUREL_LEAF_PATHS = LAUREL_LEAVES.map(leafOutline);

// Measured from the reference (leaves #ced7e2–#d3dbe5).
const LAUREL_COLOUR = "#d0d9e3";

/** Large faint laurel branch on the right side. */
function Laurel() {
  // One flat colour for leaves AND stem, so where they overlap they merge
  // into a single seamless shape. The emboss filter then shades the
  // outline of the whole branch (shadow down-right, light rim up-left),
  // like the reference.
  return (
    <g filter="url(#cert-emboss)" fill={LAUREL_COLOUR}>
      {LAUREL_LEAF_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      {/* stem on top: stays one continuous line, as in the reference */}
      <path d={LAUREL_STEM} fill="none" stroke={LAUREL_COLOUR} strokeWidth={STEM_HALF_WIDTH * 2} strokeLinecap="round" />
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
