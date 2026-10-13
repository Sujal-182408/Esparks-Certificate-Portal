import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { apiRequest } from "../../services/api";

export default function AddCertificate() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  /* =========================================================
     REQUEST ID
  ========================================================= */

  const requestId = useMemo(() => {
    const value =
      searchParams.get("requestId");

    if (!value) {
      return "";
    }

    return value.trim();
  }, [searchParams]);

  const validRequestId = useMemo(() => {
    return /^[1-9]\d*$/.test(
      requestId
    );
  }, [requestId]);

  /* =========================================================
     STATE
  ========================================================= */

  const [request, setRequest] =
    useState(null);

  const [loadingRequest, setLoadingRequest] =
    useState(true);

  const [requestError, setRequestError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =========================================================
     FORM
  ========================================================= */

  const [certificateType, setCertificateType] =
    useState("");

  const [courseName, setCourseName] =
    useState("");

  const [issuerName, setIssuerName] =
    useState("eSparks IT Solutions");

  const [issueDate, setIssueDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  /* =========================================================
     LOAD REQUEST
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadRequest = async () => {
      if (!validRequestId) {
        if (mounted) {
          setLoadingRequest(false);
          setRequestError(
            "Invalid certificate request ID."
          );
        }

        return;
      }

      try {
        setLoadingRequest(true);
        setRequestError("");
        setError("");

        console.log(
          "🔵 Loading certificate request:",
          requestId
        );

        const data = await apiRequest(
          `/admin/certificate-requests/${encodeURIComponent(
            requestId
          )}`
        );

        console.log(
          "🟢 Certificate request response:",
          data
        );

        const loadedRequest =
          data?.request ||
          data?.certificateRequest ||
          data?.data ||
          null;

        if (!loadedRequest) {
          throw new Error(
            "Certificate request was not found."
          );
        }

        const returnedId = Number(
          loadedRequest.id ??
            loadedRequest.request_id
        );

        if (
          !Number.isInteger(returnedId) ||
          returnedId !==
            Number(requestId)
        ) {
          throw new Error(
            "Certificate request ID mismatch."
          );
        }

        if (!mounted) return;

        setRequest(
          loadedRequest
        );

        setCertificateType(
          loadedRequest.certificate_type ||
            loadedRequest.certificateType ||
            ""
        );

        setCourseName(
          loadedRequest.course_name ||
            loadedRequest.courseName ||
            ""
        );
      } catch (error) {
        console.error(
          "Load certificate request error:",
          error
        );

        if (!mounted) return;

        setRequest(null);

        setRequestError(
          error?.message ||
            "Unable to load certificate request."
        );
      } finally {
        if (mounted) {
          setLoadingRequest(false);
        }
      }
    };

    loadRequest();

    return () => {
      mounted = false;
    };
  }, [requestId, validRequestId]);

  /* =========================================================
     INVALID REQUEST PAGE
  ========================================================= */

  if (
    !requestId ||
    !validRequestId
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          background:
            "#f5f7fb",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            padding: "40px",
            borderRadius: "18px",
            background: "#fff",
            boxShadow:
              "0 15px 50px rgba(0,0,0,.08)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              marginBottom: "15px",
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              color: "#111827",
            }}
          >
            Invalid Certificate Request
          </h1>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.7,
            }}
          >
            This certificate creation page
            requires a valid certificate
            request ID.
          </p>

          <div
            style={{
              margin:
                "20px 0",
              padding: "15px",
              borderRadius: "10px",
              background:
                "#f3f4f6",
              fontFamily:
                "monospace",
              color: "#374151",
            }}
          >
            Expected URL:
            <br />
            /admin/certificates/create?requestId=123
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/certificate-requests"
              )
            }
            style={{
              border: "none",
              borderRadius: "10px",
              padding:
                "12px 20px",
              background:
                "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loadingRequest) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            border:
              "4px solid #e5e7eb",
            borderTopColor:
              "#2563eb",
            borderRadius: "50%",
            animation:
              "certificateSpin .8s linear infinite",
          }}
        />

        <p>
          Loading certificate request...
        </p>

        <style>
          {`
            @keyframes certificateSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* =========================================================
     REQUEST ERROR
  ========================================================= */

  if (
    requestError ||
    !request
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          background:
            "#f5f7fb",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "650px",
            padding: "40px",
            background: "#fff",
            borderRadius: "18px",
            textAlign: "center",
            boxShadow:
              "0 15px 50px rgba(0,0,0,.08)",
          }}
        >
          <h1>
            Unable to Load Request
          </h1>

          <p
            style={{
              color: "#dc2626",
              margin:
                "15px 0 25px",
            }}
          >
            {requestError ||
              "Certificate request not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/certificate-requests"
              )
            }
            style={{
              border: "none",
              borderRadius: "10px",
              padding:
                "12px 20px",
              background:
                "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     CREATE CERTIFICATE
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validRequestId) {
      setError(
        "Invalid certificate request ID."
      );
      return;
    }

    if (!certificateType) {
      setError(
        "Certificate type is required."
      );
      return;
    }

    if (!courseName.trim()) {
      setError(
        "Course name is required."
      );
      return;
    }

    if (!issuerName.trim()) {
      setError(
        "Issuer name is required."
      );
      return;
    }

    if (!issueDate) {
      setError(
        "Issue date is required."
      );
      return;
    }

    try {
      setSaving(true);

      console.log(
        "🟦 Creating certificate from request:",
        requestId
      );

      const payload = {
        requestId: Number(
          requestId
        ),

        certificateType,

        courseName:
          courseName.trim(),

        issuerName:
          issuerName.trim(),

        issueDate,
      };

      console.log(
        "🟦 Certificate payload:",
        payload
      );

      const data =
        await apiRequest(
          "/admin/certificates",
          {
            method: "POST",

            body: JSON.stringify(
              payload
            ),
          }
        );

      console.log(
        "🟢 Certificate created:",
        data
      );

      const certificate =
        data?.certificate ||
        data?.data ||
        data;

      const certificateId =
        Number(
          certificate?.id
        );

      if (
        !Number.isInteger(
          certificateId
        ) ||
        certificateId <= 0
      ) {
        throw new Error(
          "Certificate was created but the server did not return a valid certificate ID."
        );
      }

      setSuccess(
        "Certificate created successfully."
      );

      navigate(
        `/admin/certificates/${certificateId}`,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Create certificate error:",
        error
      );

      setError(
        error?.message ||
          "Unable to create certificate."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     FORM
  ========================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "#f5f7fb",
        padding:
          "40px 24px",
      }}
    >

      <div
        style={{
          maxWidth:
            "1000px",
          margin:
            "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "30px",
            gap: "20px",
            flexWrap:
              "wrap",
          }}
        >

          <div>
            <h1
              style={{
                margin: 0,
                color:
                  "#111827",
              }}
            >
              Create Certificate
            </h1>

            <p
              style={{
                marginTop:
                  "8px",
                color:
                  "#6b7280",
              }}
            >
              Create certificate
              from verified request
              #{requestId}.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/certificate-requests"
              )
            }
            disabled={saving}
            style={{
              border:
                "1px solid #d1d5db",
              borderRadius:
                "10px",
              padding:
                "11px 18px",
              background:
                "#fff",
              color:
                "#374151",
              cursor:
                "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to Requests
          </button>

        </div>

        {/* REQUEST SUMMARY */}

        <div
          style={{
            background:
              "#fff",
            borderRadius:
              "16px",
            padding:
              "25px",
            marginBottom:
              "24px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,.06)",
          }}
        >

          <h2
            style={{
              marginTop: 0,
              color:
                "#111827",
            }}
          >
            Request Information
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap:
                "20px",
            }}
          >

            <Info
              label="Request ID"
              value={`#${request.id}`}
            />

            <Info
              label="Employee"
              value={
                request.employee_name ||
                request.employeeName ||
                "—"
              }
            />

            <Info
              label="Email"
              value={
                request.employee_email ||
                request.employeeEmail ||
                "—"
              }
            />

            <Info
              label="Certificate Type"
              value={certificateTypeLabel(
                request.certificate_type
              )}
            />

            <Info
              label="Course"
              value={
                request.course_name ||
                "—"
              }
            />

            {request.duration_months && (
              <Info
                label="Duration"
                value={`${request.duration_months} months`}
              />
            )}

          </div>

        </div>

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            background:
              "#fff",
            borderRadius:
              "16px",
            padding:
              "30px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,.06)",
          }}
        >

          <h2
            style={{
              marginTop: 0,
            }}
          >
            Certificate Details
          </h2>

          {/* ERROR */}

          {error && (
            <div
              style={{
                padding:
                  "14px 16px",
                borderRadius:
                  "10px",
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                marginBottom:
                  "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div
              style={{
                padding:
                  "14px 16px",
                borderRadius:
                  "10px",
                background:
                  "#ecfdf5",
                color:
                  "#047857",
                marginBottom:
                  "20px",
              }}
            >
              {success}
            </div>
          )}

          {/* TYPE */}

          <div
            style={{
              marginBottom:
                "20px",
            }}
          >

            <label
              htmlFor="certificateType"
              style={labelStyle}
            >
              Certificate Type
            </label>

            <select
              id="certificateType"
              value={
                certificateType
              }
              onChange={(event) =>
                setCertificateType(
                  event.target.value
                )
              }
              disabled={saving}
              style={
                inputStyle
              }
            >
              <option value="">
                Select certificate type
              </option>

              <option value="CERT">
                Certificate
              </option>

              <option value="INTR">
                Internship
              </option>
            </select>

          </div>

          {/* COURSE */}

          <div
            style={{
              marginBottom:
                "20px",
            }}
          >

            <label
              htmlFor="courseName"
              style={labelStyle}
            >
              Course / Program
            </label>

            <input
              id="courseName"
              type="text"
              value={
                courseName
              }
              onChange={(event) =>
                setCourseName(
                  event.target.value
                )
              }
              disabled={saving}
              placeholder="Enter course name"
              style={
                inputStyle
              }
            />

          </div>

          {/* ISSUER */}

          <div
            style={{
              marginBottom:
                "20px",
            }}
          >

            <label
              htmlFor="issuerName"
              style={labelStyle}
            >
              Issuer Name
            </label>

            <input
              id="issuerName"
              type="text"
              value={
                issuerName
              }
              onChange={(event) =>
                setIssuerName(
                  event.target.value
                )
              }
              disabled={saving}
              placeholder="eSparks IT Solutions"
              style={
                inputStyle
              }
            />

          </div>

          {/* DATE */}

          <div
            style={{
              marginBottom:
                "30px",
            }}
          >

            <label
              htmlFor="issueDate"
              style={labelStyle}
            >
              Issue Date
            </label>

            <input
              id="issueDate"
              type="date"
              value={
                issueDate
              }
              onChange={(event) =>
                setIssueDate(
                  event.target.value
                )
              }
              disabled={saving}
              style={
                inputStyle
              }
            />

          </div>

          {/* BUTTONS */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "flex-end",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/certificate-requests"
                )
              }
              disabled={saving}
              style={{
                border:
                  "1px solid #d1d5db",
                borderRadius:
                  "10px",
                padding:
                  "12px 20px",
                background:
                  "#fff",
                color:
                  "#374151",
                cursor:
                  "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !validRequestId
              }
              style={{
                border: "none",
                borderRadius:
                  "10px",
                padding:
                  "12px 22px",
                background:
                  saving
                    ? "#93c5fd"
                    : "#2563eb",
                color:
                  "#fff",
                cursor:
                  saving
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
              }}
            >
              {saving
                ? "Creating Certificate..."
                : "Create Certificate"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENT
========================================================= */

function Info({
  label,
  value,
}) {
  return (
    <div>
      <div
        style={{
          fontSize:
            "13px",
          color:
            "#6b7280",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight:
            600,
          color:
            "#111827",
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  outline: "none",
  background: "#fff",
  color: "#111827",
  fontSize: "15px",
  boxSizing: "border-box",
};