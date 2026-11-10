
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Eye,
  Pencil,
  Ban,
  RefreshCw,
  X,
  AlertTriangle,
  Trash2,
} from "lucide-react";

import {
  getAdminCertificates,
  revokeAdminCertificate,
  requestCertificateDeleteOtp,
  confirmCertificateDelete,
} from "../../services/api";

import "./ManageCertificate.css";

export default function ManageCertificates() {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [deactivateEmployee, setDeactivateEmployee] = useState(false);
  // Optional reason — shown to the employee in the email and stored in the audit log.
  const [revokeReason, setRevokeReason] = useState("");

  // Delete confirmation and OTP state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteChallengeId, setDeleteChallengeId] = useState("");
  const [sendingDeleteOtp, setSendingDeleteOtp] = useState(false);
  const [verifyingDeleteOtp, setVerifyingDeleteOtp] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  // Fetch certificates
  const fetchCertificates = async () => {
    try {
      setRefreshing(true);
      setError("");

      const data = await getAdminCertificates();

      setCertificates(
        Array.isArray(data?.certificates) ? data.certificates : []
      );
    } catch (error) {
      console.error("Certificate fetch error:", error);
      setError(error?.message || "Failed to fetch certificates.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

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

  // Open revoke confirmation modal
  const handleRevoke = (certificate) => {
    if (!certificate?.id || certificate.status === "revoked") return;

    setRevokeTarget(certificate);
    setDeactivateEmployee(false);
    setError("");
    setSuccess("");
  };

  // Close revoke confirmation modal
  const closeRevokeModal = () => {
    if (revokingId !== null) return;

    setRevokeTarget(null);
    setDeactivateEmployee(false);
    setRevokeReason("");
  };

  // Confirm certificate revocation
  const confirmRevoke = async () => {
    if (!revokeTarget?.id) return;

    const certificate = revokeTarget;

    try {
      setRevokingId(certificate.id);
      setError("");
      setSuccess("");

      const data = await revokeAdminCertificate(certificate.id, {
        reason: revokeReason,
        deactivateEmployee,
      });

      setCertificates((current) =>
        current.map((item) =>
          String(item.id) === String(certificate.id)
            ? {
                ...item,
                status: "revoked",
                revoked_at:
                  data?.certificate?.revoked_at || new Date().toISOString(),
              }
            : item
        )
      );

      setSuccess(
        data?.message ||
          `Certificate ${certificate.certificate_no} has been revoked successfully.${
            deactivateEmployee
              ? " Employee account has also been deactivated."
              : " Employee account remains active."
          }`
      );

      setRevokeTarget(null);
      setDeactivateEmployee(false);
      setRevokeReason("");
    } catch (error) {
      console.error("Certificate revoke error:", error);
      setError(error?.message || "Unable to revoke certificate.");
    } finally {
      setRevokingId(null);
    }
  };

  // Request deletion OTP and open modal
  const handleDelete = async (certificate) => {
    if (
      !certificate?.id ||
      sendingDeleteOtp ||
      verifyingDeleteOtp ||
      deletingId !== null ||
      revokingId !== null
    ) {
      return;
    }

    setDeleteTarget(certificate);
    setDeleteOtp("");
    setDeleteChallengeId("");
    setDeleteError("");
    setDeleteSuccess("");
    setError("");
    setSuccess("");
    setSendingDeleteOtp(true);

    try {
      const data = await requestCertificateDeleteOtp(certificate.id);

      setDeleteChallengeId(data.challengeId);
      setDeleteSuccess(
        data.message || "Verification OTP sent successfully."
      );
    } catch (error) {
      console.error("Delete OTP error:", error);
      setDeleteError(
        error?.message || "Unable to send verification OTP."
      );
    } finally {
      setSendingDeleteOtp(false);
    }
  };

  // Close delete modal
  const closeDeleteModal = () => {
    if (sendingDeleteOtp || verifyingDeleteOtp) return;

    setDeleteTarget(null);
    setDeleteOtp("");
    setDeleteChallengeId("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  // Verify OTP and permanently delete certificate
  const confirmDelete = async () => {
    if (!deleteTarget?.id || !deleteChallengeId) {
      setDeleteError("Please request a verification OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(deleteOtp)) {
      setDeleteError("Enter a valid 6-digit OTP.");
      return;
    }

    const certificateId = deleteTarget.id;

    try {
      setVerifyingDeleteOtp(true);
      setDeletingId(certificateId);
      setDeleteError("");
      setDeleteSuccess("");

      const data = await confirmCertificateDelete(
        certificateId,
        deleteChallengeId,
        deleteOtp
      );

      // Remove deleted certificate from the table
      setCertificates((current) =>
        current.filter(
          (item) => String(item.id) !== String(certificateId)
        )
      );

      // Close modal and reset OTP state
      setDeleteTarget(null);
      setDeleteOtp("");
      setDeleteChallengeId("");
      setDeleteError("");
      setDeleteSuccess("");

      setSuccess(
        data.message || "Certificate deleted successfully."
      );
    } catch (error) {
      console.error("Verified deletion error:", error);

      setDeleteError(
        error?.message || "OTP verification or deletion failed."
      );
    } finally {
      setVerifyingDeleteOtp(false);
      setDeletingId(null);
    }
  };

  // Certificate statistics
  const totalCertificates = certificates.length;

  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === "issued"
  ).length;

  const revokedCertificates = certificates.filter(
    (certificate) => certificate.status === "revoked"
  ).length;

  return (
    <div className="manage-certificate">
      <div className="manage-container">

        {/* TOP BAR */}
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
              className={refreshing ? "refresh-spinning" : ""}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* HEADER */}
        <div className="manage-header">
          <div className="manage-title-section">
            <p className="manage-label">CERTIFICATE MANAGEMENT</p>
            <h1>Manage Certificates</h1>
            <p className="manage-description">
              View, edit and revoke issued certificates.
            </p>
          </div>

          <button
            type="button"
            className="add-certificate-btn"
            onClick={() => navigate("/admin/certificate-requests")}
          >
            <Plus size={18} />
            <span>Add Certificate</span>
          </button>
        </div>

        {/* PAGE SUCCESS */}
        {success && (
          <div className="certificate-success">
            <div>
              <strong>Success</strong>
              <p>{success}</p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* PAGE ERROR */}
        {error && (
          <div className="certificate-error">
            <div>
              <strong>Certificate operation failed</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="certificate-stats">
          <div className="stat-card">
            <span>Total Certificates</span>
            <strong>{totalCertificates}</strong>
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

        {/* EMPTY STATE */}
        {!error && certificates.length === 0 && (
          <div className="no-certificates">
            <div className="empty-icon">
              <Ban size={32} />
            </div>

            <h2>No certificates found</h2>
            <p>Create your first certificate to see it here.</p>

            <button
              type="button"
              className="empty-create-btn"
              onClick={() =>
                navigate("/admin/certificate-requests")
              }
            >
              <Plus size={18} />
              Create Certificate
            </button>
          </div>
        )}

        {/* CERTIFICATE TABLE */}
        {certificates.length > 0 && (
          <div className="certificate-table-wrapper">
            <div className="table-scroll">
              <table className="certificate-table">
                <thead>
                  <tr>
                    <th>Certificate No.</th>
                    <th>Recipient</th>
                    <th>Course</th>
                    <th>Issuer</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {certificates.map((certificate) => {
                    const isRevoked =
                      certificate.status === "revoked";

                    const isRevoking =
                      String(revokingId) ===
                      String(certificate.id);

                    return (
                      <tr key={certificate.id}>
                        <td>
                          <span className="certificate-number">
                            {certificate.certificate_no || "—"}
                          </span>
                        </td>

                        <td>
                          <div className="recipient-cell">
                            <strong>
                              {certificate.recipient_name || "—"}
                            </strong>

                            {certificate.employee_email && (
                              <span>
                                {certificate.employee_email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="course-cell">
                            {certificate.course_name || "—"}
                          </span>
                        </td>

                        <td>
                          {certificate.issuer_name || "—"}
                        </td>

                        <td>
                          {formatDate(certificate.issue_date)}
                        </td>

                        <td>
                          <div className="status-wrapper">
                            <span
                              className={`certificate-status ${
                                certificate.status === "issued"
                                  ? "status-issued"
                                  : certificate.status === "revoked"
                                    ? "status-revoked"
                                    : "status-default"
                              }`}
                            >
                              {certificate.status || "unknown"}
                            </span>

                            {certificate.revoked_at && (
                              <small>
                                Revoked:{" "}
                                {formatDate(certificate.revoked_at)}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="certificate-actions">

                            {/* VIEW */}
                            <button
                              type="button"
                              className="view-btn"
                              onClick={() =>
                                handleView(certificate.id)
                              }
                              title="View certificate"
                            >
                              <Eye size={15} />
                              <span>View</span>
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() =>
                                handleEdit(certificate.id)
                              }
                              disabled={isRevoked}
                              title={
                                isRevoked
                                  ? "Revoked certificates cannot be edited"
                                  : "Edit certificate"
                              }
                            >
                              <Pencil size={15} />
                              <span>Edit</span>
                            </button>

                            {/* REVOKE */}
                            <button
                              type="button"
                              className="revoke-btn"
                              onClick={() =>
                                handleRevoke(certificate)
                              }
                              disabled={
                                isRevoked ||
                                isRevoking ||
                                deletingId !== null ||
                                sendingDeleteOtp ||
                                verifyingDeleteOtp
                              }
                              title={
                                isRevoked
                                  ? "Certificate already revoked"
                                  : "Revoke certificate"
                              }
                            >
                              <Ban size={15} />

                              <span>
                                {isRevoking
                                  ? "Revoking..."
                                  : isRevoked
                                    ? "Revoked"
                                    : "Revoke"}
                              </span>
                            </button>

                            {/* DELETE */}
                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                handleDelete(certificate)
                              }
                              disabled={
                                deletingId !== null ||
                                sendingDeleteOtp ||
                                verifyingDeleteOtp ||
                                revokingId !== null
                              }
                              title="Permanently delete certificate"
                            >
                              <Trash2 size={15} />

                              <span>
                                {String(deletingId) ===
                                String(certificate.id)
                                  ? "Deleting..."
                                  : "Delete"}
                              </span>
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-table-hint">
              ← Swipe horizontally to view all certificate details →
            </div>
          </div>
        )}

        {/* COUNT */}
        {certificates.length > 0 && (
          <div className="certificate-count">
            Showing <strong>{certificates.length}</strong>{" "}
            certificate
            {certificates.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* REVOKE CONFIRMATION MODAL */}
      {revokeTarget && (
        <div
          className="revoke-modal-overlay"
          onClick={closeRevokeModal}
        >
          <div
            className="revoke-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="revoke-modal-header">
              <div className="revoke-modal-icon">
                <AlertTriangle size={23} />
              </div>

              <button
                type="button"
                className="revoke-modal-close"
                onClick={closeRevokeModal}
                disabled={revokingId !== null}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <h2 id="revoke-modal-title">
              Confirm Certificate Revocation
            </h2>

            <p className="revoke-modal-description">
              Are you sure you want to revoke this certificate?
              This action cannot be undone.
            </p>

            <div className="revoke-certificate-details">
              <div>
                <span>Certificate No.</span>
                <strong>
                  {revokeTarget.certificate_no || "—"}
                </strong>
              </div>

              <div>
                <span>Recipient</span>
                <strong>
                  {revokeTarget.recipient_name || "—"}
                </strong>
              </div>

              <div>
                <span>Course</span>
                <strong>
                  {revokeTarget.course_name || "—"}
                </strong>
              </div>
            </div>

            <label className="revoke-reason-field">
              <span>Reason (optional, sent to the employee)</span>
              <textarea
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="e.g. Issued with incorrect course details."
                disabled={revokingId !== null}
              />
            </label>

            <label className="revoke-deactivate-option">
              <input
                type="checkbox"
                checked={deactivateEmployee}
                onChange={(event) =>
                  setDeactivateEmployee(event.target.checked)
                }
                disabled={revokingId !== null}
              />

              <span className="revoke-checkbox-content">
                <strong>
                  Also deactivate this employee's account
                </strong>

                <small>
                  The employee will lose access to the Certificate Portal.
                </small>
              </span>
            </label>

            <div className="revoke-modal-actions">
              <button
                type="button"
                className="revoke-cancel-btn"
                onClick={closeRevokeModal}
                disabled={revokingId !== null}
              >
                Cancel
              </button>

              <button
                type="button"
                className="revoke-confirm-btn"
                onClick={confirmRevoke}
                disabled={revokingId !== null}
              >
                <Ban size={16} />

                {revokingId !== null
                  ? "Revoking..."
                  : "Revoke Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE OTP VERIFICATION MODAL */}
      {deleteTarget && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="delete-modal-close"
              onClick={closeDeleteModal}
              disabled={
                sendingDeleteOtp || verifyingDeleteOtp
              }
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="delete-modal-icon">
              <AlertTriangle size={28} />
            </div>

            <h2 id="delete-modal-title">
              Verify Certificate Deletion
            </h2>

            <p>
              {sendingDeleteOtp
                ? "Sending a verification OTP to your registered admin email..."
                : deleteChallengeId
                  ? "A verification OTP has been sent to your registered admin email. Enter it below to permanently delete this certificate."
                  : "Preparing your certificate deletion verification..."}
            </p>

            {/* DELETE SUCCESS */}
            {deleteSuccess && (
              <div className="certificate-success">
                <p>{deleteSuccess}</p>
              </div>
            )}

            {/* DELETE ERROR */}
            {deleteError && (
              <div className="certificate-error">
                <p>{deleteError}</p>
              </div>
            )}

            {/* CERTIFICATE DETAILS */}
            <div className="delete-certificate-details">
              <p>
                <strong>Certificate:</strong>{" "}
                {deleteTarget.certificate_no ||
                  `#${deleteTarget.id}`}
              </p>

              <p>
                <strong>Recipient:</strong>{" "}
                {deleteTarget.recipient_name || "N/A"}
              </p>

              <p>
                <strong>Course:</strong>{" "}
                {deleteTarget.course_name || "N/A"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`delete-status ${deleteTarget.status}`}
                >
                  {deleteTarget.status || "N/A"}
                </span>
              </p>
            </div>

            {/* OTP INPUT */}
            <label htmlFor="delete-certificate-otp">
              Enter 6-digit OTP
            </label>

            <input
              id="delete-certificate-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Enter OTP"
              value={deleteOtp}
              onChange={(event) => {
                setDeleteOtp(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                );
                setDeleteError("");
              }}
              disabled={
                sendingDeleteOtp ||
                verifyingDeleteOtp ||
                !deleteChallengeId
              }
            />

            <p className="delete-otp-expiry">
              OTP expires in 5 minutes. Maximum 5 attempts.
            </p>

            {/* MODAL ACTIONS */}
            <div className="delete-modal-actions">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={
                  sendingDeleteOtp || verifyingDeleteOtp
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  sendingDeleteOtp ||
                  verifyingDeleteOtp ||
                  !deleteChallengeId ||
                  deleteOtp.length !== 6
                }
              >
                {sendingDeleteOtp
                  ? "Sending OTP..."
                  : verifyingDeleteOtp
                    ? "Verifying..."
                    : "Verify & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
