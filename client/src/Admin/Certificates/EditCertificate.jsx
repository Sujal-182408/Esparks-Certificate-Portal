import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FilePenLine } from "lucide-react";
import BackButton from "../../components/BackButton";
import "./EditCertificate.css";

const API_URL = `${(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")}/api`;

export default function EditCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    certificateNo: "",
    recipientName: "",
    employeeId: "",
    employeeEmail: "",
    courseName: "",
    issuerName: "",
    issueDate: "",
  });

  const [certificateStatus, setCertificateStatus] =
    useState("issued");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     FETCH CERTIFICATE
  ========================================================= */

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/admin/certificates/${id}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to load certificate."
          );
        }

        const certificate =
          data?.certificate || data;

        if (!certificate) {
          throw new Error(
            "Certificate information was not found."
          );
        }

        /*
         * IMPORTANT:
         * employee_id comes from PostgreSQL.
         * We don't allow the admin to manually type
         * recipient information.
         */

        setForm({
          certificateNo:
            certificate.certificate_no || "",

          recipientName:
            certificate.recipient_name || "",

          employeeId:
            certificate.employee_id
              ? String(certificate.employee_id)
              : "",

          employeeEmail:
            certificate.employee_email || "",

          courseName:
            certificate.course_name || "",

          issuerName:
            certificate.issuer_name || "",

          issueDate: certificate.issue_date
            ? String(certificate.issue_date).substring(
                0,
                10
              )
            : "",
        });

        setCertificateStatus(
          certificate.status || "issued"
        );
      } catch (err) {
        console.error(
          "Fetch certificate error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load certificate."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCertificate();
    }
  }, [id]);

  /* =========================================================
     HANDLE INPUT
  ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateForm = () => {
    if (!form.certificateNo.trim()) {
      return "Certificate number is required.";
    }

    if (!form.employeeId) {
      return (
        "This certificate is not linked to a registered employee."
      );
    }

    if (!form.courseName.trim()) {
      return "Course name is required.";
    }

    if (!form.issuerName.trim()) {
      return "Issuer name is required.";
    }

    if (!form.issueDate) {
      return "Issue date is required.";
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        form.issueDate
      )
    ) {
      return "Issue date must be in YYYY-MM-DD format.";
    }

    return null;
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      /*
       * Do NOT send status.
       *
       * Revocation has its own endpoint:
       * PATCH /api/admin/certificates/:id/revoke
       */

      const payload = {
        certificateNo:
          form.certificateNo.trim(),

        recipientName:
          form.recipientName.trim(),

        courseName:
          form.courseName.trim(),

        issuerName:
          form.issuerName.trim(),

        issueDate:
          form.issueDate,

        employeeId:
          Number(form.employeeId),
      };

      console.log(
        "Updating certificate:",
        payload
      );

      const response = await fetch(
        `${API_URL}/admin/certificates/${id}`,
        {
          method: "PUT",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to update certificate."
        );
      }

      setSuccess(
        data?.message ||
          "Certificate updated successfully."
      );

      /*
       * Give the user a moment to see
       * the success message.
       */

      setTimeout(() => {
        navigate(
          `/admin/certificates/${id}`
        );
      }, 900);
    } catch (err) {
      console.error(
        "Update certificate error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update certificate."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="edit-certificate-page">
        <div className="edit-loading">
          <div className="edit-loading-spinner"></div>

          <p>
            Loading certificate...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="edit-certificate-page">

      {/* BACK */}

      <BackButton
        text="Back to Certificates"
        to="/admin/certificates"
      />

      {/* SUCCESS */}

      {success && (
        <div className="edit-success-message">
          ✓ {success}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="edit-error-message">
          ⚠ {error}
        </div>
      )}

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="edit-certificate-topbar">

        <div className="edit-title-section">

          <div className="edit-title-icon">
            <FilePenLine size={22} />
          </div>

          <div>
            <h1>
              Edit Certificate
            </h1>

            <p>
              Update certificate information
            </p>
          </div>

        </div>

        <button
          type="button"
          className="edit-back-btn"
          onClick={() =>
            navigate(
              "/admin/certificates"
            )
          }
        >
          <ArrowLeft size={16} />

          Back to Certificates
        </button>

      </div>

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="edit-certificate-layout">

        {/* ===================================================
            FORM
        =================================================== */}

        <div className="edit-certificate-card">

          <div className="edit-card-header">

            <h2>
              Certificate Information
            </h2>

            <p>
              Modify the certificate information below.
            </p>

          </div>

          <form
            className="edit-certificate-form"
            onSubmit={handleSubmit}
          >

            {/* =============================================
                CERTIFICATE NUMBER
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Certificate Number
                <span className="required">
                  *
                </span>
              </label>

              <input
                type="text"
                name="certificateNo"
                value={
                  form.certificateNo
                }
                onChange={handleChange}
                required
                disabled={saving}
                maxLength={100}
                autoComplete="off"
              />

              <span className="field-help">
                Must be unique.
              </span>

            </div>

            {/* =============================================
                EMPLOYEE
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Registered Employee
              </label>

              <div className="edit-employee-box">

                <div>
                  <strong>
                    {form.recipientName ||
                      "Unknown employee"}
                  </strong>

                  <span>
                    {form.employeeEmail ||
                      "No employee email"}
                  </span>
                </div>

              </div>

              <span className="field-help">
                Employee identity is linked to the
                registered employee account and cannot
                be changed here.
              </span>

            </div>

            {/* =============================================
                COURSE
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Course Name
                <span className="required">
                  *
                </span>
              </label>

              <input
                type="text"
                name="courseName"
                value={
                  form.courseName
                }
                onChange={handleChange}
                required
                disabled={saving}
                maxLength={200}
              />

            </div>

            {/* =============================================
                ISSUER
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Issuer
                <span className="required">
                  *
                </span>
              </label>

              <input
                type="text"
                name="issuerName"
                value={
                  form.issuerName
                }
                onChange={handleChange}
                required
                disabled={saving}
                maxLength={200}
              />

            </div>

            {/* =============================================
                ISSUE DATE
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Issue Date
                <span className="required">
                  *
                </span>
              </label>

              <input
                type="date"
                name="issueDate"
                value={
                  form.issueDate
                }
                onChange={handleChange}
                required
                disabled={saving}
              />

            </div>

            {/* =============================================
                STATUS
            ============================================= */}

            <div className="edit-form-group">

              <label>
                Certificate Status
              </label>

              <div
                className={`edit-status-display ${
                  certificateStatus ===
                  "revoked"
                    ? "revoked"
                    : "issued"
                }`}
              >
                <span className="edit-status-dot"></span>

                {certificateStatus ===
                "revoked"
                  ? "Revoked"
                  : "Issued"}
              </div>

              <span className="field-help">
                Certificate status is controlled by
                the dedicated revoke action.
              </span>

            </div>

            {/* =============================================
                FOOTER
            ============================================= */}

            <div className="edit-form-footer">

              <div className="edit-footer-info">
                Changes will update the existing
                certificate.
              </div>

              <div className="edit-footer-buttons">

                <button
                  type="button"
                  className="cancel-edit-btn"
                  onClick={() =>
                    navigate(
                      "/admin/certificates"
                    )
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-edit-btn"
                  disabled={
                    saving ||
                    certificateStatus ===
                      "revoked"
                  }
                >
                  <Save size={16} />

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>

          </form>
        </div>

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="edit-sidebar">

          {/* PREVIEW */}

          <div className="edit-preview-card">

            <h3>
              Certificate Preview
            </h3>

            <div className="preview-certificate">

              <span className="preview-label">
                Certificate No.
              </span>

              <div className="preview-value">
                {form.certificateNo ||
                  "-"}
              </div>

              <span className="preview-label">
                Recipient
              </span>

              <div className="preview-value preview-recipient">
                {form.recipientName ||
                  "-"}
              </div>

              <span className="preview-label">
                Employee Gmail
              </span>

              <div className="preview-value preview-email">
                {form.employeeEmail ||
                  "-"}
              </div>

              <span className="preview-label">
                Course
              </span>

              <div className="preview-value">
                {form.courseName ||
                  "-"}
              </div>

              <span className="preview-label">
                Issuer
              </span>

              <div className="preview-value">
                {form.issuerName ||
                  "-"}
              </div>

              <span className="preview-label">
                Issue Date
              </span>

              <div className="preview-value">
                {form.issueDate ||
                  "-"}
              </div>

              <span
                className={`preview-status ${
                  certificateStatus ===
                  "issued"
                    ? "issued"
                    : "revoked"
                }`}
              >
                {certificateStatus}
              </span>

            </div>

          </div>

          {/* SECURITY INFO */}

          <div className="edit-warning-card">

            <h3>
              🔐 Certificate Security
            </h3>

            <p>
              The recipient and Gmail are taken
              from the registered employee account.
              They cannot be changed manually.
            </p>

          </div>

          {/* REVOKE INFO */}

          {certificateStatus ===
            "issued" && (
            <div className="edit-warning-card">

              <h3>
                ⚠ Revocation
              </h3>

              <p>
                To revoke this certificate, return
                to Manage Certificates and use the
                dedicated Revoke button.
              </p>

            </div>
          )}

          {certificateStatus ===
            "revoked" && (
            <div className="edit-warning-card">

              <h3>
                🚫 Certificate Revoked
              </h3>

              <p>
                This certificate has already been
                revoked and cannot be edited.
              </p>

            </div>
          )}

        </aside>

      </div>
    </div>
  );
}