
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Clock3,
  Users,
  Ban,
  TrendingDown,
  RefreshCw,
  CalendarDays,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import {
  getAdminCertificateRequests,
  getAdminCertificates,
  getAdminEmployees,
} from "../services/api";
import "./ReportsAnalytics.css";

const getList = (data, keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return Array.isArray(data) ? data : [];
};

const getDate = (item) =>
  item?.created_at || item?.issued_at || item?.issue_date ||
  item?.reviewed_at || item?.updated_at || null;

const getMonthKey = (date) => {
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? null
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatNumber = (number) =>
  new Intl.NumberFormat("en-IN").format(number || 0);


// Each report source: a label for error messages, the shared API helper
// (correct backend URL + admin session cookie), and the response key.
// Defined outside the component so it is created once, not on every render.
const REPORT_SOURCES = [
  { name: "Employees", load: getAdminEmployees, keys: ["employees", "data"] },
  { name: "Certificates", load: getAdminCertificates, keys: ["certificates", "data"] },
  { name: "Certificate Requests", load: getAdminCertificateRequests, keys: ["requests", "data"] },
];

export default function ReportsAnalytics() {
const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [period, setPeriod] = useState("6");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      // The three requests are independent, so run them in parallel.
      // A failure names the source and HTTP status, e.g.
      // "Certificates API failed (401): Admin authentication required."
      const [employeeList, certificateList, requestList] = await Promise.all(
        REPORT_SOURCES.map(async ({ name, load, keys }) => {
          try {
            return getList(await load(), keys);
          } catch (err) {
            throw new Error(
              err.status
                ? `${name} API failed (${err.status}): ${err.message}`
                : `${name}: ${err.message}`,
            );
          }
        }),
      );

      setEmployees(employeeList);
      setCertificates(certificateList);
      setRequests(requestList);
    } catch (err) {
      console.error("Reports analytics error:", err);
      setError(err.message || "Unable to load reports. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadReports();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const months = period === "all" ? null : Number(period);
    const start = months
      ? new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      : null;

    const withinPeriod = (item) => {
      const date = getDate(item);
      if (!date) return false;
      const parsed = new Date(date);
      return !Number.isNaN(parsed.getTime()) &&
        (!start || parsed >= start) &&
        parsed <= now;
    };

    return {
      certificates: certificates.filter(withinPeriod),
      requests: requests.filter(withinPeriod),
      employees: employees.filter(withinPeriod)
    };
  }, [employees, certificates, requests, period]);

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(
      (item) => item.is_active === true || item.is_active === 1
    ).length;

    const pendingRequests = requests.filter(
      (item) => String(item.status).toLowerCase() === "pending"
    ).length;

    const revoked = certificates.filter(
      (item) => String(item.status).toLowerCase() === "revoked"
    ).length;

    const expired = certificates.filter(
      (item) => String(item.status).toLowerCase() === "expired"
    ).length;

    const issued = certificates.filter(
      (item) => String(item.status).toLowerCase() === "issued"
    ).length;

    return {
      totalCertificates: certificates.length,
      pendingRequests,
      activeEmployees,
      revoked,
      expired,
      issued
    };
  }, [employees, certificates, requests]);

  const months = useMemo(() => {
    const count = period === "all" ? 6 : Math.min(Number(period), 12);
    const now = new Date();

    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1);
      return {
        key: getMonthKey(date),
        label: date.toLocaleDateString("en-IN", { month: "short" })
      };
    });
  }, [period]);

  const monthlyCertificates = months.map((month) => ({
    ...month,
    value: filtered.certificates.filter(
      (item) => getMonthKey(getDate(item)) === month.key &&
        String(item.status).toLowerCase() === "issued"
    ).length
  }));

  const monthlyRequests = months.map((month) => {
    const items = filtered.requests.filter(
      (item) => getMonthKey(getDate(item)) === month.key
    );

    return {
      ...month,
      total: items.length,
      approved: items.filter(
        (item) => String(item.status).toLowerCase() === "issued" ||
          String(item.status).toLowerCase() === "approved"
      ).length
    };
  });

  const monthlyEmployees = months.map((month) => ({
    ...month,
    value: filtered.employees.filter(
      (item) => getMonthKey(getDate(item)) === month.key
    ).length
  }));

  const maxCertificates = Math.max(
    1,
    ...monthlyCertificates.map((item) => item.value)
  );

  const maxRequests = Math.max(
    1,
    ...monthlyRequests.map((item) => item.total)
  );

  const maxEmployees = Math.max(
    1,
    ...monthlyEmployees.map((item) => item.value)
  );

  const recentActivity = useMemo(() => {
    const certificateEvents = certificates.map((item) => ({
      id: `certificate-${item.id}`,
      title: `${String(item.status).toLowerCase() === "revoked" ? "Certificate revoked" : "Certificate issued"}`,
      description: item.certificate_no || item.certificate_number || `Certificate #${item.id}`,
      date: getDate(item),
      type: String(item.status).toLowerCase() === "revoked" ? "revoked" : "issued"
    }));

    const requestEvents = requests.map((item) => ({
      id: `request-${item.id}`,
      title: `Certificate request ${String(item.status || "submitted").toLowerCase()}`,
      description: item.course_name || item.certificate_type || `Request #${item.id}`,
      date: getDate(item),
      type: String(item.status).toLowerCase() === "rejected" ? "rejected" : "request"
    }));

    return [...certificateEvents, ...requestEvents]
      .filter((item) => item.date && !Number.isNaN(new Date(item.date).getTime()))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [certificates, requests]);

  const formatRelative = (date) => {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(date).toLocaleDateString("en-IN");
  };

  const statusTotal = stats.issued + stats.revoked + stats.expired;
  const issuedPercent = statusTotal ? (stats.issued / statusTotal) * 100 : 0;
  const revokedPercent = statusTotal ? (stats.revoked / statusTotal) * 100 : 0;

  if (loading) {
    return (
      <main className="reports-loading">
        <LoaderCircle className="reports-loader-icon" size={34} />
        <p>Preparing reports and analytics...</p>
      </main>
    );
  }

  return (
    <main className="reports-page">
         <button
            type="button"
            onClick={() => navigate("/admin")}
            className="employee-back-button"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>
      <div className="reports-background">
        <span className="reports-orb reports-orb-one" />
        <span className="reports-orb reports-orb-two" />
        <span className="reports-grid" />
      </div>

      <div className="reports-container">
        <header className="reports-header">
          <div className="reports-heading">
            <div className="reports-heading-icon">
              <BarChart3 size={27} />
            </div>
            <div>
              <span className="reports-eyebrow">ADMINISTRATION / INSIGHTS</span>
              <h1>Reports & Analytics</h1>
              <p>Monitor certificate portal performance and activity.</p>
            </div>
          </div>

          <div className="reports-header-actions">
            <button
              className="reports-refresh"
              onClick={() => loadReports(true)}
              disabled={refreshing}
              type="button"
            >
              <RefreshCw size={16} className={refreshing ? "is-spinning" : ""} />
              Refresh
            </button>
            <div className="reports-period">
              <CalendarDays size={17} />
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="1">Last Month</option>
                <option value="3">Last 3 Months</option>
                <option value="6">Last 6 Months</option>
                <option value="12">Last 12 Months</option>
                <option value="all">All Available Data</option>
              </select>
            </div>
          </div>
        </header>

        {error && (
          <div className="reports-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => loadReports(true)} type="button">Try again</button>
          </div>
        )}

        <section className="reports-stats-grid">
          <article className="report-stat-card stat-purple">
            <div className="report-stat-top">
              <span>Total Certificates</span>
              <div className="report-stat-icon"><Award size={23} /></div>
            </div>
            <strong>{formatNumber(stats.totalCertificates)}</strong>
            <small><FileText size={13} /> All certificate records</small>
            <div className="report-stat-line" />
          </article>

          <article className="report-stat-card stat-blue">
            <div className="report-stat-top">
              <span>Pending Requests</span>
              <div className="report-stat-icon"><Clock3 size={23} /></div>
            </div>
            <strong>{formatNumber(stats.pendingRequests)}</strong>
            <small><Activity size={13} /> Awaiting admin review</small>
            <div className="report-stat-line" />
          </article>

          <article className="report-stat-card stat-cyan">
            <div className="report-stat-top">
              <span>Active Employees</span>
              <div className="report-stat-icon"><Users size={23} /></div>
            </div>
            <strong>{formatNumber(stats.activeEmployees)}</strong>
            <small><CheckCircle2 size={13} /> Currently active accounts</small>
            <div className="report-stat-line" />
          </article>

          <article className="report-stat-card stat-pink">
            <div className="report-stat-top">
              <span>Revoked Certificates</span>
              <div className="report-stat-icon"><Ban size={23} /></div>
            </div>
            <strong>{formatNumber(stats.revoked)}</strong>
            <small><TrendingDown size={13} /> Invalidated certificates</small>
            <div className="report-stat-line" />
          </article>
        </section>

        <section className="reports-main-grid">
          <article className="reports-panel issuance-panel">
            <div className="reports-panel-heading">
              <div>
                <h2><BarChart3 size={20} /> Certificate Issuance Overview</h2>
                <p>Issued certificates by month</p>
              </div>
              <span className="chart-legend"><i /> Certificates issued</span>
            </div>

            <div className="bar-chart">
              <div className="bar-chart-y">
                {[maxCertificates, Math.ceil(maxCertificates * .75), Math.ceil(maxCertificates * .5), Math.ceil(maxCertificates * .25), 0].map((value, index) => (
                  <span key={index}>{value}</span>
                ))}
              </div>
              <div className="bar-chart-content">
                <div className="bar-chart-gridlines"><i /><i /><i /><i /><i /></div>
                <div className="bar-chart-bars">
                  {monthlyCertificates.map((item) => (
                    <div className="bar-chart-column" key={item.key}>
                      <span className="bar-chart-value">{item.value}</span>
                      <div
                        className="bar-chart-bar"
                        style={{ height: `${(item.value / maxCertificates) * 100}%` }}
                        title={`${item.label}: ${item.value} issued`}
                      />
                      <span className="bar-chart-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="reports-panel status-panel">
            <div className="reports-panel-heading">
              <div>
                <h2><PieChart size={20} /> Certificate Status</h2>
                <p>Current certificate distribution</p>
              </div>
            </div>

            <div className="status-content">
              <div
                className="status-donut"
                style={{
                  background: `conic-gradient(#14d6b0 0% ${issuedPercent}%, #ffbd4a ${issuedPercent}% ${issuedPercent + revokedPercent}%, #a879ff ${issuedPercent + revokedPercent}% 100%)`
                }}
              >
                <div className="status-donut-inner">
                  <strong>{formatNumber(statusTotal)}</strong>
                  <span>Tracked</span>
                </div>
              </div>
              <div className="status-legend">
                <div><i className="legend-issued" /><span>Issued</span><strong>{stats.issued}</strong></div>
                <div><i className="legend-revoked" /><span>Revoked</span><strong>{stats.revoked}</strong></div>
                <div><i className="legend-expired" /><span>Expired</span><strong>{stats.expired}</strong></div>
              </div>
            </div>
          </article>
        </section>

        <section className="reports-bottom-grid">
          <article className="reports-panel monthly-panel">
            <div className="reports-panel-heading">
              <div>
                <h2><Activity size={19} /> Monthly Request Statistics</h2>
                <p>Requests received and approved</p>
              </div>
            </div>
            <div className="monthly-chart">
              {monthlyRequests.map((item) => (
                <div className="monthly-chart-column" key={item.key}>
                  <div className="monthly-chart-bars">
                    <span
                      className="monthly-total-bar"
                      style={{ height: `${(item.total / maxRequests) * 100}%` }}
                      title={`${item.total} requests`}
                    />
                    <span
                      className="monthly-approved-bar"
                      style={{ height: `${(item.approved / maxRequests) * 100}%` }}
                      title={`${item.approved} approved`}
                    />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="monthly-legend">
              <span><i className="legend-request" /> Requests</span>
              <span><i className="legend-approved" /> Approved</span>
            </div>
          </article>

          <article className="reports-panel activity-panel">
            <div className="reports-panel-heading">
              <div>
                <h2><Clock3 size={19} /> Recent Portal Activity</h2>
                <p>Latest certificate and request records</p>
              </div>
            </div>
            {recentActivity.length ? (
              <div className="activity-list">
                {recentActivity.map((item) => (
                  <div className="activity-item" key={item.id}>
                    <span className={`activity-dot activity-${item.type}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <small>{formatRelative(item.date)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="reports-empty">
                <Activity size={25} />
                <span>No recent activity available.</span>
              </div>
            )}
          </article>

          <article className="reports-panel employee-panel">
            <div className="reports-panel-heading">
              <div>
                <h2><Users size={19} /> Employee Activity</h2>
                <p>New employee accounts by month</p>
              </div>
            </div>
            <div className="employee-chart">
              {monthlyEmployees.map((item) => (
                <div className="employee-chart-column" key={item.key}>
                  <strong>{item.value}</strong>
                  <div className="employee-chart-track">
                    <span style={{ height: `${(item.value / maxEmployees) * 100}%` }} />
                  </div>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="reports-footer">
          <span><Activity size={14} /> Analytics generated from portal records</span>
          <span>Esparks IT Solutions Private Limited</span>
        </footer>
      </div>
    </main>
  );
}
