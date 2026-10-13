import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  CalendarDays,
  Building2,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import BackButton from "../../components/BackButton";
import { apiRequest } from "../../services/api";

const CERTIFICATE_TYPES = [
  {
    value: "CERT",
    label: "Certificate",
  },
  {
    value: "INTR",
    label: "Internship",
  },
];

/* ============================================================
   CREATE CERTIFICATE
============================================================ */

export default function AddCertificate() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  /* ============================================================
     REQUEST ID

     IMPORTANT:
     The certificate must always be created from
     a verified certificate request.

     Expected URL:

     /admin/certificates/create?requestId=14

     requestId is the certificate request ID.
     It is NOT the certificate ID.
  ============================================================ */

  const requestId = useMemo(() => {
    const value = searchParams.get("requestId");

    if (!value) {
      return "";
    }

    return value.trim();
  }, [searchParams]);

  /* ============================================================
     REQUEST ID VALIDATION
  ============================================================ */

  const validRequestId = useMemo(() => {
    return /^[1-9]\d*$/.test(requestId);
  }, [requestId]);

  /* ============================================================
     FORM
  ============================================================ */

  const [form, setForm] = useState({
    certificateType: "CERT",
    courseName: "",
    issuerName: "eSparks IT Solutions",
    issueDate: "",
  });

  /* ============================================================
     REQUEST INFORMATION
  ============================================================ */

  const [request, setRequest] = useState(null);

  const [requestLoading, setRequestLoading] =
    useState(false);

  const [requestError, setRequestError] =
    useState("");

  /* ============================================================
     CREATE STATE
  ============================================================ */

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const [createdCertificate, setCreatedCertificate] =
    useState(null);

  /* ============================================================
     LOAD CERTIFICATE REQUEST
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    async function loadRequest() {
      if (!requestId || !validRequestId) {
        return;
      }

      try {
        setRequestLoading(true);
        setRequestError("");

        /*
          IMPORTANT:

          Do not trust employee information from the URL.

          The backend resolves the complete request
          from the database using requestId.
        */

        const data = await apiRequest(
          `/admin/certificate-requests/${encodeURIComponent(
            requestId
          )}`
        );

        if (!mounted) {
          return;
        }

        const loadedRequest =
          data?.request || null;

        if (!loadedRequest?.id) {
          throw new Error(
            "Certificate request information could not be loaded."
          );
        }

        /*
          Security validation:

          Make sure the backend returned the same
          request ID that was supplied in the URL.
        */

        if (
          Number(loadedRequest.id) !==
          Number(requestId)
        ) {
          throw new Error(
            "Certificate request validation failed."
          );
        }

        setRequest(loadedRequest);

        /*
          Prefill certificate information from
          the actual verified request.
        */

        setForm((previous) => ({
          ...previous,

          certificateType:
            loadedRequest.certificate_type ||
            previous.certificateType,

          courseName:
            loadedRequest.course_name ||
            previous.courseName,
        }));
      } catch (err) {
        console.error(
          "Load certificate request error:",
          err
        );

        if (!mounted) {
          return;
        }

        setRequestError(
          err?.message ||
            "Unable to load the certificate request."
        );
      } finally {
        if (mounted) {
          setRequestLoading(false);
        }
      }
    }

    loadRequest();

    return () => {
      mounted = false;
    };
  }, [requestId, validRequestId]);

  /* ============================================================
     HANDLE INPUT
  ============================================================ */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
    setCreatedCertificate(null);
  }

  /* ============================================================
     HANDLE SUBMIT
  ============================================================ */

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setCreatedCertificate(null);

    try {
      /* ========================================================
         REQUEST ID
      ======================================================== */

      if (!requestId) {
        throw new Error(
          "Certificate request ID is missing."
        );
      }

      if (!validRequestId) {
        throw new Error(
          "Invalid certificate request ID."
        );
      }

      /* ========================================================
         REQUEST MUST BE LOADED
      ======================================================== */

      if (!request?.id) {
        throw new Error(
          "Certificate request information is not available."
        );
      }

      /*
        Extra protection:

        Make sure the loaded request matches
        the request ID in the URL.
      */

      if (
        Number(request.id) !==
        Number(requestId)
      ) {
        throw new Error(
          "Certificate request validation failed."
        );
      }

      /* ========================================================
         REQUEST STATUS
      ======================================================== */

      if (
        request.status &&
        request.status !== "pending"
      ) {
        throw new Error(
          `This certificate request is already ${request.status}.`
        );
      }

      /* ========================================================
         CLEAN VALUES
      ======================================================== */

      const certificateType = String(
        form.certificateType || ""
      )
        .trim()
        .toUpperCase();

      const courseName = String(
        form.courseName || ""
      ).trim();

      const issuerName = String(
        form.issuerName || ""
      ).trim();

      const issueDate = String(
        form.issueDate || ""
      ).trim();

      /* ========================================================
         CERTIFICATE TYPE
      ======================================================== */

      if (
        !CERTIFICATE_TYPES.some(
          (item) =>
            item.value === certificateType
        )
      ) {
        throw new Error(
          "Please select a valid certificate type."
        );
      }

      /* ========================================================
         COURSE
      ======================================================== */

      if (!courseName) {
        throw new Error(
          "Course name is required."
        );
      }

      if (courseName.length > 200) {
        throw new Error(
          "Course name must be at most 200 characters."
        );
      }

      /* ========================================================
         ISSUER
      ======================================================== */

      if (!issuerName) {
        throw new Error(
          "Issuer name is required."
        );
      }

      if (issuerName.length > 200) {
        throw new Error(
          "Issuer name is too long."
        );
      }

      /* ========================================================
         DATE
      ======================================================== */

      if (!issueDate) {
        throw new Error(
          "Issue date is required."
        );
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          issueDate
        )
      ) {
        throw new Error(
          "Issue date must be in YYYY-MM-DD format."
        );
      }

      /* ========================================================
         CREATE CERTIFICATE
         
         IMPORTANT SECURITY RULE:

         Do NOT send:
         - employeeId
         - employeeEmail
         - recipientName
         - certificateId
         - certificateNo
         - verificationToken

         The backend resolves employee information
         from requestId.
      ======================================================== */

      const data = await apiRequest(
        "/admin/certificates",
        {
          method: "POST",

          body: JSON.stringify({
            requestId: Number(requestId),

            certificateType,

            courseName,

            issuerName,

            issueDate,
          }),
        }
      );

      console.log(
        "Create certificate response:",
        data
      );

      /* ========================================================
         SUCCESS
      ======================================================== */

      const certificate =
        data?.certificate || null;

      if (!certificate?.id) {
        throw new Error(
          "Certificate was created, but the server did not return a certificate ID."
        );
      }

      /*
        Convert returned ID to a number.

        The certificate ID is generated by the backend.
      */

      const certificateId = Number(
        certificate.id
      );

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        throw new Error(
          "The server returned an invalid certificate ID."
        );
      }

      console.log(
        "ISSUED CERTIFICATE RESPONSE:",
        certificate
      );

      console.log(
        "ISSUED CERTIFICATE ID:",
        certificateId
      );

      console.log(
        "NAVIGATING TO:",
        `/admin/certificates/${certificateId}`
      );

      setSuccess(
        data?.message ||
          "Certificate created successfully."
      );

      setCreatedCertificate(
        certificate
      );

      /*
        IMPORTANT:

        requestId and certificateId are DIFFERENT.

        Example:

        requestId     = 14
        certificateId = 21

        Correct:

        /admin/certificates/21

        NOT:

        /admin/certificates/14
      */

      navigate(
        `/admin/certificates/${certificateId}`,
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "Create certificate error:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while creating the certificate."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     INVALID REQUEST PAGE
  ============================================================ */

  if (!requestId || !validRequestId) {
    return (
      <main className="min-h-screen bg-midnight px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">

          <div className="mb-6">
            <BackButton />
          </div>

          <section
            aria-labelledby="invalid-request-title"
            className="rounded-3xl border border-red-400/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >

            <div className="mb-5 inline-flex rounded-2xl bg-red-400/10 p-3 text-red-300">
              <AlertCircle
                size={30}
                aria-hidden="true"
              />
            </div>

            <h1
              id="invalid-request-title"
              className="text-2xl font-bold text-white"
            >
              Invalid Certificate Request
            </h1>

            <p className="mt-3 leading-6 text-slate-400">
              This certificate creation page requires
              a valid certificate request ID.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Expected URL format:
              <br />
              <code className="text-cyan-300">
                /admin/certificates/create?requestId=123
              </code>
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/certificate-requests"
                )
              }
              className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Back to Certificate Requests
            </button>

          </section>

        </div>
      </main>
    );
  }

  /* ============================================================
     LOADING REQUEST
  ============================================================ */

  if (requestLoading) {
    return (
      <main className="min-h-screen bg-midnight px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">

          <div className="mb-6">
            <BackButton />
          </div>

          <section
            aria-live="polite"
            className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl"
          >

            <Loader2
              size={34}
              className="mx-auto animate-spin text-cyan-400"
              aria-hidden="true"
            />

            <p className="mt-4 font-semibold text-white">
              Loading certificate request...
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Request #{requestId}
            </p>

          </section>

        </div>
      </main>
    );
  }

  /* ============================================================
     REQUEST LOAD ERROR
  ============================================================ */

  if (requestError || !request) {
    return (
      <main className="min-h-screen bg-midnight px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">

          <div className="mb-6">
            <BackButton />
          </div>

          <section
            aria-live="assertive"
            className="rounded-3xl border border-red-400/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >

            <div className="mb-5 inline-flex rounded-2xl bg-red-400/10 p-3 text-red-300">
              <AlertCircle
                size={30}
                aria-hidden="true"
              />
            </div>

            <h1 className="text-2xl font-bold text-white">
              Unable to Load Certificate Request
            </h1>

            <p className="mt-3 leading-6 text-slate-400">
              {requestError ||
                "The certificate request could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/certificate-requests"
                )
              }
              className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Back to Certificate Requests
            </button>

          </section>

        </div>
      </main>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <main className="min-h-screen bg-midnight px-4 py-10 sm:px-6">

      <div className="mx-auto w-full max-w-3xl">

        {/* ======================================================
            BACK BUTTON
        ====================================================== */}

        <div className="mb-6">
          <BackButton />
        </div>

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="mb-8">

          <div
            className="mb-4 inline-flex rounded-2xl bg-cyan-400/10 p-3 text-cyan-300"
            aria-hidden="true"
          >
            <Award size={30} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create Certificate
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Review the certificate request and create
            the official employee certificate.
          </p>

        </header>

        {/* ======================================================
            REQUEST INFORMATION
        ====================================================== */}

        <section
          aria-labelledby="request-information-title"
          className="mb-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5"
        >

          <div className="flex items-start gap-3">

            <FileCheck2
              size={22}
              className="mt-0.5 shrink-0 text-cyan-300"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">

              <h2
                id="request-information-title"
                className="text-sm font-semibold text-cyan-200"
              >
                Certificate Request #{request.id}
              </h2>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">

                <div>
                  <p className="text-xs text-slate-500">
                    Employee
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {request.employee_name ||
                      "Employee information unavailable"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Employee Email
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-300">
                    {request.employee_email ||
                      "Email unavailable"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Requested Type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {request.certificate_type ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Request Status
                  </p>

                  <p className="mt-1 text-sm font-semibold capitalize text-emerald-300">
                    {request.status ||
                      "pending"}
                  </p>
                </div>

                {request.duration_months && (
                  <div>
                    <p className="text-xs text-slate-500">
                      Duration
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {request.duration_months}{" "}
                      months
                    </p>
                  </div>
                )}

              </div>

            </div>

          </div>

        </section>

        {/* ======================================================
            SECURITY INFORMATION
        ====================================================== */}

        <section
          aria-labelledby="security-title"
          className="mb-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5"
        >

          <div className="flex items-start gap-3">

            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-cyan-300"
              aria-hidden="true"
            />

            <div>

              <h2
                id="security-title"
                className="text-sm font-semibold text-cyan-200"
              >
                Secure certificate request
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Employee identity is resolved from the
                verified certificate request on the server.
                Employee ID, recipient name, certificate
                number, and verification token cannot be
                supplied by the frontend.
              </p>

            </div>

          </div>

        </section>

        {/* ======================================================
            SUCCESS
        ====================================================== */}

        {success && (
          <section
            aria-live="polite"
            className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-emerald-300"
          >

            <div className="flex items-start gap-3">

              <CheckCircle
                size={22}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />

              <div>

                <p className="font-semibold">
                  {success}
                </p>

                {createdCertificate?.certificate_no && (
                  <p className="mt-2 text-sm text-emerald-300/80">
                    Certificate No:{" "}

                    <strong className="text-white">
                      {
                        createdCertificate.certificate_no
                      }
                    </strong>
                  </p>
                )}

              </div>

            </div>

          </section>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <section
            aria-live="assertive"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-300"
          >

            <AlertCircle
              size={22}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />

            <div>

              <p className="font-semibold">
                Certificate creation failed
              </p>

              <p className="mt-1 text-sm text-red-300/80">
                {error}
              </p>

            </div>

          </section>
        )}

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        >

          <div className="grid gap-6 md:grid-cols-2">

            {/* ==================================================
                REQUEST ID
            ================================================== */}

            <div className="md:col-span-2">

              <label
                htmlFor="requestId"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Certificate Request
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4">

                <FileCheck2
                  size={19}
                  className="shrink-0 text-cyan-400"
                  aria-hidden="true"
                />

                <input
                  id="requestId"
                  type="text"
                  value={`Request #${requestId}`}
                  readOnly
                  aria-readonly="true"
                  className="w-full cursor-default bg-transparent py-3.5 text-sm font-semibold text-cyan-200 outline-none"
                />

              </div>

              <p className="mt-2 text-xs text-slate-500">
                This request identifier comes from the
                certificate request workflow and cannot
                be changed here.
              </p>

            </div>

            {/* ==================================================
                CERTIFICATE TYPE
            ================================================== */}

            <div>

              <label
                htmlFor="certificateType"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Certificate Type
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-4 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/20">

                <FileCheck2
                  size={19}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />

                <select
                  id="certificateType"
                  name="certificateType"
                  value={
                    form.certificateType
                  }
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full bg-transparent py-3.5 text-sm text-white outline-none"
                >

                  {CERTIFICATE_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                        className="bg-slate-900"
                      >
                        {type.label}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

            {/* ==================================================
                CERTIFICATE NUMBER
            ================================================== */}

            <div>

              <span className="mb-2 block text-sm font-medium text-slate-300">
                Certificate Number
              </span>

              <div className="flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4">

                <FileCheck2
                  size={19}
                  className="shrink-0 text-cyan-400"
                  aria-hidden="true"
                />

                <div className="py-3.5">

                  <p className="text-sm font-semibold text-cyan-200">
                    Generated by server
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Cannot be manually changed
                  </p>

                </div>

              </div>

            </div>

            {/* ==================================================
                EMPLOYEE
            ================================================== */}

            <div className="md:col-span-2">

              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">

                <div className="flex items-start gap-3">

                  <UserRound
                    size={20}
                    className="mt-0.5 shrink-0 text-cyan-300"
                    aria-hidden="true"
                  />

                  <div className="min-w-0">

                    <p className="text-sm font-medium text-cyan-200">
                      Employee
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {request.employee_name ||
                        "Employee name unavailable"}
                    </p>

                    {request.employee_email && (
                      <p className="mt-1 break-all text-xs text-slate-400">
                        {request.employee_email}
                      </p>
                    )}

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Employee identity is read from the
                      verified request and cannot be changed
                      from this form.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                COURSE
            ================================================== */}

            <div>

              <label
                htmlFor="courseName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Course Name
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-4 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/20">

                <Award
                  size={19}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />

                <input
                  id="courseName"
                  name="courseName"
                  type="text"
                  value={
                    form.courseName
                  }
                  onChange={handleChange}
                  placeholder="Web Development"
                  maxLength={200}
                  required
                  disabled={loading}
                  autoComplete="off"
                  className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
                />

              </div>

            </div>

            {/* ==================================================
                ISSUER
            ================================================== */}

            <div>

              <label
                htmlFor="issuerName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Issuer Name
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-4 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/20">

                <Building2
                  size={19}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />

                <input
                  id="issuerName"
                  name="issuerName"
                  type="text"
                  value={
                    form.issuerName
                  }
                  onChange={handleChange}
                  maxLength={200}
                  required
                  disabled={loading}
                  autoComplete="organization"
                  className="w-full bg-transparent py-3.5 text-sm text-white outline-none"
                />

              </div>

            </div>

            {/* ==================================================
                ISSUE DATE
            ================================================== */}

            <div className="md:col-span-2">

              <label
                htmlFor="issueDate"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Issue Date
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-4 transition focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/20">

                <CalendarDays
                  size={19}
                  className="shrink-0 text-slate-500"
                  aria-hidden="true"
                />

                <input
                  id="issueDate"
                  name="issueDate"
                  type="date"
                  value={
                    form.issueDate
                  }
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full bg-transparent py-3.5 text-sm text-white outline-none"
                />

              </div>

            </div>

          </div>

          {/* ====================================================
              SECURITY NOTICE
          ==================================================== */}

          <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/50 p-4">

            <div className="flex items-start gap-3">

              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
                aria-hidden="true"
              />

              <p className="text-xs leading-5 text-slate-400">

                <span className="font-semibold text-slate-300">
                  Security:
                </span>{" "}

                The frontend does not provide employee ID,
                recipient name, certificate ID, certificate
                number, or verification token. The backend
                obtains employee information from the verified
                certificate request and generates certificate
                identifiers securely.

              </p>

            </div>

          </div>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/certificate-requests"
                )
              }
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-1/3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                requestLoading
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 hover:shadow-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-2/3"
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />

                  Creating Certificate...
                </>
              ) : (
                <>
                  <CheckCircle
                    size={18}
                    aria-hidden="true"
                  />

                  Create Certificate
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </main>
  );
}