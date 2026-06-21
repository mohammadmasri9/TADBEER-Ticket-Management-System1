// src/pages/MyTickets.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Plus,
  Grid,
  List,
  Star,
  CheckSquare,
  Users,
  TrendingUp,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";

import { getTickets } from "../../api/tickets";
import Footer from "../components/Footer";
import "../style/MyTickets.css";

// ============ TYPE DEFINITIONS ============
type TicketStatus = "open" | "in-progress" | "pending" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketCategory = "Technical" | "Security" | "Feature" | "Account" | "Bug";
type SortOption = "recent" | "oldest" | "priority";
type ViewMode = "grid" | "list";

interface ApiTicket {
  _id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
  createdBy?: { _id: string; name: string; email: string; role: string };
  assignee?: { _id: string; name: string; email: string; role: string } | null;
  attachments?: any[];
}

interface TicketUI {
  id: string;
  codeLabel: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assignee?: string;
  createdDate: string;
  lastUpdated: string;
  comments: number;
  attachments: number;
  isFavorite?: boolean;
}

interface StatusConfig {
  icon: React.ReactNode;
  class: string;
  label: string;
}

interface StatCardData {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick: () => void;
}

// ============ UTILITY FUNCTIONS ============
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getStatusConfig = (status: TicketStatus): StatusConfig => {
  const configs: Record<TicketStatus, StatusConfig> = {
    open: { icon: <AlertCircle size={14} />, class: "status-open", label: "Open" },
    "in-progress": { icon: <Clock size={14} />, class: "status-progress", label: "In Progress" },
    pending: { icon: <Clock size={14} />, class: "status-pending", label: "Pending" },
    resolved: { icon: <CheckCircle size={14} />, class: "status-resolved", label: "Resolved" },
    closed: { icon: <CheckCircle size={14} />, class: "status-closed", label: "Closed" },
  };
  return configs[status];
};

const getPriorityClass = (priority: TicketPriority): string => {
  const classes: Record<TicketPriority, string> = {
    low: "priority-low",
    medium: "priority-medium",
    high: "priority-high",
    urgent: "priority-urgent",
  };
  return classes[priority];
};

// ============ STAT CARD COMPONENT ============
interface StatCardProps {
  data: StatCardData;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ data }) => (
  <div
    className="stat-card"
    onClick={data.onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === "Enter" && data.onClick()}
  >
    <div className="stat-left">
      <div className="stat-icon">{data.icon}</div>
    </div>
    <div className="stat-right">
      <h3 className="stat-value">{data.value}</h3>
      <p className="stat-label">{data.label}</p>
    </div>
  </div>
));

StatCard.displayName = "StatCard";

// ============ TICKET CARD COMPONENT ============
interface TicketCardProps {
  ticket: TicketUI;
  onNavigate: (id: string) => void;
}

