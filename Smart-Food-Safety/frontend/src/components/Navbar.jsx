import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Menu, X, ArrowRight, User } from "lucide-react";
import { getToken, logout } from "../services/authService";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const token = getToken();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const getDashboardPath = () => {
    if (user?.role === "ADMIN") return "/admin-dashboard";
    if (user?.role === "AUTHORIZED_AUTHORITY") return "/authority-dashboard";
    return "/customer-dashboard";
  };

  const isLoggedIn = !!token && !!user?.role;

  return (
    <>
      <nav className="public-navbar">
        <div className="public-navbar-inner">
          {/* Logo */}
          <div
            className="navbar-logo"
            onClick={() => navigate("/")}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <div className="navbar-logo-icon" style={{ background: "#0d6b3d" }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div className="navbar-logo-text">
              <span className="navbar-logo-name" style={{ color: "#0d6b3d", fontWeight: 800 }}>
                FoodSafe AI 2.0
              </span>
              <span className="navbar-logo-sub">Smart Food Safety Platform</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="navbar-links">
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              Home
            </Link>
            <Link
              to="/about"
              className={location.pathname === "/about" ? "active" : ""}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={location.pathname === "/contact" ? "active" : ""}
            >
              Contact
            </Link>
            <Link
              to="/adulteration-detection"
              className={
                location.pathname === "/adulteration-detection" ? "active" : ""
              }
            >
              AI Screening
            </Link>
          </div>

          {/* Desktop Auth Actions */}
          <div className="navbar-actions">
            {isLoggedIn ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-secondary)",
                    background: "var(--color-surface-2)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {user.name || user.email?.split("@")[0] || "User"}
                  <span style={{ marginLeft: "4px", fontWeight: 700, color: "var(--color-primary)" }}>
                    ({user.role === "ADMIN" ? "Admin" : user.role === "AUTHORIZED_AUTHORITY" ? "Authority" : "Citizen"})
                  </span>
                </span>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(getDashboardPath())}
                >
                  <span>Dashboard</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  title="Sign out or log in with another account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  id="nav-login-btn"
                  className="btn btn-primary btn-sm"
                  style={{
                    background: "#0d6b3d",
                    borderColor: "#0d6b3d",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "8px 20px",
                    borderRadius: "8px",
                  }}
                  onClick={() => navigate("/login")}
                >
                  Login
                </button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="navbar-mobile-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>
          Home
        </Link>
        <Link to="/about" onClick={() => setMobileOpen(false)}>
          About Platform
        </Link>
        <Link to="/contact" onClick={() => setMobileOpen(false)}>
          Contact & Support
        </Link>
        <Link to="/adulteration-detection" onClick={() => setMobileOpen(false)}>
          AI Screening Lab
        </Link>
        <Link to="/track-complaint" onClick={() => setMobileOpen(false)}>
          Track Complaint
        </Link>

        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {isLoggedIn ? (
            <>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  navigate(getDashboardPath());
                  setMobileOpen(false);
                }}
              >
                Go to Dashboard
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  logout();
                  navigate("/login");
                  setMobileOpen(false);
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  navigate("/login");
                  setMobileOpen(false);
                }}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  navigate("/register");
                  setMobileOpen(false);
                }}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;