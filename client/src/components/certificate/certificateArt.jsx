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
      <linearGradient id="cert-navy" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#061736" />
        <stop offset="1" stopColor="#0e2d63" />
      </linearGradient>
      {/* Gold band shine: runs ACROSS the band (paper edge -> navy edge).
          userSpaceOnUse so the rotated bottom-left copy shines the same way. */}
      <linearGradient id="cert-gold-band" gradientUnits="userSpaceOnUse" x1="1343" y1="165" x2="1381" y2="129">
        <stop offset="0" stopColor="#a8770f" />
        <stop offset="0.25" stopColor="#dcae3a" />
        <stop offset="0.5" stopColor="#fff0a8" />
        <stop offset="0.72" stopColor="#e7bd4a" />
        <stop offset="1" stopColor="#9e6f12" />
      </linearGradient>
      {/* bottom-left band: shine runs from the paper edge (upper right) to the navy edge (lower left) */}
      <linearGradient id="cert-gold-band-bl" gradientUnits="userSpaceOnUse" x1="137" y1="843" x2="93" y2="866">
        <stop offset="0" stopColor="#a8770f" />
        <stop offset="0.25" stopColor="#dcae3a" />
        <stop offset="0.5" stopColor="#fff0a8" />
        <stop offset="0.72" stopColor="#e7bd4a" />
        <stop offset="1" stopColor="#9e6f12" />
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
 * One decorative corner (top-right). The bottom-left corner is the same
 * drawing rotated 180°, so both always match.
 *
 * Matches the sample: a single wide, shiny gold band (bright centre, darker
 * edges) casting a soft shadow onto the paper, then dark navy in two
 * subtle tones (a faint lighter "fold" stripe).
 */
function Corner(props) {
  return (
    <g {...props}>
      {/* soft shadow of the gold band on the paper */}
      <polygon points="1170,0 1186,0 1500,330 1500,350" fill="#0a1f45" opacity="0.22" filter="url(#cert-blur)" />
      {/* dark navy */}
      <polygon points="1256,0 1500,0 1500,256" fill="url(#cert-navy)" />
      {/* faint lighter fold stripe inside the navy */}
      <polygon points="1318,0 1372,0 1500,136 1500,192" fill="#1a447f" opacity="0.45" />
      {/* the shiny gold band */}
      <polygon points="1186,0 1256,0 1500,256 1500,330" fill="url(#cert-gold-band)" />
    </g>
  );
}

/**
 * Bottom-left corner. In the sample it is SMALLER than the top-right one
 * and its gold band widens towards the bottom, so it is drawn with its own
 * measured points (a rotated copy came out too big and covered the
 * signature block text).
 */
