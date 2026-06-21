// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Clock,
  TrendingUp,
  Info,
  Filter,
  ChevronDown,
  Users,
  Calendar,
  ClipboardList,
  UserCheck,
  Eye,
  Repeat,
  X,
  Star,
  MoreVertical,
  Archive,
  Trash2,
} from "lucide-react";

import { archiveTicket, getTickets, softDeleteTicket, TicketDTO, toggleFavorite } from "../../api/tickets";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/Dashboard.css";

type TicketStatus = "open" | "in-progress" | "pending" | "resolved" | "closed";
type TicketScope = "created" | "assigned" | "watching" | "reassigned";
type DashboardTab = "overview" | "recent" | "team";

interface StatusFilter {
  open: boolean;
  "in-progress": boolean;
  pending: boolean;
  resolved: boolean;
  closed: boolean;
}

interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  urgent: number;
}

/* =========================
   LOCAL STORAGE STORE
========================= */
const LS_KEY = "tadbeer_ticket_actions_v1";

type TicketActionState = {
  favorites: string[];
  archived: string[];
  deleted: string[];
};

const safeParse = <T,>(val: string | null, fallback: T): T => {
  try {
    return val ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
};

const getActionState = (): TicketActionState =>
  safeParse<TicketActionState>(localStorage.getItem(LS_KEY), {
    favorites: [],
    archived: [],
    deleted: [],
  });

const setActionState = (next: TicketActionState) => {
  localStorage.setItem(LS_KEY, JSON.stringify(next));
};

const includesId = (list: string[], id: string) => list.includes(id);

const toggleFavoriteLS = (id: string) => {
  const s = getActionState();
  const favorites = includesId(s.favorites, id)
    ? s.favorites.filter((x) => x !== id)
    : [...s.favorites, id];
  setActionState({ ...s, favorites });
};

const archiveTicketLS = (id: string) => {
  const s = getActionState();
  if (includesId(s.deleted, id)) return; // don't archive deleted
  if (!includesId(s.archived, id)) setActionState({ ...s, archived: [...s.archived, id] });
};

const deleteTicketSoftLS = (id: string) => {
  const s = getActionState();
  const deleted = includesId(s.deleted, id) ? s.deleted : [...s.deleted, id];
  // when deleted -> remove from archived + favorites
  const archived = s.archived.filter((x) => x !== id);
  const favorites = s.favorites.filter((x) => x !== id);
  setActionState({ favorites, archived, deleted });
};

/* =========================
   UTILS
========================= */
const normalizeId = (val: any): string => {
  if (!val) return "";
  const fromObj = val?._id ?? val?.id ?? val?.userId ?? val?.uid ?? val?.value ?? val?.user?._id;
  const raw = fromObj ?? val;

  try {
    return raw?.toString?.() ? String(raw.toString()) : String(raw);
  } catch {
    return "";
  }
};

const isSameId = (a: any, b: any): boolean => {
  const A = normalizeId(a);
  const B = normalizeId(b);
  return !!A && !!B && A === B;
};

/* =========================
   COMPONENTS
========================= */
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  onClick: () => void;
}
const StatCard: React.FC<StatCardProps> = ({ icon, value, label, onClick }) => (
  <div className="stat-card" onClick={onClick} role="button" tabIndex={0}>
    <div className="stat-header">
      <div className="stat-icon">{icon}</div>
    </div>
    <div className="stat-body">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{label}</p>
    </div>
  </div>
);

interface TicketListItemProps {
  ticket: TicketDTO;
  currentUserId: string;
  onClick: () => void;
  onActionDone: () => void; // refresh list state
}

