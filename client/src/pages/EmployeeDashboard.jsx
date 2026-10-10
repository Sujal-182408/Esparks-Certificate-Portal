import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  Copy,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  LogOut,
  Mail,
  QrCode,
  Radio,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

import { apiRequest } from "../services/api";
import "./EmployeeDashboard.css";

/* =========================================================
   HELPERS
========================================================= */

function getEmployeeId(employee) {
  if (!employee) return "";

  return String(
    employee.employee_id ??
      employee.employeeId ??
      employee.id ??
      ""
  ).trim();
}

function getCertificateEmployeeId(data) {
  if (!data) return "";

  return String(
    data.employeeId ??
      data.employee_id ??
      data.employee?.id ??
      data.employee?.employee_id ??
      data.employee?.employeeId ??
      ""
  ).trim();
}

function normalizeCertificate(data) {
  if (!data) return null;

  const verificationToken =
    data.verificationToken ??
    data.verification_token ??
    "";

  const employeeId =
    getCertificateEmployeeId(data);

  const certificateUrl = verificationToken
    ? `${window.location.origin}/certificate/view?token=${encodeURIComponent(
        verificationToken
      )}`
    : "";

  return {
    id: data.id,

    employeeId,

    certificateNo:
      data.certificateNo ??
      data.certificate_no ??
      data.certificateNumber ??
      data.certificate_number ??
      "",

    recipientName:
      data.recipientName ??
      data.recipient_name ??
      "",

    courseName:
      data.courseName ??
      data.course_name ??
      "",

    issuerName:
      data.issuerName ??
      data.issuer_name ??
      "",

    issueDate:
      data.issueDate ??
      data.issue_date ??
      "",

    status: String(
      data.status ?? ""
    ).toLowerCase(),

    verificationToken,

    verificationUrl: certificateUrl,

    certificateType:
      data.certificateType ??
      data.certificate_type ??
      "",
  };
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isIssued(certificate) {
  return (
    certificate &&
    String(certificate.status).toLowerCase() ===
      "issued"
  );
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({
  children,
  icon: Icon = CircleCheck,
  tone = "cyan",
}) {
  return (
    <div
      className={`ed-status-pill ed-status-${tone}`}
    >
      <span className="ed-status-dot">
        <span className="ed-status-dot-core" />
      </span>

      <Icon size={11} />

      <span>{children}</span>
    </div>
  );
}

/* =========================================================
   CERTIFICATE DETAIL
========================================================= */

function CertificateDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}) {
  return (
    <div className="ed-detail-card">
      <div className="ed-detail-line" />

      <div className="ed-detail-content">
        <div className="ed-detail-icon">
          <Icon
            size={16}
            strokeWidth={1.8}
          />
        </div>

        <div className="ed-detail-text">
          <p className="ed-detail-label">
            {label}
          </p>

          <p
            className={`ed-detail-value ${
              mono
                ? "ed-detail-mono"
                : ""
            }`}
          >
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY CERTIFICATES
========================================================= */

function EmptyCertificates({
  onRequest,
}) {
  return (
    <div className="ed-empty-card">
      <div className="ed-empty-glow" />

      <div className="ed-empty-icon">
        <Award
          size={38}
          strokeWidth={1.2}
        />
      </div>

      <div className="ed-empty-content">
        <p className="ed-section-eyebrow">
          Digital credentials
        </p>

        <h2>No certificates yet</h2>

        <p>
          You currently don't have an issued
          certificate associated with your
          employee account.
        </p>

        <button
          type="button"
          onClick={onRequest}
          className="ed-primary-button"
        >
          Request Certificate
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   PENDING REQUEST
========================================================= */

function PendingRequestCard({
  request,
}) {
  const courseName =
    request?.courseName ??
    request?.course_name ??
    "Certificate request";

  const certificateType =
    request?.certificateType ??
    request?.certificate_type ??
    "CERT";

  const createdAt =
    request?.createdAt ??
    request?.created_at;

  return (
    <div className="ed-pending-card">
      <div>
        <div className="ed-pending-heading">
          <p>{courseName}</p>

          <span>{certificateType}</span>
        </div>

        <p className="ed-pending-date">
          Submitted{" "}
          {createdAt
            ? formatDate(createdAt)
            : "recently"}
        </p>
      </div>

      <StatusPill
        icon={Activity}
        tone="amber"
      >
        Pending review
      </StatusPill>
    </div>
  );
}

/* =========================================================
   QR MODAL
========================================================= */

function QRModal({
  certificate,
  onClose,
  onViewCertificate,
}) {
  if (!certificate) return null;

  const certificateUrl =
    certificate.verificationUrl;

  return (
    <div
      className="ed-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="ed-qr-modal">
        <div className="ed-modal-top-line" />

        <button
          type="button"
          onClick={onClose}
          className="ed-modal-close"
          aria-label="Close QR"
        >
          <X size={16} />
        </button>

        <div className="ed-qr-modal-content">
          <div className="ed-qr-heading">
            <div className="ed-qr-heading-icon">
              <QrCode size={22} />
            </div>

            <p className="ed-section-eyebrow">
              Secure certificate access
            </p>

            <h2>
              {certificate.certificateNo ||
                "Certificate"}
            </h2>

            <p>
              Scan this QR to open your full
              certificate.
            </p>
          </div>

          <div className="ed-qr-container">
            <div className="ed-qr-box">
              {certificateUrl ? (
                <QRCodeSVG
                  value={certificateUrl}
                  size={245}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#031014"
                />
              ) : (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                  }}
                >
                  QR unavailable
                </div>
              )}
            </div>
          </div>

          <div className="ed-qr-info">
            <p className="ed-detail-label">
              Certificate
            </p>

            <p className="ed-qr-course">
              {certificate.courseName ||
                "Certificate credential"}
            </p>

            <p className="ed-qr-description">
              Scan this QR to open the full
              certificate. Access is protected by
              employee authentication and
              certificate ownership checks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onViewCertificate(
                certificate
              );
            }}
            className="ed-primary-button ed-full-button"
          >
            <ExternalLink size={16} />

            Open Full Certificate

            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [employee, setEmployee] =
    useState(null);

  const [certificates, setCertificates] =
    useState([]);

  const [pendingRequests, setPendingRequests] =
    useState([]);

  /*
   * No full-page loading state.
   * The dashboard renders immediately.
   */
  const [error, setError] =
    useState("");

  const [
    selectedCertificate,
    setSelectedCertificate,
  ] = useState(null);

  const [copiedId, setCopiedId] =
    useState(null);

  /* =======================================================
     LOAD DASHBOARD
  ====================================================== */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setError("");

    try {
      /* ---------------------------------------------------
         EMPLOYEE
      --------------------------------------------------- */

      const employeeResult =
        await apiRequest(
          "/employee-auth/me"
        );

      const currentEmployee =
        employeeResult?.employee ??
        employeeResult?.user ??
        employeeResult;

      if (!currentEmployee) {
        throw new Error(
          "Employee account could not be loaded."
        );
      }

      setEmployee(currentEmployee);

      const loggedInEmployeeId =
        getEmployeeId(
          currentEmployee
        );

      /* ---------------------------------------------------
         CERTIFICATES
      --------------------------------------------------- */

      const certificateResult =
        await apiRequest(
          "/employee/certificates"
        );

      const rawCertificates =
        certificateResult?.certificates ??
        certificateResult?.data ??
        [];

      const normalizedCertificates =
        Array.isArray(
          rawCertificates
        )
          ? rawCertificates
              .map(
                normalizeCertificate
              )
              .filter(Boolean)
          : [];

      /*
       * IMPORTANT:
       *
       * Never hardcode employee 5.
       *
       * If the backend supplies employee_id,
       * only show certificates belonging to
       * the currently authenticated employee.
       *
       * If employee_id is not returned, the
       * backend MUST already guarantee that
       * /employee/certificates contains only
       * the authenticated employee's records.
       */
      const employeeCertificates =
        loggedInEmployeeId
          ? normalizedCertificates.filter(
              (certificate) => {
                /*
                 * If certificate has an employee ID,
                 * enforce the match.
                 */
                if (
                  certificate.employeeId
                ) {
                  return (
                    String(
                      certificate.employeeId
                    ) ===
                    loggedInEmployeeId
                  );
                }

                /*
                 * If employee_id is not included
                 * in the response, keep the
                 * certificate because this endpoint
                 * is expected to already be scoped
                 * by the backend.
                 */
                return true;
              }
            )
          : [];

      setCertificates(
        employeeCertificates
      );

      /* ---------------------------------------------------
         REQUESTS
      --------------------------------------------------- */

      try {
        const requestResult =
          await apiRequest(
            "/employee/certificate-requests"
          );

        const requests =
          requestResult?.requests ??
          requestResult?.data ??
          [];

        const pending =
          Array.isArray(requests)
            ? requests.filter(
                (request) =>
                  String(
                    request?.status ??
                      ""
                  ).toLowerCase() ===
                  "pending"
              )
            : [];

        setPendingRequests(
          pending
        );
      } catch (requestError) {
        console.warn(
          "Certificate requests unavailable:",
          requestError
        );

        setPendingRequests([]);
      }
    } catch (err) {
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        err?.response?.status ===
          401 ||
        err?.response?.status ===
          403
      ) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        err?.message ||
          "Unable to load your employee dashboard."
      );
    }
  }

  /* =======================================================
     OPEN FULL CERTIFICATE
  ====================================================== */

  function viewCertificate(
    certificate
  ) {
    if (!certificate) {
      setError(
        "Certificate information is unavailable."
      );

      return;
    }

    if (
      !certificate.verificationToken
    ) {
      setError(
        "Certificate verification token is unavailable."
      );

      return;
    }

    navigate(
      `/certificate/view?token=${encodeURIComponent(
        certificate.verificationToken
      )}`
    );
  }

  /* =======================================================
     COPY CERTIFICATE URL
  ====================================================== */

  async function copyVerificationUrl(
    certificate
  ) {
    if (
      !certificate?.verificationUrl
    ) {
      setError(
        "Certificate link is unavailable."
      );

      return;
    }

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          certificate.verificationUrl
        );
      } else {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          certificate.verificationUrl;

        textarea.style.position =
          "fixed";

        textarea.style.opacity = "0";

        document.body.appendChild(
          textarea
        );

        textarea.focus();
        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      }

      setCopiedId(
        String(certificate.id)
      );

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      setError(
        "Unable to copy the certificate link."
      );
    }
  }

  /* =======================================================
     LOGOUT
  ====================================================== */

  async function logout() {
    try {
      await apiRequest(
        "/employee-auth/logout",
        {
          method: "POST",
        }
      );
    } catch (err) {
      console.warn(
        "Logout request failed:",
        err
      );
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  }

  /* =======================================================
     STATS
  ====================================================== */

  const issuedCertificates =
    useMemo(
      () =>
        certificates.filter(
          (certificate) =>
            isIssued(certificate)
        ),
      [certificates]
    );

  /* =======================================================
     EMPLOYEE DATA
  ====================================================== */

  const employeeName =
    employee?.name ||
    employee?.full_name ||
    employee?.employee_name ||
    "Employee";

  const employeeEmail =
    employee?.email ||
    employee?.company_email ||
    "—";

  const employeeId =
    employee?.employee_id ||
    employee?.employeeId ||
    employee?.id ||
    "—";

  /* =======================================================
     UI
  ====================================================== */

  return (
    <main className="employee-dashboard">

      {/* ===================================================
          BACKGROUND
      ==================================================== */}

      <div
        className="ed-background"
        aria-hidden="true"
      >
        <div className="ed-bg-glow ed-bg-glow-one" />

        <div className="ed-bg-glow ed-bg-glow-two" />

        <div className="ed-grid-background" />

        <div className="ed-top-line" />
      </div>

      {/* ===================================================
          NAVBAR
      ==================================================== */}

      <header className="ed-navbar">
        <div className="ed-navbar-inner">

          <div className="ed-brand">

            <div className="ed-brand-icon">
              <div className="ed-brand-inner">
                <Award size={19} />
              </div>
            </div>

            <div>
              <p className="ed-brand-name">
                ESPARKS{" "}
                <span>
                  IT SOLUTIONS
                </span>
              </p>

              <p className="ed-brand-subtitle">
                Digital Credential Network
              </p>
            </div>

          </div>

          <div className="ed-navbar-actions">

            <div className="ed-session">
              <span className="ed-session-dot" />

              <span>
                Secure session
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/verify")
              }
              className="ed-scan-button"
              title="Scan a certificate QR code"
            >
              <ScanLine size={15} />

              <span>
                Scan Certificate
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="ed-logout-button"
            >
              <LogOut size={15} />

              <span>
                Sign out
              </span>
            </button>

          </div>

        </div>
      </header>

      {/* ===================================================
          CONTENT
      ==================================================== */}

      <div className="ed-content">

        {/* =================================================
            HERO
        ================================================== */}

        <section className="ed-hero">

          <div className="ed-hero-glow" />

          <div className="ed-hero-bottom-line" />

          <div className="ed-hero-content">

            <div className="ed-hero-main">

              <StatusPill
                icon={ShieldCheck}
              >
                Identity verified
              </StatusPill>

              <h1>
                Welcome back,
                <span>
                  {employeeName}
                </span>
              </h1>

              <p className="ed-hero-description">
                Manage your digital credentials
                from one protected workspace.
                Every certificate has its own
                verification identity and QR.
              </p>

              <div className="ed-employee-meta">

                <div className="ed-meta-item">
                  <Mail size={13} />

                  <span>
                    {employeeEmail}
                  </span>
                </div>

                <div className="ed-meta-item">
                  <Fingerprint size={13} />

                  <span>
                    ID: {employeeId}
                  </span>
                </div>

              </div>

            </div>

            <div className="ed-workspace-status">

              <div className="ed-workspace-icon">
                <LockKeyhole size={18} />
              </div>

              <div>
                <p>
                  Workspace
                </p>

                <strong>
                  Protected & active
                </strong>
              </div>

              <Radio
                size={13}
                className="ed-live-icon"
              />

            </div>

          </div>

        </section>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="ed-error">

            <div className="ed-error-icon">
              <Shield size={15} />
            </div>

            <div>
              <strong>
                Something needs attention
              </strong>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}

        {/* =================================================
            STATS
        ================================================== */}

        <section className="ed-stats">

          <div className="ed-stat-card">

            <div className="ed-stat-top">

              <div className="ed-stat-icon cyan">
                <User size={18} />
              </div>

              <CircleCheck
                size={16}
                className="ed-success"
              />

            </div>

            <p className="ed-stat-label">
              Employee account
            </p>

            <strong>
              Active
            </strong>

            <span>
              Identity successfully verified
            </span>

          </div>

          <div className="ed-stat-card">

            <div className="ed-stat-top">

              <div className="ed-stat-icon sky">
                <FileCheck2 size={18} />
              </div>

              <span className="ed-stat-count">
                {
                  issuedCertificates.length
                }
              </span>

            </div>

            <p className="ed-stat-label">
              Certificates
            </p>

            <strong>
              {issuedCertificates.length
                ? "Available"
                : "None yet"}
            </strong>

            <span>
              Issued credentials
            </span>

          </div>

          <div className="ed-stat-card">

            <div className="ed-stat-top">

              <div className="ed-stat-icon cyan">
                <ShieldCheck size={18} />
              </div>

              <Sparkles
                size={15}
                className="ed-cyan"
              />

            </div>

            <p className="ed-stat-label">
              Certificates accessible
            </p>

            <strong>
              {
                issuedCertificates.length
              }
            </strong>

            <span>
              Available to your account
            </span>

          </div>

          <div className="ed-stat-card">

            <div className="ed-stat-top">

              <div className="ed-stat-icon blue">
                <Activity size={18} />
              </div>

              <span className="ed-active-dot" />

            </div>

            <p className="ed-stat-label">
              Security status
            </p>

            <strong>
              Protected
            </strong>

            <span>
              Ownership controls enabled
            </span>

          </div>

        </section>

        {/* =================================================
            PENDING REQUESTS
        ================================================== */}

        {pendingRequests.length >
          0 && (
          <section className="ed-section">

            <div className="ed-section-heading">

              <div>

                <p className="ed-section-eyebrow amber">
                  Requests
                </p>

                <h2>
                  Pending certificates
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/certificate/request"
                  )
                }
                className="ed-text-button"
              >
                New request
              </button>

            </div>

            <div className="ed-pending-list">

              {pendingRequests.map(
                (request) => (
                  <PendingRequestCard
                    key={request.id}
                    request={request}
                  />
                )
              )}

            </div>

          </section>
        )}

        {/* =================================================
            CERTIFICATES
        ================================================== */}

        <section className="ed-section ed-certificates-section">

          <div className="ed-section-heading certificate-heading">

            <div>

              <div className="ed-heading-label">

                <span />

                <p className="ed-section-eyebrow">
                  Digital credentials
                </p>

              </div>

              <h2>
                My Certificates
              </h2>

              <p className="ed-section-description">
                Open your certificate directly or
                generate a secure QR that opens the
                full certificate.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/certificate/request"
                )
              }
              className="ed-secondary-button"
            >
              Request certificate
              <ArrowRight size={14} />
            </button>

          </div>

          {issuedCertificates.length ===
          0 ? (
            <EmptyCertificates
              onRequest={() =>
                navigate(
                  "/certificate/request"
                )
              }
            />
          ) : (
            <div className="ed-certificate-grid">

              {issuedCertificates.map(
                (certificate) => {
                  const copied =
                    copiedId ===
                    String(
                      certificate.id
                    );

                  return (
                    <article
                      key={
                        certificate.id
                      }
                      className="ed-certificate-card"
                    >

                      <div className="ed-card-top-line" />

                      <div className="ed-card-glow" />

                      <div className="ed-certificate-content">

                        {/* HEADER */}

                        <div className="ed-certificate-header">

                          <div className="ed-certificate-title">

                            <div className="ed-certificate-icon">
                              <BadgeCheck size={22} />
                            </div>

                            <div>

                              <p>
                                Certificate
                              </p>

                              <strong>
                                {certificate.certificateNo ||
                                  "Certificate"}
                              </strong>

                            </div>

                          </div>

                          <StatusPill
                            tone="green"
                            icon={
                              CircleCheck
                            }
                          >
                            Issued
                          </StatusPill>

                        </div>

                        {/* COURSE */}

                        <div className="ed-course-box">

                          <p>
                            Course / Program
                          </p>

                          <h3>
                            {certificate.courseName ||
                              "Certificate credential"}
                          </h3>

                          <div className="ed-course-line" />

                          <div className="ed-details-grid">

                            <CertificateDetail
                              icon={User}
                              label="Recipient"
                              value={
                                certificate.recipientName ||
                                employeeName
                              }
                            />

                            <CertificateDetail
                              icon={
                                CalendarDays
                              }
                              label="Issued"
                              value={formatDate(
                                certificate.issueDate
                              )}
                            />

                            <CertificateDetail
                              icon={
                                BookOpen
                              }
                              label="Program"
                              value={
                                certificate.courseName
                              }
                            />

                            <CertificateDetail
                              icon={
                                ShieldCheck
                              }
                              label="Issuer"
                              value={
                                certificate.issuerName
                              }
                            />

                          </div>

                        </div>

                        {/* ACCESS STATE */}

                        <div className="ed-verification-state">

                          <div className="ed-verified-box">

                            <div>
                              <CircleCheck size={17} />
                            </div>

                            <section>

                              <strong>
                                Certificate available
                              </strong>

                              <span>
                                Open the full certificate
                                securely using your
                                employee account.
                              </span>

                            </section>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="ed-actions">

                          <button
                            type="button"
                            onClick={() =>
                              viewCertificate(
                                certificate
                              )
                            }
                            className="ed-view-button"
                          >
                            <ExternalLink size={15} />

                            View Certificate

                            <ArrowRight size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCertificate(
                                certificate
                              )
                            }
                            className="ed-qr-button"
                          >
                            <QrCode size={15} />

                            Generate QR
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              copyVerificationUrl(
                                certificate
                              )
                            }
                            className="ed-copy-button"
                            title="Copy secure certificate link"
                          >
                            {copied ? (
                              <Check
                                size={15}
                                className="ed-success"
                              />
                            ) : (
                              <Copy size={15} />
                            )}

                            <span>
                              {copied
                                ? "Copied"
                                : "Copy"}
                            </span>
                          </button>

                        </div>

                        {/* FOOTER */}

                        <div className="ed-card-footer">

                          <span>
                            <Fingerprint size={12} />

                            Employee protected
                          </span>

                          <span>
                            <LockKeyhole size={12} />

                            Full certificate access
                          </span>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* =================================================
            SECURITY
        ================================================== */}

        <section className="ed-security-grid">

          <div className="ed-security-card">

            <div className="ed-security-icon cyan">
              <ShieldCheck size={17} />
            </div>

            <h3>
              Employee protected
            </h3>

            <p>
              Your certificate is loaded through
              an authenticated employee session.
            </p>

          </div>

          <div className="ed-security-card">

            <div className="ed-security-icon sky">
              <QrCode size={17} />
            </div>

            <h3>
              One QR per certificate
            </h3>

            <p>
              Each certificate has its own unique
              verification token and QR credential.
            </p>

          </div>

          <div className="ed-security-card">

            <div className="ed-security-icon blue">
              <LockKeyhole size={17} />
            </div>

            <h3>
              Ownership protected
            </h3>

            <p>
              The server checks the certificate token
              against the authenticated employee before
              returning the full certificate.
            </p>

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================== */}

        <footer className="ed-footer">

          <div className="ed-footer-left">

            <div className="ed-footer-icon">
              <ShieldCheck size={12} />
            </div>

            <span>
              ESPARKS IT SOLUTIONS Secure Credential Network
            </span>

          </div>

          <div className="ed-footer-right">

            <span>
              Protected workspace
            </span>

            <i />

            <span>
              Full certificate access enabled
            </span>

          </div>

        </footer>

      </div>

      {/* =================================================
          QR MODAL
      ================================================== */}

      {selectedCertificate && (
        <QRModal
          certificate={
            selectedCertificate
          }
          onClose={() =>
            setSelectedCertificate(
              null
            )
          }
          onViewCertificate={
            viewCertificate
          }
        />
      )}

    </main>
  );
}