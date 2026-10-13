import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import {
  adminLogin,
  getCurrentAdmin,
} from "../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // ==========================================
      // ADMIN LOGIN
      // ==========================================

      const data = await adminLogin(
        email.trim(),
        password
      );

      console.log("ADMIN LOGIN RESPONSE:", data);

      // ==========================================
      // VERIFY ADMIN SESSION
      // ==========================================

      const meData = await getCurrentAdmin();

      console.log(
        "ADMIN SESSION RESPONSE:",
        meData
      );

      // ==========================================
      // VERIFY ADMIN ROLE
      // ==========================================

      if (meData?.admin?.role !== "admin") {
        throw new Error(
          "Authenticated user is not an administrator."
        );
      }

      // ==========================================
      // VERIFY ACTIVE STATUS
      // ==========================================

      if (meData?.admin?.is_active !== true) {
        throw new Error(
          "This administrator account is inactive."
        );
      }

      console.log("ADMIN LOGIN SUCCESS");
      console.log("ADMIN:", meData.admin);

      // ==========================================
      // REDIRECT TO ADMIN DASHBOARD
      // ==========================================

      navigate("/admin", {
        replace: true,
      });

    } catch (err) {
      console.error(
        "ADMIN LOGIN ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to sign in as administrator."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] px-4 py-8 text-white sm:px-6 sm:py-12">

      {/* =====================================================
          PREMIUM BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-[160px]" />

        <div className="absolute -bottom-48 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/[0.08] blur-[150px]" />

        <div className="absolute -right-44 top-[20%] h-[430px] w-[430px] rounded-full bg-sky-400/[0.035] blur-[150px]" />

        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/[0.025] blur-[130px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.07),transparent_38%)]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="absolute left-0 right-0 top-[18%] h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      </div>

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      <section className="relative z-10 w-full max-w-[460px]">

        {/* =================================================
            BRAND / SECURITY ICON
        ================================================= */}

        <div className="mb-7 flex justify-center">

          <div className="relative">

            <div className="absolute -inset-6 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full border border-cyan-300/20 bg-white/[0.025] shadow-[0_0_60px_rgba(34,211,238,0.13),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">

              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.07] bg-gradient-to-br from-cyan-400/10 to-blue-500/5">

                <ShieldCheck
                  size={30}
                  strokeWidth={1.6}
                  className="text-cyan-300"
                />

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            MAIN GLASS CARD
        ================================================= */}

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-white/[0.035] shadow-[0_35px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="mx-auto h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.8)]" />

          <div className="px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-9">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="text-center">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-cyan-300/[0.04] px-3 py-1.5">

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />

                </span>

                <span className="text-[9px] font-bold uppercase tracking-[1.8px] text-cyan-300/80">
                  Restricted Access
                </span>

              </div>

              <h1 className="text-[30px] font-bold tracking-[-1.2px] text-white sm:text-[34px]">

                Admin{" "}

                <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  Portal
                </span>

              </h1>

              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-slate-500 sm:text-sm">
                Secure administrator access to ESPARKS IT SOLUTIONS.
              </p>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                role="alert"
                className="mt-7 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-4"
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-400/10">

                  <AlertCircle
                    size={17}
                    className="text-red-400"
                  />

                </div>

                <div className="min-w-0">

                  <p className="text-xs font-bold text-red-300">
                    Authentication failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-300/70">
                    {error}
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                LOGIN FORM
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="admin-email"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Admin email
                </label>

                <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/[0.025] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">

                  <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">

                    <Mail size={18} />

                  </div>

                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter admin email"
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div>

                <label
                  htmlFor="admin-password"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Password
                </label>

                <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/[0.025] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">

                  <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">

                    <LockKeyhole size={18} />

                  </div>

                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter password"
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                </div>

              </div>

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 py-4 text-sm font-extrabold text-[#021014] shadow-[0_12px_35px_rgba(34,211,238,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,211,238,0.2)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
              >

                <span className="absolute inset-y-0 -left-24 w-24 skew-x-[-20deg] bg-white/40 blur-md transition-all duration-700 group-hover:left-[115%]" />

                <span className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/20" />

                {loading ? (
                  <>
                    <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-[#021014]/25 border-t-[#021014]" />

                    <span className="relative">
                      Signing in...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative">
                      Sign In
                    </span>

                    <ArrowRight
                      size={18}
                      className="relative transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

            </form>

            {/* =================================================
                SECURITY INFO
            ================================================= */}

            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">

              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/10 bg-cyan-300/[0.04] text-cyan-300">

                  <ShieldCheck size={16} />

                </div>

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[1px] text-cyan-300/70">
                    Protected Area
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-slate-600">
                    Administrator access is restricted to
                    authorized ESPARKS IT SOLUTIONS accounts.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                EMPLOYEE LOGIN
            ================================================= */}

            <div className="mt-7 border-t border-white/[0.07] pt-6 text-center">

              <Link
                to="/login"
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-cyan-300 sm:text-sm"
              >
                Employee login instead

                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

            </div>

            {/* =================================================
                HOME
            ================================================= */}

            <Link
              to="/"
              className="mt-3 block text-center text-[11px] text-slate-600 transition hover:text-slate-300"
            >
              Back to Home
            </Link>

          </div>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-6 text-center">

          <div className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">

            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />

            ESPARKS IT SOLUTIONS Secure Administration

            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />

          </div>

        </div>

      </section>

    </main>
  );
}