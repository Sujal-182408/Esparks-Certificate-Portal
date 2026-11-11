
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  ShieldX,
  Search,
  ScanLine,
  RotateCcw,
  ArrowLeft,
  LockKeyhole,
  Download,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import QRScanner from "../components/QRScanner";
import { apiRequest } from "../services/api";

import companyLogo from "../assets/logo.png";
import sign from "../assets/sign.png";
import nipLogo from "../assets/nipLogo.png";
import msmeLogo from "../assets/msmeLogo.png";
import isoLogo from "../assets/iso-logo.png";

import CertificateDocument from "../components/certificate/CertificateDocument";

import "./CertificatePage.css";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractToken(value) {
  if (!value) return null;

  const input = String(value).trim();

  if (UUID_REGEX.test(input)) return input;

  try {
    const url = new URL(input);
    const token = url.searchParams.get("token");

    return token && UUID_REGEX.test(token) ? token : null;
  } catch {
    return null;
  }
}

function normalizeCertificate(raw = {}, token = "") {
  return {
    recipientName: raw.recipient_name || raw.recipientName || "",
    courseName: raw.course_name || raw.courseName || "",
    certificateNo: raw.certificate_no || raw.certificateNo || "",
    certificateType: raw.certificate_type || raw.certificateType || "INTR",
    durationMonths: raw.duration_months ?? raw.durationMonths ?? null,
    issueDate: raw.issue_date || raw.issueDate || "",
    issuerName: raw.issuer_name || raw.issuerName || "eSparks IT Solutions",
    verificationToken: token,
    status: String(raw.status || "").trim().toLowerCase(),
  };
}

function toTitleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-z])/g,
      (_, separator, letter) =>
        `${separator}${letter.toUpperCase()}`,
    );
}

function formatCertificateDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCertificateType(type) {
  const value = String(type || "").trim().toUpperCase();

  if (["INTR", "INTERNSHIP"].includes(value)) {
    return {
      heading: "OF INTERNSHIP PROGRAM",
      label: "Internship",
    };
  }

  if (["EXPR", "EXP", "EXPERIENCE"].includes(value)) {
    return {
      heading: "OF EXPERIENCE",
      label: "Experience",
    };
  }

  if (["GEN", "GENERAL"].includes(value)) {
    return {
      heading: "OF ACHIEVEMENT",
      label: "General",
    };
  }

  return {
    heading: "OF CERTIFICATE",
    label: "Certificate",
  };
}

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const certificateRef = useRef(null);

  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");

  const tokenFromUrl = searchParams.get("token");

  const certificate = verificationResult?.certificate || null;

  const isValid =
    verificationResult?.valid === true &&
    verificationResult?.status === "valid";

  const isRevoked = verificationResult?.status === "revoked";
  const isExpired = verificationResult?.status === "expired";
  const isInvalid = verificationResult?.status === "invalid";

  const verificationUrl = useMemo(() => {
    if (!certificate?.verificationToken) return "";

    return `${window.location.origin}/verify?token=${encodeURIComponent(
      certificate.verificationToken,
    )}`;
  }, [certificate?.verificationToken]);

  const verifyCertificate = async (value) => {
    if (loading) return;

    setError("");
    setVerificationResult(null);

    const token = extractToken(value);

    if (!token) {
      setError(
        "Invalid verification QR code or token. Please provide a valid certificate QR code.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest(
        `/verify/${encodeURIComponent(token)}`,
      );

      const normalizedCertificate = result?.certificate
        ? normalizeCertificate(result.certificate, token)
        : null;

      setVerificationResult({
        success: Boolean(result?.success),
        valid: Boolean(result?.valid),
        status: result?.status || "invalid",
        message:
          result?.message ||
          "This certificate could not be verified.",
        certificate: normalizedCertificate,
      });

      setManualToken("");
    } catch (err) {
      setVerificationResult({
        success: false,
        valid: false,
        status: "invalid",
        message:
          err?.message ||
          "This certificate could not be verified against our official records.",
        certificate: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      verifyCertificate(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    if (!manualToken.trim()) {
      setError("Please enter a verification token.");
      return;
    }

    await verifyCertificate(manualToken);
  };

  const handleScan = async (value) => {
    if (!value || loading) return;

    await verifyCertificate(value);
  };

  const handleReset = () => {
    setVerificationResult(null);
    setError("");
    setManualToken("");
    navigate("/verify", { replace: true });
  };

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          const finish = () => {
            img.removeEventListener("load", finish);
            img.removeEventListener("error", finish);
            resolve();
          };

          img.addEventListener("load", finish);
          img.addEventListener("error", finish);
        });
      }),
    );
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current || isDownloading || !isValid) {
      return;
    }

    try {
      setIsDownloading(true);

      const element = certificateRef.current;

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitForImages(element);

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

        onclone: (clonedDocument) => {
          const clonedCertificate =
            clonedDocument.querySelector(".certificate-document");

          if (!clonedCertificate) return;

          Object.assign(clonedCertificate.style, {
            width: "1380px",
            height: "976px",
            minWidth: "1380px",
            minHeight: "976px",
            maxWidth: "1380px",
            maxHeight: "976px",
            margin: "0",
            padding: "0",
            transform: "none",
            boxSizing: "border-box",
          });

          const titleSection = clonedCertificate.querySelector(
            ".certificate-title-section",
          );

          if (titleSection) {
            Object.assign(titleSection.style, {
              position: "absolute",
              top: "235px",
              left: "0",
              right: "0",
              margin: "0",
              padding: "0",
            });
          }

          const titleLine = clonedCertificate.querySelector(
            ".certificate-title-line",
          );

          if (titleLine) {
            Object.assign(titleLine.style, {
              position: "relative",
              top: "25px",
              margin: "14px auto 0",
            });
          }

          const recipientSection = clonedCertificate.querySelector(
            ".certificate-recipient-section",
          );

          if (recipientSection) {
            Object.assign(recipientSection.style, {
              position: "absolute",
              top: "350px",
              left: "50%",
              width: "72%",
              margin: "0",
              padding: "0",
              transform: "translateX(-50%)",
            });
          }

          const awardedText = clonedCertificate.querySelector(
            ".certificate-awarded-text",
          );

          if (awardedText) {
            Object.assign(awardedText.style, {
              margin: "0",
              padding: "0",
              lineHeight: "1",
            });
          }

          const recipient = clonedCertificate.querySelector(
            ".certificate-recipient",
          );

          if (recipient) {
            Object.assign(recipient.style, {
              margin: "30px 0 0",
              padding: "0",
              lineHeight: "1",
            });
          }
        },
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      pdf.addImage(
        canvas.toDataURL("image/png", 1),
        "PNG",
        0,
        0,
        297,
        210,
        undefined,
        "FAST",
      );

      const safeName = String(
        certificate.certificateNo || "certificate",
      )
        .replace(/[<>:"/\\|?*]+/g, "-")
        .trim();

      pdf.save(`${safeName || "certificate"}.pdf`);
    } catch (err) {
      console.error("Public certificate PDF error:", err);
      alert(err?.message || "Unable to generate certificate PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const certificateType = getCertificateType(
    certificate?.certificateType,
  );

  const issueDate = formatCertificateDate(certificate?.issueDate);

  const durationMonths = certificate?.durationMonths;

  const description = (() => {
    if (!certificate) return "";

    if (certificateType.label === "Internship") {
      return (
        <>
          In recognition of your outstanding performance and dedication
          during your{" "}
          {durationMonths && (
            <>
              <strong>
                {durationMonths}{" "}
                {Number(durationMonths) === 1 ? "Month" : "Months"} of
                Internship
              </strong>{" "}
            </>
          )}
          in <strong>{certificate.courseName}</strong> at{" "}
          <strong>{certificate.issuerName}</strong>. Your consistent efforts,
          technical skills, and professional growth have truly contributed
          to our internship program.
        </>
      );
    }

    if (certificateType.label === "Experience") {
      return (
        <>
          This certificate recognizes your professional experience and
          contributions in <strong>{certificate.courseName}</strong> at{" "}
          <strong>{certificate.issuerName}</strong>. We appreciate your
          dedication, skills, and valuable contributions.
        </>
      );
    }

    return (
      <>
        This certificate is awarded in recognition of your achievement and
        contribution in <strong>{certificate.courseName}</strong> at{" "}
        <strong>{certificate.issuerName}</strong>. We appreciate your
        efforts and wish you success in your future endeavors.
      </>
    );
  })();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/5 px-4 py-2.5 text-sm font-bold text-cyan-400 transition hover:-translate-y-0.5 hover:border-cyan-400/45 hover:bg-cyan-400/10"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <header className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <img className="h-10 w-11" src={companyLogo} alt="eSparks" />
            </div>
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            eSparks IT Solutions
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Certificate Verification
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Verify and access company-issued certificates using the official
            QR code or verification link.
          </p>
        </header>

        {loading && (
          <div className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-10 text-center">
            <Loader2 className="mx-auto mb-4 animate-spin text-cyan-400" size={40} />
            <h2 className="text-xl font-bold">Verifying Certificate</h2>
            <p className="mt-2 text-sm text-slate-400">
              Checking the official company records...
            </p>
          </div>
        )}

        {!loading && verificationResult && (
          <section className="space-y-6">
            <div
              className={`rounded-2xl border p-5 ${
                isValid
                  ? "border-emerald-400/20 bg-emerald-400/5"
                  : isRevoked
                    ? "border-amber-400/20 bg-amber-400/5"
                    : "border-red-400/20 bg-red-400/5"
              }`}
            >
              <div className="flex items-center gap-3">
                {isValid ? (
                  <ShieldCheck className="text-emerald-400" size={30} />
                ) : (
                  <ShieldX
                    className={
                      isRevoked ? "text-amber-400" : "text-red-400"
                    }
                    size={30}
                  />
                )}

                <div>
                  <h2 className="text-xl font-bold">
                    {isValid
                      ? "Certificate is Authentic"
                      : isRevoked
                        ? "Certificate Revoked"
                        : isExpired
                          ? "Certificate Expired"
                          : "Certificate Not Verified"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {verificationResult.message}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Status: {verificationResult.status}
              </p>
            </div>

            {certificate && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      Certificate Preview
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {isValid
                        ? "Official certificate retrieved from company records."
                        : "This certificate is not currently valid."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={!isValid || isDownloading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isDownloading ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Download size={17} />
                    )}
                    {isDownloading ? "Generating PDF..." : "Download PDF"}
                  </button>
                </div>

                {/* FULL-WIDTH CENTERED CERTIFICATE PREVIEW */}
                <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto overflow-y-hidden">
                {/* FULL-WIDTH CERTIFICATE PREVIEW */}
<div className="certificate-preview-scroll">
  <div className="certificate-preview-inner">
    <CertificateDocument
      ref={certificateRef}
      certificate={certificate}
      verificationUrl={verificationUrl}
    />
  </div>
</div>
                </div>

                {!isValid && (
                  <p className="text-center text-sm font-semibold text-red-400">
                    PDF download is disabled because this certificate is not valid.
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="mx-auto flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-400"
            >
              <RotateCcw size={17} />
              Verify Another Certificate
            </button>
          </section>
        )}

        {!loading && !verificationResult && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                  <ScanLine className="text-cyan-400" size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">Scan Certificate QR</h2>
                  <p className="text-sm text-slate-500">
                    Scan the QR code printed on the certificate.
                  </p>
                </div>
              </div>

              <QRScanner onScan={handleScan} />
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Search className="text-cyan-400" size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">Manual Verification</h2>
                  <p className="text-sm text-slate-500">
                    Enter the certificate token or paste its link.
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <label
                  htmlFor="verification-token"
                  className="block text-sm font-medium text-slate-300"
                >
                  Verification Token / Link
                </label>

                <input
                  id="verification-token"
                  type="text"
                  value={manualToken}
                  onChange={(event) => {
                    setManualToken(event.target.value);
                    setError("");
                  }}
                  placeholder="Paste certificate link or token"
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                >
                  <Search size={17} />
                  Verify Certificate
                </button>
              </form>

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={20} />
                    <p className="text-sm leading-6 text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <ShieldCheck className="mx-auto mb-3 text-cyan-400" size={25} />
            <h3 className="text-sm font-semibold">Official Records</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Verification is checked against official company records.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <LockKeyhole className="mx-auto mb-3 text-cyan-400" size={25} />
            <h3 className="text-sm font-semibold">Secure Verification</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Each certificate uses a unique verification token.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <Download className="mx-auto mb-3 text-cyan-400" size={25} />
            <h3 className="text-sm font-semibold">Certificate Access</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Public certificate links allow recipients to access and download valid certificates.
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-800 pt-6 text-center">
          <p className="text-xs text-slate-600">
            Certificate verification is provided by the official eSparks IT Solutions verification system.
          </p>
        </footer>
      </div>
    </main>
  );
}