const TicketCard: React.FC<TicketCardProps> = React.memo(({ ticket, onNavigate }) => {
  const statusConfig = getStatusConfig(ticket.status);

  const handleClick = useCallback(() => {
    onNavigate(ticket.id);
  }, [ticket.id, onNavigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onNavigate(ticket.id);
      }
    },
    [ticket.id, onNavigate]
  );

  return (
    <div
      className="ticket-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="ticket-card-header">
        <div className="ticket-id-row">
          <span className="ticket-id">{ticket.codeLabel}</span>
          {ticket.isFavorite && <Star size={16} fill="#FFD700" stroke="#FFD700" />}
        </div>
        <button
          className="ticket-menu-btn"
          aria-label="More options"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <h3 className="ticket-title">{ticket.title}</h3>

      <div className="ticket-badges">
        <span className={`status-badge ${statusConfig.class}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
        <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <span className="category-badge">
          <Tag size={12} />
          {ticket.category}
        </span>
      </div>

      <div className="ticket-meta">
        {ticket.assignee && (
          <div className="meta-item">
            <User size={14} />
            <span>{ticket.assignee}</span>
          </div>
        )}
        <div className="meta-item">
          <Calendar size={14} />
          <span>{formatDate(ticket.lastUpdated)}</span>
        </div>
      </div>

      <div className="ticket-footer">
        <div className="ticket-stats">
          {ticket.comments > 0 && (
            <span className="stat-item">
              <MessageSquare size={14} />
              {ticket.comments}
            </span>
          )}
          {ticket.attachments > 0 && (
            <span className="stat-item">
              <Paperclip size={14} />
              {ticket.attachments}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

TicketCard.displayName = "TicketCard";

// ============ TICKET LIST ITEM COMPONENT ============
interface TicketListItemProps {
  ticket: TicketUI;
  onNavigate: (id: string) => void;
}

const TicketListItem: React.FC<TicketListItemProps> = React.memo(({ ticket, onNavigate }) => {
  const statusConfig = getStatusConfig(ticket.status);

  const handleClick = useCallback(() => {
    onNavigate(ticket.id);
  }, [ticket.id, onNavigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onNavigate(ticket.id);
      }
    },
    [ticket.id, onNavigate]
  );

  return (
    <div
      className="ticket-list-item"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="list-item-left">
        {ticket.isFavorite && <Star size={16} fill="#FFD700" stroke="#FFD700" />}
        <span className="ticket-id">{ticket.codeLabel}</span>
        <h3 className="ticket-title-list">{ticket.title}</h3>
      </div>

      <div className="list-item-center">
        <span className={`status-badge ${statusConfig.class}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
        <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <span className="category-badge-list">
          <Tag size={12} />
          {ticket.category}
        </span>
      </div>

      <div className="list-item-right">
        {ticket.assignee && (
          <div className="assignee-info">
            <User size={14} />
            <span>{ticket.assignee}</span>
          </div>
        )}
        <div className="ticket-date">
          <Calendar size={14} />
          <span>{formatDate(ticket.lastUpdated)}</span>
        </div>

        <div className="ticket-stats-list">
          {ticket.comments > 0 && (
            <span className="stat-item">
              <MessageSquare size={14} />
              {ticket.comments}
            </span>
          )}
          {ticket.attachments > 0 && (
            <span className="stat-item">
              <Paperclip size={14} />
              {ticket.attachments}
            </span>
          )}
        </div>

        <button
          className="ticket-menu-btn"
          aria-label="More options"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
});

TicketListItem.displayName = "TicketListItem";

// ============ FILTER PANEL COMPONENT ============
interface FilterPanelProps {
  priorityFilter: Record<TicketPriority, boolean>;
  categoryFilter: Record<TicketCategory, boolean>;
  onPriorityChange: (priority: TicketPriority, checked: boolean) => void;
  onCategoryChange: (category: TicketCategory, checked: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = React.memo(
  ({ priorityFilter, categoryFilter, onPriorityChange, onCategoryChange, onReset, onClose }) => {
    const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"];
    const categories: TicketCategory[] = ["Technical", "Security", "Feature", "Account", "Bug"];

    return (
      <div className="filter-panel">
        <div className="filter-section">
          <h4>Priority</h4>
          {priorities.map((p) => (
            <label key={p} className="filter-option">
              <input
                type="checkbox"
                checked={priorityFilter[p]}
                onChange={(e) => onPriorityChange(p, e.target.checked)}
              />
              <span>{p}</span>
            </label>
          ))}
        </div>

        <div className="filter-section">
          <h4>Category</h4>
          {categories.map((c) => (
            <label key={c} className="filter-option">
              <input
                type="checkbox"
                checked={categoryFilter[c]}
                onChange={(e) => onCategoryChange(c, e.target.checked)}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>

        <div className="filter-actions">
          <button className="filter-reset-btn" onClick={onReset}>
            Reset
          </button>
          <button className="filter-apply-btn" onClick={onClose}>
            Apply
          </button>
        </div>
      </div>
    );
  }
);

FilterPanel.displayName = "FilterPanel";

// ============ MAIN COMPONENT ============
const MyTickets: React.FC = () => {
  const navigate = useNavigate();

  // ========== STATE MANAGEMENT ==========
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedStatus, setSelectedStatus] = useState<"all" | TicketStatus>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tickets, setTickets] = useState<ApiTicket[]>([]);

  const [priorityFilter, setPriorityFilter] = useState<Record<TicketPriority, boolean>>({
    low: true,
    medium: true,
    high: true,
    urgent: true,
  });

  const [categoryFilter, setCategoryFilter] = useState<Record<TicketCategory, boolean>>({
    Technical: true,
    Security: true,
    Feature: true,
    Account: true,
    Bug: true,
  });

  // ========== FETCH TICKETS ==========
  useEffect(() => {
    let mounted = true;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getTickets();
        if (mounted) {
          setTickets(data);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || e?.response?.data?.message || "Failed to load tickets");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTickets();

    return () => {
      mounted = false;
    };
  }, []);

  // ========== TRANSFORM API TICKETS TO UI TICKETS ==========
  const uiTickets: TicketUI[] = useMemo(() => {
    return tickets.map((t, idx) => {
      const short = String(idx + 1).padStart(4, "0");
      return {
        id: t._id,
        codeLabel: `TKT-${short}`,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        assignee: t.assignee?.name || undefined,
        createdDate: t.createdAt,
        lastUpdated: t.updatedAt || t.createdAt,
        comments: 0,
        attachments: Array.isArray(t.attachments) ? t.attachments.length : 0,
        isFavorite: false,
      };
    });
  }, [tickets]);

  // ========== FILTER AND SORT TICKETS ==========
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = uiTickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(q) || ticket.codeLabel.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
      const matchesPriority = priorityFilter[ticket.priority as TicketPriority];
      const matchesCategory = categoryFilter[ticket.category as TicketCategory];
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    // Sort tickets
    if (sortBy === "recent") {
      list = list.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
    } else if (sortBy === "oldest") {
      list = list.sort((a, b) => +new Date(a.lastUpdated) - +new Date(b.lastUpdated));
    } else if (sortBy === "priority") {
      const order: Record<TicketPriority, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      list = list.sort(
        (a, b) => order[a.priority as TicketPriority] - order[b.priority as TicketPriority]
      );
    }

    return list;
  }, [uiTickets, searchQuery, selectedStatus, sortBy, priorityFilter, categoryFilter]);

  // ========== CALCULATE STATISTICS ==========
  const stats: StatCardData[] = useMemo(() => {
    const total = uiTickets.length;
    const active = uiTickets.filter(
      (t) => t.status === "in-progress" || t.status === "pending"
    ).length;
    const resolved = uiTickets.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    ).length;
    const completionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);

    return [
      {
        label: "Total Tickets",
        value: total.toString(),
        icon: <CheckSquare size={24} />,
        onClick: () => {
          setSelectedStatus("all");
          setSearchQuery("");
        },
      },
      {
        label: "Active Tickets",
        value: active.toString(),
        icon: <Clock size={24} />,
        onClick: () => {
          setSelectedStatus("in-progress");
        },
      },
      {
        label: "Assigned To Me",
        value: uiTickets.filter((t) => !!t.assignee).length.toString(),
        icon: <Users size={24} />,
        onClick: () => {
          // Future: filter by current user
        },
      },
      {
        label: "Completion Rate",
        value: `${completionRate}%`,
        icon: <TrendingUp size={24} />,
        onClick: () => {
          setSelectedStatus("resolved");
        },
      },
    ];
  }, [uiTickets]);

  // ========== HANDLERS ==========
  const handleNavigateToTicket = useCallback(
    (id: string) => {
      navigate(`/tickets/${id}`);
    },
    [navigate]
  );

  const handlePriorityChange = useCallback((priority: TicketPriority, checked: boolean) => {
    setPriorityFilter((prev) => ({ ...prev, [priority]: checked }));
  }, []);

  const handleCategoryChange = useCallback((category: TicketCategory, checked: boolean) => {
    setCategoryFilter((prev) => ({ ...prev, [category]: checked }));
  }, []);

  const resetFilters = useCallback(() => {
    setPriorityFilter({ low: true, medium: true, high: true, urgent: true });
    setCategoryFilter({ Technical: true, Security: true, Feature: true, Account: true, Bug: true });
    setSelectedStatus("all");
  }, []);

  const cycleSortBy = useCallback(() => {
    setSortBy((p) => (p === "recent" ? "priority" : p === "priority" ? "oldest" : "recent"));
  }, []);

  const getSortLabel = useCallback(() => {
    const labels: Record<SortOption, string> = {
      recent: "Recent",
      oldest: "Oldest",
      priority: "Priority",
    };
    return labels[sortBy];
  }, [sortBy]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClearFilters = useCallback(() => {
    resetFilters();
    setSearchQuery("");
  }, [resetFilters]);

  // ========== RENDER ==========
  return (
    <div className="my-tickets-page">
      <div className="my-tickets-content">
        {/* Statistics Cards */}
        <section className="stats-section" aria-label="Ticket statistics">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} data={stat} />
            ))}
          </div>
        </section>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tickets"
              />
            </div>

            <div className="filter-group">
              <button
                className={`filter-btn ${filterOpen ? "active" : ""}`}
                onClick={() => setFilterOpen(!filterOpen)}
                aria-expanded={filterOpen}
                aria-label="Toggle filters"
              >
                <Filter size={18} />
                Filter
              </button>

              <select
                className="sort-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <button
                className="sort-btn"
                onClick={cycleSortBy}
                title={`Current: ${getSortLabel()}`}
                aria-label={`Sort by ${getSortLabel()}`}
              >
                <ArrowUpDown size={18} />
                {getSortLabel()}
              </button>
            </div>
          </div>

          <div className="controls-right">
            <div className="view-toggle" role="tablist" aria-label="View mode">
              <button
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                role="tab"
                aria-selected={viewMode === "grid"}
              >
                <Grid size={18} />
              </button>
              <button
                className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
                role="tab"
                aria-selected={viewMode === "list"}
              >
                <List size={18} />
              </button>
            </div>

            <button
              className="create-ticket-btn"
              onClick={() => navigate("/createticket")}
              aria-label="Create new ticket"
            >
              <Plus size={18} />
              New Ticket
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <FilterPanel
            priorityFilter={priorityFilter}
            categoryFilter={categoryFilter}
            onPriorityChange={handlePriorityChange}
            onCategoryChange={handleCategoryChange}
            onReset={resetFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        {/* Tickets Display */}
        {loading ? (
          <div className="loading-state" role="status" aria-live="polite">
            <div className="loading-spinner">
              <RefreshCw size={48} />
            </div>
            <h3>Loading tickets...</h3>
            <p>Please wait while we fetch your tickets</p>
          </div>
        ) : error ? (
          <div className="error-state" role="alert">
            <XCircle size={64} strokeWidth={1.5} />
            <h3>Failed to load tickets</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={handleRetry}>
              <RefreshCw size={18} />
              Retry
            </button>
          </div>
        ) : filteredTickets.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="tickets-grid" role="list" aria-label="Tickets in grid view">
                {filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} onNavigate={handleNavigateToTicket} />
                ))}
              </div>
            ) : (
              <div className="tickets-list" role="list" aria-label="Tickets in list view">
                {filteredTickets.map((ticket) => (
                  <TicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    onNavigate={handleNavigateToTicket}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Tag size={64} strokeWidth={1.5} />
            <h3>No tickets found</h3>
            <p>
              {uiTickets.length === 0
                ? "Create your first ticket to get started"
                : "Try adjusting your search or filters"}
            </p>
            {uiTickets.length > 0 && (
              <button className="reset-filters-btn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyTickets;
