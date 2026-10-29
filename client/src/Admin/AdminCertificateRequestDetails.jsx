import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileBadge,
  FileText,
  Hash,
  Mail,
  User,
  XCircle,
  ShieldCheck,
  BookOpen,
  AlertCircle,
} from "lucide-react";

const API_URL = `${(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api`;

const getToken = () => localStorage.getItem("adminToken");

function AdminCertificateRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [request, setRequest] = useState(location.state?.request || null);
  const [loading, setLoading] = useState(!location.state?.request);
  const [error, setError] = useState("");

  useEffect(() => {
    // If request was passed through navigate(), use it.
    // Otherwise fetch it when the page is refreshed directly.
    if (request) return;

    const loadRequest = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        const response = await fetch(
          `${API_BASE}/admin/certificate-requests/${id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Failed to load certificate request."
          );
        }

        setRequest(data.request || data);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [id, request]);

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const status = String(request?.status || "").toLowerCase();

  const statusConfig = {
    pending: {
      label: "Pending Review",
      icon: Clock3,
      className:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",
    },
    issued: {
      label: "Issued",
      icon: CheckCircle2,
      className:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      className:
        "border-red-400/20 bg-red-400/10 text-red-300",
    },
  };

  const currentStatus =
    statusConfig[status] || {
      label: request?.status || "Unknown",
      icon: AlertCircle,
      className:
        "border-slate-400/20 bg-slate-400/10 text-slate-300",
    };

  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030609] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />

            <p className="text-sm text-slate-400">
              Loading certificate request...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#030609] text-white">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-5">
          <div className="w-full rounded-3xl border border-red-400/15 bg-white/[0.035] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
            <AlertCircle
              size={46}
              className="mx-auto mb-5 text-red-300"
            />

            <h1 className="text-2xl font-bold">
              Request Not Found
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {error ||
                "The certificate request could not be found."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/admin/certificate-requests")}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              <ArrowLeft size={16} />
              Back to Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030609] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-400/[0.07] blur-[120px]" />

        <div className="absolute right-[-160px] top-[20%] h-[420px] w-[420px] rounded-full bg-blue-500/[0.06] blur-[130px]" />

        <div className="absolute bottom-[-220px] left-[35%] h-[450px] w-[450px] rounded-full bg-sky-400/[0.04] blur-[140px]" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.5) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                navigate("/admin/certificate-requests")
              }
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-300"
            >
              <ArrowLeft size={16} />
              Back to Requests
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07]">
                <FileBadge
                  size={24}
                  className="text-cyan-300"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">
                  Certificate Request
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Request #{request.id}
                </h1>
              </div>
            </div>
          </div>

          {/* Status */}
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${currentStatus.className}`}
          >
            <StatusIcon size={15} />
            {currentStatus.label}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Employee */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                  <User
                    size={18}
                    className="text-cyan-300"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Employee Information
                  </h2>

                  <p className="text-xs text-slate-500">
                    Employee associated with this request
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={<User size={16} />}
                  label="Employee Name"
                  value={
                    request.employee_name ||
                    request.name ||
                    "—"
                  }
                />

                <InfoCard
                  icon={<Mail size={16} />}
                  label="Email Address"
                  value={
                    request.employee_email ||
                    request.email ||
                    "—"
                  }
                />

                <InfoCard
                  icon={<Hash size={16} />}
                  label="Employee ID"
                  value={request.employee_id || "—"}
                />

                <InfoCard
                  icon={<ShieldCheck size={16} />}
                  label="Account Status"
                  value="Verified Employee"
                />
              </div>
            </section>

            {/* Certificate details */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-300/[0.06]">
                  <BookOpen
                    size={18}
                    className="text-sky-300"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Certificate Information
                  </h2>

                  <p className="text-xs text-slate-500">
                    Requested certificate details
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={<FileText size={16} />}
                  label="Certificate Type"
                  value={
                    request.certificate_type ||
                    request.certificateType ||
                    "—"
                  }
                />

                <InfoCard
                  icon={<BadgeCheck size={16} />}
                  label="Course / Program"
                  value={
                    request.course_name ||
                    request.courseName ||
                    "—"
                  }
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Additional Details
                </p>

                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {request.additional_details ||
                    request.additionalDetails ||
                    "No additional details provided."}
                </p>
              </div>
            </section>

            {/* Rejection reason */}
            {status === "rejected" &&
              (request.rejection_reason ||
                request.rejectionReason) && (
                <section className="rounded-3xl border border-red-400/15 bg-red-400/[0.04] p-6 backdrop-blur-xl">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.08]">
                      <XCircle
                        size={18}
                        className="text-red-300"
                      />
                    </div>

                    <div>
                      <h2 className="font-semibold text-red-200">
                        Rejection Reason
                      </h2>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-200/70">
                        {request.rejection_reason ||
                          request.rejectionReason}
                      </p>
                    </div>
                  </div>
                </section>
              )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Request summary */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                  <FileBadge
                    size={18}
                    className="text-cyan-300"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Request Summary
                  </h2>

                  <p className="text-xs text-slate-500">
                    Request metadata
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <SummaryRow
                  label="Request ID"
                  value={`#${request.id}`}
                />

                <SummaryRow
                  label="Status"
                  value={currentStatus.label}
                />

                <SummaryRow
                  label="Certificate Type"
                  value={
                    request.certificate_type ||
                    request.certificateType ||
                    "—"
                  }
                />

                <SummaryRow
                  label="Created"
                  value={formatDate(request.created_at)}
                />

                <SummaryRow
                  label="Reviewed"
                  value={formatDate(request.reviewed_at)}
                />

                <SummaryRow
                  label="Issued"
                  value={formatDate(request.issued_at)}
                />

                {request.certificate_id && (
                  <SummaryRow
                    label="Certificate ID"
                    value={`#${request.certificate_id}`}
                  />
                )}

                {request.certificate_number && (
                  <SummaryRow
                    label="Certificate Number"
                    value={request.certificate_number}
                  />
                )}
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-300/[0.06]">
                  <CalendarDays
                    size={18}
                    className="text-blue-300"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    Request Timeline
                  </h2>

                  <p className="text-xs text-slate-500">
                    Certificate request lifecycle
                  </p>
                </div>
              </div>

              <TimelineItem
                title="Request Submitted"
                date={formatDate(request.created_at)}
                active
              />

              <TimelineItem
                title="Request Reviewed"
                date={formatDate(request.reviewed_at)}
                active={Boolean(request.reviewed_at)}
              />

              <TimelineItem
                title="Certificate Issued"
                date={formatDate(request.issued_at)}
                active={Boolean(request.issued_at)}
                last
              />
            </section>

            {/* Issued certificate */}
            {status === "issued" &&
              request.certificate_id && (
                <section className="rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.04] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.08]">
                      <CheckCircle2
                        size={20}
                        className="text-emerald-300"
                      />
                    </div>

                    <div className="flex-1">
                      <h2 className="font-semibold text-emerald-200">
                        Certificate Issued
                      </h2>

                      <p className="mt-1 text-sm text-emerald-200/60">
                        This request has been successfully
                        converted into a certificate.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/admin/certificates/${request.certificate_id}`
                          )
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-200"
                      >
                        <FileBadge size={15} />
                        View Certificate
                      </button>
                    </div>
                  </div>
                </section>
              )}
          </div>
        </div>

        {/* Security footer */}
        <div className="mt-8 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-cyan-300"
            />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                Secure Administrative Record
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This certificate request contains employee
                information and is accessible only to authorized
                administrators.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================
   INFO CARD
========================= */

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <p className="break-words text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* =========================
   SUMMARY ROW
========================= */

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.05] py-3 last:border-b-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="max-w-[60%] break-words text-right text-xs font-medium text-slate-200">
        {value || "—"}
      </span>
    </div>
  );
}

/* =========================
   TIMELINE
========================= */

function TimelineItem({ title, date, active, last }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`h-3 w-3 rounded-full border-2 ${
            active
              ? "border-cyan-300 bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.6)]"
              : "border-slate-700 bg-slate-900"
          }`}
        />

        {!last && (
          <div
            className={`mt-1 min-h-12 w-px ${
              active
                ? "bg-cyan-300/20"
                : "bg-white/[0.06]"
            }`}
          />
        )}
      </div>

      <div className="pb-5">
        <p
          className={`text-sm font-medium ${
            active ? "text-slate-200" : "text-slate-600"
          }`}
        >
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {date === "—" ? "Not yet" : date}
        </p>
      </div>
    </div>
  );
}

export default AdminCertificateRequestDetails;