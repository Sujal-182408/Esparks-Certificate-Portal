
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  connectSocket,
  getSocket,
  disconnectSocket,
} from "../services/socket";
import {
  Award,
  Users,
  FilePlus2,
  Bell,
  X,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Clock3,
  XCircle,
  LockKeyhole,
  LayoutDashboard,
  ChevronRight,
  BarChart3,
} from "lucide-react";

import "./AdminDashboard.css";

import {
  getCurrentAdmin,
  getAdminEmployees,
  getAdminCertificates,
  getAdminCertificateRequests,
  adminLogout,
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
} from "../services/api";

import brandLogo from "../assets/logo.png";
import banner from "../assets/banner.png";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);

  const [stats, setStats] = useState({
    employees: 0,
    certificates: 0,
    pendingRequests: 0,
    notifications: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // ============================================================
  // LOAD ADMIN SESSION
  // ============================================================

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getAdminNotifications();

      const list = Array.isArray(data?.notifications)
        ? data.notifications
        : [];

      setNotifications(list);

      setStats((prev) => ({
        ...prev,
        notifications: Number(data?.unreadCount || 0),
      }));
    } catch (error) {
      console.error("Admin notifications error:", error);
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    try {
      const [
        employeesData,
        certificatesData,
        requestsData,
      ] = await Promise.all([
        getAdminEmployees(),
        getAdminCertificates(),
        getAdminCertificateRequests(),
      ]);

      const employeeList =
        employeesData?.employees || employeesData?.data || [];

      const certificateList =
        certificatesData?.certificates || certificatesData?.data || [];

      const requestList =
        requestsData?.requests || requestsData?.data || [];

      const employees = Array.isArray(employeeList)
        ? employeeList.length
        : Number(employeesData?.count || 0);

      const certificates = Array.isArray(certificateList)
        ? certificateList.length
        : Number(certificatesData?.count || 0);

      const pendingRequests = Array.isArray(requestList)
        ? requestList.filter(
            (item) =>
              String(item?.status).toLowerCase() === "pending",
          ).length
        : 0;

      setStats((prev) => ({
        ...prev,
        employees,
        certificates,
        pendingRequests,
      }));
    } catch (error) {
      console.error("Dashboard statistics error:", error);
    }
  }, []);

  const checkAdminSession = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCurrentAdmin();

      console.log("AdminDashboard /me:", data);

      if (
        data?.admin?.role !== "admin" ||
        data?.admin?.is_active !== true
      ) {
        navigate("/admin/login", { replace: true });
        return;
      }

      setAdmin(data.admin);

      // Connect only after successful admin authentication.
      connectSocket("admin");

      await Promise.all([
        loadDashboardStats(),
        loadNotifications(),
      ]);
    } catch (error) {
      console.error("Admin session error:", error);

      disconnectSocket("admin");

      navigate("/admin/login", {
        replace: true,
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, loadDashboardStats, loadNotifications]);

  useEffect(() => {
    checkAdminSession();
  }, [checkAdminSession]);

  // ============================================================
  // REAL-TIME ADMIN NOTIFICATIONS
  // ============================================================

 
useEffect(() => {
  if (!admin) return;

  const socket = getSocket();

  if (!socket) {
    console.error("[ADMIN] Socket not initialized.");
    return;
  }

  let refreshTimeout = null;

  const handleNewNotification = (notification) => {
    if (!notification?.id) return;

    console.log(
      "[ADMIN] New notification received:",
      notification
    );

    // Avoid duplicate notifications.
    setNotifications((prev) => {
      const alreadyExists = prev.some(
        (item) => String(item.id) === String(notification.id)
      );

      if (alreadyExists) return prev;

      return [notification, ...prev];
    });

    // Update unread notification count.
    if (!notification.is_read) {
      setStats((prev) => ({
        ...prev,
        notifications: prev.notifications + 1,
      }));
    }

    // Refresh dashboard data after a new certificate request.
    const requestNotification =
      String(notification.type || "").toUpperCase().includes("REQUEST") ||
      Boolean(notification.certificate_request_id);

    if (requestNotification) {
      // Small delay allows the database transaction to finish.
      clearTimeout(refreshTimeout);

      refreshTimeout = setTimeout(() => {
        loadDashboardStats();
      }, 500);
    }
  };

  const subscribe = () => {
    socket.off("notification:new", handleNewNotification);
    socket.on("notification:new", handleNewNotification);

    console.log("[ADMIN] Real-time notification listener attached.");
  };

  if (socket.connected) {
    subscribe();
  } else {
    socket.on("connect", subscribe);
  }

  return () => {
    clearTimeout(refreshTimeout);
    socket.off("connect", subscribe);
    socket.off("notification:new", handleNewNotification);
  };
}, [admin, loadDashboardStats]);


  // ============================================================
  // ADMIN LOGOUT
  // ============================================================

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await adminLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      disconnectSocket("admin");

      setLoggingOut(false);

      navigate("/admin/login", {
        replace: true,
      });
    }
  }

  // ============================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================================

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllAdminNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        })),
      );

      setStats((prev) => ({
        ...prev,
        notifications: 0,
      }));
    } catch (error) {
      console.error("Mark all notifications error:", error);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <main className="admin-loading">
        <div className="admin-loader">
          <div className="admin-loader-ring" />
          <img src={brandLogo} alt="Esparks IT Solutions Private Limited" />
        </div>

        <p>Loading administration panel...</p>
      </main>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <main className="admin-dashboard">
      <div className="admin-background">
        <div className="admin-orb admin-orb-purple" />
        <div className="admin-orb admin-orb-blue" />
        <div className="admin-grid" />
      </div>

      {/* HEADER */}

      <header className="admin-header">
        <div className="admin-header-inner">
          <Link to="/admin" className="admin-brand">
          <img src={banner} alt="Esparks IT Solutions" width="200" height="70" />
           

            
          </Link>

          <div className="admin-header-right">
            <div className="admin-secure-status">

              {/* NOTIFICATIONS */}

              <div className="admin-notification-wrapper">
               <button
  type="button"
  className="admin-notification-button"
  onClick={() => setNotificationOpen((prev) => !prev)}
  aria-label={notificationOpen ? "Close notifications" : "Open notifications"}
  aria-expanded={notificationOpen}
>
  {notificationOpen ? <X size={20} /> : <Bell size={20} />}

  {!notificationOpen && stats.notifications > 0 && (
    <span className="admin-notification-badge">
      {stats.notifications > 99 ? "99+" : stats.notifications}
    </span>
  )}
</button>

                {notificationOpen && (
                  <div className="admin-notification-dropdown">
                    <div className="admin-notification-header">
                      <div>
                        <strong>Notifications</strong>
                        <span>{stats.notifications} unread</span>
                      </div>

                      {stats.notifications > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="admin-notification-list">
                      {notifications.length === 0 ? (
                        <div className="admin-no-notifications">
                          <Bell size={24} />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map(
                          (notification) => (
                            <button
                              type="button"
                              key={notification.id}
                              className={`admin-notification-item ${
                                notification.is_read
                                  ? ""
                                  : "unread"
                              }`}
                              onClick={async () => {
                                try {
                                  if (!notification.is_read) {
                                    await markAdminNotificationAsRead(
                                      notification.id,
                                    );

                                    setNotifications((prev) =>
                                      prev.map((item) =>
                                        item.id === notification.id
                                          ? {
                                              ...item,
                                              is_read: true,
                                            }
                                          : item,
                                      ),
                                    );

                                    setStats((prev) => ({
                                      ...prev,
                                      notifications: Math.max(
                                        0,
                                        prev.notifications - 1,
                                      ),
                                    }));
                                  }

                                  if (
                                    notification.certificate_request_id
                                  ) {
                                    navigate(
                                      `/admin/certificates/create?requestId=${encodeURIComponent(
                                        notification.certificate_request_id,
                                      )}`,
                                    );

                                    setNotificationOpen(false);
                                  }
                                } catch (error) {
                                  console.error(
                                    "Notification click error:",
                                    error,
                                  );
                                }
                              }}
                            >
                              <div className="admin-notification-icon">
                                <Bell size={17} />
                              </div>

                              <div className="admin-notification-content">
                                <strong>{notification.title}</strong>
                                <p>{notification.message}</p>

                                <small>
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleString()}
                                </small>
                              </div>

                              {!notification.is_read && (
                                <span className="admin-notification-dot" />
                              )}
                            </button>
                          ),
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-notification-footer"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/admin/certificate-requests");
                      }}
                    >
                      View Certificate Requests
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              <span className="secure-dot" />
              Secure Session
            </div>

            {/* ADMIN USER */}

            <div className="admin-user">
              <div className="admin-user-avatar">
                {admin?.email?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div className="admin-user-info">
                <strong>Administrator</strong>
                <span>{admin?.email || "Admin"}</span>
              </div>
            </div>

            {/* LOGOUT */}

            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={17} />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}

      <section className="admin-main">

        {/* HERO */}

        <div className="admin-hero">
          <div className="admin-hero-content">
            <div className="admin-eyebrow">
              <LayoutDashboard size={15} />
              ADMINISTRATION PANEL
            </div>

            <h2>
              Certificate
              <span> Administration </span>
              Made Simple.
            </h2>

            <p>
              Manage employees, certificates and certificate requests
              from one secure administration workspace.
            </p>

            <div className="admin-hero-actions">
              <Link
                to="/admin/certificate-requests"
                className="admin-primary-button"
              >
                <FilePlus2 size={18} />
                Issue Certificate
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/admin/certificate-requests"
                className="admin-secondary-button"
              >
                <Bell size={18} />
                Certificate Requests

                {stats.pendingRequests > 0 && (
                  <span className="request-badge">
                    {stats.pendingRequests}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* HERO VISUAL */}

          <div className="admin-hero-visual">
            <div className="hero-ring hero-ring-one" />
            <div className="hero-ring hero-ring-two" />

            <div className="hero-shield">
              <img src={brandLogo} alt="Esparks IT Solutions Private Limited" />
            </div>

            <div className="hero-floating-card hero-card-one">
              <CheckCircle2 size={17} />
              <span>Verified</span>
            </div>

            <div className="hero-floating-card hero-card-two">
              <LockKeyhole size={17} />
              <span>Protected</span>
            </div>
          </div>
        </div>

        {/* STATISTICS */}

        <section className="admin-stats">
          <div className="admin-stat-card">
            <div className="stat-icon purple">
              <Users size={22} />
            </div>

            <div className="stat-content">
              <span>Total Employees</span>
              <strong>{stats.employees}</strong>
              <small>Registered employees</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-icon blue">
              <Award size={22} />
            </div>

            <div className="stat-content">
              <span>Certificates</span>
              <strong>{stats.certificates}</strong>
              <small>Issued certificates</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-icon cyan">
              <Clock3 size={22} />
            </div>

            <div className="stat-content">
              <span>Pending Requests</span>
              <strong>{stats.pendingRequests}</strong>
              <small>Waiting for review</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-icon pink">
              <Bell size={22} />
            </div>

            <div className="stat-content">
              <span>Notifications</span>
              <strong>{stats.notifications}</strong>
              <small>Unread notifications</small>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="admin-error">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {/* WORKSPACE */}

        <section className="admin-workspace-section">
          <div className="section-heading">
            <div>
              <span className="section-label">WORKSPACE</span>
              <h3>Administration Tools</h3>

              <p>
                Access the main areas of your certificate management
                system.
              </p>
            </div>
          </div>

          <div className="workspace-grid">

            <Link
              to="/admin/certificates"
              className="workspace-card workspace-purple"
            >
              <div className="workspace-top">
                <div className="workspace-icon">
                  <Award size={24} />
                </div>

                <ChevronRight
                  size={20}
                  className="workspace-arrow"
                />
              </div>

              <h4>Certificates</h4>
              <p>View, search, edit and manage issued certificates.</p>

              <span className="workspace-link">
                Manage Certificates
                <ArrowRight size={15} />
              </span>
            </Link>

            <Link
              to="/admin/certificate-requests"
              className="workspace-card workspace-cyan"
            >
              <div className="workspace-top">
                <div className="workspace-icon">
                  <Bell size={24} />
                </div>

                <ChevronRight
                  size={20}
                  className="workspace-arrow"
                />
              </div>

              <h4>Certificate Requests</h4>
              <p>
                Review employee requests and issue or reject certificates.
              </p>

              <span className="workspace-link">
                Review Requests

                {stats.pendingRequests > 0 && (
                  <span className="workspace-count">
                    {stats.pendingRequests}
                  </span>
                )}
              </span>
            </Link>

            <Link
              to="/admin/employees"
              className="workspace-card workspace-pink"
            >
              <div className="workspace-top">
                <div className="workspace-icon">
                  <Users size={24} />
                </div>

                <ChevronRight
                  size={20}
                  className="workspace-arrow"
                />
              </div>

              <h4>Employees</h4>
              <p>Manage registered eSparks IT employee accounts.</p>

              <p>Manage registered Esparks IT Solutions Private Limited employee accounts.</p>

              <span className="workspace-link">
                Manage Employees
                <ArrowRight size={15} />
              </span>
            </Link>

            <Link
              to="/admin/reports"
              className="workspace-card workspace-cyan"
            >
              <div className="workspace-icon">
                <BarChart3 size={25} />
              </div>

              <h4>Reports &amp; Analytics</h4>

              <p>
                Monitor certificate statistics, employee activity and
                monthly reports.
              </p>

              <span className="workspace-link">
                View Reports
                <ArrowRight size={15} />
              </span>
            </Link>
          </div>
        </section>

        {/* SECURITY */}

        <section className="admin-security">
          <div className="security-icon">
            <LockKeyhole size={24} />
          </div>

          <div className="security-content">
            <span className="section-label">SECURITY</span>

            <h3>Administration session protected</h3>

            <p>
              Your administrator session is authenticated through a
              secure HTTP-only cookie.
            </p>
          </div>

          <div className="security-status">
            <span />
            Authenticated
          </div>
        </section>

        {/* FOOTER */}

        <footer className="admin-footer">
          <div>
            <img src={brandLogo} alt="Esparks IT Solutions Private Limited" />
            Esparks Certificate Management System
          </div>

          <span>Secure Administration Workspace</span>
        </footer>
      </section>
    </main>
  );
}
