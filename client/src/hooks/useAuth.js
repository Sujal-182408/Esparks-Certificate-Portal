// ============================================================
// useAuth() — read the employee session anywhere in the app
// ============================================================
//
//   const { user, loading, login, logout } = useAuth();
//
// Must be used inside <AuthProvider> (see main.jsx).
// ============================================================

import { useContext } from "react";
import { AuthContext } from "../context/authContextObject";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return context;
}
