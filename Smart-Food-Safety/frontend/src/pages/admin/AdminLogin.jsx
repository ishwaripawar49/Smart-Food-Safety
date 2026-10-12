import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import {
  login, getToken, getCurrentUser, logout
} from "../../services/authService";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [existingUser, setExistingUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getCurrentUser()
        .then((u) => { if (u) setExistingUser(u); })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please enter both email and password."); return; }
    try {
      setLoading(true);
      const data = await login(email.trim(), password);
      if (data.user?.role !== "ADMIN") { logout(); setError("Access denied. Admin credentials required."); return; }
      navigate("/admin-dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid admin credentials. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-login-page animate-fade-in">
      <div className="admin-login-card animate-fade-in-up">

        <div className="admin-login-header">
          <div className="admin-login-icon">
            <Lock size={28} color="var(--color-primary)" />
          </div>
          <div className="admin-login-role-badge role-admin">
            <ShieldCheck size={12} />
            Admin Portal
          </div>
          <h1>Administrator Login</h1>
          <p>Access the FoodSafe AI admin control panel</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "var(--space-5)" }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              className="form-input"
              placeholder="admin@foodsafety.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
            <label className="form-label" htmlFor="admin-pass">Password</label>
            <div className="password-field">
              <input
                id="admin-pass"
                type={showPass ? "text" : "password"}
                className="form-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: "44px" }}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Authenticating...</> : "Login as Administrator"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-5)" }}>
          <Link to="/" className="login-back-link" style={{ justifyContent: "center" }}>
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}

export default AdminLogin;