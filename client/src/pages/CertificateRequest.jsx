import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Award,
  FileText,
  Info,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { apiRequest } from "../services/api";

export default function CertificateRequest() {
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);

  const [certificateType, setCertificateType] =
    useState("CERT");

  const [courseName, setCourseName] = useState("");
  const [additionalDetails, setAdditionalDetails] =
    useState("");

const [durationMonths, setDurationMonths] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEmployee() {
      try {
        const result = await apiRequest(
          "/employee-auth/me"
        );

        if (!mounted) return;

        const currentEmployee =
          result?.employee ||
          result?.user ||
          result;

        if (!currentEmployee) {
          throw new Error(
            "Employee information was not found."
          );
        }

        setEmployee(currentEmployee);
      } catch (err) {
        if (!mounted) return;

        console.error(
          "Certificate request employee error:",
          err
        );

        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err?.message ||
            "Unable to load employee information."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEmployee();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCertificateType = String(
      certificateType || ""
    )
      .trim()
      .toUpperCase();

    const cleanCourseName = courseName.trim();
    const cleanAdditionalDetails =
      additionalDetails.trim();

    if (
      !["CERT", "INTR"].includes(
        cleanCertificateType
      )
    ) {
      setError(
        "Please select a valid certificate type."
      );
      return;
    }

    if (!cleanCourseName) {
      setError("Please enter the course name.");
      return;
    }

    if (cleanCourseName.length > 200) {
      setError(
        "Course name must not exceed 200 characters."
      );
      return;
    }

    if (cleanAdditionalDetails.length > 5000) {
      setError(
        "Additional details must not exceed 5000 characters."
      );
      return;
    }

    if (cleanCertificateType === "INTR") {
  const months = Number(durationMonths);

  if (
    !Number.isInteger(months) ||
    months < 1 ||
    months > 24
  ) {
    setError(
      "Internship duration must be between 1 and 24 months."
    );
    return;
  }
}

    setSubmitting(true);

  try {
  await apiRequest(
    "/employee/certificate-requests",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        certificate_type: cleanCertificateType,
        course_name: cleanCourseName,
        additional_details:
          cleanAdditionalDetails || null,
        duration_months:
          cleanCertificateType === "INTR"
            ? Number(durationMonths)
            : null,
      }),
    }
  );

  setSuccess(
    "Certificate request submitted successfully."
  );

  setCourseName("");
  setAdditionalDetails("");
  setCertificateType("CERT");
  setDurationMonths("");
} catch (err) {
  console.error(
    "Certificate request submit error:",
    err
  );

  setError(
    err?.message ||
      "Unable to submit certificate request."
  );
} finally {
  setSubmitting(false);
}
 
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020608] text-white">
        <div className="text-center">
          <LoaderCircle
            size={38}
            className="mx-auto animate-spin text-cyan-300"
          />

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
            ESPARKS IT SOLUTIONS
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Loading request workspace...
          </p>
        </div>
      </main>
    );
  }

  const employeeName =
    employee?.name ||
    employee?.full_name ||
    employee?.employee_name ||
    "Employee";

  const employeeEmail =
    employee?.email ||
    employee?.company_email ||
    "—";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020608] text-white">
      {/* Background */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 size-[500px] rounded-full bg-cyan-400/[0.06] blur-[130px]" />

        <div className="absolute right-[-180px] top-[20%] size-[500px] rounded-full bg-sky-400/[0.05] blur-[140px]" />

        <div className="absolute bottom-[-200px] left-[30%] size-[550px] rounded-full bg-blue-500/[0.04] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}

      <header className="relative z-10 border-b border-white/[0.06] bg-[#020608]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-300">
              <Award size={19} />
            </div>

            <div>
              <p className="text-sm font-black text-white">
                ESPARKS
                <span className="text-cyan-300">
                  {" "}
                  IT SOLUTIONS
                </span>
              </p>

              <p className="hidden text-[8px] font-bold uppercase tracking-[0.25em] text-slate-600 sm:block">
                Digital Credential Network
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05] hover:text-cyan-200"
          >
            <ArrowLeft size={14} />

            <span className="hidden sm:inline">
              Dashboard
            </span>
          </button>
        </div>
      </header>

      {/* Content */}

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Heading */}

        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">
            <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />

            Secure certificate request
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Request your
            <span className="block bg-linear-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
              digital certificate
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            Submit your certificate information securely
            for administrator review.
          </p>
        </div>

        {/* Main */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          {/* Info */}

          <aside className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-2xl sm:p-7">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] text-cyan-300">
              <ShieldCheck size={21} />
            </div>

            <h2 className="mt-6 text-xl font-black">
              Request overview
            </h2>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              Your authenticated employee identity is
              automatically attached to this request.
            </p>

            {/* Employee */}

            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Employee
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/[0.06] text-cyan-300">
                  <User size={17} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {employeeName}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-slate-600">
                    {employeeEmail}
                  </p>
                </div>

                <BadgeCheck
                  size={15}
                  className="ml-auto shrink-0 text-emerald-400"
                />
              </div>
            </div>

            {/* Steps */}

            <div className="mt-5 space-y-3">
              {[
                [
                  "01",
                  "Submit request",
                  "Provide your certificate information.",
                ],
                [
                  "02",
                  "Administrator review",
                  "Your request is reviewed securely.",
                ],
                [
                  "03",
                  "Credential issued",
                  "Approved certificates appear in your dashboard.",
                ],
              ].map(
                ([number, title, description]) => (
                  <div
                    key={number}
                    className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/[0.05] text-[9px] font-black text-cyan-300">
                      {number}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        {title}
                      </p>

                      <p className="mt-1 text-[10px] leading-5 text-slate-600">
                        {description}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-5 flex gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] p-3.5">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-cyan-300"
              />

              <p className="text-[10px] leading-5 text-slate-600">
                Only authorized administrators can approve
                or reject certificate requests.
              </p>
            </div>
          </aside>

          {/* Form */}

          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] backdrop-blur-2xl">
            <div className="border-b border-white/[0.06] p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] text-cyan-300">
                  <FileText size={20} />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">
                    Credential application
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Certificate details
                  </h2>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-7"
            >
              {/* Error */}

              {error && (
                <div className="mb-5 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
                  <p className="text-xs font-bold text-red-300">
                    Request failed
                  </p>

                  <p className="mt-1 text-[11px] text-red-200/60">
                    {error}
                  </p>
                </div>
              )}

              {/* Success */}

              {success && (
                <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-400"
                  />

                  <div>
                    <p className="text-xs font-bold text-emerald-300">
                      Request submitted
                    </p>

                    <p className="mt-1 text-[11px] text-emerald-200/60">
                      {success}
                    </p>
                  </div>
                </div>
              )}

              {/* Locked employee fields */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee name
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4">
                    <User
                      size={15}
                      className="text-cyan-300/70"
                    />

                    <span className="truncate text-sm text-slate-300">
                      {employeeName}
                    </span>

                    <LockKeyhole
                      size={13}
                      className="ml-auto text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Employee email
                  </label>

                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4">
                    <Mail
                      size={15}
                      className="text-cyan-300/70"
                    />

                    <span className="truncate text-sm text-slate-300">
                      {employeeEmail}
                    </span>

                    <LockKeyhole
                      size={13}
                      className="ml-auto text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Type */}

              <div className="mt-6">
                <label className="mb-3 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Certificate type
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCertificateType("CERT")
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      certificateType === "CERT"
                        ? "border-cyan-300/30 bg-cyan-300/[0.07]"
                        : "border-white/[0.07] bg-black/20 hover:border-white/[0.13]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-300/[0.06] text-cyan-300">
                        <BadgeCheck size={18} />
                      </div>

                      {certificateType === "CERT" && (
                        <CheckCircle2
                          size={17}
                          className="text-cyan-300"
                        />
                      )}
                    </div>

                    <p className="mt-4 text-sm font-black">
                      Certificate
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Standard employee certificate
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCertificateType("INTR")
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      certificateType === "INTR"
                        ? "border-sky-300/30 bg-sky-300/[0.07]"
                        : "border-white/[0.07] bg-black/20 hover:border-white/[0.13]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-sky-300/[0.06] text-sky-300">
                        <Sparkles size={18} />
                      </div>

                      {certificateType === "INTR" && (
                        <CheckCircle2
                          size={17}
                          className="text-sky-300"
                        />
                      )}
                    </div>

                    <p className="mt-4 text-sm font-black">
                      Internship
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Internship or training certificate
                    </p>
                  </button>
                </div>
              </div>

              {/* Course */}

              <div className="mt-6">
                <label
                  htmlFor="course_name"
                  className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500"
                >
                  Course / program name
                </label>

                <div className="relative">
                  <BookOpen
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/60"
                  />

                  <input
                    id="course_name"
                    type="text"
                    value={courseName}
                    onChange={(event) => {
                      setCourseName(
                        event.target.value
                      );
                      setError("");
                      setSuccess("");
                    }}
                    maxLength={200}
                    placeholder="e.g. Full Stack Web Development"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-300/[0.05]"
                  />
                </div>
              </div>

              {/* Internship Duration */}

{certificateType === "INTR" && (
  <div className="mt-6">
    <label
      htmlFor="duration_months"
      className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500"
    >
      Internship duration
    </label>

    <div className="relative">
      <Award
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/60"
      />

      <input
        id="duration_months"
        type="number"
        min="1"
        max="24"
        step="1"
        value={durationMonths}
        onChange={(event) => {
          setDurationMonths(event.target.value);
          setError("");
          setSuccess("");
        }}
        placeholder="e.g. 6"
        className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/25 pl-11 pr-24 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-300/[0.05]"
      />

      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
        Months
      </span>
    </div>

    <p className="mt-2 text-[10px] text-slate-700">
      Enter the internship duration between 1 and 24 months.
    </p>
  </div>
)}

              {/* Details */}

              <div className="mt-6">
                <label
                  htmlFor="additional_details"
                  className="mb-2 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500"
                >
                  Additional details
                </label>

                <div className="relative">
                  <MessageSquareText
                    size={16}
                    className="absolute left-4 top-4 text-cyan-300/60"
                  />

                  <textarea
                    id="additional_details"
                    value={additionalDetails}
                    onChange={(event) => {
                      setAdditionalDetails(
                        event.target.value
                      );
                      setError("");
                      setSuccess("");
                    }}
                    maxLength={5000}
                    rows={6}
                    placeholder="Add any information that may help the administrator..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/25 py-3.5 pl-11 pr-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-300/[0.05]"
                  />
                </div>
              </div>

              {/* Submit */}

              <div className="mt-7">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] px-5 text-sm font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.06)] transition-all duration-300 hover:border-cyan-300/40 hover:bg-cyan-300/[0.14] hover:shadow-[0_0_35px_rgba(34,211,238,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />

                      <span>
                        Submitting request...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Submit Certificate Request
                      </span>

                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-slate-700">
                  Your request will be securely submitted
                  for review
                </p>
              </div>

              {/* Security */}

              <div className="mt-5 flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3.5">
                <ShieldCheck
                  size={15}
                  className="mt-0.5 shrink-0 text-cyan-300/70"
                />

                <p className="text-[10px] leading-5 text-slate-600">
                  Your request is sent through the protected
                  employee API and can only be reviewed by
                  authorized administrators.
                </p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}