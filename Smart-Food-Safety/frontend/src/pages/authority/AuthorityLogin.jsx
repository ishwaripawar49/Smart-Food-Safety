import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Building2 } from "lucide-react";
import {
  login,
  getToken,
  getCurrentUser,
  logout,
} from "../../services/authService";

function AuthorityLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUser()
        .then((user) => {
          if (user) setExistingUser(user);
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both official email and credential passkey.");
      return;
    }

    try {
      setLoading(true);
      const data = await login(email.trim(), password);

      if (data.user?.role !== "AUTHORIZED_AUTHORITY") {
        logout();
        setError("Access denied. Authorized Authority credentials required.");
        return;
      }

      navigate("/authority-dashboard", { replace: true });
    } catch (err) {
      console.error("AUTHORITY LOGIN ERROR:", err);
      setError(err.message || "Invalid authority credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card animate-fade-in">
        {/* Brand Crest */}
        <div className="admin-login-logo">
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-lg)",
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto var(--space-3)",
            }}
          >
            <Building2 size={30} color="#fff" />
          </div>
          <h1>Authorized Authority</h1>
          <p>Food Safety Field Officer & Investigation Portal</p>
        </div>

        {/* Official Role Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(220, 252, 231, 0.15)",
            border: "1px solid rgba(220, 252, 231, 0.3)",
            color: "#86efac",
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.5px",
            marginBottom: "var(--space-5)",
          }}
        >
          <ShieldCheck size={13} />
          <span>AUTHORIZED INSPECTION ACCESS ONLY</span>
        </div>

        {/* Error notice */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(220, 38, 38, 0.2)",
              border: "1px solid rgba(220, 38, 38, 0.4)",
              borderRadius: "var(--radius-md)",
              color: "#fca5a5",
              fontSize: "var(--font-size-sm)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <div className="form-group">
            <label
              className="form-label"
              style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px" }}
            >
              Official Department Email
            </label>
            <input
              type="email"
              className="form-control"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
              }}
              placeholder="authority@foodsafety.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px" }}
            >
              Access Passkey
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                className="form-control"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  paddingRight: "40px",
                }}
                placeholder="Enter regulatory passkey"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "var(--space-3)",
              padding: "12px",
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: "16px", height: "16px" }} />
                <span>Authenticating Officer...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Enter Authority Command Portal</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "var(--space-5)", textAlign: "center" }}>
          <Link
            to="/"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            &larr; Return to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthorityLogin;