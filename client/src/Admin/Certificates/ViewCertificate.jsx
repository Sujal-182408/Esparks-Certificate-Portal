// ============================================================
// Admin/Certificates/ViewCertificate.jsx — /admin/certificates/:id
// ============================================================
//
// Admin view of any certificate, including REVOKED ones (shown with a
// "REVOKED" stamp). Uses the same <CertificateDocument> as the employee
// page, so admins see exactly what the employee receives.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Edit3, Loader2 } from "lucide-react";

import {
  CertificateDocument,
  ScaledCertificate,
  buildVerificationUrl,
  downloadCertificatePdf,
  normalizeCertificate,
} from "../../components/certificate";
import { getAdminCertificate } from "../../services/api";
import "../../pages/CertificatePage.css";

const LIST_PATH = "/admin/certificates";

export default function ViewCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const certificateRef = useRef(null);
  const [certificate, setCertificate] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Derived during render — no extra state or effect needed. (The server
  // validates the ID too; this just avoids a pointless request.)
  const isValidId = /^[1-9]\d*$/.test(String(id || ""));
  const error = isValidId ? loadError : "Invalid certificate ID.";

  useEffect(() => {
    if (!isValidId) return undefined;
    let cancelled = false;

    getAdminCertificate(id)
      .then((data) => !cancelled && setCertificate(normalizeCertificate(data.certificate)))
      .catch((err) => !cancelled && setLoadError(err.message || "Unable to load this certificate."));

    return () => {
      cancelled = true;
    };
  }, [id, isValidId]);

  const verificationUrl = useMemo(
    () => buildVerificationUrl(certificate?.verificationToken),
    [certificate?.verificationToken],
  );

  // Plain function (no useCallback): it is only used by a <button>, so
  // memoising it would add complexity without saving any re-renders.
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCertificatePdf(certificateRef.current, certificate?.certificateNo);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setLoadError(err.message || "Unable to generate the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">
          <AlertCircle size={46} className="certificate-state-icon error" />
          <h2>Certificate Unavailable</h2>
          <p>{error}</p>
          <button type="button" className="certificate-button" onClick={() => navigate(LIST_PATH)}>
            <ArrowLeft size={18} /> Back to Certificates
          </button>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">
          <Loader2 size={42} className="certificate-state-icon spin" />
          <h2>Loading Certificate</h2>
          <p>Please wait while the certificate details are loaded.</p>
        </div>
      </div>
    );
  }

  const isRevoked = certificate.status === "revoked";

  return (
    <div className="certificate-page">
      <div className="certificate-actions">
        <button type="button" className="certificate-button" onClick={() => navigate(LIST_PATH)}>
          <ArrowLeft size={17} /> Back to Certificates
        </button>

        <div className="certificate-admin-actions">
          <span className={`certificate-status ${isRevoked ? "certificate-status-revoked" : "certificate-status-valid"}`}>
            {isRevoked ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            {isRevoked ? "Certificate Revoked" : "Certificate Valid"}
          </span>
          <button
            type="button"
            className="certificate-button"
            onClick={() => navigate(`${LIST_PATH}/${encodeURIComponent(certificate.id)}/edit`)}
          >
            <Edit3 size={16} /> Edit
          </button>
          <button
            type="button"
            className="certificate-button certificate-button-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={16} /> {downloading ? "Generating PDF…" : "Download PDF"}
          </button>
        </div>
      </div>

      <ScaledCertificate>
        <CertificateDocument ref={certificateRef} certificate={certificate} verificationUrl={verificationUrl} />
      </ScaledCertificate>
    </div>
  );
}
