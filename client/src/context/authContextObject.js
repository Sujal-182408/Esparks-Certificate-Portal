// ============================================================
// The React context object for the EMPLOYEE session.
//
// It lives in its own file because Vite's Fast Refresh only works when a
// .jsx file exports nothing but components. So:
//   context/authContextObject.js -> the context object (this file)
//   context/AuthContext.jsx      -> <AuthProvider> component
//   hooks/useAuth.js             -> useAuth() hook used by pages
// ============================================================

import { createContext } from "react";

export const AuthContext = createContext(null);
