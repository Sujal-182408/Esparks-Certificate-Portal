import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  ShieldX,
  Search,
  ScanLine,
  RotateCcw,
  ArrowLeft,
  LockKeyhole,
} from "lucide-react";

import QRScanner from "../components/QRScanner";
import { apiRequest } from "../services/api";
import { useNavigate } from "react-router-dom";
import brandLogo from "../assets/brand.png";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* =========================================================
   EXTRACT VERIFICATION TOKEN
========================================================= */

const extractToken = (value) => {
  if (!value) return null;

  const input = String(value).trim();

  // Raw UUID
  if (UUID_REGEX.test(input)) {
    return input;
  }

  // Full verification URL
  try {
    const url = new URL(input);
    const token = url.searchParams.get("token");

    if (token && UUID_REGEX.test(token)) {
      return token;
    }
  } catch {
    // Not a URL
  }

  return null;
};

/* =========================================================
   NORMALIZE API RESPONSE
========================================================= */

const normalizeResult = (result) => {
  const certificate = result?.certificate || null;

  return {
    status: result?.status || certificate?.status || "invalid",

    valid: Boolean(result?.valid),

    message:
      result?.message ||
      "This certificate could not be verified against our official records.",

    certificateNo:
      certificate?.certificate_no ||
      certificate?.certificateNo ||
      null,
  };
};

/* =========================================================
   COMPONENT
========================================================= */

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
const navigate = useNavigate();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");

  /* =========================================================
     VERIFY CERTIFICATE
  ========================================================= */

  const verifyCertificate = async (value) => {
    if (loading) return;

    setError("");
    setVerificationResult(null);

    const token = extractToken(value);

    if (!token) {
      setError(
        "Invalid verification QR code or token. Please scan a valid company certificate QR code.",
      );
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest(
        `/verify/${encodeURIComponent(token)}`,
      );

      const normalized = normalizeResult(result);

      setVerificationResult(normalized);
      setManualToken("");
    } catch (err) {
      /*
       * The public verification endpoint can return 404
       * when the certificate token does not exist.
       *
       * For the user, this should simply mean INVALID.
       */
      setVerificationResult({
        status: "invalid",
        valid: false,
        message:
          err?.message ||
          "This certificate could not be verified against our official company records.",
        certificateNo: null,
      });
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     AUTO VERIFY TOKEN FROM URL
  ========================================================= */

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");

    if (tokenFromUrl) {
      verifyCertificate(tokenFromUrl);
    }
  }, [searchParams]);

  /* =========================================================
     MANUAL SUBMIT
  ========================================================= */

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    if (!manualToken.trim()) {
      setError("Please enter a verification token.");
      return;
    }

    await verifyCertificate(manualToken);
  };

  /* =========================================================
     QR SCANNER RESULT
  ========================================================= */

  const handleScan = async (value) => {
    if (!value || loading) return;

    await verifyCertificate(value);
  };

  /* =========================================================
     RESET
  ========================================================= */

  const handleReset = () => {
    setVerificationResult(null);
    setError("");
    setManualToken("");

    window.history.replaceState({}, "", "/verify");
  };

  /* =========================================================
     STATUS HELPERS
  ========================================================= */

  const isValid = verificationResult?.status === "valid";

  const isRevoked = verificationResult?.status === "revoked";

  const isInvalid = verificationResult?.status === "invalid";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">


<button
  type="button"
  onClick={() => navigate("/dashboard")}
  className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/5 px-4 py-2.5 text-sm font-bold text-cyan-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/45 hover:bg-cyan-400/10 hover:text-cyan-300 active:translate-y-0"
>
  <ArrowLeft size={17} />
  <span>Back to Dashboard</span>
