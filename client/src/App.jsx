import { Link, Route, Routes } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

// =========================
// PUBLIC PAGES
// =========================
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import VerifyCertificate from "./pages/VerifyCertificate";
import CertificateView from "./pages/CertificateView";
import CertificateRequest from "./pages/CertificateRequest";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// =========================
// PROTECTED ROUTES
// =========================
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

// =========================
// ADMIN PAGES
// =========================
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./Admin/AdminDashboard";

// =========================
// ADMIN CERTIFICATES
// =========================
import AddCertificate from "./Admin/Certificates/AddCertificate";
import ManageCertificate from "./Admin/Certificates/ManageCertificates";
import AdminViewCertificate from "./Admin/Certificates/ViewCertificate";
import EditCertificate from "./Admin/Certificates/EditCertificate";

// =========================
// ADMIN CERTIFICATE REQUESTS
// =========================
import AdminCertificateRequest from "./Admin/AdminCertificateRequest";

// =========================
// ADMIN EMPLOYEES
// =========================
import AdminEmployees from "./Admin/Certificates/AdminEmployees";
import EmployeeDetails from "./Admin/Certificates/EmployeeDetails";

// =========================
// 404 PAGE
// =========================
function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#080b10] px-5 text-center text-white">
      <ShieldCheck
        size={55}
        className="mb-5 text-cyan-400"
      />

      <h1 className="text-7xl font-extrabold">
        404
      </h1>

      <h2 className="mt-3 text-2xl font-semibold">
        Page Not Found
      </h2>

      <p className="mt-3 text-slate-400">
        The page you are looking for does not exist.
      </p>

      <Link
        to="/"
        className="
          mt-7 inline-flex h-11 items-center justify-center
          rounded-xl bg-cyan-400 px-6
          text-sm font-bold text-slate-950
          transition hover:bg-cyan-300
        "
      >
        Back to Home
      </Link>
    </div>
  );
}

// =========================
// APP
// =========================
function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC ROUTES
      ===================================================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/verify"
        element={<VerifyCertificate />}
      />

      <Route
        path="/certificate/view"
        element={<CertificateView />}
      />

      <Route
        path="/certificate/request"
        element={
          <ProtectedRoute>
            <CertificateRequest />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE DASHBOARD
      ===================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      {/* =====================================================
          ADMIN DASHBOARD
      ===================================================== */}

      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN EMPLOYEES
      ===================================================== */}

      <Route
        path="/admin/employees"
        element={
          <AdminProtectedRoute>
            <AdminEmployees />
          </AdminProtectedRoute>
        }
      />

      <Route
        path="/admin/employees/:id"
        element={
          <AdminProtectedRoute>
            <EmployeeDetails />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN CERTIFICATE REQUESTS
      ===================================================== */}

      <Route
        path="/admin/certificate-requests"
        element={
          <AdminProtectedRoute>
            <AdminCertificateRequest />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          ADMIN CERTIFICATES
      ===================================================== */}

      <Route
        path="/admin/certificates"
        element={
          <AdminProtectedRoute>
            <ManageCertificate />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          CREATE CERTIFICATE
          
          IMPORTANT:
          This route expects:
          
          /admin/certificates/create?requestId=14
      ===================================================== */}

      <Route
        path="/admin/certificates/create"
        element={
          <AdminProtectedRoute>
            <AddCertificate />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          EDIT CERTIFICATE

          Example:
          /admin/certificates/14/edit
      ===================================================== */}

      <Route
        path="/admin/certificates/:id/edit"
        element={
          <AdminProtectedRoute>
            <EditCertificate />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          VIEW CERTIFICATE

          Example:
          /admin/certificates/14
      ===================================================== */}

      <Route
        path="/admin/certificates/:id"
        element={
          <AdminProtectedRoute>
            <AdminViewCertificate />
          </AdminProtectedRoute>
        }
      />

      {/* =====================================================
          404
      ===================================================== */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );
}

export default App;