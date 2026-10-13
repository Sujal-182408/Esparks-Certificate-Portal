import React, { useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { QRCodeSVG } from "qrcode.react";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Download,
  GraduationCap,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { apiRequest } from "../services/api";


import companyLogo from "../assets/logo.png";
import sign from "../assets/sign.png";
import nipLogo from "../assets/nipLogo.png";
import msmeLogo from "../assets/msmeLogo.png";
import isoLogo from "../assets/iso-logo.png";

import "./CertificateView.css";

/* ============================================================
   NORMALIZE CERTIFICATE DATA
============================================================ */

function normalizeCertificate(raw = {}) {
  return {
    id: raw.id ?? null,

    recipientName:
      raw.recipientName ||
      raw.recipient_name ||
      raw.employeeName ||
      raw.employee_name ||
      "",

    courseName: raw.courseName || raw.course_name || "",

    certificateNo: raw.certificateNo || raw.certificate_no || "",

    certificateType:
      raw.certificateType || raw.certificate_type || "INTERNSHIP",
    durationMonths: raw.durationMonths ?? raw.duration_months ?? null,

    issueDate: raw.issueDate || raw.issue_date || "",

    issuerName: raw.issuerName || raw.issuer_name || "",

    verificationToken: raw.verificationToken || raw.verification_token || "",

    status: raw.status || "",

    createdAt: raw.createdAt || raw.created_at || "",

    revokedAt: raw.revokedAt || raw.revoked_at || "",
  };
}

/* ============================================================
   TITLE CASE
============================================================ */

function toTitleCase(value = "") {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-z])/g,
      (_, separator, letter) => `${separator}${letter.toUpperCase()}`,
    );
}

/* ============================================================
   DATE
============================================================ */

function formatCertificateDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ============================================================
   COMPONENT
============================================================ */

