// ============================================================
// <AuthProvider> — keeps track of the logged-in EMPLOYEE
// ============================================================
//
// HOW IT WORKS
// ------------
// The real session is an httpOnly cookie that JavaScript cannot read.
// So on page load we simply ask the server "who am I?"
// (GET /api/employee-auth/me):
//   - 200 -> store the employee in `user`
//   - 401 -> not logged in, `user` = null
//
// While that first check runs, `loading` is true so <ProtectedRoute>
// shows a spinner instead of wrongly redirecting to /login.
//
// Admin sessions are separate and are checked by <AdminProtectedRoute>.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  employeeLogin,
  employeeLogout,
  getCurrentEmployee,
  registerEmployee,
} from "../services/api";
import { AuthContext } from "./authContextObject";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Ask the server who is logged in. Returns the employee or null. */
  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentEmployee({ quiet401: true });
      setUser(data?.employee || null);
      return data?.employee || null;
    } catch (error) {
      setUser(null);
      if (error.status === 401) return null; // simply not logged in
      throw error;
    }
  }, []);

  // Check the session once when the app starts.
  useEffect(() => {
    let cancelled = false;

    getCurrentEmployee({ quiet401: true })
      .then((data) => !cancelled && setUser(data?.employee || null))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));

    // Cleanup: if the component unmounts before the request finishes,
    // don't update state on an unmounted component.
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(
    async (name, email, password) => {
      await registerEmployee(name, email, password);
      return refreshUser();
    },
    [refreshUser],
  );

  const login = useCallback(
    async (email, password) => {
      await employeeLogin(email, password);
      const employee = await refreshUser();
      if (!employee) {
        // Usually means the browser blocked the cross-site cookie.
        throw new Error("Login succeeded, but the session cookie was not accepted by the browser.");
      }
      return employee;
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await employeeLogout();
    } finally {
      setUser(null); // log out locally even if the request failed
    }
  }, []);

  // useMemo: only create a new value object when something changed, so
  // components using useAuth() don't re-render on every parent render.
  // NOTE: `loading` here only means "initial session check". Pages keep
  // their own `submitting` state for button spinners.
  const value = useMemo(
    () => ({ user, loading, register, login, logout, refreshUser, isAuthenticated: Boolean(user) }),
    [user, loading, register, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
