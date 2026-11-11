// ============================================================
// <CertificateDocument> — the certificate itself (1500 × 1000 px)
// ============================================================
//
// ONE component used everywhere a certificate is shown:
//   - pages/CertificateView.jsx            (employee + public link)
//   - Admin/Certificates/ViewCertificate.jsx (admin)
//   - PDF download (certificatePdf.js captures this element)
//
// Before, each page had its own copy of the template, and they had
// already drifted apart. Now a design change is made once, here.
//
// It is a PURE component: it receives data through props, fetches
// nothing and has no side effects — easy to reuse and to preview.
//
// Layers (bottom to top):
//   1. <CertificateBackground> SVG: paper, border, corners, laurel
//   2. HTML text, positioned on the 1500 × 1000 grid (see the CSS)
//   3. "REVOKED" stamp, only for revoked certificates
// ============================================================

import { forwardRef, memo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CertificateBackground,
  EsMark,
  GoldSeal,
  IsoGlobe,
  TitleRibbon,
} from "./certificateArt";
import {
  COMPANY,
  ISO_BADGES,
  firstName,
  formatCertificateDate,
  formatPersonName,
  getWording,
} from "./certificateContent";
import "./CertificateDocument.css";

/**
 * Long names get a smaller script font so they always fit the 900 px name
 * area. Great Vibes averages ~0.5 em per character, so a name of n
 * characters is about 0.5 × size × n px wide -> size ≤ 1800 / n.
 */
const NAME_MAX_SIZE = 90;
const NAME_MIN_SIZE = 40;
function nameFontSize(name) {
  return Math.max(NAME_MIN_SIZE, Math.min(NAME_MAX_SIZE, Math.floor(1800 / Math.max(name.length, 1))));
}

/** "in the area of X from A to B." — falls back gracefully when dates are missing. */
function ProgrammeLine({ courseName, startDate, endDate, durationMonths }) {
  const from = formatCertificateDate(startDate);
  const to = formatCertificateDate(endDate);

  return (
    <p className="cert-line">
      in the area of <strong>{courseName}</strong>
      {from && to ? (
        <>
          {" "}from <strong>{from}</strong> to <strong>{to}</strong>
        </>
      ) : durationMonths ? (
        <>
          {" "}for a duration of{" "}
          <strong>
            {durationMonths} {Number(durationMonths) === 1 ? "month" : "months"}
          </strong>
        </>
      ) : null}
      .
    </p>
  );
}

/**
 * @param {{
 *   certificate: ReturnType<import("./certificateContent").normalizeCertificate>,
 *   verificationUrl: string,
 * }} props
 * `ref` points at the root element (used for the PDF capture).
 */
// memo: skip re-rendering when the page re-renders with the same props
// (e.g. while the "Generating PDF…" button state changes).
const CertificateDocument = memo(forwardRef(function CertificateDocument(
  { certificate, verificationUrl },
  ref,
) {
  const wording = getWording(certificate.certificateType);
  const name = formatPersonName(certificate.recipientName) || "Certificate Recipient";
  const isRevoked = certificate.status === "revoked";

  return (
    <article ref={ref} className="cert" aria-label={`Certificate ${certificate.certificateNo}`}>
      <CertificateBackground />

      {/* ---------------- HEADER ---------------- */}
      <header className="cert-header">
        <div className="cert-brand">
          <EsMark height={74} />
          <div className="cert-brand-text">
            <span className="cert-brand-line1">{COMPANY.brandLine1}</span>
            <span className="cert-brand-line2">{COMPANY.brandLine2}</span>
          </div>
        </div>

        <span className="cert-divider" />

        {ISO_BADGES.map((badge, index) => (
          <div key={badge.standard} className="cert-iso-group">
            {index > 0 && <span className="cert-divider" />}
            <div className="cert-iso">
              <div className="cert-iso-globe">
                <IsoGlobe />
                <span>ISO</span>
              </div>
              <strong>{badge.standard}</strong>
              {badge.lines.map((line) => (
                <small key={line}>{line}</small>
              ))}
            </div>
          </div>
        ))}
      </header>

      {/* ---------------- TITLE ---------------- */}
      <section className="cert-body">
        <h1 className="cert-title">CERTIFICATE</h1>

        <div className="cert-ribbon">
          <span className="cert-ribbon-rule" />
          <div className="cert-ribbon-band">
            <TitleRibbon />
            <span>{wording.subtitle}</span>
          </div>
          <span className="cert-ribbon-rule" />
        </div>

        <p className="cert-line cert-intro">This is to certify that</p>

        <h2 className="cert-name" style={{ fontSize: nameFontSize(name) }}>
          {name}
        </h2>
        <span className="cert-name-rule" />

        <p className="cert-line">has successfully completed {wording.programme} at</p>
        <p className="cert-line cert-company">{COMPANY.bodyName}</p>
        <ProgrammeLine
          courseName={certificate.courseName || "the assigned programme"}
          startDate={certificate.startDate}
          endDate={certificate.endDate}
          durationMonths={certificate.durationMonths}
        />

        <p className="cert-summary">
          {wording.summary.replace("{name}", firstName(certificate.recipientName))}
        </p>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="cert-footer">
        <div className="cert-signature">
          <span className="cert-signature-script">{COMPANY.signatoryName}</span>
          {/* short pen stroke under the signature, as in the sample */}
          <svg className="cert-signature-flourish" viewBox="0 0 92 14" aria-hidden="true">
            <path d="M 2 12 Q 40 6 90 2" fill="none" stroke="#1b2f6b" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="cert-signature-rule" />
          <strong>{COMPANY.signatoryName}</strong>
          <span>{COMPANY.signatoryTitle}</span>
          <small>{COMPANY.legalName}</small>
        </div>

        <div className="cert-seal">
          <GoldSeal />
        </div>

        <span className="cert-divider cert-divider-footer" />

        <dl className="cert-meta">
          <div>
            <dt>Certificate ID:</dt>
            <dd>{certificate.certificateNo || "—"}</dd>
          </div>
          <div>
            <dt>Issued On:</dt>
            <dd>{formatCertificateDate(certificate.issueDate) || "—"}</dd>
          </div>
        </dl>

        <div className="cert-qr">
          {verificationUrl ? (
            <QRCodeSVG value={verificationUrl} size={104} level="M" marginSize={0} fgColor="#111111" />
          ) : (
            <span className="cert-qr-missing">QR unavailable</span>
          )}
          <span>Verify Certificate</span>
        </div>
      </footer>

      {isRevoked && (
        <div className="cert-revoked" role="status">
          REVOKED
        </div>
      )}
    </article>
  );
}));

export default CertificateDocument;
