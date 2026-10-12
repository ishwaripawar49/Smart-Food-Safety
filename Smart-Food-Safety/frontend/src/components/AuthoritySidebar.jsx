import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileCheck,
  Search,
  ClipboardCheck,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  Sparkles,
} from "lucide-react";
import "./AdminSidebar.css";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/authority-dashboard",
  },
  {
    icon: Sparkles,
    label: "Intelligence Map",
    path: "/authority/intelligence",
  },
  {
    icon: FileCheck,
    label: "Verified Complaints",
    path: "/authority/verified-complaints",
  },
  {
    icon: Search,
    label: "Investigations",
    path: "/authority/investigations",
  },
  {
    icon: Briefcase,
    label: "My Cases",
    path: "/authority/cases",
  },
  {
    icon: ClipboardCheck,
    label: "Actions",
    path: "/authority/actions",
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/authority/reports",
  },
  {
    icon: Bell,
    label: "Notifications",
    path: "/authority/notifications",
    badge: true,
  },
];

function AuthoritySidebar({ notificationCount = 0 }) {
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      <aside className={`admin-sidebar-panel ${mobileOpen ? "open" : ""}`}>

        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">FoodSafe AI</span>
            <span className="sidebar-logo-sub">Authority Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Main Menu</span>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                onClick={() => { navigate(item.path); closeMobile(); }}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && notificationCount > 0 && (
                  <span className="sidebar-item-badge">{notificationCount}</span>
                )}
                {isActive(item.path) && (
                  <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user.name || user.email || "A")[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user.name || user.email?.split("@")[0] || "Authority"}
              </span>
              <span className="sidebar-user-role">Authorized Authority</span>
            </div>
          </div>

          <button
            className="sidebar-item sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Log Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}

export default AuthoritySidebar;
