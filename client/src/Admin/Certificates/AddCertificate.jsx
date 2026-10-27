
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./AddCertificate.css";

export default function AddCertificate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestId = useMemo(
    () => searchParams.get("requestId")?.trim() || "",
    [searchParams]
  );

  const validRequestId = useMemo(
    () => /^[1-9]\d*$/.test(requestId),
    [requestId]
  );

  const [request, setRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [certificateType, setCertificateType] = useState("");
  const [courseName, setCourseName] = useState("");
  const [issuerName, setIssuerName] = useState("eSparks IT Solutions");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const certificateTypeLabel = (type) => {
    if (type === "CERT") return "Certificate";
    if (type === "INTR") return "Internship";
    return type || "—";
  };

  const displayValue = (value) =>
    value === null || value === undefined || value === ""
      ? "—"
      : value;

  const requestNumber = request?.id ?? request?.request_id ?? requestId;
  const employeeName = request?.employee_name ?? request?.employeeName ?? "—";
  const employeeEmail = request?.employee_email ?? request?.employeeEmail ?? "—";
  const requestedCertificateType =
    request?.certificate_type ?? request?.certificateType ?? "";
  const requestedCourse = request?.course_name ?? request?.courseName ?? "—";
  const requestedDuration =
    request?.duration_months ?? request?.durationMonths;

  useEffect(() => {
    let mounted = true;

    const loadRequest = async () => {
      if (!validRequestId) {
        if (mounted) {
          setLoadingRequest(false);
          setRequestError("Invalid certificate request ID.");
        }
        return;
      }

      try {
        setLoadingRequest(true);
        setRequestError("");
        setError("");

        const data = await apiRequest(
          `/admin/certificate-requests/${encodeURIComponent(requestId)}`
        );

        const loadedRequest =
          data?.request ??
          data?.certificateRequest ??
          data?.data ??
          null;

        if (!loadedRequest) {
          throw new Error("Certificate request was not found.");
        }

        const returnedId = Number(
          loadedRequest.id ?? loadedRequest.request_id
        );

        if (
          !Number.isInteger(returnedId) ||
          returnedId !== Number(requestId)
        ) {
          throw new Error("Certificate request ID mismatch.");
        }

        if (!mounted) return;

        setRequest(loadedRequest);
        setCertificateType(
          loadedRequest.certificate_type ??
          loadedRequest.certificateType ??
          ""
        );
        setCourseName(
          loadedRequest.course_name ??
          loadedRequest.courseName ??
          ""
        );
      } catch (error) {
        console.error("Load certificate request error:", error);

        if (!mounted) return;

        setRequest(null);
        setRequestError(
          error?.message || "Unable to load certificate request."
        );
      } finally {
        if (mounted) setLoadingRequest(false);
      }
    };

    loadRequest();

    return () => {
      mounted = false;
    };
  }, [requestId, validRequestId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validRequestId) {
      setError("Invalid certificate request ID.");
      return;
    }

    if (!certificateType) {
      setError("Certificate type is required.");
      return;
    }

    if (!courseName.trim()) {
      setError("Course name is required.");
      return;
    }

    if (!issuerName.trim()) {
      setError("Issuer name is required.");
      return;
    }

    if (!issueDate) {
      setError("Issue date is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        requestId: Number(requestId),
        certificateType,
        courseName: courseName.trim(),
        issuerName: issuerName.trim(),
        issueDate,
      };

      const data = await apiRequest("/admin/certificates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const certificate =
        data?.certificate ?? data?.data ?? data;
      const certificateId = Number(certificate?.id);

      if (!Number.isInteger(certificateId) || certificateId <= 0) {
        throw new Error(
          "Certificate was created but the server did not return a valid certificate ID."
        );
      }

      setSuccess("Certificate created successfully.");
      navigate(`/admin/certificates/${certificateId}`, {
        replace: true,
      });
    } catch (error) {
      console.error("Create certificate error:", error);
      setError(error?.message || "Unable to create certificate.");
    } finally {
      setSaving(false);
    }
  };

  if (!requestId || !validRequestId) {
    return (
      <main className="add-certificate-page">
        <div className="add-certificate-background" />

        <section className="add-certificate-state">
          <div className="add-certificate-state-icon">⚠️</div>
          <span className="add-certificate-eyebrow">
            REQUEST VALIDATION
          </span>
          <h1>Invalid Certificate Request</h1>
          <p>
            This certificate creation page requires a valid certificate
            request ID.
          </p>

          <div className="add-certificate-url">
            <span>Expected URL</span>
            <code>/admin/certificates/create?requestId=123</code>
          </div>

          <button
            type="button"
            className="add-certificate-button primary"
            onClick={() => navigate("/admin/certificate-requests")}
          >
            Back to Requests
          </button>
        </section>
      </main>
    );
  }

  if (loadingRequest) {
    return (
      <main className="add-certificate-page">
        <div className="add-certificate-background" />

        <section className="add-certificate-state">
          <div className="add-certificate-spinner" />
          <h1>Loading Request</h1>
          <p>Loading certificate request #{requestId}...</p>
        </section>
      </main>
    );
  }

  if (requestError || !request) {
    return (
      <main className="add-certificate-page">
        <div className="add-certificate-background" />

        <section className="add-certificate-state">
          <div className="add-certificate-state-icon error">!</div>
          <h1>Unable to Load Request</h1>
          <p className="add-certificate-state-error">
            {requestError || "Certificate request not found."}
          </p>

          <button
            type="button"
            className="add-certificate-button primary"
            onClick={() => navigate("/admin/certificate-requests")}
          >
            Back to Requests
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="add-certificate-page">
      <div className="add-certificate-background" />

      <div className="add-certificate-container">
        <header className="add-certificate-header">
          <div className="add-certificate-heading">
            <h1 className="add-certificate-title">
              Create Certificate
            </h1>
            <p className="add-certificate-subtitle">
              Create certificate from verified request #{requestId}.
            </p>
          </div>

          <button
            type="button"
            className="add-certificate-button secondary"
            onClick={() => navigate("/admin/certificate-requests")}
            disabled={saving}
          >
            ← Back to Requests
          </button>
        </header>

        <section className="add-certificate-panel">
          <h2>Request Information</h2>

          <div className="add-certificate-info-grid">
            <Info label="Request ID" value={`#${requestNumber}`} />
            <Info label="Employee" value={employeeName} />
            <Info label="Email" value={employeeEmail} />
            <Info
              label="Certificate Type"
              value={certificateTypeLabel(requestedCertificateType)}
            />
            <Info label="Course" value={requestedCourse} />

            {requestedDuration !== null &&
              requestedDuration !== undefined &&
              requestedDuration !== "" && (
                <Info
                  label="Duration"
                  value={`${requestedDuration} months`}
                />
              )}
          </div>
        </section>

        <form className="add-certificate-panel" onSubmit={handleSubmit}>
          <h2>Certificate Details</h2>

          {error && (
            <div className="add-certificate-alert error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="add-certificate-alert success" role="status">
              {success}
            </div>
          )}

          <div className="add-certificate-form-grid">
            <div className="add-certificate-field">
              <label htmlFor="certificateType">
                Certificate Type <span>*</span>
              </label>
              <select
                id="certificateType"
                name="certificateType"
                value={certificateType}
                onChange={(event) =>
                  setCertificateType(event.target.value)
                }
                disabled={saving}
                required
              >
                <option value="">Select certificate type</option>
                <option value="CERT">Certificate</option>
                <option value="INTR">Internship</option>
              </select>
            </div>

            <div className="add-certificate-field">
              <label htmlFor="courseName">
                Course / Program <span>*</span>
              </label>
              <input
                id="courseName"
                name="courseName"
                type="text"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                disabled={saving}
                placeholder="Enter course name"
                autoComplete="off"
                required
              />
            </div>

            <div className="add-certificate-field">
              <label htmlFor="issuerName">
                Issuer Name <span>*</span>
              </label>
              <input
                id="issuerName"
                name="issuerName"
                type="text"
                value={issuerName}
                onChange={(event) => setIssuerName(event.target.value)}
                disabled={saving}
                placeholder="eSparks IT Solutions"
                autoComplete="organization"
                required
              />
            </div>

            <div className="add-certificate-field">
              <label htmlFor="issueDate">
                Issue Date <span>*</span>
              </label>
              <input
                id="issueDate"
                name="issueDate"
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="add-certificate-actions">
            <button
              type="button"
              className="add-certificate-button secondary"
              onClick={() => navigate("/admin/certificate-requests")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="add-certificate-button primary"
              disabled={saving || !validRequestId}
            >
              {saving ? "Creating Certificate..." : "Create Certificate"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="add-certificate-info">
      <div className="add-certificate-info-label">{label}</div>
      <div className="add-certificate-info-value">
        {value === null || value === undefined || value === ""
          ? "—"
          : value}
      </div>
    </div>
  );
}
