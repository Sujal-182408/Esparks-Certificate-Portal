// ============================================================
// pages/CertificateView.jsx — /certificate/view?token=<uuid>
// ============================================================
//
// Shows a certificate to the employee (from their dashboard) or to anyone
// with the link (emails). Data comes from the PUBLIC verification API, so
// only valid, non-revoked certificates are displayed here.
//
// The certificate design itself lives in components/certificate/.
// This page only: loads the data, shows loading/error states, and
// offers "Download PDF".
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Loader2 } from "lucide-react";

import {
  CertificateDocument,
  ScaledCertificate,
  buildVerificationUrl,
  downloadCertificatePdf,
  normalizeCertificate,
} from "../components/certificate";
import { useAuth } from "../hooks/useAuth";
import { verifyCertificate } from "../services/api";
import "./CertificatePage.css";

export default function CertificateView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const certificateRef = useRef(null);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(token ? "" : "Certificate verification token is missing.");
  const [downloading, setDownloading] = useState(false);

  // Logged-in employees go back to their dashboard; public visitors to the verifier.
  const backPath = user ? "/dashboard" : "/verify";

  // ---- Load the certificate whenever the token changes ----
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    verifyCertificate(token)
      .then((data) => {
        if (cancelled) return;
        if (!data?.valid || !data.certificate) {
          setError(data?.message || "This certificate is no longer valid.");
          return;
        }
        setCertificate(normalizeCertificate(data.certificate));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load this certificate.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // useMemo: the URL (and the QR code built from it) only changes with the token.
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
      setError(err.message || "Unable to generate the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // ---- Error ----
  if (error) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">
          <AlertCircle size={46} className="certificate-state-icon error" />
          <h2>Certificate Unavailable</h2>
          <p>{error}</p>
          <button type="button" className="certificate-button" onClick={() => navigate(backPath)}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>
    );
  }

  // ---- Loading ----
  if (!certificate) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">
          <Loader2 size={42} className="certificate-state-icon spin" />
          <h2>Loading Certificate</h2>
          <p>Please wait while we securely load the certificate from our official records.</p>
        </div>
      </div>
    );
  }

  // ---- Certificate ----
  return (
    <div className="certificate-page">
      <div className="certificate-actions">
        <button type="button" className="certificate-button" onClick={() => navigate(backPath)}>
          <ArrowLeft size={17} /> {user ? "Dashboard" : "Back"}
        </button>

        <div className="certificate-admin-actions">
          <span className="certificate-status certificate-status-valid">
            <CheckCircle2 size={17} /> Certificate Verified
          </span>
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
