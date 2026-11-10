// ============================================================
// certificatePdf.js — "Download PDF"
// ============================================================
//
// HOW IT WORKS
//   1. Wait until the certificate's web fonts are loaded.
//   2. `html-to-image` turns the certificate element into a canvas.
//      It lets the BROWSER lay out the page (via an SVG <foreignObject>)
//      and embeds the web fonts, so the image is pixel-identical to the
//      screen. (We previously used html2canvas, which re-implements
//      layout itself and drew Cinzel / Great Vibes text in the wrong
//      place — "CERTIFICATE" ended up under the ribbon.)
//   3. jsPDF places the image on a page with the same 3:2 shape.
//
// PERFORMANCE: both libraries are loaded with dynamic `import()` only
// when someone clicks "Download PDF", so they are not part of the normal
// page bundle.
// ============================================================

import { CERT_HEIGHT, CERT_WIDTH } from "./certificateContent";

// 297 mm wide (A4 width) × 198 mm (keeps the 3:2 design ratio).
// Prints on A4 landscape with a small white margin at the bottom.
const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = (PAGE_WIDTH_MM * CERT_HEIGHT) / CERT_WIDTH;

// 2× resolution -> 3000 × 2000 px image: sharp when printed.
const PIXEL_RATIO = 2;

const CERT_FONTS = [
  '700 92px "Cinzel"',
  '400 90px "Great Vibes"',
  '400 24px "Montserrat"',
  '600 24px "Montserrat"',
  '700 24px "Montserrat"',
  '700 33px "Tinos"',
];

/** Make a value safe to use as a file name. */
function toFileName(value) {
  return (
    String(value || "certificate")
      .replace(/[<>:"/\\|?*\s]+/g, "-")
      .replace(/^-+|-+$/g, "") || "certificate"
  );
}

/**
 * Draw the certificate element into a canvas exactly as it will appear in
 * the PDF. Exported separately so the dev preview page can display it.
 * @param {HTMLElement} element the <article class="cert"> element
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderCertificateCanvas(element) {
  if (!element) throw new Error("Certificate is not ready yet.");

  const { toCanvas } = await import("html-to-image");

  if (document.fonts) {
    await Promise.all(CERT_FONTS.map((font) => document.fonts.load(font)));
    await document.fonts.ready;
  }

  // The element itself is never transformed (<ScaledCertificate> scales its
  // PARENT), so it is captured at its full 1500 × 1000 design size.
  return toCanvas(element, {
    width: CERT_WIDTH,
    height: CERT_HEIGHT,
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
  });
}

/**
 * @param {HTMLElement} element  the <article class="cert"> element
 * @param {string} certificateNo used for the file name
 */
export async function downloadCertificatePdf(element, certificateNo) {
  // Load jsPDF in parallel while the image is being rendered.
  const [canvas, { jsPDF }] = await Promise.all([renderCertificateCanvas(element), import("jspdf")]);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM],
    compress: true,
  });

  // JPEG at high quality is several times smaller than PNG and looks the same here.
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
  pdf.save(`${toFileName(certificateNo)}.pdf`);
}
