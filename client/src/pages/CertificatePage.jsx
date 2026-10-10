
import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import {
  BadgeCheck,
  FileCheck2,
  ShieldCheck,
  XCircle,
  ArrowLeft,
  LockKeyhole,
  CalendarDays,
  Building2,
  UserRound,
  Hash,
} from "lucide-react";
import { apiRequest } from "../services/api";
import "./CertificateView.css";

export default function CertificatePage() {
  const { id } = useParams();
  const location = useLocation();

  const [certificate, setCertificate] = useState(
    location.state?.certificate || null
  );

  const [loading, setLoading] = useState(
    !location.state?.certificate
  );

  const [error, setError] = useState("");

  useEffect(() => {
    if (certificate) return;

    let cancelled = false;

    async function fetchCertificate() {
      try {
        const result = await apiRequest(
          `/certificates/${encodeURIComponent(id)}`
        );

        if (!cancelled) {
          setCertificate(result.certificate);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load certificate details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCertificate();

    return () => {
      cancelled = true;
    };
  }, [id, certificate]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] px-5 py-20 text-white">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-[110px]" />

        <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-blue-500/[0.08] blur-[120px]" />

        {/* Grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:42px_42px]" />

        <section className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/70 to-transparent" />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.07] text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.08)]">
            <ShieldCheck size={27} strokeWidth={1.7} />
          </div>

          <div className="mx-auto mt-6 h-9 w-9 animate-spin rounded-full border-[3px] border-white/10 border-r-cyan-300 border-t-sky-400" />

          <h1 className="mt-5 text-lg font-extrabold tracking-tight text-white">
            Loading Certificate
          </h1>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Securely retrieving certificate information...
          </p>
        </section>
      </main>
    );
  }

  /* =========================================================
     ERROR / NOT FOUND
  ========================================================= */

  if (error || !certificate) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] px-5 py-16 text-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/[0.05] blur-[120px]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-500/[0.06] blur-[120px]" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:42px_42px]" />

        <section className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/[0.09] bg-white/[0.035] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-10">
          <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-red-400/70 to-transparent" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/15 bg-red-400/[0.07] text-red-300">
            <XCircle size={32} strokeWidth={1.7} />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-400/10 bg-red-400/[0.05] px-3 py-1.5 text-[9px] font-extrabold tracking-[1.2px] text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            CERTIFICATE UNAVAILABLE
          </div>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Certificate unavailable
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {error || "No certificate information was found."}
          </p>

          <Link
            to="/verify"
            className="group mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-400 via-sky-400 to-blue-500 px-5 text-xs font-extrabold text-[#021014] shadow-[0_12px_35px_rgba(34,211,238,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,211,238,0.2)]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />

            Return to verification
          </Link>
        </section>
      </main>
    );
  }

  const isValid = certificate.status === "valid";

  /* =========================================================
     CERTIFICATE PAGE
  ========================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030609] px-4 py-8 text-white sm:px-6 sm:py-12">
      {/* =====================================================
          BACKGROUND ATMOSPHERE
      ===================================================== */}

      <div className="pointer-events-none fixed -left-48 top-[5%] h-96 w-96 rounded-full bg-cyan-400/[0.055] blur-[120px]" />

      <div className="pointer-events-none fixed -right-48 top-[25%] h-105 w-105 rounded-full bg-blue-500/[0.055] blur-[130px]" />

      <div className="pointer-events-none fixed bottom-[-180px] left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-sky-400/[0.035] blur-[130px]" />

      <div className="pointer-events-none fixed inset-0 opacity-[0.022] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {/* ===================================================
            TOP NAV
        =================================================== */}

        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/verify"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 text-[11px] font-bold text-slate-400 backdrop-blur-xl transition duration-300 hover:border-cyan-300/20 hover:bg-cyan-300/[0.04] hover:text-cyan-300"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />

            Back to verification
          </Link>

          <div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[1.3px] text-slate-600 sm:flex">
            <ShieldCheck
              size={14}
              className="text-cyan-400/70"
            />

            ESPARKS IT SOLUTIONS
          </div>
        </div>

        {/* ===================================================
            MAIN CARD
        =================================================== */}

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-white/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div
            className={`absolute left-0 right-0 top-0 h-px ${
              isValid
                ? "bg-linear-to-r from-transparent via-cyan-300/80 to-transparent"
                : "bg-linear-to-r from-transparent via-red-400/70 to-transparent"
            }`}
          />

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.07] text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.06)]">
                <ShieldCheck
                  size={27}
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-[9px] font-extrabold tracking-[1.5px] text-slate-500">
                  CERTIFICATE RECORD
                </p>

                <h1 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  Verification result
                </h1>
              </div>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-extrabold tracking-[0.5px] ${
                isValid
                  ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-red-400/15 bg-red-400/[0.07] text-red-300"
              }`}
            >
              {isValid ? (
                <BadgeCheck size={16} />
              ) : (
                <XCircle size={16} />
              )}

              {isValid
                ? "VALID CERTIFICATE"
                : "NOT VALID"}
            </div>
          </div>

          <div className="mx-6 h-px bg-linear-to-r from-transparent via-white/[0.09] to-transparent sm:mx-8 lg:mx-10" />

          {/* =================================================
              CERTIFICATE INTRO
          ================================================= */}

          <div className="px-6 pb-7 pt-8 text-center sm:px-8 lg:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] text-cyan-300">
              <FileCheck2
                size={28}
                strokeWidth={1.6}
              />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {certificate.title || "Employee Certificate"}
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-slate-500 sm:text-sm">
              Certificate details returned by the official
              verification service.
            </p>
          </div>

          {/* =================================================
              DETAILS
          ================================================= */}

          <div className="grid grid-cols-1 gap-3 px-6 pb-8 sm:grid-cols-2 sm:px-8 lg:px-10">
            <CertificateInfo
              icon={UserRound}
              label="Employee name"
              value={certificate.employeeName}
            />

            <CertificateInfo
              icon={Hash}
              label="Certificate ID"
              value={certificate.certificateNumber}
            />

            <CertificateInfo
              icon={Building2}
              label="Organization"
              value={certificate.organization}
            />

            <CertificateInfo
              icon={CalendarDays}
              label="Issue date"
              value={certificate.issueDate}
            />
          </div>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <div className="mx-6 mb-6 flex items-start gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.025] p-4 sm:mx-8 lg:mx-10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.05] text-cyan-300">
              <LockKeyhole size={17} />
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-slate-200">
                Official verification status
              </h3>

              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                This result reflects the status returned by
                the server at the time of verification. Only
                the official backend determines certificate
                validity.
              </p>
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-black/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <ShieldCheck
                size={15}
                className="text-cyan-400/60"
              />

              ESPARKS IT SOLUTIONS
            </div>

            <p className="text-[9px] text-slate-700">
              Secure certificate verification platform
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


/* =========================================================
   CERTIFICATE INFO COMPONENT
========================================================= */

function CertificateInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-cyan-300/[0.018]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.04] blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-cyan-300/80 transition duration-300 group-hover:border-cyan-300/15 group-hover:bg-cyan-300/[0.05]">
          <Icon size={16} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[1px] text-slate-600">
            {label}
          </p>

          <p className="mt-2 wrap-break-word text-sm font-bold leading-6 text-slate-200">
            {value || "Not provided"}
          </p>
        </div>
      </div>
    </div>
  );
}
