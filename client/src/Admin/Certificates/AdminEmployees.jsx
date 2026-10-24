import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminEmployees.css";

import {
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  UserCheck,
  UserX,
  CalendarDays,
  Search,
  Eye,
  ShieldCheck,
  Filter,
} from "lucide-react";

import { apiRequest } from "../../services/api";
import BackButton from "../../components/BackButton";

export default function AdminEmployees() {
    const navigate = useNavigate();
  // =========================================================
  // STATE
  // =========================================================

  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");


  
  // =========================================================
  // LOAD EMPLOYEES
  // =========================================================


  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/admin/employees", {
        method: "GET",
      });

      console.log(
        "========== ADMIN EMPLOYEES =========="
      );

      console.log("FULL RESPONSE:", data);

      console.log("EMPLOYEES:", data?.employees);

      console.log(
        "EMPLOYEE COUNT:",
        data?.employees?.length
      );

      console.log(
        "===================================="
      );

      const employeeList = Array.isArray(data?.employees)
        ? data.employees
        : Array.isArray(data)
        ? data
        : [];

      setEmployees(employeeList);
    } catch (error) {
      console.error(
        "Load employees error:",
        error
      );

      setEmployees([]);

      setError(
        error?.message ||
          "Unable to load employees."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  // =========================================================
  // EMPLOYEE HELPERS
  // =========================================================

  function getEmployeeName(employee) {
    return (
      employee?.name ||
      employee?.employee_name ||
      employee?.employeeName ||
      "Unknown Employee"
    );
  }

  function getEmployeeEmail(employee) {
    return (
      employee?.email ||
      employee?.employee_email ||
      employee?.employeeEmail ||
      "—"
    );
  }

  function getEmployeeId(employee) {
    return employee?.id ?? "—";
  }

  function isEmployeeActive(employee) {
    return (
      employee?.is_active === true ||
      employee?.isActive === true
    );
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  const activeCount = useMemo(() => {
    return employees.filter((employee) =>
      isEmployeeActive(employee)
    ).length;
  }, [employees]);

  const inactiveCount = useMemo(() => {
    return employees.length - activeCount;
  }, [employees, activeCount]);

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredEmployees = useMemo(() => {
    const cleanSearch =
      search.trim().toLowerCase();

    return employees.filter((employee) => {
      const name = getEmployeeName(
        employee
      ).toLowerCase();

      const email = getEmployeeEmail(
        employee
      ).toLowerCase();

      const id = String(
        getEmployeeId(employee)
      ).toLowerCase();

      const matchesSearch =
        !cleanSearch ||
        name.includes(cleanSearch) ||
        email.includes(cleanSearch) ||
        id.includes(cleanSearch);

      const active =
        isEmployeeActive(employee);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          active) ||
        (statusFilter === "inactive" &&
          !active);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    employees,
    search,
    statusFilter,
  ]);

  // =========================================================
  // VIEW EMPLOYEE
  // =========================================================

function viewEmployee(employee) {
  const employeeId = employee?.id;

  if (employeeId === undefined || employeeId === null || String(employeeId).trim() === "") {
    console.error("Missing employee ID:", employee);
    setError("Unable to open employee details: employee ID is missing.");
    return;
  }

  navigate(`/admin/employees/${encodeURIComponent(String(employeeId))}`);
}
  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-employees-page">
        <div className="admin-employees-container">

          <BackButton
            text="Back to Dashboard"
            to="/admin"
          />

          <div className="employees-message">

            <Loader2
              size={25}
              className="rotate-icon"
            />

            <span>
              Loading employees...
            </span>

          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="admin-employees-page">

      <div className="admin-employees-container">

        {/* ===================================================
            BACK
        =================================================== */}

        <BackButton
          text="Back to Dashboard"
          to="/admin"
        />

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="employees-header">

          <div className="employees-title">

            <div className="employees-title-icon">
              <Users size={30} />
            </div>

            <div>
              <h1>
                Employee Management
              </h1>

              <p>
                Monitor registered employees
                and their certificate activity.
              </p>
            </div>

          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={loadEmployees}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "rotate-icon"
                  : ""
              }
            />

            Refresh
          </button>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="employees-error">

            <AlertCircle size={22} />

            <div className="employees-error-content">

              <strong>
                Unable to load employees
              </strong>

              <p>
                {error}
              </p>

            </div>

            <button
              type="button"
              className="error-retry-btn"
              onClick={loadEmployees}
            >
              Retry
            </button>

          </div>
        )}

        {!error && (
          <>
            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="employee-stats">

              {/* TOTAL */}

              <div className="employee-stat-card">

                <div className="employee-stat-icon total">
                  <Users size={21} />
                </div>

                <div className="employee-stat-content">

                  <span>
                    Total Employees
                  </span>

                  <strong>
                    {employees.length}
                  </strong>

                </div>

              </div>

              {/* ACTIVE */}

              <div className="employee-stat-card">

                <div className="employee-stat-icon active">
                  <UserCheck size={21} />
                </div>

                <div className="employee-stat-content">

                  <span>
                    Active Employees
                  </span>

                  <strong>
                    {activeCount}
                  </strong>

                </div>

              </div>

              {/* INACTIVE */}

              <div className="employee-stat-card">

                <div className="employee-stat-icon inactive">
                  <UserX size={21} />
                </div>

                <div className="employee-stat-content">

                  <span>
                    Inactive Employees
                  </span>

                  <strong>
                    {inactiveCount}
                  </strong>

                </div>

              </div>

            </div>

            {/* =================================================
                SEARCH + FILTER
            ================================================= */}

            <div className="employee-tools">

              <div className="employee-search">

                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search name, email or employee ID..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>

              <div className="employee-filter">

                <Filter size={17} />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <option value="all">
                    All Status
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

              </div>

            </div>

            {/* =================================================
                RESULTS INFO
            ================================================= */}

            <div className="employee-results-info">

              <span>
                Showing{" "}
                <strong>
                  {filteredEmployees.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {employees.length}
                </strong>{" "}
                employees
              </span>

              {(search ||
                statusFilter !==
                  "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "all"
                    );
                  }}
                >
                  Clear filters
                </button>
              )}

            </div>

            {/* =================================================
                EMPLOYEE LIST
            ================================================= */}

            <div className="employees-table-wrapper">

              {employees.length === 0 ? (

                /* =============================================
                   NO EMPLOYEES
                ============================================= */

                <div className="employees-empty">

                  <div className="employees-empty-icon">
                    <Users size={40} />
                  </div>

                  <h3>
                    No Registered Employees
                  </h3>

                  <p>
                    There are currently no
                    registered employee accounts.
                  </p>

                  <button
                    type="button"
                    className="refresh-btn"
                    onClick={loadEmployees}
                  >
                    <RefreshCw size={16} />
                    Refresh Employees
                  </button>

                </div>

              ) : filteredEmployees.length ===
                0 ? (

                /* =============================================
                   NO SEARCH RESULT
                ============================================= */

                <div className="employees-empty">

                  <div className="employees-empty-icon">
                    <Search size={38} />
                  </div>

                  <h3>
                    No Employees Found
                  </h3>

                  <p>
                    Try changing your search
                    or status filter.
                  </p>

                  <button
                    type="button"
                    className="refresh-btn"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter(
                        "all"
                      );
                    }}
                  >
                    Clear Filters
                  </button>

                </div>

              ) : (

                <>
                  {/* =========================================
                      DESKTOP TABLE
                  ========================================= */}

                  <div className="employees-table-scroll">

                    <table className="employees-table">

                      <thead>

                        <tr>

                          <th>
                            Employee
                          </th>

                          <th>
                            Email
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Registered
                          </th>

                          <th>
                            Action
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {filteredEmployees.map(
                          (
                            employee,
                            index
                          ) => {

                            const name =
                              getEmployeeName(
                                employee
                              );

                            const email =
                              getEmployeeEmail(
                                employee
                              );

                            const active =
                              isEmployeeActive(
                                employee
                              );

                            return (
                              <tr
                                key={
                                  employee?.id ||
                                  `employee-${index}`
                                }
                              >

                                {/* EMPLOYEE */}

                                <td>

                                  <div className="employee-name">

                                    <div className="employee-avatar">
                                      {name
                                        .charAt(
                                          0
                                        )
                                        .toUpperCase()}
                                    </div>

                                    <div className="employee-name-content">

                                      <strong>
                                        {name}
                                      </strong>

                                      <span>
                                        ID #
                                        {employee?.id ??
                                          "—"}
                                      </span>

                                    </div>

                                  </div>

                                </td>

                                {/* EMAIL */}

                                <td>

                                  <div className="employee-email">

                                    <Mail
                                      size={15}
                                    />

                                    <span>
                                      {email}
                                    </span>

                                  </div>

                                </td>

                                {/* STATUS */}

                                <td>

                                  <span
                                    className={
                                      active
                                        ? "status active"
                                        : "status inactive"
                                    }
                                  >

                                    <span className="status-dot" />

                                    {active
                                      ? "Active"
                                      : "Inactive"}

                                  </span>

                                </td>

                                {/* DATE */}

                                <td>

                                  <div className="employee-created">

                                    <CalendarDays
                                      size={14}
                                    />

                                    <span>
                                      {formatDate(
                                        employee?.created_at ||
                                          employee?.createdAt
                                      )}
                                    </span>

                                  </div>

                                </td>

                                {/* ACTION */}

                                <td>

                                  <button
                                    type="button"
                                    className="view-employee-btn"
                                    onClick={() =>
                                      viewEmployee(
                                        employee
                                      )
                                    }
                                  >

                                    <Eye
                                      size={16}
                                    />

                                    View

                                  </button>

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* =========================================
                      MOBILE CARDS
                  ========================================= */}

                  <div className="employee-mobile-list">

                    {filteredEmployees.map(
                      (
                        employee,
                        index
                      ) => {

                        const name =
                          getEmployeeName(
                            employee
                          );

                        const email =
                          getEmployeeEmail(
                            employee
                          );

                        const active =
                          isEmployeeActive(
                            employee
                          );

                        return (
                          <div
                            className="employee-mobile-card"
                            key={
                              employee?.id ||
                              `mobile-${index}`
                            }
                          >

                            <div className="mobile-employee-top">

                              <div className="employee-name">

                                <div className="employee-avatar">
                                  {name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div className="employee-name-content">

                                  <strong>
                                    {name}
                                  </strong>

                                  <span>
                                    ID #
                                    {employee?.id ??
                                      "—"}
                                  </span>

                                </div>

                              </div>

                              <span
                                className={
                                  active
                                    ? "status active"
                                    : "status inactive"
                                }
                              >
                                <span className="status-dot" />
                                {active
                                  ? "Active"
                                  : "Inactive"}
                              </span>

                            </div>

                            <div className="mobile-employee-details">

                              <div>
                                <Mail size={15} />
                                <span>
                                  {email}
                                </span>
                              </div>

                              <div>
                                <CalendarDays
                                  size={15}
                                />
                                <span>
                                  Registered{" "}
                                  {formatDate(
                                    employee?.created_at ||
                                      employee?.createdAt
                                  )}
                                </span>
                              </div>

                            </div>

                            <button
                              type="button"
                              className="mobile-view-btn"
                              onClick={() =>
                                viewEmployee(
                                  employee
                                )
                              }
                            >
                              <Eye size={16} />
                              View Employee
                            </button>

                          </div>
                        );
                      }
                    )}

                  </div>
                </>
              )}

            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            {employees.length > 0 && (
              <div className="employees-footer">

                <div>
                  <UserCheck size={17} />

                  <span>
                    {activeCount} active
                  </span>
                </div>

                <div>
                  <UserX size={17} />

                  <span>
                    {inactiveCount} inactive
                  </span>
                </div>

                <div>
                  <ShieldCheck size={17} />

                  <span>
                    Employee accounts are
                    managed through registration.
                  </span>
                </div>

              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}