const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, currentUserId, onClick, onActionDone }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ticketId = String(ticket._id || "");

  const isFav = ((ticket as any).favoritedBy || []).some((id: any) => isSameId(id, currentUserId));

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleToggleFav = async (e: React.MouseEvent) => {
    stop(e);
    try {
      await toggleFavorite(ticketId);
      onActionDone();
    } catch {
      // Keep the dashboard usable; detailed errors are shown on full ticket pages.
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    stop(e);
    try {
      await archiveTicket(ticketId);
      setMenuOpen(false);
      onActionDone();
    } catch {
      setMenuOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    stop(e);
    if (confirm("Move this ticket to Recycle Bin?")) {
      try {
        await softDeleteTicket(ticketId);
        setMenuOpen(false);
        onActionDone();
      } catch {
        setMenuOpen(false);
      }
    }
  };

  return (
    <button className="dashListItem" onClick={onClick} type="button">
      {/* Header */}
      <div className="ticket-card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`priority-badge ${ticket.priority}`}>
          <span className="priority-text">{ticket.priority} Priority</span>
        </span>

        <span className="ticket-number" style={{ marginLeft: "auto" }}>
          Ticket# {ticket._id?.slice(-6) || "N/A"}
        </span>

        {/* ⭐ Favorite */}
        <button
          type="button"
          onClick={handleToggleFav}
          title={isFav ? "Unfavorite" : "Favorite"}
          aria-label={isFav ? "Unfavorite ticket" : "Favorite ticket"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
          }}
        >
          <Star size={18} fill={isFav ? "currentColor" : "none"} />
        </button>

        {/* ⋮ Menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setMenuOpen((v) => !v);
            }}
            aria-label="Ticket actions"
            title="Actions"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
            }}
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: 26,
                right: 0,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
                boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                minWidth: 160,
                zIndex: 50,
                overflow: "hidden",
              }}
              onClick={(e) => stop(e as any)}
            >
              <button
                type="button"
                onClick={handleArchive}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Archive size={16} />
                Archive
              </button>

              <button
                type="button"
                onClick={handleDelete}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  cursor: "pointer",
                  color: "#b42318",
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="ticket-card-title">{ticket.title}</h3>

      {/* Description */}
      <p className="ticket-card-description">
        {ticket.description?.substring(0, 120) || "No description available"}
        {ticket.description && ticket.description.length > 120 && "..."}
      </p>

      {/* Footer */}
      <div className="ticket-card-footer">
        <div className="ticket-meta-left">
          <span className="ticket-assignee">
            <UserCheck size={14} aria-hidden="true" />
            {ticket.assignee?.name || ticket.assignee?.email || "Unassigned"}
          </span>

          <span className="ticket-date">
            <Calendar size={14} aria-hidden="true" />
            Posted at{" "}
            {new Date(ticket.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        </div>

        <button className="open-ticket-btn" type="button" onClick={(e) => e.stopPropagation()}>
          Open Ticket
        </button>
      </div>
    </button>
  );
};

interface ScopeSelectorProps {
  scope: TicketScope;
  onScopeChange: (scope: TicketScope) => void;
  isManager: boolean;
}
const ScopeSelector: React.FC<ScopeSelectorProps> = ({ scope, onScopeChange, isManager }) => {
  const scopes: Array<{ value: TicketScope; label: string; icon: React.ReactNode; show?: boolean }> =
    [
      { value: "created", label: "Created by Me", icon: <ClipboardList size={16} />, show: true },
      { value: "assigned", label: "Assigned to Me", icon: <UserCheck size={16} />, show: true },
      { value: "watching", label: "Watching", icon: <Eye size={16} />, show: true },
      { value: "reassigned", label: "Reassigned by Me", icon: <Repeat size={16} />, show: isManager },
    ];

  return (
    <div className="scope-selector">
      {scopes
        .filter((s) => s.show)
        .map(({ value, label, icon }) => (
          <button
            key={value}
            className={`scope-btn ${scope === value ? "active" : ""}`}
            onClick={() => onScopeChange(value)}
            aria-pressed={scope === value}
            type="button"
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
    </div>
  );
};

interface FilterPanelProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onClose: () => void;
  onReset: () => void;
}
const FilterPanel: React.FC<FilterPanelProps> = ({ statusFilter, onFilterChange, onClose, onReset }) => {
  const statuses: TicketStatus[] = ["open", "in-progress", "pending", "resolved", "closed"];

  const handleCheckboxChange = (status: TicketStatus, checked: boolean) => {
    onFilterChange({ ...statusFilter, [status]: checked });
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h4>Filter Tickets</h4>
        <button className="filter-close" onClick={onClose} aria-label="Close filter" type="button">
          <X size={18} />
        </button>
      </div>

      <div className="filter-section">
        <h5>Status</h5>
        {statuses.map((status) => (
          <label key={status} className="filter-option">
            <input
              type="checkbox"
              checked={statusFilter[status]}
              onChange={(e) => handleCheckboxChange(status, e.target.checked)}
            />
            <span>{status.replace("-", " ")}</span>
          </label>
        ))}
      </div>

      <div className="filter-actions">
        <button className="filter-reset-btn" onClick={onReset} type="button">
          Reset
        </button>
        <button className="filter-apply-btn" onClick={onClose} type="button">
          Apply
        </button>
      </div>
    </div>
  );
};

/* =========================
   MAIN
========================= */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const u: any = user as any;

  const myId = useMemo(() => normalizeId(u?.userId ?? u?.id ?? u?._id ?? u?.uid), [u]);
  const myRole = useMemo(() => String(u?.role || ""), [u]);
  const isManager = useMemo(() => myRole === "manager", [myRole]);

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [scope, setScope] = useState<TicketScope>("created");
  const [filterOpen, setFilterOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>({
    open: true,
    "in-progress": true,
    pending: true,
    resolved: true,
    closed: false,
  });

  // used to refetch after persisted ticket actions
  const [actionsVersion, setActionsVersion] = useState(0);
  const refreshActions = () => setActionsVersion((v) => v + 1);

  const scopeLabel = useMemo(() => {
    const labels: Record<TicketScope, string> = {
      created: "Created by Me",
      assigned: "Assigned to Me",
      watching: "Watching",
      reassigned: "Reassigned by Me",
    };
    return labels[scope];
  }, [scope]);

  const scopedTickets = useMemo(() => {
    if (!myId) return [];

    if (scope === "reassigned") {
      return tickets.filter((t: any) => {
        const watchers = (t.watchers || []) as any[];
        const addedByMe = watchers.some((w) => isSameId(w?.addedBy, myId));
        const watcherIsMe = watchers.some((w) => isSameId(w?.userId ?? w, myId));
        return addedByMe && !watcherIsMe;
      });
    }

    if (scope === "created") return tickets.filter((t: any) => isSameId(t.createdBy, myId));
    if (scope === "assigned") return tickets.filter((t: any) => isSameId(t.assignee, myId));
    if (scope === "watching")
      return tickets.filter((t: any) => {
        const watchers = (t.watchers || []) as any[];
        return watchers.some((w) => isSameId(w?.userId ?? w, myId));
      });

    return tickets;
  }, [tickets, scope, myId]);

  const stats = useMemo<DashboardStats>(() => {
    return {
      total: scopedTickets.length,
      open: scopedTickets.filter((t) => t.status === "open").length,
      inProgress: scopedTickets.filter((t) => t.status === "in-progress").length,
      urgent: scopedTickets.filter((t) => t.priority === "urgent").length,
    };
  }, [scopedTickets]);

  const recentTickets = useMemo(() => {
    return scopedTickets
      .filter((t) => statusFilter[t.status as TicketStatus])
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 10);
  }, [scopedTickets, statusFilter, actionsVersion]);

  useEffect(() => {
    let mounted = true;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError("");

        const params = scope === "reassigned" ? undefined : { view: scope };
        const data = await getTickets(params as any);

        if (!mounted) return;
        setTickets(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load tickets");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTickets();

    return () => {
      mounted = false;
    };
  }, [scope, actionsVersion]);

  const handleFilterReset = useCallback(() => {
    setStatusFilter({
      open: true,
      "in-progress": true,
      pending: true,
      resolved: true,
      closed: false,
    });
  }, []);

  const handleRetry = () => window.location.reload();

  useEffect(() => {
    if (!isManager && scope === "reassigned") setScope("created");
  }, [isManager, scope]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <ScopeSelector scope={scope} onScopeChange={setScope} isManager={isManager} />
          <div className="current-view">
            <span className="view-label">Current View:</span>
            <span className="view-value">{scopeLabel}</span>
          </div>
        </div>

        <section className="stats-section" aria-label="Ticket statistics">
          <div className="stats-grid">
            <StatCard icon={<CheckSquare size={24} />} value={stats.total} label={scopeLabel} onClick={() => navigate("/tickets")} />
            <StatCard icon={<Clock size={24} />} value={stats.open} label="Open" onClick={() => navigate("/tickets?status=open")} />
            <StatCard icon={<TrendingUp size={24} />} value={stats.inProgress} label="In Progress" onClick={() => navigate("/tickets?status=in-progress")} />
            <StatCard icon={<Info size={24} />} value={stats.urgent} label="Urgent" onClick={() => navigate("/tickets?priority=urgent")} />
          </div>
        </section>

        <div className="section-header">
          <div className="tabs" role="tablist">
            <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")} type="button">
              Overview
              {activeTab === "overview" && <ChevronDown size={16} strokeWidth={2.5} />}
            </button>

            <button className={`tab ${activeTab === "recent" ? "active" : ""}`} onClick={() => setActiveTab("recent")} type="button">
              Recent ({scopeLabel})
            </button>

            <button className={`tab ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")} type="button">
              Team
            </button>
          </div>

          {activeTab === "recent" && (
            <div className="section-actions">
              <button className={`filter-btn ${filterOpen ? "active" : ""}`} onClick={() => setFilterOpen(!filterOpen)} type="button">
                <Filter size={18} strokeWidth={2} />
                Filter
              </button>
            </div>
          )}
        </div>

        {filterOpen && activeTab === "recent" && (
          <FilterPanel statusFilter={statusFilter} onFilterChange={setStatusFilter} onClose={() => setFilterOpen(false)} onReset={handleFilterReset} />
        )}

        {loading ? (
          <div className="dashboardState" role="status" aria-live="polite">
            <Clock size={48} strokeWidth={1.5} />
            <span>Loading tickets...</span>
          </div>
        ) : error ? (
          <div className="dashboardState error" role="alert">
            <Info size={48} strokeWidth={1.5} />
            <span>{error}</span>
            <button onClick={handleRetry} type="button">
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <section className="dashboard-section" aria-labelledby="overview-title">
                <div className="section-title-wrapper">
                  <h2 id="overview-title" className="section-title">
                    Quick Actions
                  </h2>
                  <p className="section-subtitle">Fast navigation to key modules</p>
                </div>

                <div className="quick-actions-grid">
                  <button className="quick-action-btn" onClick={() => navigate("/createticket")} type="button">
                    <CheckSquare size={28} strokeWidth={2} />
                    <span>Create Ticket</span>
                  </button>

                  <button className="quick-action-btn" onClick={() => navigate("/tickets")} type="button">
                    <CheckSquare size={28} strokeWidth={2} />
                    <span>All Tickets</span>
                  </button>

                  <button className="quick-action-btn" onClick={() => navigate("/admin/users")} type="button">
                    <Users size={28} strokeWidth={2} />
                    <span>User Management</span>
                  </button>

                  <button className="quick-action-btn" onClick={() => navigate("/manager/reports")} type="button">
                    <TrendingUp size={28} strokeWidth={2} />
                    <span>Reports</span>
                  </button>
                </div>
              </section>
            )}

            {activeTab === "recent" && (
              <section className="dashboard-section" aria-labelledby="recent-title">
                <div className="section-title-wrapper">
                  <h2 id="recent-title" className="section-title">
                    Recent Tickets — {scopeLabel}
                  </h2>
                  <p className="section-subtitle">Latest updates in this view</p>
                </div>

                {recentTickets.length === 0 ? (
                  <div className="empty-state">
                    <Clock size={64} strokeWidth={1.5} />
                    <h3>No tickets in this view</h3>
                    <p>Try switching views or create/assign/watch a ticket</p>
                  </div>
                ) : (
                  <div className="dashList">
                    {recentTickets.map((ticket: any) => (
                      <TicketListItem
                        key={ticket._id}
                        ticket={ticket}
                        currentUserId={myId}
                        onClick={() => navigate(`/tickets/${ticket._id}`)}
                        onActionDone={refreshActions}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "team" && (
              <section className="dashboard-section" aria-labelledby="team-title">
                <div className="empty-state">
                  <Users size={64} strokeWidth={1.5} />
                  <h3 id="team-title">Team Dashboard</h3>
                  <p>Team widgets will be integrated next (agents, workload, SLA)</p>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
