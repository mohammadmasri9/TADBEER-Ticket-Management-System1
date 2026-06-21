// src/components/Header.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../style/Header.css";

import {
  Search,
  Bell,
  Settings,
  User,
  ChevronDown,
  LogOut,
  UserCircle,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";

import tadbeerLogo from "../assets/images/tadbeer-logo.png";
import ooredooLogo from "../assets/images/ooredoo-logo.png";

// ✅ Notifications API (keep same style as Dashboard imports)
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationDTO,
} from "../../api/notifications";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return date.toLocaleDateString();
}

const Header: React.FC<HeaderProps> = ({
  title = "Dashboard",
  showSearch = true,
  onMenuToggle,
  sidebarOpen = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ----- UI state -----
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // ----- Notifications state -----
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");

  // refs for outside click
  const searchRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // supports Mongo _id or id from auth context
  const userId = (user as any)?._id || (user as any)?.id || (user as any)?.userId;

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const displayName = useMemo(() => {
    const name = (user as any)?.name || "User";
    return name.length > 15 ? `${name.slice(0, 15)}...` : name;
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setProfileOpen(false);
    setNotificationOpen(false);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // TODO: implement search routing later
    console.log("Searching for:", q);
    setSearchOpen(false);
  };

  // ✅ Retry function (simple + stable)
  const retryNotifications = async () => {
    try {
      setNotifLoading(true);
      setNotifError("");
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setNotifError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load notifications"
      );
    } finally {
      setNotifLoading(false);
    }
  };

  // ✅ Fetch on mount / user change (Dashboard style)
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    (async () => {
      try {
        setNotifLoading(true);
        setNotifError("");
        const data = await getNotifications();
        if (!mounted) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        setNotifError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load notifications"
        );
      } finally {
        if (mounted) setNotifLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ Refresh when dropdown opens (Dashboard style)
  useEffect(() => {
    if (!notificationOpen || !userId) return;

    let mounted = true;

    (async () => {
      try {
        setNotifLoading(true);
        setNotifError("");
        const data = await getNotifications();
        if (!mounted) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        setNotifError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load notifications"
        );
      } finally {
        if (mounted) setNotifLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationOpen, userId]);

  const handleMarkAllRead = async () => {
    try {
      setNotifError("");
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e: any) {
      setNotifError(
        e?.response?.data?.message || e?.message || "Failed to mark all as read"
      );
    }
  };

  const handleOpenNotification = async (n: NotificationDTO) => {
    try {
      setNotifError("");

      // optimistic mark read
      if (!n.isRead) {
        setNotifications((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
        );
        await markNotificationAsRead(n._id);
      }

      // navigate if link exists
      if (n.link) {
        setNotificationOpen(false);
        navigate(n.link);
      }
    } catch (e: any) {
      setNotifError(
        e?.response?.data?.message || e?.message || "Failed to open notification"
      );
    }
  };

  // ✅ close dropdowns on outside click
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (searchOpen && searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (
        notificationOpen &&
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setNotificationOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [searchOpen, notificationOpen, profileOpen]);

  // ✅ ESC closes all
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left */}
        <div className="header-left">
          <button
            className="menu-toggle-btn"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            type="button"
          >
            {sidebarOpen ? (
              <X size={24} strokeWidth={2} />
            ) : (
              <Menu size={24} strokeWidth={2} />
            )}
          </button>

          <div
            className="header-logo"
            onClick={() => navigate("/dashboard")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/dashboard")}
          >
            <img src={tadbeerLogo} alt="Tadbeer Logo" className="logo-image" />
          </div>
        </div>

        {/* Center */}
        <div className="header-center">
          <div className="header-brand">
            <span className="powered-by">POWERED BY</span>
            <img src={ooredooLogo} alt="Ooredoo" className="ooredoo-logo" />
          </div>
        </div>

        {/* Right */}
        <div className="header-right">
          {/* Search */}
          {showSearch && (
            <div
              ref={searchRef}
              className={`header-search ${searchOpen ? "open" : ""}`}
            >
              <button
                className="header-icon-btn search-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchOpen((p) => !p);
                  setNotificationOpen(false);
                  setProfileOpen(false);
                }}
                aria-label="Search"
                type="button"
              >
                <Search size={20} strokeWidth={2} />
              </button>

              {searchOpen && (
                <form onSubmit={handleSearchSubmit} className="search-form">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search tickets, users, reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Notifications */}
          <div ref={notifRef} className="header-dropdown">
            <button
              className="header-icon-btn notification-btn"
              onClick={(e) => {
                e.stopPropagation();
                setNotificationOpen((p) => !p);
                setProfileOpen(false);
                setSearchOpen(false);
              }}
              aria-label="Notifications"
              type="button"
            >
              <Bell size={20} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {notificationOpen && (
              <div className="dropdown-menu notifications-menu">
                <div className="dropdown-header">
                  <h3>Notifications</h3>
                  <button
                    className="mark-read-btn"
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={notifications.length === 0 || unreadCount === 0}
                    style={{ opacity: notifications.length === 0 || unreadCount === 0 ? 0.6 : 1 }}
                  >
                    Mark all as read
                  </button>
                </div>

                <div className="dropdown-body">
                  {notifLoading ? (
                    <div className="empty-notifications">
                      <Bell size={48} strokeWidth={1} />
                      <p>Loading...</p>
                    </div>
                  ) : notifError ? (
                    <div className="empty-notifications">
                      <Bell size={48} strokeWidth={1} />
                      <p style={{ marginBottom: 10 }}>{notifError}</p>
                      <button
                        type="button"
                        className="view-all-btn"
                        onClick={retryNotifications}
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <button
                        key={notif._id}
                        type="button"
                        className={`notification-item ${
                          !notif.isRead ? "unread" : ""
                        }`}
                        onClick={() => handleOpenNotification(notif)}
                        style={{ width: "100%", textAlign: "left" }}
                      >
                        <div className="notification-icon">
                          <Bell size={16} />
                        </div>

                        <div className="notification-content">
                          <h4>{notif.title}</h4>
                          <p>{notif.message}</p>
                          <span className="notification-time">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-notifications">
                      <Bell size={48} strokeWidth={1} />
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>

                <div className="dropdown-footer">
                  <button
                    className="view-all-btn"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate("/notifications");
                    }}
                    type="button"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            className="header-icon-btn"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            type="button"
          >
            <Settings size={20} strokeWidth={2} />
          </button>

          {/* Profile */}
          <div ref={profileRef} className="header-dropdown">
            <button
              className="header-profile-btn"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen((p) => !p);
                setNotificationOpen(false);
                setSearchOpen(false);
              }}
              aria-label="Profile"
              type="button"
            >
              <div className="profile-avatar">
                <User size={18} strokeWidth={2} />
              </div>

              <div className="profile-info">
                <span className="profile-name">{displayName}</span>
                <span className="profile-role">
                  {(user as any)?.role || "User"}
                </span>
              </div>

              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`chevron-icon ${profileOpen ? "rotated" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="dropdown-menu profile-menu">
                <div className="dropdown-header profile-header">
                  <div className="profile-avatar large">
                    <User size={24} strokeWidth={2} />
                  </div>
                  <div className="profile-details">
                    <h4>{(user as any)?.name || "User"}</h4>
                    <p>{(user as any)?.email || "user@tadbeer.com"}</p>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <div className="dropdown-body">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate(`/profile/${userId || ""}`);
                    }}
                    type="button"
                  >
                    <UserCircle size={18} strokeWidth={2} />
                    <span>My Profile</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    type="button"
                  >
                    <Settings size={18} strokeWidth={2} />
                    <span>Settings</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/help");
                    }}
                    type="button"
                  >
                    <HelpCircle size={18} strokeWidth={2} />
                    <span>Help & Support</span>
                  </button>
                </div>

                <div className="dropdown-divider" />

                <div className="dropdown-footer">
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogOut size={18} strokeWidth={2} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional title row */}
      {/* <div className="header-page-title">{title}</div> */}
    </header>
  );
};

export default Header;
