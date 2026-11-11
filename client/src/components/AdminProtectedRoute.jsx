import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentAdmin } from "../services/api";

export default function AdminProtectedRoute({
  children,
}) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        // quiet401: being logged out is an expected answer here, not an error.
        const data = await getCurrentAdmin({ quiet401: true });

        if (!mounted) {
          return;
        }

        if (
          data?.admin?.role === "admin" &&
          data?.admin?.is_active === true
        ) {

          setAuthenticated(true);
        } else {

          setAuthenticated(false);
        }
      } catch {

        if (mounted) {
          setAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f14",
          color: "#fff",
          fontSize: "20px",
        }}
      >
        Loading admin session...
      </div>
    );
  }

  // =====================================================
  // NOT AUTHENTICATED
  // =====================================================

  if (!authenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // =====================================================
  // AUTHENTICATED
  // =====================================================

  return children;
}