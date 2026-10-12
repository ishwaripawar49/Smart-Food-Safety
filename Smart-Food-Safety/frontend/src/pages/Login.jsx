import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  User,
  ShieldAlert,
  Settings,
  LogOut,
  ArrowRight,
  Mail,
  Lock,
} from "lucide-react";

import {
  login,
  getToken,
  getCurrentUser,
  logout,
} from "../services/authService";

// Photographic background matching exact reference: fresh vegetables with softly blurred green botanical elements
import loginBgWebp from "../assets/login-vegetables-bg.webp";
import loginBgJpg from "../assets/login-vegetables-bg.jpg";

const ROLES = [
  {
    id: "CUSTOMER",
    label: "Citizen / Customer",
    icon: User,
    subtitle: "File complaints, track progress & access AI food screening",
    demoEmail: "customer@test.com",
    demoPassword: "test123",
  },
  {
    id: "ADMIN",
    label: "Administrator",
    icon: Settings,
    subtitle: "Triage complaints, manage shops & system governance",
    demoEmail: "admin@foodsafety.com",
    demoPassword: "admin123",
  },
  {
    id: "AUTHORIZED_AUTHORITY",
    label: "FSSAI Authority",
    icon: ShieldAlert,
    subtitle: "Inspect establishments, record findings & enforce directives",
    demoEmail: "authority@foodsafety.com",
    demoPassword: "123456",
  },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState("CUSTOMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState(null);

  // Check if session exists in localStorage
  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUser()
        .then((user) => {
          if (user) setExistingUser(user);
        })
        .catch(() => {
          logout();
          setExistingUser(null);
        });
    }
  }, []);

  const handleClearSession = () => {
    logout();
    setExistingUser(null);
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role.id);
    setError("");
  };

  const handleFillDemo = (role) => {
    setEmail(role.demoEmail);
    setPassword(role.demoPassword);
    setSelectedRole(role.id);
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await login(email.trim(), password);

      const role = data.user?.role;
      const destination = location.state?.from;
      if (role === "CUSTOMER") {
        navigate(destination || "/customer-dashboard", { replace: true });
      } else if (role === "ADMIN") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "AUTHORIZED_AUTHORITY") {
        navigate("/authority-dashboard", { replace: true });
      } else {
        logout();
        setError("Unknown user role received from server.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Invalid credentials. Please verify email and password.");
    } finally {
      setLoading(false);
    }
  };

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  return (
    <div
      className="login-page exact-login-page animate-fade-in"
      style={{
        backgroundImage: `linear-gradient(rgba(247, 251, 248, 0.72), rgba(247, 251, 248, 0.85)), url(${loginBgWebp})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="exact-login-container">

        {/* ==================== LEFT SIDE: INTRODUCTORY BRAND & MESSAGE ==================== */}
        <div className="login-intro-column">

          {/* Top Brand Logo */}
          <div className="login-brand-header">
            <div className="login-brand-symbol">
              <ShieldCheck size={28} color="#ffffff" />
            </div>
            <div className="login-brand-meta">
              <span className="login-brand-text">FoodSafe AI 2.0</span>
              <span className="login-brand-tag">Smart Food Safety</span>
            </div>
          </div>

          <div className="login-intro-content">
            {/* Introductory Heading */}
            <h1 className="login-exact-heading">
              Safe Food <br />
              <span>Brighter Communities</span>
            </h1>

            {/* Supporting Introductory Paragraph */}
            <p className="login-exact-paragraph">
              Together, we can identify food safety concerns and build a healthier tomorrow.
            </p>

            {/* Feature Bullets */}
            <div className="login-benefit-cards">
              <div className="login-benefit-item">
                <div className="benefit-dot" />
                <span>
                  <strong>Citizens:</strong> Quick grievance filing, Marathi/Hindi support, voice reports &amp; AI screening
                </span>
              </div>
              <div className="login-benefit-item">
                <div className="benefit-dot" />
                <span>
                  <strong>Administrators:</strong> Grievance verification, FBO shops registry &amp; safety analytics
                </span>
              </div>
              <div className="login-benefit-item">
                <div className="benefit-dot" />
                <span>
                  <strong>FSSAI Authorities:</strong> In-field inspections, forensic sampling &amp; statutory oversight
                </span>
              </div>
            </div>
          </div>

          <div className="login-intro-footer">
            <span>Independent Community &amp; Administrative Decision-Support Platform</span>
          </div>

        </div>

        {/* ==================== RIGHT SIDE: LARGE ROUNDED WHITE LOGIN CARD ==================== */}
        <div className="login-card-column">
          <div className="exact-login-card animate-fade-in-up">

            {/* Centered FoodSafe AI green shield/leaf logo */}
            <div className="login-card-logo-center">
              <div className="login-card-shield-circle">
                <ShieldCheck size={32} color="#0d6b3d" />
              </div>
              <span className="login-card-brand-name">FoodSafe AI 2.0</span>
            </div>

            {/* "Login to Your Account" Heading */}
            <h2 className="login-card-title">Login to Your Account</h2>
            <p className="login-card-subtitle">
              Sign in with your registered account credentials
            </p>

            {/* Active Session Notice (If Signed In) */}
            {existingUser && (
              <div className="login-active-session-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>Active Session:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.375rem", marginTop: "2px" }}>
                      <strong style={{ fontSize: "0.8125rem", color: "var(--color-heading)", wordBreak: "break-all" }}>
                        {existingUser.name || existingUser.email}
                      </strong>
                      <span className="role-chip">
                        {existingUser.role}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSession}
                    className="btn btn-ghost"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", height: "auto", minHeight: "unset", flexShrink: 0 }}
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "0.45rem", fontSize: "0.8125rem", justifyContent: "center" }}
                  onClick={() => {
                    if (existingUser.role === "ADMIN") navigate("/admin-dashboard");
                    else if (existingUser.role === "AUTHORIZED_AUTHORITY") navigate("/authority-dashboard");
                    else navigate("/customer-dashboard");
                  }}
                >
                  <span>Go to Active Dashboard</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Customer, Admin and Authority Selection Tabs */}
            <div className="login-roles-tabs-section">
              <span className="login-roles-label">Select Account Type</span>
              <div className="login-roles-grid">
                {ROLES.map((r) => {
                  const IconComponent = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={`role-tab-btn ${isSelected ? "selected" : ""}`}
                    >
                      <IconComponent size={16} />
                      <span>{r.label.split("/")[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Subtitle and Fill Demo helper */}
              <div className="login-role-helper-row">
                <span className="login-role-subtext">
                  {activeRoleConfig.subtitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleFillDemo(activeRoleConfig)}
                  className="fill-demo-link"
                >
                  Fill demo credentials
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form: Email and Password Fields */}
            <form className="exact-login-form" onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email address
                </label>
                <div className="input-with-icon">
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder={activeRoleConfig.demoEmail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <Mail size={16} className="input-left-icon" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <div className="input-with-icon password-field">
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    className="form-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <Lock size={16} className="input-left-icon" />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Full-width emerald-green Login button */}
              <button
                id="login-submit-btn"
                type="submit"
                className="btn-exact-login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as {activeRoleConfig.label.split("/")[0].trim()}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Existing Registration & Public Navigation Links */}
            <div className="login-card-footer">
              <p>New citizen complainant?</p>
              <button
                id="login-register-link-btn"
                className="btn-create-account"
                onClick={() => navigate("/register")}
              >
                Create New Citizen Account
              </button>

              <Link to="/" className="login-return-home">
                <ArrowLeft size={15} />
                <span>Back to Public Website</span>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;