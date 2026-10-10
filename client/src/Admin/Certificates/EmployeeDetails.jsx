import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
} from "lucide-react";

import "./EmployeeDetails.css";

const API_URL = "/api";

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEmployee() {
    if (!id) {
      setError("Employee ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/employees/${encodeURIComponent(id)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Unable to load employee details. (${response.status})`
        );
      }

      if (!data?.success && !data?.employee) {
        throw new Error(
          data?.message || "Employee details could not be loaded."
        );
      }

      setEmployee(data.employee || data);
    } catch (err) {
      console.error("Employee details error:", err);

      setError(
        err?.message ||
          "Something went wrong while loading employee details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const certificates = useMemo(() => {
    if (!employee) return [];

    if (Array.isArray(employee.certificates)) {
      return employee.certificates;
    }

    return [];
  }, [employee]);

  const certificateStats = useMemo(() => {
    const total = certificates.length;

    const issued = certificates.filter(
      (certificate) =>
        String(certificate?.status || "").toLowerCase() === "issued"
    ).length;

    const revoked = certificates.filter(
      (certificate) =>
        String(certificate?.status || "").toLowerCase() === "revoked"
    ).length;

    return {
      total,
      issued,
      revoked,
    };
  }, [certificates]);

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatus(employeeData) {
    return employeeData?.is_active === false
      ? "Inactive"
      : "Active";
  }

  function getCertificateStatus(certificate) {
    const status = String(
      certificate?.status || ""
    ).toLowerCase();

    if (status === "revoked") {
      return "Revoked";
    }

    if (status === "issued") {
      return "Issued";
    }

    return certificate?.status || "Unknown";
  }

  function viewCertificate(certificate) {
    if (!certificate?.id) return;

    navigate(`/admin/certificates/${certificate.id}`);
  }

  function getCertificateNumber(certificate) {
    return (
      certificate?.certificate_no ||
      certificate?.certificateNo ||
      "—"
    );
  }

  function getCourseName(certificate) {
    return (
      certificate?.course_name ||
      certificate?.courseName ||
      "—"
    );
  }

  function getIssueDate(certificate) {
    return (
      certificate?.issue_date ||
      certificate?.issueDate ||
      null
    );
  }

  if (loading) {
    return (
      <div className="employee-details-page employee-details-loading">
        <Loader2
          size={38}
          className="animate-spin text-cyan-400"
        />

        <p>
          Loading employee details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employee-details-page">
        <div className="employee-details-container">

          <button
            type="button"
            onClick={() => navigate("/admin/employees")}
            className="employee-back-button"
          >
            <ArrowLeft size={17} />
            Back to Employee Management
          </button>

          <div className="employee-error-card">
            <div className="employee-error-icon">
              <AlertCircle size={28} />
            </div>

            <h2>
              Unable to load employee
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={loadEmployee}
              className="employee-retry-button"
            >
              <RefreshCw size={17} />
              Try Again
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="employee-details-page">
        <div className="employee-details-container">

          <button
            type="button"
            onClick={() => navigate("/admin/employees")}
            className="employee-back-button"
          >
            <ArrowLeft size={17} />
            Back to Employee Management
          </button>

          <div className="employee-error-card">
            <div className="employee-error-icon">
              <AlertCircle size={28} />
            </div>

            <h2>
              Employee not found
            </h2>

            <p>
              No employee account was found for ID {id}.
            </p>
          </div>

        </div>
      </div>
    );
  }

  const status = getStatus(employee);
  const isActive = employee?.is_active !== false;

  return (
    <div className="employee-details-page">

      <div className="employee-details-container">

        {/* =========================================
            TOP NAVIGATION
        ========================================== */}

        <div className="employee-details-topbar">

          <button
            type="button"
            onClick={() => navigate("/admin/employees")}
            className="employee-back-button"
          >
            <ArrowLeft size={17} />
            Back to Employee Management
          </button>

          <button
            type="button"
            onClick={loadEmployee}
            className="employee-refresh-button"
            title="Refresh employee details"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

        </div>


        {/* =========================================
            PAGE HEADER
        ========================================== */}

        <div className="employee-details-header">

          <div>
            <div className="employee-details-label">
              <ShieldCheck size={17} />
              ADMIN / EMPLOYEE MANAGEMENT
            </div>

            <h1>
              Employee Details
            </h1>

            <p>
              View registered employee information and
              certificate activity.
            </p>
          </div>

          <div
            className={`employee-status-badge ${
              isActive
                ? "employee-status-active"
                : "employee-status-inactive"
            }`}
          >
            {isActive ? (
              <UserCheck size={17} />
            ) : (
              <UserX size={17} />
            )}

            {status}
          </div>

        </div>


        {/* =========================================
            EMPLOYEE PROFILE
        ========================================== */}

        <section className="employee-profile-card">

          <div className="employee-profile-heading">

            <div className="employee-profile-avatar">
              <User size={28} />
            </div>

            <div>
              <h2>
                {employee.name || "Unnamed Employee"}
              </h2>

              <p>
                Employee ID: {employee.id}
              </p>
            </div>

          </div>


          <div className="employee-profile-grid">

            {/* EMAIL */}

            <div className="employee-info-item">

              <div className="employee-info-icon">
                <Mail size={19} />
              </div>

              <div>
                <span>
                  Email Address
                </span>

                <strong>
                  {employee.email || "—"}
                </strong>
              </div>

            </div>


            {/* EMPLOYEE ID */}

            <div className="employee-info-item">

              <div className="employee-info-icon">
                <User size={19} />
              </div>

              <div>
                <span>
                  Employee ID
                </span>

                <strong>
                  #{employee.id}
                </strong>
              </div>

            </div>


            {/* STATUS */}

            <div className="employee-info-item">

              <div className="employee-info-icon">
                {isActive ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <UserX size={19} />
                )}
              </div>

              <div>
                <span>
                  Account Status
                </span>

                <strong>
                  {status}
                </strong>
              </div>

            </div>


            {/* REGISTERED DATE */}

            <div className="employee-info-item">

              <div className="employee-info-icon">
                <CalendarDays size={19} />
              </div>

              <div>
                <span>
                  Registered On
                </span>

                <strong>
                  {formatDate(employee.created_at)}
                </strong>
              </div>

            </div>

          </div>

        </section>


        {/* =========================================
            CERTIFICATE SUMMARY
        ========================================== */}

        <section className="employee-certificate-summary">

          <div className="employee-summary-card">

            <div className="employee-summary-icon">
              <Award size={22} />
            </div>

            <div>
              <span>
                Total Certificates
              </span>

              <strong>
                {certificateStats.total}
              </strong>
            </div>

          </div>

