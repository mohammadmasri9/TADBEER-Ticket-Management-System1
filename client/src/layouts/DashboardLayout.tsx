// src/layouts/DashboardLayout.tsx
import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../style/DashboardLayout.css";

import {
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  FolderOpen,
  Archive,
  RotateCcw,
  Star,
  Trash2,
  Users,
  GraduationCap,
} from "lucide-react";

// ✅ Global Floating AI Assistant (connected to backend now)
import AIFloatingAssistant from "../components/AIFloatingAssistant";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const ticketNavItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: <ChevronRight size={16} />, path: "/dashboard" },
    { id: "active", label: "Active tickets", icon: <FileText size={16} />, path: "/active-tickets" },
    { id: "pending", label: "Pending tasks", icon: <Clock size={16} />, path: "/pending-tasks" },
    { id: "completed", label: "Completed", icon: <CheckCircle size={16} />, path: "/completed" },
    { id: "team", label: "Team projects", icon: <FolderOpen size={16} />, path: "/team-projects" },
    { id: "archived", label: "Archived tickets", icon: <Archive size={16} />, path: "/archived" },
    { id: "recent", label: "Recent updates", icon: <RotateCcw size={16} />, path: "/recent-updates" },
    { id: "favorites", label: "Favorites", icon: <Star size={16} />, path: "/favorites" },
    { id: "recycle", label: "Recycle bin", icon: <Trash2 size={16} />, path: "/recycle-bin" },
  ];

  const sharedItems: NavItem[] = [
    { id: "shared-team", label: "Team", icon: <Users size={16} />, path: "/shared/team" },
    { id: "shared-training", label: "Training", icon: <GraduationCap size={16} />, path: "/shared/training" },
  ];

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const handleOverlayClick = () => closeSidebar();

  const handleLinkClick = () => {
    if (isMobile) closeSidebar();
  };

  const goToCreateTicket = () => {
    handleLinkClick();
    navigate("/createticket");
  };

  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();

    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("/tickets") && !path.includes("create")) return "My Tickets";
    if (path.includes("kanban")) return "Kanban Board";
    if (path.includes("createticket") || path.includes("create-ticket")) return "Create Ticket";
    if (path.includes("admin/users")) return "Manage Users";
    if (path.includes("admin/adduser")) return "Add User";
    if (path.includes("admin/sla")) return "SLA Management";
    if (path.includes("reports")) return "Reports";
    if (path.includes("profile")) return "Profile";
    if (path.includes("notifications")) return "Notifications";

    if (path.includes("completed")) return "Completed Tickets";
    if (path.includes("active")) return "Active Tickets";
    if (path.includes("pending")) return "Pending Tasks";
    if (path.includes("overview")) return "Overview";
    if (path.includes("team-projects")) return "Team Projects";
    if (path.includes("archived")) return "Archived Tickets";
    if (path.includes("recent-updates")) return "Recent Updates";
    if (path.includes("favorites")) return "Favorites";
    if (path.includes("recycle-bin")) return "Recycle Bin";

    return "Dashboard";
  };

  return (
    <div className="dashboard-layout">
      <Header
        title={getPageTitle()}
        showSearch={true}
        onMenuToggle={handleToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Ticket management</h3>

          <nav className="sidebar-nav">
            {ticketNavItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Shared tickets</h3>

          <nav className="sidebar-nav">
            {sharedItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={handleLinkClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="btn-create-ticket" onClick={goToCreateTicket} type="button">
            Create ticket
          </button>
        </div>
      </aside>

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={handleOverlayClick} aria-hidden="true" />
      )}

      <main className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <Outlet />

      </main>

      {/* ✅ Global AI Floating Icon (connected to backend) */}
      <AIFloatingAssistant />
    </div>
  );
};

export default DashboardLayout;
