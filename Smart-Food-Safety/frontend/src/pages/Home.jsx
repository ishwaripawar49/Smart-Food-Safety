import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  MapPin,
  Mic,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  FileCheck2,
  Microscope,
} from "lucide-react";
import Navbar from "../components/Navbar";

// High-resolution clean hero background image & responsive assets
import heroBg2400Webp from "../assets/images/foodsafe-hero-background-2400.webp";
import heroBg2400Jpg from "../assets/images/foodsafe-hero-background-2400.jpg";
import heroBgWebp from "../assets/images/foodsafe-hero-background.webp";
import heroBgJpg from "../assets/images/foodsafe-hero-background.jpg";
import heroMobileWebp from "../assets/images/foodsafe-hero-mobile.webp";
import heroMobileJpg from "../assets/images/foodsafe-hero-mobile.jpg";
import circleVegWebp from "../assets/circle-vegetables.webp";
import circleVegJpg from "../assets/circle-vegetables.jpg";
import circleDairyWebp from "../assets/circle-dairy.webp";
import circleDairyJpg from "../assets/circle-dairy.jpg";
import circleGrainsWebp from "../assets/circle-grains.webp";
import circleGrainsJpg from "../assets/circle-grains.jpg";
import circleSpicesWebp from "../assets/circle-spices.webp";
import circleSpicesJpg from "../assets/circle-spices.jpg";

