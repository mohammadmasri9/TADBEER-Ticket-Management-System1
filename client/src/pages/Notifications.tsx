// src/pages/NotificationsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/NotificationsPage.css";

import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Trash2,
  Check,
  X,
  Search,
  ArrowLeft,
  Loader2,
  Mail,
  MailOpen,
} from "lucide-react";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  NotificationDTO,
} from "../../api/notifications";

type FilterType = "all" | "unread" | "read";

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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [deletingId, setDeletingId] = useState<string>("");
  const [markingReadId, setMarkingReadId] = useState<string>("");

  const userId =
    (user as any)?._id || (user as any)?.id || (user as any)?.userId;

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return notifications.filter((n) => {
      const matchesSearch =
        !q ||
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !n.isRead) ||
        (filter === "read" && n.isRead);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, filter]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const read = total - unread;
    return { total, unread, read };
  }, [notifications]);

  const handleMarkAllRead = async () => {
    try {
      setError("");
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to mark all as read"
      );
    }
  };

  const handleMarkAsRead = async (notif: NotificationDTO) => {
    if (notif.isRead) return;

    try {
      setMarkingReadId(notif._id);
      setError("");
      await markNotificationAsRead(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to mark as read"
      );
    } finally {
      setMarkingReadId("");
    }
  };

  const handleOpenNotification = async (notif: NotificationDTO) => {
    try {
      setError("");

      if (!notif.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        await markNotificationAsRead(notif._id);
      }

      if (notif.link) {
        navigate(notif.link);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to open notification"
      );
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const ok = window.confirm("Delete this notification?");
    if (!ok) return;

    try {
      setDeletingId(id);
      setError("");

      await deleteNotification(id);

      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to delete notification"
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n._id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(`Delete ${selectedIds.size} notification(s)?`);
    if (!ok) return;

    try {
      setError("");

      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => deleteNotification(id))
      );

      const failed = results.filter((r) => r.status === "rejected").length;

      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n._id)));
      setSelectedIds(new Set());

      if (failed > 0) {
        setError(`${failed} delete(s) failed. Others were deleted.`);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to delete notifications"
      );
    }
  };

  // ✅ match your real NotificationType values
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "ticket_assigned":
        return <Zap size={20} />;
      case "comment_added":
        return <Mail size={20} />;
      case "ticket_updated":
        return <Info size={20} />;
      case "ticket_overdue":
        return <AlertCircle size={20} />;
      case "system":
      default:
        return <Bell size={20} />;
    }
  };

  const getNotificationClass = (type?: string) => {
    switch (type) {
      case "ticket_assigned":
        return "notification-success";
      case "comment_added":
        return "notification-info";
      case "ticket_updated":
        return "notification-default";
      case "ticket_overdue":
        return "notification-warning";
      case "system":
      default:
        return "notification-default";
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-top">
            <button className="back-btn" onClick={() => navigate(-1)} type="button">
              <ArrowLeft size={20} />
              Back
            </button>
          </div>

          <div className="header-main">
            <div className="header-icon">
              <Bell size={32} />
            </div>
            <div className="header-text">
              <h1 className="page-title">Notifications</h1>
              <p className="page-subtitle">Manage all your notifications in one place</p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <div>
              <strong>Error:</strong> {error}
            </div>
            <button className="dismiss-btn" onClick={() => setError("")} type="button">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Bell size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.total}</h3>
              <p className="stat-label">Total</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon unread">
              <Mail size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.unread}</h3>
              <p className="stat-label">Unread</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon read">
              <MailOpen size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.read}</h3>
              <p className="stat-label">Read</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery("")} type="button">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
                type="button"
              >
                All ({stats.total})
              </button>
              <button
                className={`filter-tab ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
                type="button"
              >
                Unread ({stats.unread})
              </button>
              <button
                className={`filter-tab ${filter === "read" ? "active" : ""}`}
                onClick={() => setFilter("read")}
                type="button"
              >
                Read ({stats.read})
              </button>
            </div>
          </div>

          <div className="controls-right">
            {selectedIds.size > 0 && (
              <button
                className="action-btn delete-selected-btn"
                onClick={handleDeleteSelected}
                type="button"
              >
                <Trash2 size={18} />
                Delete ({selectedIds.size})
              </button>
            )}

            <button
              className="action-btn mark-all-btn"
              onClick={handleMarkAllRead}
              disabled={stats.unread === 0}
              type="button"
            >
              <Check size={18} />
              Mark All Read
            </button>

            <button className="action-btn refresh-btn" onClick={loadNotifications} type="button">
              <Loader2 size={18} className={loading ? "spinning" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredNotifications.length > 0 && (
          <div className="bulk-actions">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredNotifications.length}
                onChange={handleSelectAll}
              />
              <span>Select All</span>
            </label>

            <span className="selected-count">
              {selectedIds.size > 0 && `${selectedIds.size} selected`}
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="notifications-list">
          {loading ? (
            <div className="empty-state">
              <Loader2 size={64} strokeWidth={1} className="spinning" />
              <h3>Loading notifications...</h3>
              <p>Please wait</p>
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={64} strokeWidth={1} />
              <h3>Failed to load notifications</h3>
              <p>{error}</p>
              <button className="action-btn retry-btn" type="button" onClick={loadNotifications}>
                Retry
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={64} strokeWidth={1} />
              <h3>No notifications found</h3>
              <p>
                {searchQuery
                  ? "Try adjusting your search"
                  : filter === "unread"
                  ? "You're all caught up!"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif._id}
                className={`notification-item ${!notif.isRead ? "unread" : ""} ${getNotificationClass(
                  notif.type
                )}`}
              >
                <label className="notification-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notif._id)}
                    onChange={() => handleToggleSelect(notif._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>

                <div
                  className="notification-icon-wrapper"
                  onClick={() => handleOpenNotification(notif)}
                  role="button"
                  tabIndex={0}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                <div
                  className="notification-body"
                  onClick={() => handleOpenNotification(notif)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="notification-header">
                    <h4 className="notification-title">{notif.title}</h4>
                    <span className="notification-time">{formatTimeAgo(notif.createdAt)}</span>
                  </div>
                  <p className="notification-message">{notif.message}</p>
                  {notif.link && (
                    <span className="notification-link">
                      <Zap size={14} />
                      Click to view details
                    </span>
                  )}
                </div>

                <div className="notification-actions">
                  {!notif.isRead && (
                    <button
                      className="action-icon-btn mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif);
                      }}
                      disabled={markingReadId === notif._id}
                      title="Mark as read"
                      type="button"
                    >
                      {markingReadId === notif._id ? (
                        <Loader2 size={18} className="spinning" />
                      ) : (
                        <Check size={18} />
                      )}
                    </button>
                  )}

                  <button
                    className="action-icon-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notif._id);
                    }}
                    disabled={deletingId === notif._id}
                    title="Delete"
                    type="button"
                  >
                    {deletingId === notif._id ? (
                      <Loader2 size={18} className="spinning" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>

                {!notif.isRead && <div className="unread-indicator" />}
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotificationsPage;
