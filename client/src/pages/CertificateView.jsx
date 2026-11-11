// ============================================================
// pages/CertificateView.jsx
// Route: /certificate/view?token=<verification-token>
//
// PURPOSE
// ------------------------------------------------------------
// Displays a certificate using the shared certificate module.
//
// FEATURES
// ------------------------------------------------------------
// 1. Loads certificate details through the public verification API.
// 2. Supports public certificate links.
// 3. Displays loading, error, and unavailable states.
// 4. Shows the shared responsive certificate design.
// 5. Generates a PDF using the shared PDF utility.
// 6. Provides a QR code through CertificateDocument.
//
// IMPORTANT
// ------------------------------------------------------------
// The actual certificate design lives in:
// components/certificate/CertificateDocument.jsx
//
// Do not duplicate certificate HTML or styling in this page.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";

import {
  CertificateDocument,
  ScaledCertificate,
  buildVerificationUrl,
  downloadCertificatePdf,
  normalizeCertificate,
} from "../components/certificate";

import { verifyCertificate } from "../services/api";

import "./CertificatePage.css";


/* ============================================================
   CERTIFICATE VIEW COMPONENT
============================================================ */

export default function CertificateView() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");


  /* ==========================================================
     REFS
  ========================================================== */

  // References the actual certificate element for PDF generation.
  const certificateRef = useRef(null);


  /* ==========================================================
     STATE
  ========================================================== */

  const [certificate, setCertificate] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [downloading, setDownloading] = useState(false);


  /* ==========================================================
     VERIFICATION URL
  ========================================================== */

  // The same URL is displayed as a QR code inside the certificate.
  const verificationUrl = useMemo(
    () => buildVerificationUrl(certificate?.verificationToken),
    [certificate?.verificationToken],
  );


  /* ==========================================================
     LOAD CERTIFICATE
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadCertificate() {
      try {
        setLoading(true);

        setError("");

        setCertificate(null);


        // Validate the verification token.
        if (!token) {
          throw new Error(
            "Certificate verification token is missing.",
          );
        }


        // Request certificate information from the public API.
        const response = await verifyCertificate(token);


        // Ignore the response if the component has unmounted.
        if (cancelled) {
          return;
        }


        // Check whether the certificate is valid.
        if (!response?.valid || !response?.certificate) {
          throw new Error(
            response?.message ||
              (response?.status === "revoked"
                ? "This certificate has been revoked."
                : "This certificate is invalid or unavailable."),
          );
        }


        // Convert database fields into the frontend certificate format.
        const normalizedCertificate = normalizeCertificate(
          response.certificate,
        );


        // Verify the certificate status.
        if (normalizedCertificate.status !== "issued") {
          throw new Error(
            "This certificate is not currently available.",
          );
        }


        // Store the verified certificate.
        setCertificate(normalizedCertificate);

      } catch (err) {
        console.error("Certificate loading error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load this certificate. Please try again.",
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    // Start loading the certificate.
    loadCertificate();


    // Cleanup prevents outdated requests from updating component state.
    return () => {
      cancelled = true;
    };

  }, [token]);


  /* ==========================================================
     DOWNLOAD CERTIFICATE PDF
  ========================================================== */

  const handleDownload = async () => {
    if (!certificateRef.current || downloading || !certificate) {
      return;
    }

    try {
      setDownloading(true);

      setError("");


      // Generate and download the certificate PDF.
      await downloadCertificatePdf(
        certificateRef.current,
        certificate.certificateNo,
      );

    } catch (err) {
      console.error("Certificate PDF generation failed:", err);

      setError(
        err?.message ||
          "Unable to generate the certificate PDF.",
      );

    } finally {
      setDownloading(false);
    }
  };


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const handleBack = () => {
    // Return to the previous page when browser history is available.
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    // Fallback for users opening a direct certificate link.
    navigate("/verify");
  };


  /* ==========================================================
     LOADING STATE
  ========================================================== */

  if (loading) {
    return (
      <main className="certificate-state-page">

        <div className="certificate-state-card">

          <Loader2
            size={42}
            className="certificate-state-icon spin"
          />

          <h2>Loading Certificate</h2>

          <p>
            Please wait while we securely retrieve your certificate
            from the official certificate system.
          </p>

        </div>

      </main>
    );
  }


  /* ==========================================================
     ERROR STATE
  ========================================================== */

  if (error || !certificate) {
    return (
      <main className="certificate-state-page">

        <div className="certificate-state-card certificate-error-card">

          <AlertCircle
            size={46}
            className="certificate-state-icon error-icon"
          />

          <h2>Certificate Unavailable</h2>

          <p>
            {error ||
              "The requested certificate could not be found."}
          </p>

          <button
            type="button"
            className="certificate-button"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />

            Back
          </button>

        </div>

      </main>
    );
  }


  /* ==========================================================
     MAIN CERTIFICATE PAGE
  ========================================================== */

  return (
    <main className="certificate-page">


      {/* ======================================================
         PAGE ACTIONS
      ====================================================== */}

      <div className="certificate-actions no-print">

        {/* Back Button */}

        <button
          type="button"
          className="certificate-button"
          onClick={handleBack}
        >
          <ArrowLeft size={17} />

          Back
        </button>


        {/* Certificate Actions */}

        <div className="certificate-admin-actions">

          {/* Verification Status */}

          <span className="certificate-status certificate-status-valid">

            <CheckCircle2 size={17} />

            Certificate Verified

          </span>


          {/* Download PDF */}

          <button
            type="button"
            className="certificate-button certificate-button-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2
                  size={17}
                  className="spin"
                />

                Generating PDF...
              </>
            ) : (
              <>
                <Download size={17} />

                Download PDF
              </>
            )}
          </button>

        </div>

      </div>


      {/* ======================================================
         CERTIFICATE DOCUMENT
      ====================================================== */}

      <div className="certificate-wrapper">

        <ScaledCertificate>

          <CertificateDocument
            ref={certificateRef}
            certificate={certificate}
            verificationUrl={verificationUrl}
          />

        </ScaledCertificate>

      </div>


    </main>
  );
}
