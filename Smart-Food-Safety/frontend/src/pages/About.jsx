import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Microscope,
  Zap,
  ClipboardList,
  Users,
  CheckCircle2,
  Award,
  Scale,
  Building2,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import Navbar from "../components/Navbar";

function About() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section" style={{ padding: "80px 5% 50px" }}>
        <div className="hero-content" style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
          <div className="hero-badge animate-fade-in" style={{ margin: "0 auto 16px" }}>
            <ShieldCheck size={14} color="#15803D" />
            <span>CIVIC FOOD SAFETY INITIATIVE</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: "var(--font-size-5xl)", marginBottom: "16px" }}>
            Protecting Public Health Through Digital Transparency
          </h1>

          <p className="hero-desc" style={{ maxWidth: "760px", margin: "0 auto 24px", fontSize: "var(--font-size-lg)" }}>
            FoodSafe AI is an open civic technology and decision-support platform connecting citizens, food business operators, and regulatory officers for transparent food safety reporting, triage, and rapid assistance.
          </p>

          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto 32px",
              padding: "14px 18px",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "10px",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "#166534",
              textAlign: "left",
            }}
          >
            <strong>Regulatory Notice:</strong> FoodSafe AI is an independent community and administrative decision-support platform. It is <em>not</em> an official government agency or statutory judicial body affiliated directly with the Food Safety and Standards Authority of India (FSSAI). Reports submitted here are processed through internal triage workflows. For statutory legal complaints or formal government prosecution, please file directly through the official Government portal at{" "}
            <a
              href="https://foscos.fssai.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#15803D", fontWeight: 700, textDecoration: "underline" }}
            >
              foscos.fssai.gov.in
            </a>{" "}
            or call the National Consumer Helpline (1915).
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/submit-complaint")}
            >
              <span>File a Grievance</span>
              <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/adulteration-detection")}
            >
              <Microscope size={16} />
              <span>Explore AI Screening</span>
            </button>
          </div>
        </div>
      </section>

      {/* Trust Metric Strip */}
      <section
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
          padding: "var(--space-6) 5%",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-6)",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "800", color: "var(--color-primary)" }}>
              100%
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-secondary)", marginTop: "4px" }}>
              Statutory FSSAI DART Alignment
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "800", color: "var(--color-primary)" }}>
              200+
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-secondary)", marginTop: "4px" }}>
              Standardized Food Commodity Tests
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "800", color: "var(--color-primary)" }}>
              24-48h
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-secondary)", marginTop: "4px" }}>
              Average Verification SLA
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "800", color: "var(--color-primary)" }}>
              End-to-End
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-secondary)", marginTop: "4px" }}>
              Immutable Investigation Trail
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="features-section" style={{ padding: "60px 5%" }}>
        <div className="section-heading">
          <span>PILLARS OF GOVERNANCE</span>
          <h2>Architected for High-Integrity Food Safety</h2>
          <p>
            Combining consumer whistleblowing, rule-based rapid diagnostic testing, and regulatory enforcement.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={24} color="var(--color-primary)" />
            </div>
            <h3>Public Health Defense</h3>
            <p>
              Early detection and real-time reporting of contaminated food products, expired commodities, and unsanitary retail hygiene prevent foodborne illness outbreaks.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Microscope size={24} color="var(--color-primary)" />
            </div>
            <h3>FSSAI DART Standards</h3>
            <p>
              Standardized screening procedures from the FSSAI Detect Adulteration with Rapid Test handbook empower consumers to detect chemical adulterants at home.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} color="var(--color-primary)" />
            </div>
            <h3>Intelligent Risk Triaging</h3>
            <p>
              Automated multi-factor risk scoring categorizes severity levels, enabling immediate dispatch of Food Safety Officers to establishments with acute health risks.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Scale size={24} color="var(--color-primary)" />
            </div>
            <h3>Transparent Enforcement</h3>
            <p>
              Immutable investigation history and enforcement records guarantee accountability across inspections, improvement notices, and official laboratory sampling.
            </p>
          </div>
        </div>
      </section>

      {/* Stakeholder Framework */}
      <section className="how-section" style={{ padding: "50px 5% 70px" }}>
        <div className="section-heading">
          <span>STAKEHOLDER GOVERNANCE</span>
          <h2>Tripartite Oversight Ecosystem</h2>
          <p>Three interconnected roles working synchronously to uphold safety standards.</p>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">01</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 8px" }}>
              <Users size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0 }}>Vigilant Citizens</h3>
            </div>
            <p>
              File evidence-backed complaints with photographic records, conduct rapid household adulteration tests, and monitor investigation milestones in real-time.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 8px" }}>
              <Building2 size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0 }}>System Administrators</h3>
            </div>
            <p>
              Verify complainant details, curate licensed Food Business Operator databases, triage duplicate submissions, and forward verified dossiers to field officers.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 8px" }}>
              <Award size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0 }}>Designated Officers</h3>
            </div>
            <p>
              Conduct statutory inspections under the Food Safety and Standards Act, seize non-compliant stocks, dispatch legal samples for certified lab testing, and impose penalties.
            </p>
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

export default About;