// ===================================================
// HOME PAGE — FoodSafe AI 2.0 Exact Reference Design
// ===================================================

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">

      {/* ==================== 1. WHITE NAVBAR WITH GREEN LOGO & LOGIN BUTTON ==================== */}
      <Navbar />

      {/* ==================== 2. APPROVED HERO BACKGROUND SECTION ==================== */}
      <section className="hero-section exact-hero-section approved-hero-bg-section">
        {/* Background Artwork Layer with clean ultra-high-resolution garden basket photograph */}
        <div className="hero-artwork-bg" aria-hidden="true">
          <picture>
            <source media="(min-width: 1400px)" srcSet={heroBg2400Webp} type="image/webp" />
            <source media="(min-width: 1400px)" srcSet={heroBg2400Jpg} type="image/jpeg" />
            <source srcSet={heroBgWebp} type="image/webp" />
            <img
              src={heroBgJpg}
              alt="Fresh garden vegetable basket on light wooden table"
              className="hero-artwork-bg-img"
              fetchPriority="high"
            />
          </picture>
          <div className="hero-artwork-gradient-overlay" />
        </div>

        <div className="hero-inner exact-hero-inner">

          {/* Left Content */}
          <div className="hero-content exact-hero-content">

            {/* Small green introductory badge */}
            <div className="hero-intro-badge">
              <ShieldCheck size={14} color="#0d6b3d" />
              <span>Smart Food Safety Platform</span>
            </div>

            {/* Large dark-green heading */}
            <h1 className="hero-exact-headline">
              Safer Food for <br className="hero-br" />
              <span>Healthier Communities</span>
            </h1>

            {/* Supporting paragraph */}
            <p className="hero-exact-desc">
              Report food safety concerns, identify possible adulteration, and
              help build safer food practices for everyone.
            </p>

            {/* Buttons: Solid emerald-green and white outlined */}
            <div className="hero-exact-buttons">
              <button
                id="hero-report-btn"
                className="btn-exact-primary"
                onClick={() => navigate("/submit-complaint")}
              >
                <FileText size={18} />
                <span>Report Food Problem</span>
              </button>

              <button
                id="hero-easy-complaint-btn"
                className="btn-exact-outline"
                onClick={() => navigate("/easy-complaint")}
              >
                <Sparkles size={18} color="#0d6b3d" />
                <span>FoodSafe Easy</span>
                <span className="btn-easy-pill">सोपी पद्धत</span>
              </button>

              <button
                className="btn-exact-ghost"
                onClick={() => navigate("/about")}
              >
                <span>How It Works</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Trust checkmarks */}
            <div className="hero-trust-row">
              {[
                "Easy Complaint Reporting",
                "Real-time Status Tracking",
                "AI Adulteration Screening",
              ].map((t) => (
                <div key={t} className="hero-trust-item">
                  <CheckCircle2 size={15} color="#0d6b3d" />
                  <span>{t}</span>
                </div>
              ))}
            </div>

            {/* Mobile-only artwork view with the crisp vegetable basket and slogan */}
            <div className="hero-artwork-mobile-view" aria-hidden="true">
              <div className="hero-decorative-slogan mobile-slogan" aria-label="Safe Food, Healthy People, Stronger Communities">
                <div className="slogan-badge-cluster">
                  <svg className="slogan-leaf-icon" viewBox="0 0 32 32" width="22" height="22" fill="none">
                    <path d="M8 24C8 14 16 6 27 4C24 15 16 23 8 24Z" fill="#1b5e20" opacity="0.9" />
                    <path d="M4 20C4 13 10 7 18 6C16 14 10 19 4 20Z" fill="#2e7d32" opacity="0.75" />
                  </svg>
                  <div className="slogan-script-lines">
                    <span className="slogan-line slogan-line-1">Safe Food</span>
                    <span className="slogan-line slogan-line-2">Healthy People</span>
                    <span className="slogan-line slogan-line-3">Stronger Communities</span>
                  </div>
                </div>
                <svg className="slogan-curved-underline" viewBox="0 0 200 14" width="150" height="12" fill="none">
                  <path d="M4 4C50 12 120 12 146 4" stroke="#155724" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <picture>
                <source srcSet={heroMobileWebp} type="image/webp" />
                <img
                  src={heroMobileJpg}
                  alt="Fresh garden vegetable basket on light wooden tabletop"
                  className="hero-mobile-artwork-img"
                  loading="lazy"
                />
              </picture>
            </div>

          </div>

          {/* Right Column: Decorative Slogan positioned over the soft background above the vegetable basket */}
          <div className="hero-artwork-right-col" aria-hidden="true">
            <div className="hero-decorative-slogan" aria-label="Safe Food, Healthy People, Stronger Communities">
              <div className="slogan-badge-cluster">
                <svg className="slogan-leaf-icon" viewBox="0 0 32 32" width="28" height="28" fill="none">
                  <path d="M8 24C8 14 16 6 27 4C24 15 16 23 8 24Z" fill="#1b5e20" opacity="0.9" />
                  <path d="M4 20C4 13 10 7 18 6C16 14 10 19 4 20Z" fill="#2e7d32" opacity="0.75" />
                </svg>
                <div className="slogan-script-lines">
                  <span className="slogan-line slogan-line-1">Safe Food</span>
                  <span className="slogan-line slogan-line-2">Healthy People</span>
                  <span className="slogan-line slogan-line-3">Stronger Communities</span>
                </div>
              </div>
              <svg className="slogan-curved-underline" viewBox="0 0 200 14" width="195" height="14" fill="none">
                <path d="M4 4C60 13 148 13 194 4" stroke="#155724" strokeWidth="2.75" strokeLinecap="round" />
              </svg>
            </div>
          </div>

        </div>
      </section>

      {/* ==================== 3. FOUR WHITE FEATURE CARDS WITH CIRCULAR ICONS ==================== */}
      <section className="features-section exact-features-section">
        <div className="features-inner">

          <div className="section-heading">
            <span>PLATFORM CAPABILITIES</span>
            <h2>One Platform for Safer Food</h2>
            <p>
              Simple, powerful tools to report, monitor, and manage food safety
              concerns at every level.
            </p>
          </div>

          <div className="features-exact-grid">
            {[
              {
                id: "feat-file-complaint",
                icon: FileText,
                title: "File a Complaint",
                desc: "Submit food safety grievances with shop details, photos, and invoice receipts for immediate administrative review.",
                link: "/submit-complaint",
                linkText: "Start Complaint Form",
                iconBg: "#e8f5e9", // Green circular icon
                iconColor: "#1b5e20",
                badge: "Standard Flow",
              },
              {
                id: "feat-add-location",
                icon: MapPin,
                title: "Add Location",
                desc: "Pinpoint roadside vendors, stalls, or registered restaurants using automated GPS and interactive map geolocation.",
                link: "/easy-complaint",
                linkText: "Locate & Report",
                iconBg: "#fff3e0", // Orange circular icon
                iconColor: "#e65100",
                badge: "GPS & Maps",
              },
              {
                id: "feat-use-voice",
                icon: Mic,
                title: "Use Your Voice",
                desc: "Report concerns hands-free in Marathi, Hindi, or English using built-in speech recognition and voice guidance.",
                link: "/easy-complaint",
                linkText: "Try Voice Input",
                iconBg: "#f3e5f5", // Purple circular icon
                iconColor: "#7b1fa2",
                badge: "Voice Enabled",
              },
              {
                id: "feat-create-change",
                icon: ShieldCheck,
                title: "Help Create Change",
                desc: "Empower local communities, access AI adulteration screening, and track real-time resolution from inspection to closure.",
                link: "/track-complaint",
                linkText: "Track Your Complaint",
                iconBg: "#e3f2fd", // Blue circular icon
                iconColor: "#1565c0",
                badge: "Community Shield",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  id={card.id}
                  className="exact-feature-card"
                  onClick={() => navigate(card.link)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(card.link)}
                >
                  {/* Circular icon with specific color */}
                  <div
                    className="feature-circular-icon"
                    style={{ background: card.iconBg }}
                  >
                    <Icon size={28} color={card.iconColor} />
                  </div>

                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>

                  <div className="feature-card-cta">
                    <span>{card.linkText}</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ==================== 4. WHY FOODSAFE AI & OVERLAPPING CIRCULAR IMAGES ==================== */}
      <section className="why-section exact-why-section">
        <div className="why-inner">

          <div className="why-exact-layout">

            {/* Left Column: Overlapping Circular Images (Vegetables, Dairy, Grains, Spices) */}
            <div className="why-circles-col">
              <div className="overlapping-circles-container">

                <div className="circle-card circle-1" title="Fresh Vegetables">
                  <picture>
                    <source srcSet={circleVegWebp} type="image/webp" />
                    <img
                      src={circleVegJpg}
                      alt="Fresh Vegetables: broccoli, lettuce, and tomatoes"
                      className="circle-img"
                      loading="lazy"
                      width="180"
                      height="180"
                    />
                  </picture>
                  <span className="circle-caption">Vegetables</span>
                </div>

                <div className="circle-card circle-2" title="Pure Dairy">
                  <picture>
                    <source srcSet={circleDairyWebp} type="image/webp" />
                    <img
                      src={circleDairyJpg}
                      alt="Pure Dairy: farm milk and fresh paneer"
                      className="circle-img"
                      loading="lazy"
                      width="180"
                      height="180"
                    />
                  </picture>
                  <span className="circle-caption">Dairy</span>
                </div>

                <div className="circle-card circle-3" title="Whole Grains">
                  <picture>
                    <source srcSet={circleGrainsWebp} type="image/webp" />
                    <img
                      src={circleGrainsJpg}
                      alt="Whole Grains: golden wheat and rice"
                      className="circle-img"
                      loading="lazy"
                      width="180"
                      height="180"
                    />
                  </picture>
                  <span className="circle-caption">Grains</span>
                </div>

                <div className="circle-card circle-4" title="Natural Spices">
                  <picture>
                    <source srcSet={circleSpicesWebp} type="image/webp" />
                    <img
                      src={circleSpicesJpg}
                      alt="Natural Spices: turmeric, cinnamon, and cloves"
                      className="circle-img"
                      loading="lazy"
                      width="180"
                      height="180"
                    />
                  </picture>
                  <span className="circle-caption">Spices</span>
                </div>

              </div>

              {/* Informational banner underneath overlapping circles */}
              <div className="circles-banner-card">
                <ShieldCheck size={20} color="#0d6b3d" />
                <div>
                  <strong>Wholesome • Pure • Safe</strong>
                  <p>Comprehensive safety monitoring across every food group</p>
                </div>
              </div>
            </div>

            {/* Right Column: Informational Content & 4 Pillars */}
            <div className="why-info-col">
              <span className="why-kicker">COMMUNITY &amp; SAFETY OVERSIGHT</span>
              <h2 className="why-main-title">Why FoodSafe AI?</h2>
              <p className="why-summary-text">
                FoodSafe AI bridges consumers, safety reviewers, and responsible food operators
                with explainable AI intelligence, transparent complaint resolution, and accessible
                multilingual tools.
              </p>

              <div className="why-pillars-grid">
                {[
                  {
                    icon: AlertTriangle,
                    title: "Report Unsafe Food",
                    desc: "Quickly flag spoiled items, foreign objects, poor hygiene, or unlisted roadside stalls with photographic evidence.",
                    color: "#dc2626",
                    bg: "#fef2f2",
                  },
                  {
                    icon: FileCheck2,
                    title: "Support Food Safety Review",
                    desc: "Facilitate transparent documentation and sample evidence routing to designated administrative review officers.",
                    color: "#16a34a",
                    bg: "#f0fdf4",
                  },
                  {
                    icon: Microscope,
                    title: "Explainable AI Insights",
                    desc: "Screen ingredients and visual adulteration indicators with instant risk scoring, forensic guides, and testing cues.",
                    color: "#7b1fa2",
                    bg: "#f3e5f5",
                  },
                  {
                    icon: Users,
                    title: "Healthier Communities",
                    desc: "Protect families and encourage responsible food handling standards across schools, markets, and neighborhoods.",
                    color: "#1565c0",
                    bg: "#e3f2fd",
                  },
                ].map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.title} className="why-pillar-card">
                      <div
                        className="why-pillar-icon"
                        style={{ background: pillar.bg }}
                      >
                        <Icon size={20} color={pillar.color} />
                      </div>
                      <div>
                        <h4>{pillar.title}</h4>
                        <p>{pillar.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Regulatory Notice Card */}
              <div className="why-regulatory-note">
                <strong>Platform Notice:</strong> FoodSafe AI is an independent community
                decision-support platform. Submissions are internal reports for verification,
                triage, and educational food safety screening.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================== 5. HOW IT WORKS WORKFLOW ==================== */}
      <section className="how-section">
        <div className="how-inner">

          <div className="section-heading">
            <span>SIMPLE PROCESS</span>
            <h2>How Our Platform Works</h2>
          </div>

          <div className="steps-grid">
            {[
              {
                num: "01",
                icon: FileText,
                title: "Report",
                desc: "Submit a food safety complaint with details and photographic evidence.",
                active: true,
              },
              {
                num: "02",
                icon: Clock,
                title: "Review",
                desc: "Admin reviews and verifies the complaint, then routes it to the appropriate authority.",
                active: false,
              },
              {
                num: "03",
                icon: Microscope,
                title: "Investigate",
                desc: "Authorized authorities investigate the case and assess risk levels.",
                active: false,
              },
              {
                num: "04",
                icon: CheckCircle2,
                title: "Resolve",
                desc: "Actions are taken, the complainant is notified, and the case is closed.",
                active: false,
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className={`step-item ${step.active ? "active-step" : ""}`}>
                  <div className="step-number">
                    <Icon size={22} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ==================== 6. DEEP-GREEN FOOTER ==================== */}
      <footer className="exact-deep-footer">
        <div className="footer-inner">

          <div className="footer-top">

            <div className="footer-brand">
              <div className="footer-logo-title">
                <ShieldCheck size={24} color="#86efac" />
                <span>FoodSafe AI 2.0</span>
              </div>
              <p>
                A comprehensive digital platform for food safety complaint
                reporting, monitoring, and resolution in partnership with
                food safety authorities.
              </p>
            </div>

            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/">Home</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>

            <div className="footer-col">
              <h4>Services</h4>
              <Link to="/submit-complaint">File a Complaint</Link>
              <Link to="/track-complaint">Track Complaint</Link>
              <Link to="/adulteration-detection">AI Screening</Link>
            </div>

            <div className="footer-col">
              <h4>Access</h4>
              <Link to="/login">Citizen Login</Link>
              <Link to="/admin-login">Admin Panel</Link>
              <Link to="/authority-login">Authority Portal</Link>
            </div>

          </div>

          <div className="footer-disclaimer-box">
            <strong>Regulatory Disclaimer:</strong> FoodSafe AI is an independent community and administrative decision-support platform. Submissions are internal reports for verification and administrative triage. FoodSafe AI is not an official government body, statutory tribunal, or direct affiliate of the Food Safety and Standards Authority of India (FSSAI). For official statutory consumer grievances or formal regulatory proceedings, citizens should submit directly via the official government portal at{" "}
            <a
              href="https://foscos.fssai.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#86efac", textDecoration: "underline" }}
            >
              https://foscos.fssai.gov.in
            </a>{" "}
            or National Consumer Helpline (1915).
          </div>

          <div className="footer-bottom">
            <span>© 2026 FoodSafe AI Platform. All rights reserved.</span>
            <span>Built for public food safety transparency.</span>
          </div>

        </div>
      </footer>

    </div>
  );
}

export default Home;