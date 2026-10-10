import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Eye,
  Pencil,
  Ban,
  RefreshCw,
} from "lucide-react";

import "./ManageCertificate.css";

const API_URL = "/api";

export default function ManageCertificates() {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCertificates = async () => {
    try {
      setRefreshing(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/certificates`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to fetch certificates."
        );
      }

      setCertificates(
        Array.isArray(data?.certificates)
          ? data.certificates
          : []
      );
    } catch (error) {
      console.error("Certificate fetch error:", error);

      setError(
        error?.message || "Unable to fetch certificates."
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleView = (id) => {
    navigate(`/admin/certificates/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/admin/certificates/${id}/edit`);
  };

  const handleRevoke = async (certificate) => {
    if (!certificate?.id) return;

    if (certificate.status === "revoked") {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke certificate "${certificate.certificate_no}"?\n\n` +
        `Recipient: ${
          certificate.recipient_name || "—"
        }\n` +
        `Course: ${
          certificate.course_name || "—"
        }\n\n` +
        `After revocation, this certificate will no longer be considered valid.`
    );

    if (!confirmed) return;

    try {
      setRevokingId(certificate.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/admin/certificates/${certificate.id}/revoke`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to revoke certificate."
        );
      }

      setCertificates((current) =>
        current.map((item) =>
          String(item.id) ===
          String(certificate.id)
            ? {
                ...item,
                status: "revoked",
                revoked_at:
                  data?.certificate?.revoked_at ||
                  new Date().toISOString(),
              }
            : item
        )
      );

      setSuccess(
        data?.message ||
          `Certificate ${certificate.certificate_no} has been revoked successfully.`
      );
    } catch (error) {
      console.error(
        "Certificate revoke error:",
        error
      );

      setError(
        error?.message ||
          "Unable to revoke certificate."
      );
    } finally {
      setRevokingId(null);
    }
  };

  const totalCertificates = certificates.length;

  const issuedCertificates = certificates.filter(
    (certificate) =>
      certificate.status === "issued"
  ).length;

  const revokedCertificates = certificates.filter(
    (certificate) =>
      certificate.status === "revoked"
  ).length;

  return (
    <div className="manage-certificate">
      <div className="manage-container">
        {/* =========================
            TOP BAR
        ========================= */}
        <div className="manage-topbar">
          <button
            type="button"
            className="back-dashboard-btn"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={17} />
            <span>Back to Dashboard</span>
          </button>

          <button
            type="button"
            className="refresh-btn"
            onClick={fetchCertificates}
            disabled={refreshing}
            title="Refresh certificates"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "refresh-spinning"
                  : ""
              }
            />

            <span>
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>

        {/* =========================
            HEADER
        ========================= */}
        <div className="manage-header">
          <div className="manage-title-section">
            <p className="manage-label">
              CERTIFICATE MANAGEMENT
            </p>

            <h1>Manage Certificates</h1>

            <p className="manage-description">
              View, edit and revoke issued certificates.
            </p>
          </div>

          <button
            type="button"
            className="add-certificate-btn"
            onClick={() =>
              navigate(
                "/admin/certificates/new"
              )
            }
          >
            <Plus size={18} />
            <span>Add Certificate</span>
          </button>
        </div>

        {/* =========================
            SUCCESS MESSAGE
        ========================= */}
        {success && (
          <div className="certificate-success">
            <div>
              <strong>Success</strong>

              <p>{success}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* =========================
            ERROR MESSAGE
        ========================= */}
        {error && (
          <div className="certificate-error">
            <div>
              <strong>
                Certificate operation failed
              </strong>

              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* =========================
            STATS
        ========================= */}
        <div className="certificate-stats">
          <div className="stat-card">
            <span>Total Certificates</span>

            <strong>
              {totalCertificates}
            </strong>
          </div>

          <div className="stat-card">
            <span>Issued</span>

            <strong className="stat-issued">
              {issuedCertificates}
            </strong>
          </div>

          <div className="stat-card">
            <span>Revoked</span>

            <strong className="stat-revoked">
              {revokedCertificates}
            </strong>
          </div>
        </div>

        {/* =========================
            EMPTY STATE
        ========================= */}
        {!error &&
          certificates.length === 0 && (
            <div className="no-certificates">
              <div className="empty-icon">
                <Ban size={32} />
              </div>

              <h2>
                No certificates found
              </h2>

              <p>
                Create your first certificate
                to see it here.
              </p>

              <button
                type="button"
                className="empty-create-btn"
                onClick={() =>
                  navigate(
                    "/admin/certificates/new"
                  )
                }
              >
                <Plus size={18} />
                Create Certificate
              </button>
            </div>
          )}

        {/* =========================
            CERTIFICATE TABLE
        ========================= */}
        {certificates.length > 0 && (
          <div className="certificate-table-wrapper">
            <div className="table-scroll">
              <table className="certificate-table">
                <thead>
                  <tr>
                    <th>
                      Certificate No.
                    </th>

                    <th>Recipient</th>

                    <th>Course</th>

                    <th>Issuer</th>

                    <th>Issue Date</th>

                    <th>Status</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {certificates.map(
                    (certificate) => {
                      const isRevoked =
                        certificate.status ===
                        "revoked";

                      const isRevoking =
                        String(
                          revokingId
                        ) ===
                        String(
                          certificate.id
                        );

                      return (
                        <tr
                          key={
                            certificate.id
                          }
                        >
                          {/* CERTIFICATE NUMBER */}
                          <td>
                            <span className="certificate-number">
                              {certificate.certificate_no ||
                                "—"}
                            </span>
                          </td>

                          {/* RECIPIENT */}
                          <td>
                            <div className="recipient-cell">
                              <strong>
                                {certificate.recipient_name ||
                                  "—"}
                              </strong>

                              {certificate.employee_email && (
                                <span>
                                  {
                                    certificate.employee_email
                                  }
                                </span>
                              )}
                            </div>
                          </td>

                          {/* COURSE */}
                          <td>
                            <span className="course-cell">
                              {certificate.course_name ||
                                "—"}
                            </span>
                          </td>

                          {/* ISSUER */}
                          <td>
                            {certificate.issuer_name ||
                              "—"}
                          </td>

                          {/* ISSUE DATE */}
                          <td>
                            {formatDate(
                              certificate.issue_date
                            )}
                          </td>

                          {/* STATUS */}
                          <td>
                            <div className="status-wrapper">
                              <span
                                className={`certificate-status ${
                                  certificate.status ===
                                  "issued"
                                    ? "status-issued"
                                    : certificate.status ===
                                      "revoked"
                                    ? "status-revoked"
                                    : "status-default"
                                }`}
                              >
                                {certificate.status ||
                                  "unknown"}
                              </span>

                              {certificate.revoked_at && (
                                <small>
                                  Revoked:{" "}
                                  {formatDate(
                                    certificate.revoked_at
                                  )}
                                </small>
                              )}
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td>
                            <div className="certificate-actions">
                              {/* VIEW */}
                              <button
                                type="button"
                                className="view-btn"
                                onClick={() =>
                                  handleView(
                                    certificate.id
                                  )
                                }
                                title="View certificate"
                              >
                                <Eye
                                  size={15}
                                />

                                <span>
                                  View
                                </span>
                              </button>

                              {/* EDIT */}
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(
                                    certificate.id
                                  )
                                }
                                disabled={
                                  isRevoked
                                }
                                title={
                                  isRevoked
                                    ? "Revoked certificates cannot be edited"
                                    : "Edit certificate"
                                }
                              >
                                <Pencil
                                  size={15}
                                />

                                <span>
                                  Edit
                                </span>
                              </button>

                              {/* REVOKE */}
                              <button
                                type="button"
                                className="revoke-btn"
                                onClick={() =>
                                  handleRevoke(
                                    certificate
                                  )
                                }
                                disabled={
                                  isRevoked ||
                                  isRevoking
                                }
                                title={
                                  isRevoked
                                    ? "Certificate already revoked"
                                    : "Revoke certificate"
                                }
                              >
                                <Ban
                                  size={15}
                                />

                                <span>
                                  {isRevoking
                                    ? "Revoking..."
                                    : isRevoked
                                    ? "Revoked"
                                    : "Revoke"}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-table-hint">
              ← Swipe horizontally to view all
              certificate details →
            </div>
          </div>
        )}

        {/* =========================
            COUNT
        ========================= */}
        {certificates.length > 0 && (
          <div className="certificate-count">
            Showing{" "}
            <strong>
              {certificates.length}
            </strong>{" "}
            certificate
            {certificates.length !== 1
              ? "s"
              : ""}
          </div>
        )}
      </div>
    </div>
  );
}