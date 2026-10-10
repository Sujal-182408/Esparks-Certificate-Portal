import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { apiRequest } from "../services/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (!form.password) {
      setError("Please enter your new password.");
      return;
    }

   if (form.password.length < 10) {
  setError(
    "Password must be at least 10 characters long."
  );
  return;
}

    if (form.password.length > 128) {
      setError(
        "Password must not exceed 128 characters."
      );
      return;
    }

    if (
      form.password !== form.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/employee-auth/reset-password",
         {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            token,
            password: form.password,
          }),
        }
      );

      setSuccess(
        data?.message ||
          "Password reset successfully."
      );

      setForm({
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1800);
    } catch (err) {
      console.error(
        "Reset password error:",
        err
      );

      setError(
        err?.message ||
          "Unable to reset your password."
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

      </div>


      <section className="relative z-10 w-full max-w-107.5">

        {/* BRAND */}

        <div className="mb-7 flex justify-center">

          <div className="relative">

            <div className="absolute -inset-5 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="relative flex h-18.5 w-18.5 items-center justify-center rounded-full border border-cyan-300/20 bg-white/2.5 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">

              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.07] bg-linear-to-br from-cyan-400/10 to-blue-500/5">

                <KeyRound
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

          <div className="mx-auto h-0.5 w-24 bg-linear-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.8)]" />

          <div className="px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-9">

            <div className="text-center">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/10 bg-cyan-300/4 px-3 py-1.5">

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />

                </span>

                <span className="text-[9px] font-bold uppercase tracking-[1.8px] text-cyan-300/80">
                  Secure Recovery
                </span>

              </div>

              <h1 className="text-[30px] font-bold tracking-[-1.2px] text-white sm:text-[34px]">

                Create New{" "}

                <span className="bg-linear-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  Password
                </span>

              </h1>

              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-slate-500 sm:text-sm">
                Choose a strong password for your
                employee account.
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

                <div>

                  <p className="text-xs font-bold text-red-300">
                    Password reset failed
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

                <div>

                  <p className="text-xs font-bold text-emerald-300">
                    Password Updated
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-300/70">
                    {success}
                  </p>

                </div>

              </div>
            )}


            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* NEW PASSWORD */}

              <div>

                <label
                  htmlFor="password"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  New Password
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-3.5 focus-within:border-cyan-300/40">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/2.5 text-slate-500">

                    <Lock size={18} />

                  </div>

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/5 hover:text-cyan-300"
                  >

                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Confirm Password
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-3.5 focus-within:border-cyan-300/40">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/2.5 text-slate-500">

                    <Lock size={18} />

                  </div>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.confirmPassword
                    }
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/5 hover:text-cyan-300"
                  >

                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading || !token}
                className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-cyan-400 via-sky-400 to-blue-500 py-4 text-sm font-extrabold text-[#021014] shadow-[0_12px_35px_rgba(34,211,238,0.12)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {loading ? (
                  <>
                    <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-[#021014]/25 border-t-[#021014]" />

                    <span>
                      Updating Password...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Reset Password
                    </span>
                  </>
                )}

              </button>

            </form>


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


            <div className="mt-7 flex items-center gap-3">

              <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/[0.07]" />

              <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">
                ESPARKS IT SOLUTIONS
              </span>

              <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/[0.07]" />

            </div>

          </div>

        </div>


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