import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  BarChart2,
  Microscope,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import "./AdminSidebar.css";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/admin-dashboard",
  },
  {
    icon: Sparkles,
    label: "AI Intelligence",
    path: "/admin-intelligence",
  },
  {
    icon: ClipboardList,
    label: "Complaints",
    path: "/manage-complaints",
  },
  {
    icon: Store,
    label: "Food Shops",
    path: "/manage-shops",
  },
  {
    icon: Microscope,
    label: "AI Detection",
    path: "/adulteration-detection",
  },
  {
    icon: BarChart2,
    label: "Reports",
    path: "/reports",
  },
  {
    icon: Bell,
    label: "Notifications",
    path: "/admin-notifications",
    badge: true,
  },
];

function AdminSidebar({ notificationCount = 0 }) {
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
      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar-panel ${mobileOpen ? "open" : ""}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">FoodSafe AI</span>
            <span className="sidebar-logo-sub">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
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

        {/* Bottom */}
        <div className="sidebar-bottom">
          {/* User info */}
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user.name || user.email || "A")[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user.name || user.email?.split("@")[0] || "Admin"}
              </span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          </div>

          {/* Logout */}
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

export default AdminSidebar;
