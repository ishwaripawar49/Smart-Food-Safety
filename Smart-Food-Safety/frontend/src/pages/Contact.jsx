import { useState } from "react";
import { Link } from "react-router-dom";
import {
  PhoneCall,
  Mail,
  Building2,
  Clock,
  Send,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="home-page">
      <Navbar />

      {/* Hero Header */}
      <section className="hero-section" style={{ padding: "70px 5% 40px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <div className="hero-badge" style={{ margin: "0 auto 16px" }}>
            <PhoneCall size={14} color="#15803D" />
            <span>CONSUMER DESK & REGULATORY ASSISTANCE</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: "var(--font-size-4xl)", marginBottom: "16px" }}>
            Contact the Food Safety Desk
          </h1>

          <p className="hero-desc" style={{ maxWidth: "680px", margin: "0 auto", fontSize: "var(--font-size-lg)" }}>
            Have questions regarding filing an official grievance, merchant licensing compliance, or rapid testing procedures? Our oversight coordinators are available to help.
          </p>
        </div>
      </section>

      {/* Main Support Grid */}
      <section style={{ padding: "20px 5% 70px" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)",
            gap: "var(--space-8)",
            alignItems: "start",
          }}
        >
          {/* Support Channels Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
                    National Consumer Grievance Helpline
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Toll-Free Helpline</span>
                </div>
              </div>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "800", color: "var(--color-primary-dark)", margin: "8px 0" }}>
                1800-112-100
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--font-size-xs)", color: "var(--color-secondary)" }}>
                <Clock size={14} />
                <span>Mon – Fri: 09:00 to 18:00 IST</span>
              </div>
            </div>

            <div className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-info-bg)",
                    color: "var(--color-info)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
                    Official Regulatory Email
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Digital Helpdesks</span>
                </div>
              </div>
              <p style={{ margin: "6px 0 2px", fontSize: "var(--font-size-sm)", color: "var(--color-body)" }}>
                Citizen Support: <strong>support@foodsafety.gov.in</strong>
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-body)" }}>
                Statutory Compliance: <strong>compliance@foodsafety.gov.in</strong>
              </p>
            </div>

            <div className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: "#FEF3C7",
                    color: "#B45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-base)" }}>
                    Central Administrative Directorate
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>National Headquarters</span>
                </div>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-secondary)", lineHeight: "1.5" }}>
                FDA Bhawan, Kotla Road, New Delhi – 110002, India
              </p>
            </div>
          </div>

          {/* Interactive Message Form */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: "var(--font-size-2xl)", color: "var(--color-heading)" }}>
              Submit an Inquiry
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "var(--font-size-sm)", color: "var(--color-secondary)" }}>
              Our dedicated public desk coordinates all inquiries and responds within 24 hours.
            </p>

            {submitted ? (
              <div
                className="animate-fade-in"
                style={{
                  padding: "var(--space-6)",
                  background: "var(--color-success-bg)",
                  border: "1px solid var(--color-success-border)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "var(--color-success)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto var(--space-3)",
                  }}
                >
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ margin: "0 0 8px", color: "var(--color-heading)" }}>
                  Inquiry Dispatched Successfully
                </h3>
                <p style={{ margin: "0 0 16px", color: "var(--color-body)", fontSize: "var(--font-size-sm)" }}>
                  A confirmation email has been logged. An assigned support specialist will respond to {formData.email}.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: "", email: "", subject: "", message: "" });
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Rajesh Sharma"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., rajesh@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Question about complaint tracking or lab verification"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Message Description <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    className="form-control"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry with relevant details..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                >
                  <Send size={16} />
                  <span>Send Message to Support Desk</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: "800", color: "var(--color-heading)", fontSize: "16px" }}>
              FoodSafe AI
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--color-secondary)", fontSize: "13px" }}>
            Smart Food Safety Complaint & Regulatory Monitoring Platform
          </p>
        </div>

        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Sign In</Link>
          <Link to="/register">Create Account</Link>
        </div>

        <p className="copyright">© 2026 FoodSafe AI Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Contact;