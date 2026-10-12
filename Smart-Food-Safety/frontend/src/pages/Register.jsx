import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { getApiUrl } from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6)          { setError("Password must be at least 6 characters."); return; }

    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Registration failed."); return; }
      setSuccess(true);
    } catch {
      setError("Cannot connect to backend. Please ensure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-page animate-fade-in">
        <div className="register-card">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle2 size={38} color="var(--color-success)" />
            </div>
            <h2>Account Created!</h2>
            <p style={{ color: "var(--color-secondary)", marginBottom: "var(--space-6)" }}>
              Your customer account has been created successfully. You can now log in.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/login")}
              style={{ width: "100%" }}
            >
              Proceed to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page animate-fade-in">
      <div className="register-card animate-fade-in-up">

        {/* Header */}
        <div className="register-header">
          <div className="register-logo">
            <ShieldCheck size={26} color="var(--color-primary)" />
          </div>
          <h1>Create Account</h1>
          <p>Join FoodSafe AI as a customer to report and track food safety complaints</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "var(--space-5)" }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone Number</label>
            <input
              id="reg-phone"
              type="tel"
              className="form-input"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-pass">
              Password <span className="required">*</span>
            </label>
            <div className="password-field">
              <input
                id="reg-pass"
                type={showPass ? "text" : "password"}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "44px" }}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
            <label className="form-label" htmlFor="reg-confirm">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              id="reg-confirm"
              type="password"
              className="form-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating Account...</>
            ) : "Create Account"}
          </button>

        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-secondary)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
          <Link to="/" className="login-back-link" style={{ justifyContent: "center", marginTop: "var(--space-3)" }}>
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;