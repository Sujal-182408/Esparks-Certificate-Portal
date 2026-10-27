
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileBadge,
  FileText,
  Fingerprint,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

import { apiRequest } from "../services/api";

const STATUS_OPTIONS = ["all", "pending", "issued", "rejected"];

const normalizeRequest = (request) => {
  if (!request) {
    return null;
  }

  return {
    id: request.id,

    employeeId:
      request.employee_id ??
      request.employeeId ??
      request.employee?.id ??
      "",

    employeeName:
      request.employee_name ??
      request.employeeName ??
      request.employee?.name ??
      "Unknown Employee",

    employeeEmail:
      request.employee_email ??
      request.employeeEmail ??
      request.employee?.email ??
      "",

    employeeRole:
      request.employee_role ??
      request.employeeRole ??
      request.employee?.role ??
      "employee",

    certificateType:
      request.certificate_type ??
      request.certificateType ??
      "",

    courseName:
      request.course_name ??
      request.courseName ??
      "",

    additionalDetails:
      request.additional_details ??
      request.additionalDetails ??
      "",

    status: String(request.status || "pending").toLowerCase(),

    rejectionReason:
      request.rejection_reason ??
      request.rejectionReason ??
      "",

    createdAt:
      request.created_at ??
      request.createdAt ??
      null,

    reviewedAt:
      request.reviewed_at ??
      request.reviewedAt ??
      null,

    issuedAt:
      request.issued_at ??
      request.issuedAt ??
      null,

    certificateId:
      request.certificate_id ??
      request.certificateId ??
      null,
  };
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getStatusClasses = (status) => {
  switch (status) {
    case "issued":
      return "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200";

    case "rejected":
      return "border-red-300/20 bg-red-300/[0.07] text-red-200";

    case "pending":
    default:
      return "border-amber-300/20 bg-amber-300/[0.07] text-amber-200";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "issued":
      return <CheckCircle2 size={13} />;

    case "rejected":
      return <XCircle size={13} />;

    case "pending":
    default:
      return <Clock3 size={13} />;
  }
};

function AdminCertificateRequest() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const loadRequests = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiRequest("/admin/certificate-requests");

console.log("Admin API response:", response);

const data =
  response?.requests ??
  response?.data ??
  response?.rejectedRequests ??
  [];

const normalizedRequests = Array.isArray(data)
  ? data.map(normalizeRequest).filter(Boolean)
  : [];

console.log(
  "Rejected requests received:",
  normalizedRequests.filter(
    (request) =>
      String(request.status || "").trim().toLowerCase() === "rejected"
  )
);

setRequests(normalizedRequests);

      /*
       * Keep the popup data synchronized after
       * issuing/rejecting a request.
       */
      if (selectedRequest?.id) {
        const updatedSelectedRequest = normalizedRequests.find(
          (request) =>
            String(request.id) === String(selectedRequest.id)
        );

        if (updatedSelectedRequest) {
          setSelectedRequest(updatedSelectedRequest);
        }
      }
    } catch (err) {
      console.error(
        "Failed to load certificate requests:",
        err
      );

      setError(
        err?.message ||
          "Unable to load certificate requests. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        String(request.id || "")
          .toLowerCase()
          .includes(search) ||
        String(request.employeeName || "")
          .toLowerCase()
          .includes(search) ||
        String(request.employeeEmail || "")
          .toLowerCase()
          .includes(search) ||
        String(request.courseName || "")
          .toLowerCase()
          .includes(search) ||
        String(request.certificateType || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [requests, searchTerm, statusFilter]);

const stats = useMemo(() => {
  const countByStatus = (status) =>
    requests.filter(
      (request) =>
        String(request.status || "").trim().toLowerCase() === status
    ).length;

  return {
    total: requests.length,
    pending: countByStatus("pending"),
    issued: countByStatus("issued"),
    rejected: countByStatus("rejected"),
  };
}, [requests]);

  const handleView = (request) => {
    setSelectedRequest(request);
  };

  const closeViewModal = () => {
    setSelectedRequest(null);
  };

  /*
   * IMPORTANT:
   * "Issue" does NOT create or issue the certificate.
   *
   * It only opens the certificate creation page.
   *
   * The request remains pending until the admin
   * actually clicks "Create Certificate" on that page.
   */
  const handleIssue = (request) => {
    if (!request?.id) {
      return;
    }

    setSelectedRequest(null);

    navigate(
      `/admin/certificates/create?requestId=${encodeURIComponent(
        request.id
      )}`
    );
  };

  const openRejectModal = (request) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setError("");
  };

  const closeRejectModal = () => {
    if (rejecting) {
      return;
    }

    setRejectingRequest(null);
    setRejectionReason("");
  };

  const handleReject = async () => {
    if (!rejectingRequest?.id) {
      return;
    }

    const cleanReason = rejectionReason.trim();

    if (!cleanReason) {
      setError("Please provide a rejection reason.");
      return;
    }

    if (cleanReason.length > 2000) {
      setError(
        "Rejection reason cannot exceed 2000 characters."
      );
      return;
    }

    try {
      setRejecting(true);
      setError("");

      await apiRequest(
        `/admin/certificate-requests/${rejectingRequest.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({
            rejectionReason: cleanReason,
          }),
        }
      );

      await loadRequests({ silent: true });

      setRejectingRequest(null);
      setRejectionReason("");
    } catch (err) {
      console.error(
        "Failed to reject certificate request:",
        err
      );

      setError(
        err?.message ||
          "Unable to reject this certificate request."
      );
    } finally {
      setRejecting(false);
    }
  };

  const handleBack = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#020609] text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/[0.07] blur-[120px]" />

        <div className="absolute right-[-140px] top-1/4 h-[420px] w-[420px] rounded-full bg-blue-500/[0.06] blur-[140px]" />

        <div className="absolute bottom-[-180px] left-1/3 h-[400px] w-[400px] rounded-full bg-sky-400/[0.045] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="mb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05] hover:text-cyan-200"
              >
                <ArrowLeft size={15} />
                Back to Admin
              </button>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] shadow-[0_0_30px_rgba(34,211,238,0.08)]">
                  <FileBadge
                    size={23}
                    className="text-cyan-300"
                  />
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">
                    Administration
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Certificate Requests
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                    Review employee certificate requests,
                    inspect request details, create certificates,
                    or reject requests.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadRequests({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LoaderCircle
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300/15 bg-red-300/[0.05] p-4 text-sm text-red-200">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 text-red-200/70">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-200/60 transition hover:text-red-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={<FileText size={18} />}
            accent="cyan"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock3 size={18} />}
            accent="amber"
          />

          <StatCard
            label="Issued"
            value={stats.issued}
            icon={<CheckCircle2 size={18} />}
            accent="emerald"
          />

          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={<XCircle size={18} />}
            accent="red"
          />
        </section>

        {/* Main panel */}
        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-[0_25px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {/* Toolbar */}
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              {/* Search */}
              <div className="relative w-full xl:max-w-md">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search employee, email, course..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30 focus:bg-cyan-300/[0.025] focus:ring-4 focus:ring-cyan-300/[0.04]"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const active = statusFilter === status;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setStatusFilter(status)
                      }
                      className={`rounded-xl border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition ${
                        active
                          ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200"
                          : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing{" "}
                <span className="font-semibold text-slate-300">
                  {filteredRequests.length}
                </span>{" "}
                request
                {filteredRequests.length === 1
                  ? ""
                  : "s"}
              </span>

              <span className="hidden sm:block">
                Click View to inspect complete request data
              </span>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05]">
                  <LoaderCircle
                    size={24}
                    className="animate-spin text-cyan-300"
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-300">
                  Loading certificate requests...
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Please wait
                </p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-[400px] items-center justify-center px-6">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                  <FileText
                    size={28}
                    className="text-slate-500"
                  />
                </div>

                <h2 className="mt-5 text-lg font-bold text-white">
                  No certificate requests found
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {searchTerm || statusFilter !== "all"
                    ? "No requests match your current search or filter."
                    : "There are currently no employee certificate requests."}
                </p>

                {(searchTerm ||
                  statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/[0.09]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/20">
                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Employee
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Certificate
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Course
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Submitted
                      </th>

                      <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((request) => (
                      <RequestTableRow
                        key={request.id}
                        request={request}
                        onView={handleView}
                        onIssue={handleIssue}
                        onReject={openRejectModal}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/tablet cards */}
              <div className="grid gap-3 p-3 lg:hidden">
                {filteredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onView={handleView}
                    onIssue={handleIssue}
                    onReject={openRejectModal}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* =========================
          REQUEST VIEW MODAL
      ========================= */}
      {selectedRequest && (
        <RequestViewModal
          request={selectedRequest}
          onClose={closeViewModal}
          onIssue={handleIssue}
          onReject={openRejectModal}
        />
      )}

      {/* =========================
          REJECTION MODAL
      ========================= */}
      {rejectingRequest && (
        <RejectModal
          request={rejectingRequest}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          rejecting={rejecting}
          onClose={closeRejectModal}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
  accent,
}) {
  const accentClasses = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.045] text-cyan-300",

    amber:
      "border-amber-300/15 bg-amber-300/[0.045] text-amber-300",

    emerald:
      "border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-300",

    red:
      "border-red-300/15 bg-red-300/[0.045] text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE ROW
========================================================= */

function RequestTableRow({
  request,
  onView,
  onIssue,
  onReject,
}) {
  const isPending = request.status === "pending";

  return (
    <tr className="group border-b border-white/[0.05] transition hover:bg-cyan-300/[0.018]">
      {/* Employee */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.05]">
            <User
              size={17}
              className="text-cyan-300"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {request.employeeName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {request.employeeEmail || "No email"}
            </p>
          </div>
        </div>
      </td>

      {/* Certificate */}
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-200">
          <BadgeCheck size={13} />
          {request.certificateType || "—"}
        </span>
      </td>

      {/* Course */}
      <td className="max-w-[280px] px-5 py-4">
        <div className="flex items-center gap-2">
          <BookOpen
            size={15}
            className="shrink-0 text-slate-500"
          />

          <span className="truncate text-sm text-slate-300">
            {request.courseName || "—"}
          </span>
        </div>
      </td>

      {/* Date */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays
            size={14}
            className="text-slate-600"
          />

          {formatDate(request.createdAt)}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${getStatusClasses(
            request.status
          )}`}
        >
          {getStatusIcon(request.status)}

          {request.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onView(request)}
            className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.09]"
          >
            View
          </button>

          {isPending && (
            <>
              <button
                type="button"
                onClick={() => onIssue(request)}
                className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.09]"
              >
                Issue
              </button>

              <button
                type="button"
                onClick={() => onReject(request)}
                className="rounded-lg border border-red-300/15 bg-red-300/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300/30 hover:bg-red-300/[0.09]"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   MOBILE REQUEST CARD
========================================================= */

function RequestCard({
  request,
  onView,
  onIssue,
  onReject,
}) {
  const isPending = request.status === "pending";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.015]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.05]">
            <User
              size={17}
              className="text-cyan-300"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {request.employeeName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {request.employeeEmail || "No email"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${getStatusClasses(
            request.status
          )}`}
        >
          {getStatusIcon(request.status)}

          {request.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Certificate
          </p>

          <p className="mt-1 text-xs font-semibold text-cyan-200">
            {request.certificateType || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Submitted
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-300">
            {formatDate(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
          Course
        </p>

        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-300">
          {request.courseName || "—"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(request)}
          className="flex-1 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.09]"
        >
          View Details
        </button>

        {isPending && (
          <>
            <button
              type="button"
              onClick={() => onIssue(request)}
              className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.09]"
            >
              Issue
            </button>

            <button
              type="button"
              onClick={() => onReject(request)}
              className="rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300/30 hover:bg-red-300/[0.09]"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   VIEW REQUEST MODAL
========================================================= */

function RequestViewModal({
  request,
  onClose,
  onIssue,
  onReject,
}) {
  const isPending = request.status === "pending";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#061016] shadow-[0_30px_120px_rgba(0,0,0,0.7),0_0_80px_rgba(34,211,238,0.08)]">
        {/* Modal glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-[90px]" />

        <div className="relative flex max-h-[92vh] flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                <FileBadge
                  size={23}
                  className="text-cyan-300"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">
                  Certificate Request
                </p>

                <h2 className="mt-1 truncate text-lg font-bold text-white sm:text-xl">
                  Request #{request.id}
                </h2>

                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${getStatusClasses(
                      request.status
                    )}`}
                  >
                    {getStatusIcon(request.status)}

                    {request.status}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.05] hover:text-cyan-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Employee */}
              <InfoSection
                icon={<User size={17} />}
                title="Employee Information"
              >
                <InfoRow
                  label="Name"
                  value={request.employeeName}
                />

                <InfoRow
                  label="Email"
                  value={request.employeeEmail}
                  icon={<Mail size={13} />}
                />

                <InfoRow
                  label="Employee ID"
                  value={request.employeeId || "—"}
                  icon={<Fingerprint size={13} />}
                />

                <InfoRow
                  label="Role"
                  value={request.employeeRole || "employee"}
                />
              </InfoSection>

              {/* Certificate */}
              <InfoSection
                icon={<BadgeCheck size={17} />}
                title="Certificate Information"
              >
                <InfoRow
                  label="Certificate Type"
                  value={
                    request.certificateType || "—"
                  }
                />

                <InfoRow
                  label="Course"
                  value={request.courseName || "—"}
                  icon={<BookOpen size={13} />}
                />

                <InfoRow
                  label="Certificate ID"
                  value={
                    request.certificateId || "Not issued"
                  }
                  icon={<FileBadge size={13} />}
                />
              </InfoSection>

              {/* Dates */}
              <InfoSection
                icon={<CalendarDays size={17} />}
                title="Request Timeline"
              >
                <InfoRow
                  label="Submitted"
                  value={formatDateTime(
                    request.createdAt
                  )}
                />

                <InfoRow
                  label="Reviewed"
                  value={formatDateTime(
                    request.reviewedAt
                  )}
                />

                <InfoRow
                  label="Issued"
                  value={formatDateTime(
                    request.issuedAt
                  )}
                />
              </InfoSection>

              {/* Status */}
              <InfoSection
                icon={<ShieldCheck size={17} />}
                title="Request Status"
              >
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                  <span className="text-xs text-slate-500">
                    Current status
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${getStatusClasses(
                      request.status
                    )}`}
                  >
                    {getStatusIcon(request.status)}

                    {request.status}
                  </span>
                </div>
              </InfoSection>
            </div>

            {/* Additional details */}
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText
                  size={17}
                  className="text-cyan-300"
                />

                <h3 className="text-sm font-bold text-white">
                  Additional Details
                </h3>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                {request.additionalDetails ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {request.additionalDetails}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-600">
                    No additional details were provided.
                  </p>
                )}
              </div>
            </div>

            {/* Rejection reason */}
            {request.status === "rejected" &&
              request.rejectionReason && (
                <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-300/[0.035] p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <XCircle
                      size={17}
                      className="text-red-300"
                    />

                    <h3 className="text-sm font-bold text-red-100">
                      Rejection Reason
                    </h3>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-200/70">
                    {request.rejectionReason}
                  </p>
                </div>
              )}

            {/* Security info */}
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-cyan-300"
              />

              <div>
                <p className="text-xs font-bold text-cyan-100">
                  Secure Certificate Workflow
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  This request is part of the verified
                  employee certificate workflow. Selecting
                  Issue will open the certificate creation
                  page, where the admin can review and
                  confirm the certificate details before
                  creating the certificate.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.07] bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-300 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                Close
              </button>

              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => onReject(request)}
                    className="rounded-xl border border-red-300/15 bg-red-300/[0.05] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300/30 hover:bg-red-300/[0.09]"
                  >
                    Reject Request
                  </button>

                  <button
                    type="button"
                    onClick={() => onIssue(request)}
                    className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-emerald-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.1]"
                  >
                    Go to Create Certificate
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO SECTION
========================================================= */

function InfoSection({
  icon,
  title,
  children,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="text-cyan-300">
          {icon}
        </span>

        <h3 className="text-sm font-bold text-white">
          {title}
        </h3>
      </div>

      <div className="mt-4 space-y-2">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
  icon,
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/15 px-3 py-2.5">
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-600">
        {icon}
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right text-xs font-medium text-slate-300">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   REJECT MODAL
========================================================= */

function RejectModal({
  request,
  rejectionReason,
  setRejectionReason,
  rejecting,
  onClose,
  onReject,
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !rejecting
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-300/15 bg-[#080c10] shadow-[0_30px_120px_rgba(0,0,0,0.7),0_0_70px_rgba(248,113,113,0.05)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-300/15 bg-red-300/[0.05]">
              <XCircle
                size={21}
                className="text-red-300"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                Reject Request
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Provide a reason for rejecting{" "}
                <span className="text-slate-300">
                  {request.employeeName}
                </span>
                's request.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={rejecting}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:text-white disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Rejection Reason
          </label>

          <textarea
            value={rejectionReason}
            onChange={(event) =>
              setRejectionReason(event.target.value)
            }
            rows={6}
            maxLength={2000}
            disabled={rejecting}
            placeholder="Enter the reason for rejecting this certificate request..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-red-300/25 focus:bg-red-300/[0.02] focus:ring-4 focus:ring-red-300/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-2 flex justify-end">
            <span className="text-[10px] text-slate-600">
              {rejectionReason.length}/2000
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-black/20 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={rejecting}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={
              rejecting ||
              !rejectionReason.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300/30 hover:bg-red-300/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {rejecting && (
              <LoaderCircle
                size={14}
                className="animate-spin"
              />
            )}

            {rejecting
              ? "Rejecting..."
              : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminCertificateRequest;
