import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  Search,
  Microscope,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Home,
} from "lucide-react";
import "./AdminSidebar.css";
import { logout } from "../services/authService";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/customer-dashboard",
  },
  {
    icon: FilePlus2,
    label: "File Complaint",
    path: "/submit-complaint",
  },
  {
    icon: Search,
    label: "Track Complaint",
    path: "/track-complaint",
  },
  {
    icon: Microscope,
    label: "AI Screening",
    path: "/adulteration-detection",
  },
  {
    icon: Bell,
    label: "Notifications",
    path: "/notifications",
    badge: true,
  },
];

function CustomerSidebar({ notificationCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user.name || user.email?.split("@")[0] || "Customer";
  const userInitials = displayName.charAt(0).toUpperCase();
  const isActive = (path) => location.pathname === path;
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      {/* Sidebar Panel */}
      <aside className={`admin-sidebar-panel ${mobileOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div
          className="sidebar-logo"
          onClick={() => {
            navigate("/customer-dashboard");
            closeMobile();
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="sidebar-logo-icon">
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">FoodSafe AI</span>
            <span className="sidebar-logo-sub">Citizen Portal</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Citizen Services</span>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                className={`sidebar-item ${active ? "active" : ""}`}
                onClick={() => {
                  navigate(item.path);
                  closeMobile();
                }}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && notificationCount > 0 && (
                  <span className="sidebar-item-badge">{notificationCount}</span>
                )}
                {active && (
                  <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                )}
              </button>
            );
          })}

          <span className="sidebar-section-label" style={{ marginTop: "16px" }}>
            General
          </span>
          <button
            className="sidebar-item"
            onClick={() => {
              navigate("/");
              closeMobile();
            }}
          >
            <Home size={17} />
            <span>Public Website</span>
          </button>
        </nav>

        {/* User Info & Logout Footer */}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">Verified Citizen</span>
            </div>
          </div>

          <button
            className="sidebar-item sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default CustomerSidebar;
