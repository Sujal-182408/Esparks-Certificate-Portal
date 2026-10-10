import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
} from "lucide-react";

import { apiRequest } from "../../services/api";

import companyLogo from "../../assets/logo.png";
import sign from "../../assets/sign.png";
import nipLogo from "../../assets/niplogo.png";
import msmeLogo from "../../assets/msmelogo.png";
import isoLogo from "../../assets/iso-logo.png";

import "../../pages/CertificateView.css";

/* ============================================================
   NORMALIZE BACKEND CERTIFICATE DATA
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

    courseName:
      raw.courseName ||
      raw.course_name ||
      "",

    certificateNo:
      raw.certificateNo ||
      raw.certificate_no ||
      "",

    certificateType:
      raw.certificateType ||
      raw.certificate_type ||
      "INTERNSHIP",

    issueDate:
      raw.issueDate ||
      raw.issue_date ||
      "",

    issuerName:
      raw.issuerName ||
      raw.issuer_name ||
      "",

    verificationToken:
      raw.verificationToken ||
      raw.verification_token ||
      "",

    status:
      raw.status ||
      "",

    createdAt:
      raw.createdAt ||
      raw.created_at ||
      "",

    revokedAt:
      raw.revokedAt ||
      raw.revoked_at ||
      "",
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
      (_, separator, letter) =>
        `${separator}${letter.toUpperCase()}`
    );
}

/* ============================================================
   DATE FORMATTER
============================================================ */

