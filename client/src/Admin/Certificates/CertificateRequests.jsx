import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./CertificateRequests.css";

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const certificateTypeLabel = (type) => {
  if (type === "CERT") return "Certificate";
  if (type === "INTR") return "Internship";

  return type || "—";
};

const statusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "issued") return "Issued";
  if (status === "rejected") return "Rejected";

  return status || "Unknown";
};

export default function CertificateRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("pending");

  const [selectedRequest, setSelectedRequest] =
    useState(null);

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [showIssueModal, setShowIssueModal] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  /* =========================================================
     LOAD REQUESTS
  ========================================================= */

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/admin/certificate-requests"
      );

      const list = Array.isArray(data?.requests)
        ? data.requests
        : [];

      setRequests(list);
    } catch (error) {
      console.error(
        "Load certificate requests error:",
        error
      );

      setError(
        error?.message ||
          "Unable to load certificate requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* =========================================================
     COUNTS
  ========================================================= */

  const counts = useMemo(
    () => ({
      pending: requests.filter(
        (request) =>
          request.status === "pending"
      ).length,

      issued: requests.filter(
        (request) =>
          request.status === "issued"
      ).length,

      rejected: requests.filter(
        (request) =>
          request.status === "rejected"
      ).length,
    }),
    [requests]
  );

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === activeTab
      ),
    [requests, activeTab]
  );

  /* =========================================================
     OPEN REJECT MODAL
  ========================================================= */

  const openRejectModal = (request) => {
    if (!request?.id) {
      setError(
        "Invalid certificate request."
      );
      return;
    }

    setSelectedRequest(request);
    setRejectionReason("");
    setActionMessage("");
    setShowRejectModal(true);
  };

  /* =========================================================
     OPEN ISSUE MODAL
  ========================================================= */

  const openIssueModal = (request) => {
    const requestId = Number(
      request?.id
    );

    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      setError(
        "Invalid certificate request ID."
      );
      return;
    }

    setSelectedRequest(request);
    setActionMessage("");
    setShowIssueModal(true);
  };

  /* =========================================================
     CLOSE MODALS
  ========================================================= */

  const closeModals = () => {
    if (actionLoading) return;

    setShowRejectModal(false);
    setShowIssueModal(false);
    setSelectedRequest(null);
    setRejectionReason("");
    setActionMessage("");
  };

  /* =========================================================
     REJECT REQUEST
  ========================================================= */

  const rejectRequest = async () => {
    if (!selectedRequest) {
      setActionMessage(
        "No request selected."
      );
      return;
    }

    const requestId = Number(
      selectedRequest.id
    );

    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      setActionMessage(
        "Invalid certificate request ID."
      );
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      setActionMessage(
        "Please enter a rejection reason."
      );
      return;
    }

    try {
      setActionLoading(true);
      setActionMessage("");

      await apiRequest(
        `/admin/certificate-requests/${encodeURIComponent(
          requestId
        )}/reject`,
        {
          method: "PATCH",
          body: JSON.stringify({
            rejectionReason: reason,
          }),
        }
      );

      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");

      await loadRequests();

      setActiveTab("rejected");
    } catch (error) {
      console.error(
        "Reject request error:",
        error
      );

      setActionMessage(
        error?.message ||
          "Unable to reject request."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     CONTINUE TO CREATE CERTIFICATE
  ========================================================= */

  const continueToCreateCertificate =
    () => {
      console.log(
        "🟦 Continue clicked"
      );

      console.log(
        "🟦 Selected request:",
        selectedRequest
      );

      if (!selectedRequest) {
        setActionMessage(
          "No certificate request is selected."
        );
        return;
      }

      const requestId = Number(
        selectedRequest.id
      );

      console.log(
        "🟦 Request ID:",
        requestId
      );

      if (
        !Number.isInteger(requestId) ||
        requestId <= 0
      ) {
        setActionMessage(
          "Invalid certificate request ID."
        );
        return;
      }

      const url =
        `/admin/certificates/create?requestId=${encodeURIComponent(
          requestId
        )}`;

      console.log(
        "🟢 Navigating:",
        url
      );

      setShowIssueModal(false);

      navigate(url);
    };

  /* =========================================================
     VIEW CERTIFICATE
  ========================================================= */

  const viewCertificate = (
    request
  ) => {
    const certificateId = Number(
      request?.certificate_id
    );

    if (
      !Number.isInteger(certificateId) ||
      certificateId <= 0
    ) {
      console.error(
        "Invalid certificate ID:",
        request?.certificate_id
      );

      return;
    }

    navigate(
      `/admin/certificates/${certificateId}`
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="certificate-requests-page">

      {/* HEADER */}

      <div className="certificate-requests-header">

        <div>
          <h1>
            Certificate Requests
          </h1>

          <p>
            Review employee certificate
            requests and issue or reject
            certificates.
          </p>
        </div>

        <button
          type="button"
          className="certificate-refresh-btn"
          onClick={loadRequests}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="certificate-request-error">
          {error}
        </div>
      )}

      {/* TABS */}

      <div className="certificate-request-tabs">

        <button
          type="button"
          className={
            activeTab === "pending"
              ? "request-tab active"
              : "request-tab"
          }
          onClick={() =>
            setActiveTab("pending")
          }
        >
          <span>
            Pending
          </span>

          <strong>
            {counts.pending}
          </strong>
        </button>

        <button
          type="button"
          className={
            activeTab === "issued"
              ? "request-tab active"
              : "request-tab"
          }
          onClick={() =>
            setActiveTab("issued")
          }
        >
          <span>
            Issued
          </span>

          <strong>
            {counts.issued}
          </strong>
        </button>

        <button
          type="button"
          className={
            activeTab === "rejected"
              ? "request-tab active"
              : "request-tab"
          }
          onClick={() =>
            setActiveTab("rejected")
          }
        >
          <span>
            Rejected
          </span>

          <strong>
            {counts.rejected}
          </strong>
        </button>

      </div>

      {/* LOADING */}

      {loading ? (
        <div className="certificate-request-loading">
          <div className="certificate-spinner" />

          <p>
            Loading certificate requests...
          </p>
        </div>
      ) : filteredRequests.length ===
        0 ? (

        <div className="certificate-request-empty">

          <div className="empty-icon">
            {activeTab === "pending"
              ? "📋"
              : activeTab === "issued"
              ? "✓"
              : "✕"}
          </div>

          <h2>
            No{" "}
            {statusLabel(
              activeTab
            ).toLowerCase()}{" "}
            requests
          </h2>

          <p>
            There are currently no
            certificate requests in this
            category.
          </p>

        </div>

      ) : (

        <div className="certificate-request-list">

          {filteredRequests.map(
            (request) => {

              const requestId =
                Number(request.id);

              const validRequestId =
                Number.isInteger(
                  requestId
                ) &&
                requestId > 0;

              return (
                <div
                  className="certificate-request-card"
                  key={request.id}
                >

                  {/* TOP */}

                  <div className="certificate-request-card-top">

                    <span
                      className={`request-status ${request.status}`}
                    >
                      <span className="status-dot" />

                      {statusLabel(
                        request.status
                      )}
                    </span>

                    <span className="request-id">
                      Request #{request.id}
                    </span>

                  </div>

                  {/* BODY */}

                  <div className="certificate-request-body">

                    {/* EMPLOYEE */}

                    <div className="employee-request-info">

                      <div className="employee-avatar">
                        {(
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

                    {/* DETAILS */}

                    <div className="request-details-grid">

                      <div className="request-detail">
                        <span>
                          Certificate Type
                        </span>

                        <strong>
                          {certificateTypeLabel(
                            request.certificate_type
                          )}
                        </strong>
                      </div>

                      <div className="request-detail">
                        <span>
                          Course / Program
                        </span>

                        <strong>
                          {request.course_name ||
                            "—"}
                        </strong>
                      </div>

                      <div className="request-detail">
                        <span>
                          Requested On
                        </span>

                        <strong>
                          {formatDate(
                            request.created_at
                          )}
                        </strong>
                      </div>

                      {request.duration_months && (
                        <div className="request-detail">
                          <span>
                            Duration
                          </span>

                          <strong>
                            {
                              request.duration_months
                            }{" "}
                            months
                          </strong>
                        </div>
                      )}

                      {request.certificate_no && (
                        <div className="request-detail">
                          <span>
                            Certificate No.
                          </span>

                          <strong>
                            {
                              request.certificate_no
                            }
                          </strong>
                        </div>
                      )}

                    </div>

                    {/* DETAILS */}

                    <div className="request-additional-details">

                      <span>
                        Additional Details
                      </span>

                      <p>
                        {request.additional_details ||
                          "No additional details provided."}
                      </p>

                    </div>

                    {/* REJECTION */}

                    {request.rejection_reason && (
                      <div className="rejection-reason-box">

                        <span>
                          Rejection Reason
                        </span>

                        <p>
                          {
                            request.rejection_reason
                          }
                        </p>

                      </div>
                    )}

                  </div>

                  {/* FOOTER */}

                  <div className="certificate-request-card-footer">

                    {request.status ===
                      "pending" && (
                      <>

                        <button
                          type="button"
                          className="reject-request-btn"
                          onClick={() =>
                            openRejectModal(
                              request
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          Reject Request
                        </button>

                        <button
                          type="button"
                          className="issue-request-btn"
                          onClick={() =>
                            openIssueModal(
                              request
                            )
                          }
                          disabled={
                            !validRequestId ||
                            actionLoading
                          }
                        >
                          Issue Certificate
                        </button>

                      </>
                    )}

                    {request.status ===
                      "rejected" && (
                      <div className="request-final-status rejected-final">
                        <span>✕</span>
                        Request Rejected
                      </div>
                    )}

                    {request.status ===
                      "issued" && (
                      <>

                        <div className="request-final-status issued-final">
                          <span>✓</span>
                          Certificate Issued
                        </div>

                        <button
                          type="button"
                          className="view-certificate-btn"
                          onClick={() =>
                            viewCertificate(
                              request
                            )
                          }
                        >
                          View Certificate
                        </button>

                      </>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

      {/* =====================================================
          REJECT MODAL
      ===================================================== */}

      {showRejectModal &&
        selectedRequest && (
          <div
            className="certificate-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                !actionLoading
              ) {
                closeModals();
              }
            }}
          >

            <div className="certificate-modal">

              <div className="certificate-modal-header">

                <div>
                  <h2>
                    Reject Certificate Request
                  </h2>

                  <p>
                    Request #
                    {selectedRequest.id}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeModals}
                  disabled={actionLoading}
                >
                  ×
                </button>

              </div>

              <div className="certificate-modal-content">

                <label htmlFor="rejectionReason">
                  Rejection Reason
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  placeholder="Enter the reason for rejecting this request..."
                  rows={5}
                  maxLength={2000}
                />

                <div className="textarea-counter">
                  {
                    rejectionReason.length
                  }
                  /2000
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
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modal-reject-btn"
                  onClick={rejectRequest}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Rejecting..."
                    : "Reject Request"}
                </button>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          ISSUE MODAL
      ===================================================== */}

      {showIssueModal &&
        selectedRequest && (
          <div
            className="certificate-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                !actionLoading
              ) {
                closeModals();
              }
            }}
          >

            <div className="certificate-modal">

              <div className="certificate-modal-header">

                <div>
                  <h2>
                    Create Certificate
                  </h2>

                  <p>
                    Request #
                    {selectedRequest.id}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeModals}
                >
                  ×
                </button>

              </div>

              <div className="certificate-modal-content">

                <div className="issue-summary">

                  <div>
                    <span>
                      Employee
                    </span>

                    <strong>
                      {selectedRequest.employee_name ||
                        selectedRequest.employeeName ||
                        "Unknown Employee"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedRequest.employee_email ||
                        selectedRequest.employeeEmail ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Certificate Type
                    </span>

                    <strong>
                      {certificateTypeLabel(
                        selectedRequest.certificate_type
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Course
                    </span>

                    <strong>
                      {selectedRequest.course_name ||
                        "—"}
                    </strong>
                  </div>

                  {selectedRequest.duration_months && (
                    <div>
                      <span>
                        Duration
                      </span>

                      <strong>
                        {
                          selectedRequest.duration_months
                        }{" "}
                        months
                      </strong>
                    </div>
                  )}

                </div>

                <div className="issue-warning">

                  <p>
                    Continue to the certificate
                    creation page. Employee
                    information will be loaded
                    from this verified request.
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
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modal-issue-btn"
                  onClick={
                    continueToCreateCertificate
                  }
                >
                  Continue to Create Certificate
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}