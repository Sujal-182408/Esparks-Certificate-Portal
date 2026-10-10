import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CertificateRequests.css";

const API_BASE = "/api";

const getToken = () => {
  return localStorage.getItem("adminToken");
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusLabel = (status) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "issued":
      return "Issued";
    case "rejected":
      return "Rejected";
    default:
      return status || "Unknown";
  }
};

const certificateTypeLabel = (type) => {
  if (type === "CERT") return "Certificate";
  if (type === "INTR") return "Internship";
  return type || "—";
};

function CertificateRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("pending");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [issuerName, setIssuerName] = useState("eSparks IT Solutions");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [actionMessage, setActionMessage] = useState("");

  const authHeaders = () => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/admin/certificate-requests`,
        {
          method: "GET",
          credentials: "include",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load certificate requests."
        );
      }

      setRequests(data.requests || []);
    } catch (error) {
      console.error("Load certificate requests error:", error);

      setError(
        error.message || "Unable to load certificate requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (request) => request.status === activeTab
    );
  }, [requests, activeTab]);

  const counts = useMemo(() => {
    return {
      pending: requests.filter(
        (request) => request.status === "pending"
      ).length,

      issued: requests.filter(
        (request) => request.status === "issued"
      ).length,

      rejected: requests.filter(
        (request) => request.status === "rejected"
      ).length,
    };
  }, [requests]);

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setActionMessage("");
    setShowRejectModal(true);
  };

  const openIssueModal = (request) => {
    setSelectedRequest(request);
    setIssuerName("eSparks IT Solutions");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setActionMessage("");
    setShowIssueModal(true);
  };

  const closeModals = () => {
    if (actionLoading) return;

    setShowRejectModal(false);
    setShowIssueModal(false);
    setSelectedRequest(null);
    setRejectionReason("");
    setActionMessage("");
  };

  const rejectRequest = async () => {
    if (!selectedRequest) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setActionMessage("Please provide a rejection reason.");
      return;
    }

    if (reason.length > 2000) {
      setActionMessage(
        "Rejection reason cannot exceed 2000 characters."
      );
      return;
    }

    try {
      setActionLoading(`reject-${selectedRequest.id}`);
      setActionMessage("");

      const response = await fetch(
        `${API_BASE}/admin/certificate-requests/${selectedRequest.id}/reject`,
        {
          method: "PATCH",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify({
            rejectionReason: reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reject certificate request."
        );
      }

      closeModals();

      await loadRequests();

      setActiveTab("rejected");
    } catch (error) {
      console.error("Reject request error:", error);

      setActionMessage(
        error.message || "Unable to reject certificate request."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const issueRequest = async () => {
    if (!selectedRequest) return;

    const cleanIssuerName = issuerName.trim();

    if (!cleanIssuerName) {
      setActionMessage("Issuer name is required.");
      return;
    }

    if (cleanIssuerName.length > 200) {
      setActionMessage("Issuer name is too long.");
      return;
    }

    if (!issueDate) {
      setActionMessage("Issue date is required.");
      return;
    }

    try {
      setActionLoading(`issue-${selectedRequest.id}`);
      setActionMessage("");

      const response = await fetch(
        `${API_BASE}/admin/certificate-requests/${selectedRequest.id}/issue`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify({
            issuerName: cleanIssuerName,
            issueDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to issue certificate."
        );
      }

      closeModals();

      await loadRequests();

      setActiveTab("issued");
    } catch (error) {
      console.error("Issue certificate error:", error);

      setActionMessage(
        error.message || "Unable to issue certificate."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const viewCertificate = (request) => {
    if (!request.certificate_id) {
      return;
    }

    navigate(
      `/admin/certificates/view/${request.certificate_id}`
    );
  };

  return (
    <div className="certificate-requests-page">
      <div className="certificate-requests-header">
        <div>
          <h1>Certificate Requests</h1>

          <p>
            Review employee certificate requests and issue or reject
            certificates.
          </p>
        </div>

        <button
          type="button"
          className="certificate-refresh-btn"
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="certificate-request-error">
          {error}
        </div>
      )}

      <div className="certificate-request-tabs">
        <button
          type="button"
          className={
            activeTab === "pending"
              ? "request-tab active pending-tab"
              : "request-tab"
          }
          onClick={() => setActiveTab("pending")}
        >
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </button>

        <button
          type="button"
          className={
            activeTab === "issued"
              ? "request-tab active issued-tab"
              : "request-tab"
          }
          onClick={() => setActiveTab("issued")}
        >
          <span>Issued</span>
          <strong>{counts.issued}</strong>
        </button>

        <button
          type="button"
          className={
            activeTab === "rejected"
              ? "request-tab active rejected-tab"
              : "request-tab"
          }
          onClick={() => setActiveTab("rejected")}
        >
          <span>Rejected</span>
          <strong>{counts.rejected}</strong>
        </button>
      </div>

      {loading ? (
        <div className="certificate-request-loading">
          <div className="certificate-spinner"></div>
          <p>Loading certificate requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="certificate-request-empty">
          <div className="empty-icon">
            {activeTab === "pending"
              ? "📋"
              : activeTab === "issued"
              ? "✓"
              : "✕"}
          </div>

          <h2>
            No {statusLabel(activeTab).toLowerCase()} requests
          </h2>

          <p>
            There are currently no certificate requests in this
            category.
          </p>
        </div>
      ) : (
        <div className="certificate-request-list">
          {filteredRequests.map((request) => (
            <div
              className="certificate-request-card"
              key={request.id}
            >
              <div className="certificate-request-card-top">
                <div>
                  <span
                    className={`request-status ${request.status}`}
                  >
                    <span className="status-dot"></span>
                    {statusLabel(request.status)}
                  </span>
                </div>

                <span className="request-id">
                  Request #{request.id}
                </span>
              </div>

              <div className="certificate-request-body">
                <div className="employee-request-info">
                  <div className="employee-avatar">
                    {String(
                      request.employee_name ||
                        request.employeeName ||
                        "E"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h2>
                      {request.employee_name ||
                        request.employeeName ||
                        "Unknown Employee"}
                    </h2>

                    <p>
                      {request.employee_email ||
                        request.employeeEmail ||
                        "No email available"}
                    </p>
                  </div>
                </div>

                <div className="request-details-grid">
                  <div className="request-detail">
                    <span>Certificate Type</span>
                    <strong>
                      {certificateTypeLabel(
                        request.certificate_type
                      )}
                    </strong>

                    <small>
                      {request.certificate_type}
                    </small>
                  </div>

                  <div className="request-detail">
                    <span>Course / Program</span>
                    <strong>
                      {request.course_name || "—"}
                    </strong>
                  </div>

                  <div className="request-detail">
                    <span>Requested On</span>
                    <strong>
                      {formatDate(request.created_at)}
                    </strong>
                  </div>

                  {request.certificate_no && (
                    <div className="request-detail">
                      <span>Certificate No.</span>
                      <strong className="certificate-number">
                        {request.certificate_no}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="request-additional-details">
                  <span>Additional Details</span>

                  <p>
                    {request.additional_details ||
                      "No additional details provided."}
                  </p>
                </div>

                {request.rejection_reason && (
                  <div className="rejection-reason-box">
                    <span>Rejection Reason</span>

                    <p>{request.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="certificate-request-card-footer">
                {request.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="reject-request-btn"
                      onClick={() =>
                        openRejectModal(request)
                      }
                      disabled={
                        actionLoading ===
                        `reject-${request.id}`
                      }
                    >
                      Reject Request
                    </button>

                    <button
                      type="button"
                      className="issue-request-btn"
                      onClick={() =>
                        openIssueModal(request)
                      }
                      disabled={
                        actionLoading ===
                        `issue-${request.id}`
                      }
                    >
                      Issue Certificate
                    </button>
                  </>
                )}

                {request.status === "rejected" && (
                  <div className="request-final-status rejected-final">
                    <span>✕</span>
                    Request Rejected
                  </div>
                )}

                {request.status === "issued" && (
                  <>
                    <div className="request-final-status issued-final">
                      <span>✓</span>
                      Certificate Issued
                    </div>

                    <button
                      type="button"
                      className="view-certificate-btn"
                      onClick={() =>
                        viewCertificate(request)
                      }
                    >
                      View Certificate
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================
          REJECT MODAL
      ========================= */}

      {showRejectModal && selectedRequest && (
        <div
          className="certificate-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              closeModals();
            }
          }}
        >
          <div className="certificate-modal">
            <div className="certificate-modal-header">
              <div>
                <span className="modal-danger-icon">!</span>

                <div>
                  <h2>Reject Certificate Request</h2>

                  <p>
                    This request will be marked as rejected.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModals}
                disabled={!!actionLoading}
              >
                ×
              </button>
            </div>

            <div className="certificate-modal-content">
              <div className="modal-request-summary">
                <strong>
                  {selectedRequest.employee_name ||
                    selectedRequest.employeeName}
                </strong>

                <span>
                  {selectedRequest.course_name}
                </span>
              </div>

              <label htmlFor="rejectionReason">
                Rejection Reason
              </label>

              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                placeholder="Enter the reason for rejecting this request..."
                rows="5"
                maxLength="2000"
              />

              <div className="textarea-counter">
                {rejectionReason.length}/2000
              </div>

              {actionMessage && (
                <div className="modal-action-error">
                  {actionMessage}
                </div>
              )}
            </div>

            <div className="certificate-modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeModals}
                disabled={!!actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-reject-btn"
                onClick={rejectRequest}
                disabled={!!actionLoading}
              >
                {actionLoading ===
                `reject-${selectedRequest.id}`
                  ? "Rejecting..."
                  : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          ISSUE MODAL
      ========================= */}

      {showIssueModal && selectedRequest && (
        <div
          className="certificate-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
              closeModals();
            }
          }}
        >
          <div className="certificate-modal">
            <div className="certificate-modal-header">
              <div>
                <span className="modal-success-icon">✓</span>

                <div>
                  <h2>Issue Certificate</h2>

                  <p>
                    Review the information before issuing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModals}
                disabled={!!actionLoading}
              >
                ×
              </button>
            </div>

            <div className="certificate-modal-content">
              <div className="issue-summary">
                <div>
                  <span>Employee</span>
                  <strong>
                    {selectedRequest.employee_name ||
                      selectedRequest.employeeName}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedRequest.employee_email ||
                      selectedRequest.employeeEmail}
                  </strong>
                </div>

                <div>
                  <span>Certificate Type</span>
                  <strong>
                    {selectedRequest.certificate_type}
                  </strong>
                </div>

                <div>
                  <span>Course</span>
                  <strong>
                    {selectedRequest.course_name}
                  </strong>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="issuerName">
                  Issuer Name
                </label>

                <input
                  id="issuerName"
                  type="text"
                  value={issuerName}
                  onChange={(event) =>
                    setIssuerName(event.target.value)
                  }
                  maxLength="200"
                  placeholder="Enter issuer name"
                />
              </div>

              <div className="form-field">
                <label htmlFor="issueDate">
                  Issue Date
                </label>

                <input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(event) =>
                    setIssueDate(event.target.value)
                  }
                />
              </div>

              <div className="issue-warning">
                <span>ⓘ</span>

                <p>
                  The certificate number will be generated
                  automatically by the server. You do not need
                  to enter one manually.
                </p>
              </div>

              {actionMessage && (
                <div className="modal-action-error">
                  {actionMessage}
                </div>
              )}
            </div>

            <div className="certificate-modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeModals}
                disabled={!!actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-issue-btn"
                onClick={issueRequest}
                disabled={!!actionLoading}
              >
                {actionLoading ===
                `issue-${selectedRequest.id}`
                  ? "Issuing..."
                  : "Issue Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CertificateRequests;