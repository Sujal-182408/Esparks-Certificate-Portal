import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show employee Navbar on admin pages
  const isAdminPage = location.pathname.startsWith("/admin");

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition ${
      isActive
        ? "bg-cyan-400/10 text-cyan-300"
        : "text-slate-400 hover:text-white"
    }`;

  // Admin pages use their own admin UI
  if (isAdminPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
            <ShieldCheck size={25} />
          </span>

          <span className="text-lg font-bold tracking-tight text-white">
            ESPARKS<span className="text-cyan-400">IT SOLUTIONS</span>
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-3">

          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={linkClass}
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  Dashboard
                </span>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                <LogOut size={16} />

                <span className="hidden sm:inline">
                  Logout
                </span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Get Started
              </Link>
            </>
          )}

        </div>
      </nav>
    </header>
  );
}