</button>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-lg shadow-cyan-500/10">
             <img className="w-11 h-10" src={brandLogo} alt="" />
            </div>
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Company Verification
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Certificate Verification
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Verify the authenticity of a company-issued certificate using its
            official QR code or verification token.
          </p>
        </header>

        {/* =====================================================
            VERIFICATION RESULT
        ===================================================== */}

        {verificationResult ? (
          <section className="mx-auto max-w-2xl">

            {/* =================================================
                VALID
            ================================================= */}

            {isValid && (
              <div className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-900 shadow-2xl shadow-emerald-950/20">

                <div className="border-b border-emerald-400/10 bg-emerald-400/5 px-6 py-10 text-center sm:px-10">

                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/30 ring-8 ring-emerald-400/5">
                   <img className="w-14 h-8" src={brandLogo} alt="" />
                  </div>

                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    Certificate Verified
                  </p>

                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Certificate is Authentic
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
                    This certificate has been successfully verified against
                    our official company records.
                  </p>
                </div>

                <div className="space-y-5 p-6 sm:p-8">

                  {/* STATUS */}

                  <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Verification Status
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-400">
                      VALID
                    </p>
                  </div>

                  {/* CERTIFICATE NUMBER */}

                  {verificationResult.certificateNo && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Certificate Number
                      </p>

                      <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-200">
                        {verificationResult.certificateNo}
                      </p>
                    </div>
                  )}

                  {/* SECURITY MESSAGE */}

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

                    <p className="text-sm leading-6 text-slate-400">
                      This verification result is provided directly from the
                      company&apos;s official certificate records.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                REVOKED
            ================================================= */}

            {isRevoked && (
              <div className="overflow-hidden rounded-3xl border border-amber-400/20 bg-slate-900 shadow-2xl shadow-amber-950/20">

                <div className="border-b border-amber-400/10 bg-amber-400/5 px-6 py-10 text-center sm:px-10">

                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 ring-8 ring-amber-400/5">
                    <ShieldX className="h-11 w-11 text-amber-400" />
                  </div>

                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                    Certificate Revoked
                  </p>

                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Certificate is No Longer Valid
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
                    This certificate has been revoked and is no longer
                    considered valid by the company.
                  </p>
                </div>

                <div className="space-y-5 p-6 sm:p-8">

                  <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Verification Status
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-400">
                      REVOKED
                    </p>
                  </div>

                  {verificationResult.certificateNo && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Certificate Number
                      </p>

                      <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-200">
                        {verificationResult.certificateNo}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                INVALID
            ================================================= */}

            {isInvalid && (
              <div className="overflow-hidden rounded-3xl border border-red-400/20 bg-slate-900 shadow-2xl shadow-red-950/20">

                <div className="border-b border-red-400/10 bg-red-400/5 px-6 py-10 text-center sm:px-10">

                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-400/10 ring-8 ring-red-400/5">
                    <ShieldX className="h-11 w-11 text-red-400" />
                  </div>

                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
                    Certificate Not Verified
                  </p>

                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Certificate Could Not Be Verified
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
                    This certificate could not be verified against our
                    official company records.
                  </p>
                </div>

                <div className="p-6 sm:p-8">

                  <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Verification Status
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-400">
                      INVALID
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                RESET
            ================================================= */}

            <button
              type="button"
              onClick={handleReset}
              className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-400"
            >
              <RotateCcw className="h-4 w-4" />
              Verify Another Certificate
            </button>
          </section>
        ) : (
          /* ===================================================
             VERIFICATION INPUT AREA
          =================================================== */

          <section className="grid gap-6 lg:grid-cols-2">

            {/* =================================================
                QR SCANNER
            ================================================= */}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                  <ScanLine className="h-6 w-6 text-cyan-400" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Scan Certificate QR
                  </h2>

                  <p className="text-sm text-slate-500">
                    Use the official QR code printed on the certificate.
                  </p>
                </div>
              </div>

              <QRScanner onScan={handleScan} />

              {loading && (
                <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3 text-center text-sm text-cyan-400">
                  Verifying certificate...
                </div>
              )}
            </div>

            {/* =================================================
                MANUAL TOKEN
            ================================================= */}

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                  <Search className="h-6 w-6 text-cyan-400" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Manual Verification
                  </h2>

                  <p className="text-sm text-slate-500">
                    Enter the certificate verification token.
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">

                <label
                  htmlFor="verification-token"
                  className="block text-sm font-medium text-slate-300"
                >
                  Verification Token
                </label>

                <input
                  id="verification-token"
                  type="text"
                  value={manualToken}
                  onChange={(event) => {
                    setManualToken(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter verification token"
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />

                  {loading ? "Verifying..." : "Verify Certificate"}
                </button>
              </form>

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                  <div className="flex items-start gap-3">

                    <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                    <p className="text-sm leading-6 text-red-300">
                      {error}
                    </p>

                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================
            SECURITY INFORMATION
        ===================================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-cyan-400" />

            <h3 className="text-sm font-semibold">
              Official Records
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Verification is checked against official company records.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <LockKeyhole className="mx-auto mb-3 h-6 w-6 text-cyan-400" />

            <h3 className="text-sm font-semibold">
              Secure Verification
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Each certificate uses a unique verification token.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
            <ScanLine className="mx-auto mb-3 h-6 w-6 text-cyan-400" />

            <h3 className="text-sm font-semibold">
              Public Verification
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              No employee login is required to verify a certificate.
            </p>
          </div>
        </section>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="mt-10 border-t border-slate-800 pt-6 text-center">
          <p className="text-xs text-slate-600">
            Certificate verification is provided by the official company
            verification system.
          </p>
        </footer>
      </div>
    </main>
  );
}