function formatCertificateDate(value) {
  if (!value) {
    return "";
  }

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
   ADMIN CERTIFICATE VIEW
============================================================ */

const ViewCertificate = () => {
  /*
   * IMPORTANT:
   * App.jsx route is:
   *
   * /admin/certificates/:id
   *
   * Therefore useParams() must read "id".
   */
  const { id } = useParams();

  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ==========================================================
     VERIFICATION URL
  ========================================================== */

  const verificationUrl = useMemo(() => {
    if (!certificate?.verificationToken) {
      return "";
    }

    return `${window.location.origin}/verify?token=${encodeURIComponent(
      certificate.verificationToken
    )}`;
  }, [certificate?.verificationToken]);

  /* ==========================================================
     LOAD CERTIFICATE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCertificate() {
      try {
        setLoading(true);
        setError("");

        /*
        ========================================================
        CERTIFICATE ID
        ========================================================

        The route parameter comes from:

          /admin/certificates/:id

        Example:

          /admin/certificates/10

        Therefore "id" is the certificate ID.

        This page does NOT accept:
          - request ID
          - employee ID
          - verification token
        ========================================================
        */

        const certificateId = String(id || "").trim();

        /*
        ========================================================
        REQUIRED ID
        ========================================================
        */

        if (!certificateId) {
          throw new Error(
            "Certificate ID is missing."
          );
        }

        /*
        ========================================================
        POSTGRESQL BIGINT ID VALIDATION
        ========================================================

        Allow only positive integer IDs.

        Examples:

          1       ✅
          10      ✅
          87      ✅
          0       ❌
          -1      ❌
          abc     ❌
          token   ❌
        ========================================================
        */

        if (!/^[1-9]\d*$/.test(certificateId)) {
          throw new Error(
            "Invalid certificate ID."
          );
        }

        /*
        ========================================================
        FETCH CERTIFICATE
        ========================================================
        */

        const data = await apiRequest(
          `/admin/certificates/${encodeURIComponent(
            certificateId
          )}`
        );

        /*
        ========================================================
        COMPONENT UNMOUNT CHECK
        ========================================================
        */

        if (!mounted) {
          return;
        }

        /*
        ========================================================
        GET CERTIFICATE FROM RESPONSE
        ========================================================
        */

        const rawCertificate =
          data?.certificate ||
          data?.data ||
          null;

        if (!rawCertificate) {
          throw new Error(
            "Certificate information could not be found."
          );
        }

        /*
        ========================================================
        NORMALIZE CERTIFICATE
        ========================================================
        */

        const normalized =
          normalizeCertificate(
            rawCertificate
          );

        if (!normalized.id) {
          throw new Error(
            "Certificate information could not be found."
          );
        }

        /*
        ========================================================
        SAVE CERTIFICATE
        ========================================================
        */

        setCertificate(normalized);
      } catch (err) {
        console.error(
          "Admin certificate loading error:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err?.message ||
            "Unable to load this certificate."
        );
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
  }, [id]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="certificate-state-page">
        <div className="certificate-state-card">

          <Loader2
            className="certificate-state-icon spin"
            size={42}
          />

          <h2>
            Loading Certificate
          </h2>

          <p>
            Please wait while the certificate
            details are loaded.
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
            className="certificate-state-icon error-icon"
            size={46}
          />

          <h2>
            Certificate Unavailable
          </h2>

          <p>
            {error ||
              "The requested certificate could not be found."}
          </p>

          <button
            type="button"
            className="certificate-back-button"
            onClick={() =>
              navigate("/admin/certificates")
            }
          >
            <ArrowLeft size={18} />
            Back to Certificates
          </button>

        </div>

      </div>
    );
  }

  /* ==========================================================
     CERTIFICATE DATA
  ========================================================== */

  const recipientName =
    certificate.recipientName ||
    "Certificate Recipient";

  const courseName =
    certificate.courseName ||
    "Completed Program";

  const certificateNo =
    certificate.certificateNo ||
    "N/A";

  const certificateType =
    certificate.certificateType ||
    "INTERNSHIP";

  const issuerName =
    certificate.issuerName ||
    "eSparks IT Solutions";

  const issueDate =
    formatCertificateDate(
      certificate.issueDate
    ) || "N/A";

  const status =
    certificate.status?.toLowerCase() ||
    "issued";

  const isIssued =
    status === "issued";

  /* ==========================================================
     CERTIFICATE
  ========================================================== */

  return (
    <div className="certificate-page">

      {/* =====================================================
          ADMIN ACTION BAR
      ====================================================== */}

      <div className="certificate-actions no-print">

        <button
          type="button"
          className="certificate-dashboard-button"
          onClick={() =>
            navigate("/admin/certificates")
          }
        >
          <ArrowLeft size={17} />
          Back to Certificates
        </button>

        <div className="certificate-admin-actions">

          <button
            type="button"
            className="certificate-edit-button"
            onClick={() =>
              navigate(
                `/admin/certificates/${encodeURIComponent(
                  certificate.id
                )}/edit`
              )
            }
          >
            <Edit3 size={17} />
            Edit Certificate
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
      ====================================================== */}

      <div className="certificate-wrapper">

        <article
          className={`certificate-document ${
            !isIssued
              ? "certificate-document-revoked"
              : ""
          }`}
        >

          {/* =================================================
              CENTER COMPANY WATERMARK
          ================================================== */}

          <img
            src={companyLogo}
            alt=""
            aria-hidden="true"
            className="certificate-watermark"
          />

          {/* =================================================
              OUTER FRAME
          ================================================== */}

          <div className="certificate-frame">

            <div className="certificate-frame-inner">

              <span className="frame-corner frame-tl" />
              <span className="frame-corner frame-tr" />
              <span className="frame-corner frame-bl" />
              <span className="frame-corner frame-br" />

            </div>

          </div>

          {/* =================================================
              TOP IDENTIFICATION
          ================================================== */}

          <div className="certificate-top-id">

            <span>
              CERTIFICATE-ID:
              <br />
            </span>

            {certificateNo}

          </div>

          {/* =================================================
              HEADER
          ================================================== */}

          <header className="certificate-header">

            <div className="certificate-logo-left">

              <img
                src={companyLogo}
                alt="eSparks IT Solutions"
              />

            </div>

            <div className="certificate-top-icon">

              <div className="certificate-diamond">
                ◆
              </div>

            </div>

          </header>

          {/* =================================================
              TITLE
          ================================================== */}

          <section className="certificate-title-section">

            <h1>
              CERTIFICATE
            </h1>

            <h2>
              OF{" "}
              {certificateType === "INTERNSHIP"
                ? "INTERNSHIP PROGRAM"
                : certificateType}
            </h2>

            <div className="certificate-title-line" />

          </section>

          {/* =================================================
              PRESENTED TO
          ================================================== */}

          <section className="certificate-recipient-section">

            <p className="certificate-awarded-text">
              THIS CERTIFICATE IS AWARDED TO
            </p>

            <h3 className="certificate-recipient">
              {toTitleCase(
                recipientName
              )}
            </h3>

          </section>

          {/* =================================================
              DESCRIPTION
          ================================================== */}

          <section className="certificate-description-section">

            <p>

              In recognition of your outstanding
              performance and dedication during your
              internship in{" "}

              <strong>
                {courseName}
              </strong>

              {" "}at{" "}

              <strong>
                {issuerName}
              </strong>

              . Your consistent efforts, technical
              skills, and professional growth have truly
              contributed to our internship program.

              <br />

              <span className="certificate-appreciation-text">
                We appreciate your contribution and
                wish you success in your future endeavors.
              </span>

            </p>

          </section>

          {/* =================================================
              QR + BOTTOM AUTHENTICATION
          ================================================== */}

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

                  <span className="certificate-qr-label">
                    SCAN TO VERIFY
                  </span>

                </>
              ) : (

                <div className="certificate-qr-unavailable">

                  <AlertCircle size={24} />

                  <span>
                    QR unavailable
                  </span>

                </div>

              )}

            </div>

            {/* SIGNATURE */}

            <div className="certificate-signature">

              <img
                src={sign}
                alt="Authorized Signatory"
              />

              <div className="signature-line" />

              <strong>
                Founder &amp; CEO
              </strong>

              <span>
                {issuerName}
              </span>

            </div>

            {/* NIP / ISO / MSME */}

            <img
              src={nipLogo}
              alt="NIP"
              className="certificate-nip-logo"
            />

            <img
              src={isoLogo}
              alt="ISO"
              className="certificate-iso-logo"
            />

            <img
              src={msmeLogo}
              alt="MSME"
              className="certificate-msme-logo"
            />

          </section>

          {/* =================================================
              FOOTER
          ================================================== */}

          <footer className="certificate-footer">

            <span>
              Certificate No. {certificateNo}
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Issued: {issueDate}
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Verified by {issuerName}
            </span>

          </footer>

          {/* =================================================
              REVOKED
          ================================================== */}

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

export default ViewCertificate;