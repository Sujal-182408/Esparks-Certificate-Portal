
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
import { AuthContext } from "./authContextObject";
import { apiRequest } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";



export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Ask the server who is logged in. Returns the employee or null. */
  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest("/employee-auth/me");
      const employee = data?.employee || null;
      setUser(employee);
      if (employee) {
        connectSocket("employee");
      } else {
        disconnectSocket("employee");
      }
      return employee;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        disconnectSocket("employee");
        return null;
      }
      console.error("Employee session refresh failed:", error);
      setUser(null);
      throw error;
    }
  }, []);

  // Check the session once when the app starts.
  useEffect(() => {
    let cancelled = false;

    refreshUser()
      .catch((error) => console.error("Employee session check failed:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Cleanup: if the component unmounts before the request finishes,
    // don't update state on an unmounted component.
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const register = useCallback(async (name, email, password) => {
    await apiRequest("/employee-auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    return refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    await apiRequest("/employee-auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const employee = await refreshUser();
    if (!employee) {
      throw new Error("Login succeeded, but the employee session cookie was not recognized.");
    }
    return employee;
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/employee-auth/logout", { method: "POST" });
    } finally {
      disconnectSocket("employee");
      setUser(null);
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

export function useAuth() {
  return useContext(AuthContext);
}
