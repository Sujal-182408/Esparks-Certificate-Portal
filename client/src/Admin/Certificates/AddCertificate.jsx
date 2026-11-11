
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
  const [issuerName, setIssuerName] = useState(
    "Esparks IT Solutions Private Limited"
  );
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Experience duration is entered in years and additional months.
  // It is converted into total months before sending it to the backend.
  const [experienceYears, setExperienceYears] = useState("0");
  const [experienceMonths, setExperienceMonths] = useState("0");

  const experienceDurationMonths =
    Number(experienceYears || 0) * 12 +
    Number(experienceMonths || 0);

  // Convert certificate type codes into readable labels.
  const certificateTypeLabel = (type) => {
    if (type === "CERT") return "Certificate";
    if (type === "INTR") return "Internship";
    if (type === "EXPR") return "Experience Certificate";
    return type || "—";
  };

  const requestNumber = request?.id ?? request?.request_id ?? requestId;
  const employeeName = request?.employee_name ?? request?.employeeName ?? "—";
  const employeeEmail =
    request?.employee_email ?? request?.employeeEmail ?? "—";

  const requestedCertificateType =
    request?.certificate_type ?? request?.certificateType ?? "";

  const requestedCourse = request?.course_name ?? request?.courseName ?? "—";

  const requestedDuration =
    request?.duration_months ?? request?.durationMonths;

  // Load the selected certificate request.
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

        const loadedType = String(
          loadedRequest.certificate_type ??
          loadedRequest.certificateType ??
          ""
        ).trim().toUpperCase();

        setCertificateType(loadedType);

        setCourseName(
          loadedRequest.course_name ??
          loadedRequest.courseName ??
          ""
        );

        // Restore an existing duration if the request already has one.
        if (loadedType === "EXPR") {
          const duration = Number(
            loadedRequest.duration_months ??
            loadedRequest.durationMonths ??
            0
          );

          if (Number.isInteger(duration) && duration > 0) {
            setExperienceYears(String(Math.floor(duration / 12)));
            setExperienceMonths(String(duration % 12));
          }
        }
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

  // Validate the form and create the certificate.
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

    if (!["CERT", "INTR", "EXPR"].includes(certificateType)) {
      setError("Please select a valid certificate type.");
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

    // Experience duration is mandatory only for EXPR certificates.
    if (certificateType === "EXPR") {
      const years = Number(experienceYears);
      const months = Number(experienceMonths);

      if (
        experienceYears.trim() === "" ||
        experienceMonths.trim() === "" ||
        !Number.isInteger(years) ||
        years < 0 ||
        years > 50 ||
        !Number.isInteger(months) ||
        months < 0 ||
        months > 11 ||
        experienceDurationMonths <= 0
      ) {
        setError(
          "Enter a valid experience duration in years and months."
        );
        return;
      }
    }

    try {
      setSaving(true);

      // Send experience duration in total months.
      // The backend must save this value for EXPR certificates.
      const payload = {
        requestId: Number(requestId),
        certificateType,
        courseName: courseName.trim(),
        issuerName: issuerName.trim(),
        issueDate,
        durationMonths:
          certificateType === "EXPR"
            ? experienceDurationMonths
            : null,
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

  // Show an error if the request ID is missing or invalid.
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

  // Show a loading state while fetching request information.
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

  // Show an error if the request could not be loaded.
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

        {/* Display the original employee certificate request information. */}
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
                  label="Requested Duration"
                  value={`${requestedDuration} months`}
                />
              )}
          </div>
        </section>

        {/* Certificate creation form. */}
        <form
          className="add-certificate-panel"
          onSubmit={handleSubmit}
        >
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
            {/* Select the certificate type. */}
            <div className="add-certificate-field">
              <label htmlFor="certificateType">
                Certificate Type <span>*</span>
              </label>

              <select
                id="certificateType"
                name="certificateType"
                value={certificateType}
                onChange={(event) => {
                  setCertificateType(event.target.value);
                  setError("");
                }}
                disabled={saving}
                required
              >
                <option value="">Select certificate type</option>
                <option value="CERT">Certificate</option>
                <option value="INTR">Internship</option>
                <option value="EXPR">Experience Certificate</option>
              </select>
            </div>

            {/* Course, programme, or professional role. */}
            <div className="add-certificate-field">
              <label htmlFor="courseName">
                Course / Program / Role <span>*</span>
              </label>

              <input
                id="courseName"
                name="courseName"
                type="text"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                disabled={saving}
                placeholder="Enter course name or professional role"
                autoComplete="off"
                required
              />
            </div>

            {/* Experience duration fields appear only for EXPR. */}
            {certificateType === "EXPR" && (
              <>
                <div className="add-certificate-field">
                  <label htmlFor="experienceYears">
                    Experience Duration (Years) <span>*</span>
                  </label>

                  <input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={experienceYears}
                    onChange={(event) =>
                      setExperienceYears(event.target.value)
                    }
                    disabled={saving}
                    placeholder="Enter years"
                    required
                  />
                </div>

                <div className="add-certificate-field">
                  <label htmlFor="experienceMonths">
                    Additional Months <span>*</span>
                  </label>

                  <input
                    id="experienceMonths"
                    name="experienceMonths"
                    type="number"
                    min="0"
                    max="11"
                    step="1"
                    value={experienceMonths}
                    onChange={(event) =>
                      setExperienceMonths(event.target.value)
                    }
                    disabled={saving}
                    placeholder="Enter additional months"
                    required
                  />
                </div>

                {/* Display the calculated total experience duration. */}
                {experienceDurationMonths > 0 &&
                  Number.isInteger(experienceDurationMonths) && (
                    <div className="add-certificate-field">
                      <label>Calculated Experience</label>

                      <div className="add-certificate-info-value">
                        {Math.floor(experienceDurationMonths / 12)}{" "}
                        {Math.floor(experienceDurationMonths / 12) === 1
                          ? "year"
                          : "years"}
                        {experienceDurationMonths % 12 > 0 &&
                          ` ${experienceDurationMonths % 12} ${
                            experienceDurationMonths % 12 === 1
                              ? "month"
                              : "months"
                          }`}
                      </div>
                    </div>
                  )}
              </>
            )}

            {/* Certificate issuer name. */}
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
                placeholder="Esparks IT Solutions Private Limited"
                autoComplete="organization"
                required
              />
            </div>

            {/* Certificate issue date. */}
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

          {/* Form actions. */}
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

// Reusable component for displaying request information.
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
