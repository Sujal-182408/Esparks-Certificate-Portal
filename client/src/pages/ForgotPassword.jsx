import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  Send,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    setEmail(e.target.value);

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (cleanEmail.length > 254) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest(
        "/employee-auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      setSuccess(
        data?.message ||
          "If an account exists for this email, a password reset link has been sent."
      );

      setEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);

      setError(
        err?.message ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] px-4 py-8 text-white sm:px-6 sm:py-12">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -top-45 h-125 w-125 -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[150px]" />

        <div className="absolute -bottom-52 -left-40 h-125 w-125 rounded-full bg-blue-500/8 blur-[150px]" />

        <div className="absolute -right-37.5 top-[25%] h-87.5 w-87.5 rounded-full bg-sky-300/[0.035] blur-[130px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.07),transparent_35%)]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="absolute left-0 right-0 top-[18%] h-px bg-linear-to-r from-transparent via-cyan-400/20 to-transparent" />
      </div>

      {/* CONTENT */}
      <section className="relative z-10 w-full max-w-107.5">
        {/* BRAND */}
        <div className="mb-7 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-5 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="relative flex h-18.5 w-18.5 items-center justify-center rounded-full border border-cyan-300/20 bg-white/2.5 shadow-[0_0_60px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.07] bg-linear-to-br from-cyan-400/10 to-blue-500/5">
                <ShieldCheck
                  size={29}
                  strokeWidth={1.6}
                  className="text-cyan-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/9 bg-white/[0.035] shadow-[0_35px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />

          <div className="mx-auto h-0.5 w-24 bg-linear-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.8)]" />

          <div className="px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-9">
            {/* HEADER */}
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-cyan-300/4 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>

                <span className="text-[9px] font-bold uppercase tracking-[1.8px] text-cyan-300/80">
                  Account Recovery
                </span>
              </div>

              <h1 className="text-[30px] font-bold tracking-[-1.2px] text-white sm:text-[34px]">
                Forgot{" "}
                <span className="bg-linear-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  Password?
                </span>
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-slate-500 sm:text-sm">
                Enter your registered email address and we'll send you a secure
                password reset link.
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="mt-7 flex items-start gap-3 rounded-2xl border border-red-400/15 bg-red-400/6 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                  <AlertCircle
                    size={17}
                    className="text-red-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-300">
                    Request failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-300/65">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div
                role="status"
                className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/6 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                  <CheckCircle
                    size={17}
                    className="text-emerald-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-300">
                    Check your email
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-300/70">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Email Address
                </label>

                <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/8 bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/2.5 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">
                  <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-linear-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/2.5 text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">
                    <Mail size={18} />
                  </div>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-cyan-400 via-sky-400 to-blue-500 py-4 text-sm font-extrabold text-[#021014] shadow-[0_12px_35px_rgba(34,211,238,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,211,238,0.2)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-y-0 -left-24 w-24 skew-x-[-20deg] bg-white/40 blur-md transition-all duration-700 group-hover:left-[115%]" />

                <span className="pointer-events-none absolute inset-px rounded-[15px] border border-white/20" />

                {loading ? (
                  <>
                    <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-[#021014]/25 border-t-[#021014]" />

                    <span className="relative">
                      Sending...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative">
                      Send Reset Link
                    </span>

                    <Send
                      size={18}
                      className="relative transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* BACK TO LOGIN */}
            <div className="mt-7 text-center">
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[1px] text-slate-600 transition hover:text-cyan-300"
              >
                <ArrowLeft
                  size={13}
                  className="transition group-hover:-translate-x-1"
                />

                Back to Login
              </Link>
            </div>

            {/* FOOTER */}
            <div className="mt-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/[0.07]" />

              <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">
                ESPARKS IT SOLUTIONS
              </span>

              <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/[0.07]" />
            </div>
          </div>
        </div>

        {/* SECURITY FOOTER */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">
            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />

            Secure Certificate Verification

            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />
          </div>

          <p className="mt-2 text-[9px] text-slate-800">
            © {new Date().getFullYear()} ESPARKS IT SOLUTIONS
          </p>
        </div>
      </section>
    </main>
  );
}