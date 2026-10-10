import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================================
  // EMPLOYEE SESSION
  // ================================

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest("/employee-auth/me");

      const employee = data?.employee || null;

      setUser(employee);

      return employee;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        return null;
      }

      console.error(
        "Employee session refresh failed:",
        error
      );

      return null;
    }
  }, []);

  // ================================
  // INITIAL SESSION CHECK
  // ================================

  useEffect(() => {
    let mounted = true;

    async function checkEmployeeSession() {
      try {
        const data = await apiRequest(
          "/employee-auth/me"
        );

        if (mounted) {
          setUser(data?.employee || null);
        }
      } catch (error) {
        if (error.status !== 401) {
          console.error(
            "Employee session check failed:",
            error
          );
        }

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkEmployeeSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ================================
  // EMPLOYEE REGISTER
  // ================================

  async function register(name, email, password) {
    setLoading(true);

    try {
      const data = await apiRequest(
        "/employee-auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      setUser(data?.employee || null);

      return data;
    } finally {
      setLoading(false);
    }
  }

  // ================================
  // EMPLOYEE LOGIN
  // ================================

  async function login(email, password) {
    setLoading(true);

    try {
      const data = await apiRequest(
        "/employee-auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const employee = data?.employee || null;

      setUser(employee);

      return data;
    } finally {
      setLoading(false);
    }
  }

  // ================================
  // EMPLOYEE LOGOUT
  // ================================

  async function logout() {
    setLoading(true);

    try {
      await apiRequest(
        "/employee-auth/logout",
        {
          method: "POST",
        }
      );
    } finally {
      setUser(null);
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    refreshUser,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}