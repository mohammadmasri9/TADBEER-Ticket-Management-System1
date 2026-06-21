import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/UserManagement.css";
import {
  Search,
  Filter,
  MoreVertical,
  ArrowUpDown,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Calendar,
  Grid,
  List,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Users,
  UserPlus,
  Activity,
  Lock,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
} from "lucide-react";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  UserDTO,
  UserRole,
  UserStatus,
} from "../../api/users";

type ViewMode = "grid" | "list";

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
  user: "User",
};

const roleBadgeClass: Record<UserRole, string> = {
  admin: "role-admin",
  manager: "role-lead",
  agent: "role-member",
  user: "role-member",
};

const statusBadgeClass: Record<UserStatus, string> = {
  available: "status-active",
  busy: "status-pending",
  offline: "status-inactive",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();

  // Admin-only
  if ((user as any)?.role !== "admin") {
    return (
      <div className="user-management-page">
        <div className="user-management-content">
          <div className="access-denied-container">
            <div className="access-denied-card">
              <div className="access-denied-icon">
                <Lock size={64} />
              </div>
              <h2 className="access-denied-title">Access Restricted</h2>
              <p className="access-denied-message">
                You don't have permission to access this page. User management is only available for administrators.
              </p>
              <div className="access-denied-info">
                <p className="info-label">Your Current Role:</p>
                <span className="role-badge">{(user as any)?.role || "Guest"}</span>
              </div>
              <button className="back-btn-denied" onClick={() => window.history.back()}>
                Go Back
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | "all">("all");
  const [selectedDept, setSelectedDept] = useState<string | "all">("all");

  // Data state
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeUser, setActiveUser] = useState<UserDTO | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
    department: "",
    status: "available" as UserStatus,
    phone: "",
    expertise: "",
  });

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Actions
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 1800);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Departments list from data
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtering
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u._id?.toLowerCase().includes(q);

      const matchesRole = selectedRole === "all" || u.role === selectedRole;
      const matchesStatus = selectedStatus === "all" || (u.status || "available") === selectedStatus;
      const matchesDept = selectedDept === "all" || (u.department || "") === selectedDept;

      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [users, searchQuery, selectedRole, selectedStatus, selectedDept]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || "available") === "available").length;
    const managers = users.filter((u) => u.role === "manager").length;
    const agents = users.filter((u) => u.role === "agent").length;

    return [
      { label: "Total Users", value: String(total), icon: <Users size={24} />, trendValue: "", trendUp: true },
      { label: "Available", value: String(active), icon: <UserCheck size={24} />, trendValue: "", trendUp: true },
      { label: "Managers", value: String(managers), icon: <Shield size={24} />, trendValue: "", trendUp: true },
      { label: "Agents", value: String(agents), icon: <UserPlus size={24} />, trendValue: "", trendUp: true },
    ];
  }, [users]);

  const openCreate = () => {
    setModalMode("create");
    setActiveUser(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "user",
      department: "",
      status: "available",
      phone: "",
      expertise: "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: UserDTO) => {
    setModalMode("edit");
    setActiveUser(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "", // not used in edit
      role: u.role,
      department: u.department || "",
      status: (u.status || "available") as UserStatus,
      phone: u.phone || "",
      expertise: (u.expertise || []).join(", "),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setFormErrors({});
  };

  const onFormChange = (name: string, value: string) => {
    setForm((p) => ({ ...p, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = "Name is required";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Invalid email format";
    }

    if (modalMode === "create") {
      if (!form.password.trim()) {
        errors.password = "Password is required";
      } else if (form.password.trim().length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError("");

      if (modalMode === "create") {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
          department: form.department.trim() || undefined,
          status: form.status,
          phone: form.phone.trim() || undefined,
          expertise: form.expertise
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };

        const created = await createUser(payload);
        setUsers((prev) => [created, ...prev]);
        showToast("ok", "User created successfully ✅");
        setModalOpen(false);
      } else {
        if (!activeUser?._id) return;

        const payload = {
          name: form.name.trim(),
          role: form.role,
          department: form.department.trim() || undefined,
          status: form.status,
          phone: form.phone.trim() || undefined,
          expertise: form.expertise
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };

        const updated = await updateUser(activeUser._id, payload);
        setUsers((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
        showToast("ok", "User updated successfully ✅");
        setModalOpen(false);
      }
    } catch (e: any) {
      showToast("err", e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (u: UserDTO) => {
    if (!u._id) return;
    const ok = window.confirm(`Delete user "${u.name}"? This action cannot be undone.`);
    if (!ok) return;

    try {
      setDeletingId(u._id);
      await deleteUser(u._id);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      showToast("ok", "User deleted successfully ✅");
    } catch (e: any) {
      showToast("err", e?.response?.data?.message || e?.message || "Delete failed");
    } finally {
      setDeletingId("");
    }
  };

  const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
    <span className={`role-badge ${roleBadgeClass[role]}`}>
      <Shield size={14} />
      {roleLabel[role]}
    </span>
  );

  const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => (
    <span className={`status-badge ${statusBadgeClass[status]}`}>{status}</span>
  );

  const UserCard: React.FC<{ u: UserDTO }> = ({ u }) => {
    const status = (u.status || "available") as UserStatus;

    return (
      <div className="user-card">
        <div className="user-card-header">
          <div className="user-avatar">
            <UserIcon size={32} />
          </div>
          <button className="user-menu-btn" aria-label="More options" type="button">
            <MoreVertical size={18} />
          </button>
        </div>

        <div className="user-info">
          <h3 className="user-name">{u.name}</h3>
          <p className="user-email">
            <Mail size={14} />
            {u.email}
          </p>
          {u.phone && (
            <p className="user-phone">
              <Phone size={14} />
              {u.phone}
            </p>
          )}
        </div>

        <div className="user-badges">
          <RoleBadge role={u.role} />
          <StatusBadge status={status} />
        </div>

        <div className="user-meta">
          {u.department && (
            <div className="meta-item">
              <Users size={14} />
              <span>{u.department}</span>
            </div>
          )}
          <div className="meta-item">
            <Calendar size={14} />
            <span>Joined {formatDate(u.createdAt)}</span>
          </div>
          <div className="meta-item">
            <Activity size={14} />
            <span>Updated {formatDate(u.updatedAt)}</span>
          </div>
        </div>

        <div className="user-footer">
          <div className="user-stats">
            <span className="stat-item">
              <Shield size={14} />
              {u.role}
            </span>
          </div>

          <div className="user-actions">
            <button className="action-btn edit-btn" aria-label="Edit user" type="button" onClick={() => openEdit(u)}>
              <Edit size={16} />
            </button>
            <button
              className="action-btn delete-btn"
              aria-label="Remove user"
              type="button"
              onClick={() => removeUser(u)}
              disabled={deletingId === u._id}
              style={{ opacity: deletingId === u._id ? 0.6 : 1 }}
            >
              {deletingId === u._id ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UserListItem: React.FC<{ u: UserDTO }> = ({ u }) => {
    const status = (u.status || "available") as UserStatus;

    return (
      <div className="user-list-item">
        <div className="list-item-left">
          <div className="user-avatar-small">
            <UserIcon size={24} />
          </div>
          <div className="user-info-list">
            <h3 className="user-name-list">{u.name}</h3>
            <p className="user-email-list">
              <Mail size={12} />
              {u.email}
            </p>
          </div>
        </div>

        <div className="list-item-center">
          <RoleBadge role={u.role} />
          <StatusBadge status={status} />
          {u.department && (
            <span className="department-badge">
              <Users size={12} />
              {u.department}
            </span>
          )}
        </div>

        <div className="list-item-right">
          {u.phone && (
            <div className="user-contact">
              <Phone size={14} />
              <span>{u.phone}</span>
            </div>
          )}

          <div className="user-activity">
            <Activity size={14} />
            <span>{formatDate(u.updatedAt)}</span>
          </div>

          <div className="user-actions-list">
            <button className="action-btn edit-btn" aria-label="Edit user" type="button" onClick={() => openEdit(u)}>
              <Edit size={16} />
            </button>
            <button
              className="action-btn delete-btn"
              aria-label="Remove user"
              type="button"
              onClick={() => removeUser(u)}
              disabled={deletingId === u._id}
              style={{ opacity: deletingId === u._id ? 0.6 : 1 }}
            >
              {deletingId === u._id ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-management-page">
      <div className="user-management-content">
        {/* Toast */}
        {toast && (
          <div
            className={`${toast.type === "ok" ? "success-banner" : "error-banner"}`}
            style={{ marginBottom: 24 }}
          >
            {toast.type === "ok" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Statistics */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-left">
                <div className="stat-icon">{stat.icon}</div>
              </div>
              <div className="stat-right">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls-bar">
          <div className="controls-left">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search users by name, email, id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <button
                className={`filter-btn ${filterOpen ? "active" : ""}`}
                onClick={() => setFilterOpen((p) => !p)}
                type="button"
              >
                <Filter size={18} />
                Filter
              </button>

              <select
                className="sort-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
                <option value="user">User</option>
              </select>

              <button className="sort-btn" type="button" onClick={() => loadUsers()}>
                <ArrowUpDown size={18} />
                Refresh
              </button>
            </div>
          </div>

          <div className="controls-right">
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                type="button"
              >
                <Grid size={18} />
              </button>
              <button
                className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
                type="button"
              >
                <List size={18} />
              </button>
            </div>

            <button className="add-user-btn" type="button" onClick={openCreate}>
              <Plus size={18} />
              Add New User
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="filter-panel">
            <div className="filter-section">
              <h4>Status</h4>
              <select
                className="filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="filter-section">
              <h4>Department</h4>
              <select
                className="filter-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="all">All</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-actions">
              <button
                className="filter-reset-btn"
                type="button"
                onClick={() => {
                  setSelectedRole("all");
                  setSelectedStatus("all");
                  setSelectedDept("all");
                }}
              >
                Reset
              </button>
              <button className="filter-apply-btn" type="button" onClick={() => setFilterOpen(false)}>
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Data state */}
        {loading ? (
          <div className="empty-state">
            <Loader2 size={64} strokeWidth={1} className="spinning" />
            <h3>Loading users...</h3>
            <p>Please wait</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle size={64} strokeWidth={1} />
            <h3>Failed to load users</h3>
            <p>{error}</p>
            <button className="add-user-btn" type="button" onClick={loadUsers}>
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={64} strokeWidth={1} />
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="users-grid">
            {filteredUsers.map((u) => (
              <UserCard key={u._id} u={u} />
            ))}
          </div>
        ) : (
          <div className="users-list">
            {filteredUsers.map((u) => (
              <UserListItem key={u._id} u={u} />
            ))}
          </div>
        )}

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
                  {modalMode === "create" ? <UserPlus size={24} /> : <Edit size={24} />}
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-title">
                    {modalMode === "create" ? "Add New User" : "Edit User"}
                  </h2>
                  <p className="modal-subtitle">
                    {modalMode === "create"
                      ? "Create a new user account with role and permissions"
                      : "Update user information and permissions"}
                  </p>
                </div>
              </div>

              <form className="modal-form" onSubmit={(e) => { e.preventDefault(); saveUser(); }}>
                {/* Personal Information */}
                <div className="form-section">
                  <div className="section-header">
                    <UserIcon size={20} />
                    <h2>Personal Information</h2>
                  </div>

                  <div className="section-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modal-name">
                          Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="modal-name"
                          value={form.name}
                          onChange={(e) => onFormChange("name", e.target.value)}
                          className={formErrors.name ? "error" : ""}
                          placeholder="Enter full name"
                        />
                        {formErrors.name && (
                          <span className="error-message">
                            <AlertCircle size={14} />
                            {formErrors.name}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="modal-email">
                          <Mail size={16} />
                          Email <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          id="modal-email"
                          value={form.email}
                          onChange={(e) => onFormChange("email", e.target.value)}
                          className={formErrors.email ? "error" : ""}
                          placeholder="user@tadbeer.com"
                          disabled={modalMode === "edit"}
                        />
                        {formErrors.email && (
                          <span className="error-message">
                            <AlertCircle size={14} />
                            {formErrors.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {modalMode === "create" && (
                      <div className="form-group full-width">
                        <label htmlFor="modal-password">
                          <Lock size={16} />
                          Password <span className="required">*</span>
                        </label>
                        <input
                          type="password"
                          id="modal-password"
                          value={form.password}
                          onChange={(e) => onFormChange("password", e.target.value)}
                          className={formErrors.password ? "error" : ""}
                          placeholder="Min. 6 characters"
                        />
                        {formErrors.password && (
                          <span className="error-message">
                            <AlertCircle size={14} />
                            {formErrors.password}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="form-group full-width">
                      <label htmlFor="modal-phone">
                        <Phone size={16} />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="modal-phone"
                        value={form.phone}
                        onChange={(e) => onFormChange("phone", e.target.value)}
                        placeholder="+972-599-123456"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div className="form-section">
                  <div className="section-header">
                    <Shield size={20} />
                    <h2>Work Information</h2>
                  </div>

                  <div className="section-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modal-role">
                          <Shield size={16} />
                          Role <span className="required">*</span>
                        </label>
                        <select
                          id="modal-role"
                          value={form.role}
                          onChange={(e) => onFormChange("role", e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="agent">Agent</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select>

                        {form.role && (
                          <div className="role-preview">
                            <span className={`role-badge ${roleBadgeClass[form.role]}`}>
                              <Shield size={14} />
                              {roleLabel[form.role]}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="modal-status">
                          <Activity size={16} />
                          Status
                        </label>
                        <select
                          id="modal-status"
                          value={form.status}
                          onChange={(e) => onFormChange("status", e.target.value)}
                        >
                          <option value="available">Available</option>
                          <option value="busy">Busy</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="modal-department">
                          <Users size={16} />
                          Department
                        </label>
                        <input
                          type="text"
                          id="modal-department"
                          value={form.department}
                          onChange={(e) => onFormChange("department", e.target.value)}
                          placeholder="e.g., IT, Support, Technical"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="modal-expertise">
                          <UserCheck size={16} />
                          Expertise
                        </label>
                        <input
                          type="text"
                          id="modal-expertise"
                          value={form.expertise}
                          onChange={(e) => onFormChange("expertise", e.target.value)}
                          placeholder="networking, linux, security"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    <X size={18} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="spinner" />
                        {modalMode === "create" ? "Creating..." : "Updating..."}
                      </>
                    ) : modalMode === "create" ? (
                      <>
                        <Plus size={18} />
                        Create User
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Update User
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

export default UserManagement;