<button
  type="button"
  onClick={() =>
    navigate(
      `/admin/certificates/create?requestId=${request.id}`
    )
  }
>
  Issue
</button>


          <div className="employee-summary-card">

            <div className="employee-summary-icon employee-revoked-icon">
              <ShieldCheck size={22} />
            </div>

            <div>
              <span>
                Revoked
              </span>

              <strong>
                {certificateStats.revoked}
              </strong>
            </div>

          </div>

        </section>


        {/* =========================================
            CERTIFICATES
        ========================================== */}

        <section className="employee-certificates-section">

          <div className="employee-section-header">

            <div>
              <h2>
                Employee Certificates
              </h2>

              <p>
                Certificates associated with this employee account.
              </p>
            </div>

            <div className="employee-certificate-count">
              {certificates.length}
              {" "}
              {certificates.length === 1
                ? "Certificate"
                : "Certificates"}
            </div>

          </div>


          {certificates.length === 0 ? (
            <div className="employee-empty-certificates">

              <div className="employee-empty-icon">
                <Award size={28} />
              </div>

              <h3>
                No certificates found
              </h3>

              <p>
                This employee does not have any certificates
                associated with their account yet.
              </p>

            </div>
          ) : (

            <>

              {/* =====================================
                  DESKTOP TABLE
              ====================================== */}

              <div className="employee-certificates-table-wrapper">

                <table className="employee-certificates-table">

                  <thead>
                    <tr>

                      <th>
                        Certificate
                      </th>

                      <th>
                        Course
                      </th>

                      <th>
                        Issue Date
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {certificates.map((certificate) => {

                      const certificateStatus =
                        getCertificateStatus(
                          certificate
                        );

                      const issued =
                        certificateStatus.toLowerCase() ===
                        "issued";

                      return (
                        <tr key={certificate.id}>

                          <td>
                            <div className="certificate-number-cell">

                              <div className="certificate-icon">
                                <Award size={17} />
                              </div>

                              <div>
                                <strong>
                                  {getCertificateNumber(
                                    certificate
                                  )}
                                </strong>

                                <span>
                                  ID: {certificate.id}
                                </span>
                              </div>

                            </div>
                          </td>


                          <td>
                            <span className="certificate-course">
                              {getCourseName(
                                certificate
                              )}
                            </span>
                          </td>


                          <td>
                            <span className="certificate-date">
                              {formatDate(
                                getIssueDate(
                                  certificate
                                )
                              )}
                            </span>
                          </td>


                          <td>

                            <span
                              className={`certificate-status ${
                                issued
                                  ? "certificate-status-issued"
                                  : "certificate-status-revoked"
                              }`}
                            >

                              {issued ? (
                                <CheckCircle2 size={15} />
                              ) : (
                                <ShieldCheck size={15} />
                              )}

                              {certificateStatus}

                            </span>

                          </td>


                          <td>

                            <button
                              type="button"
                              onClick={() =>
                                viewCertificate(
                                  certificate
                                )
                              }
                              className="certificate-view-button"
                            >
                              <Eye size={16} />
                              View
                            </button>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>


              {/* =====================================
                  MOBILE CERTIFICATE CARDS
              ====================================== */}

              <div className="employee-certificates-mobile">

                {certificates.map((certificate) => {

                  const certificateStatus =
                    getCertificateStatus(
                      certificate
                    );

                  const issued =
                    certificateStatus.toLowerCase() ===
                    "issued";

                  return (
                    <div
                      key={certificate.id}
                      className="employee-certificate-mobile-card"
                    >

                      <div className="mobile-certificate-header">

                        <div className="certificate-number-cell">

                          <div className="certificate-icon">
                            <Award size={17} />
                          </div>

                          <div>
                            <strong>
                              {getCertificateNumber(
                                certificate
                              )}
                            </strong>

                            <span>
                              Certificate ID: {certificate.id}
                            </span>
                          </div>

                        </div>


                        <span
                          className={`certificate-status ${
                            issued
                              ? "certificate-status-issued"
                              : "certificate-status-revoked"
                          }`}
                        >
                          {certificateStatus}
                        </span>

                      </div>


                      <div className="mobile-certificate-info">

                        <div>
                          <span>
                            Course
                          </span>

                          <strong>
                            {getCourseName(
                              certificate
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Issue Date
                          </span>

                          <strong>
                            {formatDate(
                              getIssueDate(
                                certificate
                              )
                            )}
                          </strong>
                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          viewCertificate(
                            certificate
                          )
                        }
                        className="mobile-certificate-view-button"
                      >
                        <Eye size={17} />
                        View Certificate
                      </button>

                    </div>
                  );
                })}

              </div>

            </>
          )}

        </section>


        {/* =========================================
            FOOTER INFORMATION
        ========================================== */}

        <div className="employee-details-footer">

          <div>
            <ShieldCheck size={16} />

            <span>
              Employee accounts are created through
              employee registration.
            </span>
          </div>

          <Link to="/admin/employees">
            View All Employees
          </Link>

        </div>

      </div>

    </div>
  );
}