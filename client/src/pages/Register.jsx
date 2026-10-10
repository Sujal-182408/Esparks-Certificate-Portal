
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserRound,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password.length < 10) {
      setError("Password must contain at least 10 characters.");
      return;
    }

    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register(name, email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message || "Registration failed. Please try again."
      );
    }
  }

  const fields = [
    {
      name: "name",
      label: "Full name",
      type: "text",
      placeholder: "Enter your full name",
      icon: UserRound,
      autoComplete: "name",
    },
    {
      name: "email",
      label: "Email address",
      type: "email",
      placeholder: "you@example.com",
      icon: Mail,
      autoComplete: "email",
    },
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030609] px-4 py-8 text-white sm:px-6 sm:py-12">

      {/* =====================================================
          PREMIUM BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Main cyan atmosphere */}
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-[150px]" />

        {/* Blue atmosphere */}
        <div className="absolute -bottom-52 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/[0.08] blur-[150px]" />

        {/* Right highlight */}
        <div className="absolute -right-40 top-[25%] h-[400px] w-[400px] rounded-full bg-sky-300/[0.035] blur-[140px]" />

        {/* Center atmosphere */}
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/[0.025] blur-[130px]" />

        {/* Radial lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.07),transparent_35%)]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Scan line */}
        <div className="absolute left-0 right-0 top-[18%] h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      </div>


      {/* =====================================================
          REGISTER WRAPPER
      ===================================================== */}

      <section className="relative z-10 w-full max-w-[470px]">

        {/* =================================================
            BRAND ICON
        ================================================= */}

        <div className="mb-7 flex justify-center">

          <div className="relative">

            {/* Glow */}
            <div className="absolute -inset-5 rounded-full bg-cyan-400/10 blur-2xl" />

            {/* Outer ring */}
            <div className="relative flex h-[74px] w-[74px] items-center justify-center rounded-full border border-cyan-300/20 bg-white/[0.025] shadow-[0_0_60px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">

              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.07] bg-gradient-to-br from-cyan-400/10 to-blue-500/5">

                <ShieldCheck
                  size={29}
                  strokeWidth={1.6}
                  className="text-cyan-300"
                />

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-white/[0.035] shadow-[0_35px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">

          {/* Top glass reflection */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Cyan accent */}
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
                  Employee Registration
                </span>

              </div>


              <h1 className="text-[30px] font-bold tracking-[-1.2px] text-white sm:text-[34px]">

                Create your{" "}

                <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  Account
                </span>

              </h1>


              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-slate-500 sm:text-sm">

                Create your secure ESPARKS IT SOLUTIONS
                employee account.

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
                    Registration failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-300/65">
                    {error}
                  </p>

                </div>

              </div>

            )}


            {/* =================================================
                FORM
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* =================================================
                  NAME + EMAIL
              ================================================= */}

              {fields.map((field) => {

                const Icon = field.icon;

                return (

                  <div key={field.name}>

                    <label
                      htmlFor={field.name}
                      className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                    >
                      {field.label}
                    </label>


                    <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/[0.025] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">

                      {/* Focus line */}
                      <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />


                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">

                        <Icon
                          size={18}
                        />

                      </div>


                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={form[field.name]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        autoComplete={field.autoComplete}
                        maxLength={
                          field.name === "name"
                            ? 100
                            : 254
                        }
                        required
                        disabled={loading}
                        className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      />

                    </div>

                  </div>

                );

              })}


              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div>

                <label
                  htmlFor="password"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Password
                </label>


                <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/[0.025] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">

                  {/* Focus line */}
                  <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />


                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">

                    <Lock
                      size={18}
                    />

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
                    placeholder="At least 10 characters"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:opacity-50"
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/[0.05] hover:text-cyan-300"
                  >

                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>


                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-600">

                  <ShieldCheck
                    size={13}
                    className="text-cyan-400/60"
                  />

                  Use at least 10 characters.

                </div>

              </div>


              {/* =================================================
                  CONFIRM PASSWORD
              ================================================= */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[1.2px] text-slate-400"
                >
                  Confirm password
                </label>


                <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 px-3.5 transition-all duration-300 focus-within:border-cyan-300/40 focus-within:bg-cyan-300/[0.025] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.045)]">

                  {/* Focus line */}
                  <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent transition-all duration-500 group-focus-within:w-3/4" />


                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] text-slate-500 transition duration-300 group-focus-within:border-cyan-300/10 group-focus-within:text-cyan-300">

                    <Lock
                      size={18}
                    />

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
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={10}
                    required
                    disabled={loading}
                    className="min-w-0 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-700 disabled:opacity-50"
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
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/[0.05] hover:text-cyan-300"
                  >

                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </div>


              {/* =================================================
                  SUBMIT
              ================================================= */}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 py-4 text-sm font-extrabold text-[#021014] shadow-[0_12px_35px_rgba(34,211,238,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,211,238,0.2)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {/* Animated shine */}
                <span className="absolute inset-y-0 -left-24 w-24 skew-x-[-20deg] bg-white/40 blur-md transition-all duration-700 group-hover:left-[115%]" />


                {/* Inner border */}
                <span className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/20" />


                {loading ? (
                  <>

                    <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-[#021014]/25 border-t-[#021014]" />

                    <span className="relative">
                      Creating account...
                    </span>

                  </>
                ) : (
                  <>

                    <span className="relative">
                      Create Account
                    </span>

                    <ArrowRight
                      size={18}
                      className="relative transition-transform duration-300 group-hover:translate-x-1"
                    />

                  </>
                )}

              </button>


              {/* =================================================
                  PERMISSION NOTICE
              ================================================= */}

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">

                <div className="flex gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/10 bg-cyan-300/[0.04] text-cyan-300">

                    <ShieldCheck
                      size={16}
                    />

                  </div>


                  <p className="text-[10px] leading-5 text-slate-600">

                    Creating an account does not automatically
                    grant admin or certificate-verifier
                    privileges. Those permissions must be
                    authorized separately.

                  </p>

                </div>

              </div>

            </form>


            {/* =================================================
                LOGIN
            ================================================= */}

            <div className="mt-7 border-t border-white/[0.07] pt-6 text-center">

              <p className="text-xs text-slate-500 sm:text-sm">

                Already have an account?{" "}

                <Link
                  to="/login"
                  className="font-bold text-cyan-300 transition hover:text-white"
                >
                  Sign in
                </Link>

              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-6 text-center">

          <div className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">

            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />

            Secure Certificate Verification

            <span className="h-1 w-1 rounded-full bg-cyan-400/60" />

          </div>

        </div>

      </section>

    </main>
  );
}