const CertificateView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const certificateRef = useRef(null);

  const [certificate, setCertificate] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [isDownloading, setIsDownloading] = useState(false);

  /* ==========================================================
     ADMIN / EMPLOYEE
  ========================================================== */

  const isAdmin = location.pathname.startsWith("/admin");

  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  /* ==========================================================
     VERIFICATION URL
  ========================================================== */

  const verificationUrl = useMemo(() => {
    if (!certificate?.verificationToken) {
      return "";
    }

    return `${window.location.origin}/verify?token=${encodeURIComponent(
      certificate.verificationToken,
    )}`;
  }, [certificate?.verificationToken]);

  /* ==========================================================
     WAIT FOR IMAGES
  ========================================================== */

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const handleDone = () => {
            img.removeEventListener("load", handleDone);

            img.removeEventListener("error", handleDone);

            resolve();
          };

          img.addEventListener("load", handleDone);

          img.addEventListener("error", handleDone);
        });
      }),
    );
  };

  /* ==========================================================
     DOWNLOAD PDF

     IMPORTANT:

     The REAL certificate is captured directly.

     No clone.
     No layout freezing.
     No child repositioning.

     Master certificate:
     1380 × 976

     PDF:
     A4 landscape
     297 × 210 mm
  ========================================================== */

  const handleDownloadPDF = async () => {
    if (!certificateRef.current || isDownloading) {
      return;
    }

    try {
      setIsDownloading(true);

      const element = certificateRef.current;

      /* --------------------------------------------------------
       WAIT FOR FONTS
    -------------------------------------------------------- */

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      /* --------------------------------------------------------
       WAIT FOR IMAGES
    -------------------------------------------------------- */

      await waitForImages(element);

      /* --------------------------------------------------------
       CAPTURE CERTIFICATE
       FORCE MASTER SIZE DURING PDF GENERATION
    -------------------------------------------------------- */

      const canvas = await html2canvas(element, {
        width: 1380,
        height: 976,

        windowWidth: 1380,
        windowHeight: 976,

        x: 0,
        y: 0,

        scrollX: 0,
        scrollY: 0,

        scale: 3,

        backgroundColor: "#ffffff",

        useCORS: true,
        allowTaint: false,

        logging: false,

        foreignObjectRendering: false,

        imageTimeout: 15000,

        /*
         * IMPORTANT
         * Keep the certificate at its original
         * 1380 × 976 layout while html2canvas
         * creates the PDF image.
         */
        onclone: (clonedDocument) => {
          const clonedCertificate = clonedDocument.querySelector(
            ".certificate-document",
          );

          if (!clonedCertificate) {
            return;
          }

          /* ========================================================
     FORCE MASTER CERTIFICATE SIZE
  ======================================================== */

          clonedCertificate.style.width = "1380px";
          clonedCertificate.style.height = "976px";

          clonedCertificate.style.minWidth = "1380px";
          clonedCertificate.style.minHeight = "976px";

          clonedCertificate.style.maxWidth = "1380px";
          clonedCertificate.style.maxHeight = "976px";

          clonedCertificate.style.margin = "0";
          clonedCertificate.style.padding = "0";

          clonedCertificate.style.transform = "none";
          clonedCertificate.style.boxSizing = "border-box";

          /* ========================================================
     KEEP EXACT CERTIFICATE LAYOUT
     DO NOT REPOSITION CHILD ELEMENTS
  ======================================================== */

          const titleSection = clonedCertificate.querySelector(
            ".certificate-title-section",
          );

          if (titleSection) {
            titleSection.style.position = "absolute";
            titleSection.style.top = "235px";
            titleSection.style.left = "0";
            titleSection.style.right = "0";
            titleSection.style.margin = "0";
            titleSection.style.padding = "0";
          }

          /* ========================================================
     TITLE LINE
  ======================================================== */

          const titleLine = clonedCertificate.querySelector(
            ".certificate-title-line",
          );

          if (titleLine) {
            titleLine.style.position = "relative";
            titleLine.style.top = "25px";
            titleLine.style.margin = "14px auto 0";
          }

          /* ========================================================
     RECIPIENT SECTION
  ======================================================== */

          const recipientSection = clonedCertificate.querySelector(
            ".certificate-recipient-section",
          );

          if (recipientSection) {
            recipientSection.style.position = "absolute";

            recipientSection.style.top = "350px";

            recipientSection.style.left = "50%";

            recipientSection.style.width = "72%";

            recipientSection.style.margin = "0";

            recipientSection.style.padding = "0";

            recipientSection.style.transform = "translateX(-50%)";
          }

          /* ========================================================
     AWARDED TEXT
  ======================================================== */

          const awardedText = clonedCertificate.querySelector(
            ".certificate-awarded-text",
          );

          if (awardedText) {
            awardedText.style.margin = "0";
            awardedText.style.padding = "0";

            awardedText.style.lineHeight = "1";
          }

          /* ========================================================
     RECIPIENT NAME
  ======================================================== */

          const recipient = clonedCertificate.querySelector(
            ".certificate-recipient",
          );

          if (recipient) {
            recipient.style.margin = "30px 0 0";

            recipient.style.padding = "0";

            recipient.style.lineHeight = "1";
          }
        },
      });

      /* --------------------------------------------------------
       PNG
    -------------------------------------------------------- */

      const imageData = canvas.toDataURL("image/png", 1.0);

      /* --------------------------------------------------------
       CREATE A4 LANDSCAPE PDF
    -------------------------------------------------------- */

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      /* --------------------------------------------------------
       EXACT MASTER → A4

       1380 × 976
       ↓
       297 × 210 mm
    -------------------------------------------------------- */

      pdf.addImage(imageData, "PNG", 0, 0, 297, 210, undefined, "FAST");

      /* --------------------------------------------------------
       FILE NAME
    -------------------------------------------------------- */

      const certificateNumber = certificate?.certificateNo || "certificate";

      const safeName = String(certificateNumber)
        .replace(/[<>:"/\\|?*]+/g, "-")
        .trim();

      pdf.save(`${safeName || "certificate"}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);

      alert(error?.message || "Unable to generate certificate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  /* ==========================================================
     LOAD CERTIFICATE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCertificate() {
      try {
        setLoading(true);
        setError("");

        if (!token) {
          throw new Error("Certificate verification token is missing.");
        }

        const data = await apiRequest(`/verify/${encodeURIComponent(token)}`);

        if (!mounted) {
          return;
        }

        if (!data?.valid || !data?.certificate) {
          throw new Error(
            data?.message || "This certificate could not be loaded.",
          );
        }

        const normalizedCertificate = normalizeCertificate(data.certificate);

        const certificateStatus = String(
          normalizedCertificate.status || "",
        ).toLowerCase();

        if (certificateStatus && certificateStatus !== "issued") {
          throw new Error(
            "This certificate has been revoked and is no longer available.",
          );
        }

        setCertificate(normalizedCertificate);
      } catch (err) {
        console.error("Certificate loading error:", err);

        if (mounted) {
          setError(err?.message || "Unable to load this certificate.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCertificate();

    return () => {
      mounted = false;
    };
  }, [token]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">
          <Loader2 size={42} className="certificate-state-icon spin" />

          <h2>Loading Certificate</h2>

          <p>
            Please wait while we securely load your certificate from the
            official certificate system.
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error || !certificate) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card certificate-error-card">
          <AlertCircle
            size={46}
            className="certificate-state-icon error-icon"
          />

          <h2>Certificate Access Failed</h2>

          <p>{error || "The requested certificate could not be found."}</p>

          <button
            type="button"
            className="certificate-back-button"
            onClick={() => navigate(dashboardPath)}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ==========================================================
     CERTIFICATE DATA
  ========================================================== */

  const recipientName = certificate.recipientName || "Certificate Recipient";

  const courseName = certificate.courseName || "Completed Program";

  const certificateNo = certificate.certificateNo || "N/A";

  const certificateType = certificate.certificateType || "INTERNSHIP";

  const durationMonths = certificate.durationMonths;

  const issuerName = certificate.issuerName || "eSparks IT Solutions";

  const issueDate = formatCertificateDate(certificate.issueDate) || "N/A";

  const status = certificate.status?.toLowerCase() || "issued";

  const isIssued = status === "issued";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="certificate-page">
      {/* =====================================================
          ACTION BAR
      ===================================================== */}

      <div className="certificate-actions no-print">
        <button
          type="button"
          className="certificate-dashboard-button"
          onClick={() => navigate(dashboardPath)}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <div className="certificate-admin-actions">
          <button
            type="button"
            className="certificate-dashboard-button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            <Download size={16} />

            {isDownloading ? "Generating PDF..." : "Download PDF"}
          </button>

          <div className="certificate-verification-status">
            {isIssued ? (
              <>
                <CheckCircle2 size={17} />
                Certificate Verified
              </>
            ) : (
              <>
                <AlertCircle size={17} />
                Certificate Revoked
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CERTIFICATE WRAPPER
      ===================================================== */}

      <div className="certificate-wrapper">
        <article
          ref={certificateRef}
          className={`certificate-document ${
            !isIssued ? "certificate-document-revoked" : ""
          }`}
        >
          {/* =================================================
              WATERMARK
          ================================================= */}

          <img
            src={companyLogo}
            alt=""
            aria-hidden="true"
            className="certificate-watermark"
          />

          {/* =================================================
              FRAME
          ================================================= */}

          <div className="certificate-frame">
            <div className="certificate-frame-inner">
              <span className="frame-corner frame-tl" />

              <span className="frame-corner frame-tr" />

              <span className="frame-corner frame-bl" />

              <span className="frame-corner frame-br" />
            </div>
          </div>

          {/* =================================================
              CERTIFICATE ID
          ================================================= */}

          <div className="certificate-top-id">
            <span>
              CERTIFICATE-ID:
              <br />
            </span>

            {certificateNo}
          </div>

          {/* =================================================
              HEADER
          ================================================= */}

          <header className="certificate-header">
            <div className="certificate-logo-left">
              <img src={companyLogo} alt="eSparks IT Solutions" />
            </div>

            <div className="certificate-top-icon">
              <GraduationCap className="certificate-graduation-icon" />
            </div>
          </header>

          {/* =================================================
              TITLE
          ================================================= */}

          <section className="certificate-title-section">
            <h1>CERTIFICATE</h1>

            <h2>OF INTERNSHIP PROGRAM</h2>

            <div className="certificate-title-line" />
          </section>

          {/* =================================================
              RECIPIENT
          ================================================= */}

          <section className="certificate-recipient-section">
            <p className="certificate-awarded-text">
              THIS CERTIFICATE IS AWARDED TO
            </p>

            <h3 className="certificate-recipient">
              {toTitleCase(recipientName)}
            </h3>
          </section>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <section className="certificate-description-section">
            <p className="certificate-description-text">
              In recognition of your outstanding performance and dedication
              during your{" "}
              {certificateType === "INTR" && durationMonths && (
                <>
                  <strong>
                    {durationMonths}{" "}
                    {Number(durationMonths) === 1 ? "Month" : "Months"} of
                    Internship
                  </strong>{" "}
                </>
              )}
               in <strong>{courseName}</strong> at{" "}
              <strong>{issuerName}</strong>. Your consistent efforts, technical
              skills, and professional growth have truly contributed to our
              internship program.
              <br />
              <span className="certificate-appreciation-text">
                We appreciate your contribution and wish you success in your
                future endeavors.
              </span>
            </p>
          </section>

          {/* =================================================
              BOTTOM
          ================================================= */}

          <section className="certificate-bottom">
            {/* QR */}

            <div className="certificate-qr">
              {verificationUrl ? (
                <>
                  <div className="certificate-qr-box">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={105}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <span className="certificate-qr-label">SCAN TO VERIFY</span>
                </>
              ) : (
                <div className="certificate-qr-unavailable">
                  <AlertCircle size={24} />

                  <span>QR unavailable</span>
                </div>
              )}
            </div>

            {/* SIGNATURE */}

            <div className="certificate-signature">
              <img src={sign} alt="Authorized Signatory" />

              <div className="signature-line" />

              <strong>Founder &amp; CEO</strong>

              <span>{issuerName}</span>
            </div>

            {/* NIP */}

            <img src={nipLogo} alt="NIP" className="certificate-nip-logo" />

            {/* ISO */}

            <img src={isoLogo} alt="ISO" className="certificate-iso-logo" />

            {/* MSME */}

            <img src={msmeLogo} alt="MSME" className="certificate-msme-logo" />
          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="certificate-footer">
            <span>Certificate No. {certificateNo}</span>

            <span className="footer-dot">•</span>

            <span>Issued: {issueDate}</span>

            <span className="footer-dot">•</span>

            <span>Verified by {issuerName}</span>
          </footer>

          {/* =================================================
              REVOKED
          ================================================= */}

          {!isIssued && (
            <div className="certificate-revoked-overlay">
              <div className="certificate-revoked-badge">
                <AlertCircle size={20} />
                CERTIFICATE REVOKED
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default CertificateView;