function CornerBottomLeft() {
  return (
    <g>
      <polygon points="0,672 0,687 274,1000 292,1000" fill="#0a1f45" opacity="0.2" filter="url(#cert-blur)" />
      <polygon points="0,733 0,1000 186,1000" fill="url(#cert-navy)" />
      <polygon points="0,820 0,862 120,1000 84,1000" fill="#1a447f" opacity="0.45" />
      <polygon points="0,687 0,733 186,1000 274,1000" fill="url(#cert-gold-band-bl)" />
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
// [centre x, centre y, axis angle °, length, width]
const LAUREL_LEAVES = [
  [1282, 252, 33, 58, 24], // tip pair
  [1333, 267, 71, 57, 23],
  [1306, 299, 20, 58, 22],
  [1376, 310, 88, 58, 24],
  [1336, 344, 24, 60, 23],
  [1406, 365, -79, 58, 25],
  [1358, 393, 35, 58, 24],
  [1420, 426, -65, 61, 26],
  [1367, 448, 54, 55, 25],
  [1415, 489, -47, 59, 26],
  [1358, 500, 71, 54, 24],
  [1395, 546, -30, 59, 24],
  [1334, 547, 85, 55, 23],
  [1300, 587, -84, 55, 23],
  [1362, 598, -18, 61, 24],
  [1258, 619, -72, 55, 23],
  [1316, 642, -8, 59, 22],
];

// Stem: a smooth curve (Catmull-Rom) through the measured leaf bases,
// starting with the bare tail at the bottom-left.
const LAUREL_STEM =
  "M 1201 679 C 1214 672, 1259 651, 1280 638 C 1301 625, 1312 615, 1325 601 C 1338 587, 1351 571, 1361 555 C 1371 539, 1380 522, 1385 504 C 1390 486, 1394 466, 1394 447 C 1394 428, 1391 406, 1386 388 C 1381 370, 1371 352, 1362 336 C 1353 320, 1340 302, 1331 291 C 1322 280, 1310 272, 1306 268";

// A leaf 2 units long and 0.75 units wide, centred on (0, 0) and pointed
// at both ends. It is scaled to each measured length × width, so its
// orientation (which end is the tip) doesn't matter.
const LEAF_UNIT = "M -1 0 C -0.55 -0.5, 0.45 -0.5, 1 0 C 0.45 0.5, -0.55 0.5, -1 0 Z";

// Size correction: pixel moments assume a rectangle; for a pointed,
// lens-shaped leaf the true length is ~1.25× and width ~1.3× larger
// (checked by overlaying the result on the reference).
const LEAF_LENGTH_FACTOR = 1.25;
const LEAF_WIDTH_FACTOR = 1.3;

const LEAF_TRANSFORMS = LAUREL_LEAVES.map(
  ([x, y, angle, length, width]) =>
    `translate(${x} ${y}) rotate(${angle}) scale(${((length * LEAF_LENGTH_FACTOR) / 2).toFixed(2)} ${((width * LEAF_WIDTH_FACTOR) / 0.75).toFixed(2)})`,
);

/** Large faint laurel branch on the right side (measured colours: #ced7e2–#d3dbe5). */
function Laurel() {
  return (
    <g>
      <path d={LAUREL_STEM} fill="none" stroke="#ccd5df" strokeWidth="5" strokeLinecap="round" />
      {LEAF_TRANSFORMS.map((transform) => (
        <path key={transform} d={LEAF_UNIT} fill="url(#cert-leaf)" transform={transform} />
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
      <g fill="none" stroke="#1a2b66" strokeWidth="2.4" strokeLinecap="round">
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
const SEAL_BUMP_COUNT = 34;
const SEAL_BUMPS = Array.from({ length: SEAL_BUMP_COUNT }, (_, i) => {
  const a = (2 * Math.PI * i) / SEAL_BUMP_COUNT;
  return { cx: SEAL_CX + 90 * Math.cos(a), cy: SEAL_CY + 90 * Math.sin(a) };
});

// Laurel wreath, measured from the reference seal: two branches at
// ~0.62 R that start just past the bottom (their stems cross there) and
// climb to ~30° from the top. Each node has an outer and an inner leaf.
// θ is measured clockwise from 12 o'clock.
const WREATH_RADIUS = 60;
const WREATH_STEPS = Array.from({ length: 11 }, (_, i) => 158 - i * 12.2); // 158° -> 36° (bottom kept clear, as in the reference)

const SEAL_WREATH = WREATH_STEPS.flatMap((deg, i) =>
  [-1, 1].flatMap((side) =>
    [1, -1].map((layer) => {
      const r = WREATH_RADIUS + layer * 5.5;
      const a = (deg * Math.PI) / 180;
      const x = SEAL_CX + side * r * Math.sin(a);
      const y = SEAL_CY - r * Math.cos(a);
      const tilt = side * (deg + layer * 34);
      return { key: `${side}${layer}${i}`, x, y, transform: `rotate(${tilt} ${x} ${y})` };
    }),
  ),
);

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
          <circle key={`${bump.cx}`} cx={bump.cx} cy={bump.cy} r="8.5" />
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
      <g fill="#91500a">
        {SEAL_WREATH.map(({ key, x, y, transform }) => (
          <ellipse key={key} cx={x} cy={y} rx="7" ry="3" transform={transform} />
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
