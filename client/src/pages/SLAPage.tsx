// src/pages/SLAPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/SLAPage.css";

import {
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Filter,
  Search,
  ArrowLeft,
  Shield,
  Zap,
  Target,
  Activity,
  Calendar,
  BarChart3,
  Lock,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface SLAPolicy {
  _id: string;
  name: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  responseTime: number; // in minutes
  resolutionTime: number; // in minutes
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SLAMetrics {
  totalTickets: number;
  metSLA: number;
  breachedSLA: number;
  atRisk: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  complianceRate: number;
}

interface FormData {
  name: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  responseTime: string;
  resolutionTime: string;
  isActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const mockPolicies: SLAPolicy[] = [
  {
    _id: "1",
    name: "Critical Priority SLA",
    description: "For urgent and critical tickets requiring immediate attention",
    priority: "urgent",
    responseTime: 15,
    resolutionTime: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "2",
    name: "High Priority SLA",
    description: "For high priority tickets affecting multiple users",
    priority: "high",
    responseTime: 30,
    resolutionTime: 240,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "3",
    name: "Medium Priority SLA",
    description: "For standard support requests",
    priority: "medium",
    responseTime: 60,
    resolutionTime: 480,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "4",
    name: "Low Priority SLA",
    description: "For general inquiries and low priority issues",
    priority: "low",
    responseTime: 120,
    resolutionTime: 720,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockMetrics: SLAMetrics = {
  totalTickets: 1247,
  metSLA: 1089,
  breachedSLA: 98,
  atRisk: 60,
  avgResponseTime: 23,
  avgResolutionTime: 187,
  complianceRate: 87.3,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SLAPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Access control
  const isAdmin = (user as any)?.role === "admin";
  const isManager = (user as any)?.role === "manager";
  const canManage = isAdmin || isManager;

  // State
  const [policies, setPolicies] = useState<SLAPolicy[]>(mockPolicies);
  const [metrics] = useState<SLAMetrics>(mockMetrics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activePolicy, setActivePolicy] = useState<SLAPolicy | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    priority: "medium",
    responseTime: "",
    resolutionTime: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  // Access denied for non-admins/managers
  if (!canManage) {
    return (
      <div className="sla-page">
        <div className="sla-content">
          <div className="access-denied-container">
            <div className="access-denied-card">
              <div className="access-denied-icon">
                <Lock size={64} />
              </div>
              <h2 className="access-denied-title">Access Restricted</h2>
              <p className="access-denied-message">
                You don't have permission to access this page. SLA management is only available for
                administrators and managers.
              </p>
              <div className="access-denied-info">
                <p className="info-label">Your Current Role:</p>
                <span className="role-badge">{(user as any)?.role || "Guest"}</span>
              </div>
              <button className="back-btn-denied" onClick={() => navigate(-1)}>
                Go Back
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return policies.filter((policy) => {
      const matchesSearch =
        !q ||
        policy.name.toLowerCase().includes(q) ||
        policy.description.toLowerCase().includes(q) ||
        policy.priority.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && policy.isActive) ||
        (filterStatus === "inactive" && !policy.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [policies, searchQuery, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    return [
      {
        label: "Total Tickets",
        value: metrics.totalTickets.toLocaleString(),
        icon: <Activity size={24} />,
        trend: "+12%",
        trendUp: true,
      },
      {
        label: "SLA Compliance",
        value: `${metrics.complianceRate}%`,
        icon: <CheckCircle size={24} />,
        trend: "+3.2%",
        trendUp: true,
      },
      {
        label: "SLA Breached",
        value: metrics.breachedSLA.toString(),
        icon: <AlertCircle size={24} />,
        trend: "-5%",
        trendUp: true,
      },
      {
        label: "At Risk",
        value: metrics.atRisk.toString(),
        icon: <AlertTriangle size={24} />,
        trend: "-2%",
        trendUp: true,
      },
    ];
  }, [metrics]);

  // Priority badge class
  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      urgent: "priority-urgent",
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return classes[priority] || "";
  };

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Modal handlers
  const openCreate = () => {
    setModalMode("create");
    setActivePolicy(null);
    setFormData({
      name: "",
      description: "",
      priority: "medium",
      responseTime: "",
      resolutionTime: "",
      isActive: true,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (policy: SLAPolicy) => {
    setModalMode("edit");
    setActivePolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description,
      priority: policy.priority,
      responseTime: policy.responseTime.toString(),
      resolutionTime: policy.resolutionTime.toString(),
      isActive: policy.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setFormErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Policy name is required";
    }

    if (!formData.responseTime.trim()) {
      errors.responseTime = "Response time is required";
    } else if (isNaN(Number(formData.responseTime)) || Number(formData.responseTime) <= 0) {
      errors.responseTime = "Response time must be a positive number";
    }

    if (!formData.resolutionTime.trim()) {
      errors.resolutionTime = "Resolution time is required";
    } else if (isNaN(Number(formData.resolutionTime)) || Number(formData.resolutionTime) <= 0) {
      errors.resolutionTime = "Resolution time must be a positive number";
    }

    if (
      formData.responseTime &&
      formData.resolutionTime &&
      Number(formData.responseTime) >= Number(formData.resolutionTime)
    ) {
      errors.resolutionTime = "Resolution time must be greater than response time";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    setSaving(true);

    // Simulate API call
    setTimeout(() => {
      if (modalMode === "create") {
        const newPolicy: SLAPolicy = {
          _id: Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          priority: formData.priority,
          responseTime: Number(formData.responseTime),
          resolutionTime: Number(formData.resolutionTime),
          isActive: formData.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setPolicies((prev) => [newPolicy, ...prev]);
      } else if (activePolicy) {
        setPolicies((prev) =>
          prev.map((p) =>
            p._id === activePolicy._id
              ? {
                  ...p,
                  name: formData.name.trim(),
                  description: formData.description.trim(),
                  priority: formData.priority,
                  responseTime: Number(formData.responseTime),
                  resolutionTime: Number(formData.resolutionTime),
                  isActive: formData.isActive,
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
      }

      setSaving(false);
      setModalOpen(false);
    }, 800);
  };

  const handleDelete = (policy: SLAPolicy) => {
    const ok = window.confirm(`Delete SLA policy "${policy.name}"? This action cannot be undone.`);
    if (!ok) return;

    setDeletingId(policy._id);
    // Simulate API call
    setTimeout(() => {
      setPolicies((prev) => prev.filter((p) => p._id !== policy._id));
      setDeletingId("");
    }, 600);
  };

  const handleToggleActive = (policy: SLAPolicy) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p._id === policy._id
          ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  return (
    <div className="sla-page">
      <div className="sla-content">
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
              <Target size={32} />
            </div>
            <div className="header-text">
              <h1 className="page-title">SLA Management</h1>
              <p className="page-subtitle">
                Monitor and manage Service Level Agreements for your ticketing system
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-left">
                <div className="stat-icon">{stat.icon}</div>
              </div>
              <div className="stat-right">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
                <span className={`stat-trend ${stat.trendUp ? "trend-up" : "trend-down"}`}>
                  {stat.trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="metrics-section">
          <div className="metrics-header">
            <h2>Performance Metrics</h2>
            <button className="export-btn" type="button">
              <BarChart3 size={18} />
              Export Report
            </button>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <Clock size={20} />
                <h3>Avg Response Time</h3>
              </div>
              <div className="metric-value">{metrics.avgResponseTime} min</div>
              <div className="metric-footer">
                <span className="metric-target">Target: &lt;30 min</span>
                <span className="metric-status status-good">
                  <CheckCircle size={14} />
                  On Track
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Zap size={20} />
                <h3>Avg Resolution Time</h3>
              </div>
              <div className="metric-value">{metrics.avgResolutionTime} min</div>
              <div className="metric-footer">
                <span className="metric-target">Target: &lt;240 min</span>
                <span className="metric-status status-good">
                  <CheckCircle size={14} />
                  On Track
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Target size={20} />
                <h3>SLA Met</h3>
              </div>
              <div className="metric-value">{metrics.metSLA}</div>
              <div className="metric-footer">
                <span className="metric-target">
                  {((metrics.metSLA / metrics.totalTickets) * 100).toFixed(1)}% of total
                </span>
                <span className="metric-status status-good">
                  <CheckCircle size={14} />
                  Excellent
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterStatus === "all" ? "active" : ""}`}
                onClick={() => setFilterStatus("all")}
                type="button"
              >
                All Policies
              </button>
              <button
                className={`filter-tab ${filterStatus === "active" ? "active" : ""}`}
                onClick={() => setFilterStatus("active")}
                type="button"
              >
                Active
              </button>
              <button
                className={`filter-tab ${filterStatus === "inactive" ? "active" : ""}`}
                onClick={() => setFilterStatus("inactive")}
                type="button"
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="controls-right">
            <button className="add-policy-btn" type="button" onClick={openCreate}>
              <Plus size={18} />
              Add SLA Policy
            </button>
          </div>
        </div>

        {/* Policies List */}
        <div className="policies-list">
          {loading ? (
            <div className="empty-state">
              <Loader2 size={64} strokeWidth={1} className="spinning" />
              <h3>Loading policies...</h3>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="empty-state">
              <Target size={64} strokeWidth={1} />
              <h3>No policies found</h3>
              <p>
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first SLA policy to get started"}
              </p>
              {!searchQuery && (
                <button className="add-policy-btn" type="button" onClick={openCreate}>
                  <Plus size={18} />
                  Add SLA Policy
                </button>
              )}
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <div key={policy._id} className="policy-card">
                <div className="policy-header">
                  <div className="policy-title-section">
                    <h3 className="policy-name">{policy.name}</h3>
                    <div className="policy-badges">
                      <span className={`priority-badge ${getPriorityClass(policy.priority)}`}>
                        <Shield size={14} />
                        {policy.priority.toUpperCase()}
                      </span>
                      <span className={`status-badge ${policy.isActive ? "active" : "inactive"}`}>
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="policy-actions">
                    <button
                      className="action-icon-btn"
                      onClick={() => handleToggleActive(policy)}
                      title={policy.isActive ? "Deactivate" : "Activate"}
                      type="button"
                    >
                      {policy.isActive ? <Activity size={18} /> : <Activity size={18} />}
                    </button>
                    <button
                      className="action-icon-btn edit-btn"
                      onClick={() => openEdit(policy)}
                      title="Edit"
                      type="button"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="action-icon-btn delete-btn"
                      onClick={() => handleDelete(policy)}
                      disabled={deletingId === policy._id}
                      title="Delete"
                      type="button"
                    >
                      {deletingId === policy._id ? (
                        <Loader2 size={18} className="spinning" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <p className="policy-description">{policy.description}</p>

                <div className="policy-metrics">
                  <div className="policy-metric">
                    <Clock size={16} />
                    <div className="metric-info">
                      <span className="metric-label">Response Time</span>
                      <span className="metric-value">{formatTime(policy.responseTime)}</span>
                    </div>
                  </div>

                  <div className="policy-metric">
                    <Zap size={16} />
                    <div className="metric-info">
                      <span className="metric-label">Resolution Time</span>
                      <span className="metric-value">{formatTime(policy.resolutionTime)}</span>
                    </div>
                  </div>

                  <div className="policy-metric">
                    <Calendar size={16} />
                    <div className="metric-info">
                      <span className="metric-label">Last Updated</span>
                      <span className="metric-value">
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div className="modal-header">
                <div className="modal-header-icon">
                  {modalMode === "create" ? <Plus size={24} /> : <Edit size={24} />}
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-title">
                    {modalMode === "create" ? "Add SLA Policy" : "Edit SLA Policy"}
                  </h2>
                  <p className="modal-subtitle">
                    {modalMode === "create"
                      ? "Create a new service level agreement policy"
                      : "Update service level agreement policy"}
                  </p>
                </div>
              </div>

              <form
                className="modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="form-section">
                  <div className="section-header">
                    <Info size={20} />
                    <h2>Policy Details</h2>
                  </div>

                  <div className="section-content">
                    <div className="form-group full-width">
                      <label htmlFor="name">
                        Policy Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={formErrors.name ? "error" : ""}
                        placeholder="e.g., Critical Priority SLA"
                      />
                      {formErrors.name && (
                        <span className="error-message">
                          <AlertCircle size={14} />
                          {formErrors.name}
                        </span>
                      )}
                    </div>

                    <div className="form-group full-width">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Describe when this SLA policy applies..."
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="priority">
                          <Shield size={16} />
                          Priority Level <span className="required">*</span>
                        </label>
                        <select
                          id="priority"
                          name="priority"
                          value={formData.priority}
                          onChange={handleChange}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                          />
                          <span>Active Policy</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <Clock size={20} />
                    <h2>Time Targets</h2>
                  </div>

                  <div className="section-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="responseTime">
                          <Clock size={16} />
                          Response Time (minutes) <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          id="responseTime"
                          name="responseTime"
                          value={formData.responseTime}
                          onChange={handleChange}
                          className={formErrors.responseTime ? "error" : ""}
                          placeholder="e.g., 15"
                          min="1"
                        />
                        {formErrors.responseTime && (
                          <span className="error-message">
                            <AlertCircle size={14} />
                            {formErrors.responseTime}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="resolutionTime">
                          <Zap size={16} />
                          Resolution Time (minutes) <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          id="resolutionTime"
                          name="resolutionTime"
                          value={formData.resolutionTime}
                          onChange={handleChange}
                          className={formErrors.resolutionTime ? "error" : ""}
                          placeholder="e.g., 120"
                          min="1"
                        />
                        {formErrors.resolutionTime && (
                          <span className="error-message">
                            <AlertCircle size={14} />
                            {formErrors.resolutionTime}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="time-preview">
                      <Info size={16} />
                      <span>
                        {formData.responseTime && formData.resolutionTime
                          ? `Response: ${formatTime(Number(formData.responseTime))} | Resolution: ${formatTime(
                              Number(formData.resolutionTime)
                            )}`
                          : "Enter time values to see preview"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={closeModal} disabled={saving}>
                    <X size={18} />
                    Cancel
                  </button>

                  <button type="submit" className="btn-submit" disabled={saving}>
                    {saving ? (
                      <>
                        <div className="spinner" />
                        {modalMode === "create" ? "Creating..." : "Updating..."}
                      </>
                    ) : modalMode === "create" ? (
                      <>
                        <Plus size={18} />
                        Create Policy
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Update Policy
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SLAPage;
