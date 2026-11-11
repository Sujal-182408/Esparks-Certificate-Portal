// ============================================================
// App.jsx — every page route in the application
// ============================================================
//
// PERFORMANCE: pages are loaded with React.lazy(). Vite splits each page
// into its own JavaScript file, and the browser downloads a page's code
// only when the user first visits it. A visitor who just scans a QR code
// no longer downloads the whole admin panel.
//
// ACCESS CONTROL:
//   <ProtectedRoute>       -> logged-in employee required
//   <AdminProtectedRoute>  -> logged-in admin required
// (These only improve UX. The real protection is on the server, which
//  checks the session on every API request.)
// ============================================================

import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

// ---- Public ----
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const CertificateView = lazy(() => import("./pages/CertificateView"));

// ---- Employee ----
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const CertificateRequest = lazy(() => import("./pages/CertificateRequest"));

// ---- Admin ----
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./Admin/AdminDashboard"));
const AdminEmployees = lazy(() => import("./Admin/Certificates/AdminEmployees"));
const EmployeeDetails = lazy(() => import("./Admin/Certificates/EmployeeDetails"));
const AdminCertificateRequest = lazy(() => import("./Admin/AdminCertificateRequest"));
const ManageCertificates = lazy(() => import("./Admin/Certificates/ManageCertificates"));
const AddCertificate = lazy(() => import("./Admin/Certificates/AddCertificate"));
const EditCertificate = lazy(() => import("./Admin/Certificates/EditCertificate"));
const AdminViewCertificate = lazy(() => import("./Admin/Certificates/ViewCertificate"));
const ReportsAnalytics = lazy(() => import("./Admin/ReportsAnalytics"));

// ---- Development only: certificate design preview with sample data ----
// `import.meta.env.DEV` is false in production builds, so Vite removes
// this route AND the preview page from the production bundle entirely.
const CertificatePreview = import.meta.env.DEV ? lazy(() => import("./pages/CertificatePreview")) : null;

/** Shown while a lazily-loaded page's code is downloading. */
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060a0f]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#080b10] px-5 text-center text-white">
      <ShieldCheck size={55} className="mb-5 text-cyan-400" />
      <h1 className="text-7xl font-extrabold">404</h1>
      <h2 className="mt-3 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-3 text-slate-400">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-400 px-6 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
      >
        Back to Home
      </Link>
    </div>
  );
}

/** Small helpers so the route table below stays readable. */
const employeeOnly = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
const adminOnly = (element) => <AdminProtectedRoute>{element}</AdminProtectedRoute>;

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ---------- Public ---------- */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify" element={<VerifyCertificate />} />
        <Route path="/certificate/view" element={<CertificateView />} />

        {/* ---------- Employee ---------- */}
        <Route path="/dashboard" element={employeeOnly(<EmployeeDashboard />)} />
        <Route path="/certificate/request" element={employeeOnly(<CertificateRequest />)} />

        {/* ---------- Admin ---------- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={adminOnly(<AdminDashboard />)} />
        <Route path="/admin/employees" element={adminOnly(<AdminEmployees />)} />
        <Route path="/admin/employees/:id" element={adminOnly(<EmployeeDetails />)} />
        <Route path="/admin/certificate-requests" element={adminOnly(<AdminCertificateRequest />)} />
        <Route path="/admin/certificates" element={adminOnly(<ManageCertificates />)} />
        {/* expects ?requestId=<id> */}
        <Route path="/admin/certificates/create" element={adminOnly(<AddCertificate />)} />
        <Route path="/admin/certificates/:id/edit" element={adminOnly(<EditCertificate />)} />
        <Route path="/admin/certificates/:id" element={adminOnly(<AdminViewCertificate />)} />
        <Route path="/admin/reports" element={adminOnly(<ReportsAnalytics />)} />

        {CertificatePreview && <Route path="/dev/certificate-preview" element={<CertificatePreview />} />}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
