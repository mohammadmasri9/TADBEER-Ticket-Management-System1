import React, { JSX, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/Profile.css";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Camera,
  Lock,
  Bell,
  Briefcase,
  Award,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  Key,
  Eye,
  Loader2,
} from "lucide-react";

import { getUserById, updateUser, UserDTO, UserRole, UserStatus } from "../../api/users";

type Tab = "overview" | "security" | "preferences";

type ProfileUI = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  position: string;
  location: string;
  joinedDate: string;
  lastActive: string;
  bio: string;
  status: UserStatus;
  expertise: string[];
  stats: {
    ticketsCreated: number;
    ticketsResolved: number;
    avgResponseTime: string;
    satisfaction: string;
  };
};

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // supports Mongo _id or id from auth context
  const myId = (user as any)?._id || (user as any)?.id || (user as any)?.userId;
  const profileId = id || myId;

  const canEdit = useMemo(() => {
    // user can edit self, admin can edit anyone
    const role = (user as any)?.role;
    if (!profileId) return false;
    if (role === "admin") return true;
    return String(profileId) === String(myId);
  }, [profileId, myId, user]);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 1800);
  };

  const defaultProfile: ProfileUI = {
    _id: profileId || "",
    name: "",
    email: "",
    phone: "",
    role: ((user as any)?.role as UserRole) || "user",
    department: "",
    position: "",
    location: "",
    joinedDate: "",
    lastActive: "",
    bio: "",
    status: "available",
    expertise: [],
    stats: {
      ticketsCreated: 0,
      ticketsResolved: 0,
      avgResponseTime: "-",
      satisfaction: "-",
    },
  };

  const [profile, setProfile] = useState<ProfileUI>(defaultProfile);
  const [editedProfile, setEditedProfile] = useState<ProfileUI>(defaultProfile);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const getRoleConfig = (role: string) => {
    const configs: Record<string, { icon: JSX.Element; class: string; label: string }> = {
      admin: { icon: <Shield size={16} />, class: "role-admin", label: "Administrator" },
      manager: { icon: <Briefcase size={16} />, class: "role-manager", label: "Manager" },
      agent: { icon: <Award size={16} />, class: "role-lead", label: "Agent" },
      user: { icon: <User size={16} />, class: "role-member", label: "User" },
    };
    return configs[role] || configs.user;
  };

  const roleConfig = useMemo(() => getRoleConfig(profile.role), [profile.role]);

  const stats = useMemo(
    () => [
      { label: "Tickets Created", value: String(profile.stats.ticketsCreated), icon: <Activity size={24} />, color: "blue" },
      { label: "Tickets Resolved", value: String(profile.stats.ticketsResolved), icon: <CheckCircle size={24} />, color: "green" },
      { label: "Avg Response Time", value: profile.stats.avgResponseTime, icon: <Clock size={24} />, color: "orange" },
      { label: "Satisfaction Rate", value: profile.stats.satisfaction, icon: <Award size={24} />, color: "red" },
    ],
    [profile.stats]
  );

  const loadProfile = async () => {
    if (!profileId) {
      setError("Missing profile id");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const u: UserDTO = await getUserById(profileId);

      const ui: ProfileUI = {
        _id: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        role: u.role,
        department: u.department || "",
        position: "",   // (not in DB currently)
        location: "",   // (not in DB currently)
        joinedDate: u.createdAt || "",
        lastActive: u.updatedAt || "",
        bio: "",        // (not in DB currently)
        status: (u.status || "available") as UserStatus,
        expertise: u.expertise || [],
        stats: {
          ticketsCreated: 0,
          ticketsResolved: 0,
          avgResponseTime: "-",
          satisfaction: "-",
        },
      };

      setProfile(ui);
      setEditedProfile(ui);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const handleEditToggle = () => {
    if (!canEdit) return;
    if (isEditing) {
      setEditedProfile(profile);
    }
    setIsEditing((p) => !p);
  };

  const handleInputChange = (field: keyof ProfileUI, value: string) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) return;

    if (!editedProfile.name.trim()) return showToast("err", "Name is required");

    try {
      setSaving(true);

      // NOTE: updateUser doesn't support email in your API → keep email readonly
      const payload = {
        name: editedProfile.name.trim(),
        role: editedProfile.role,
        department: editedProfile.department.trim() || undefined,
        status: editedProfile.status,
        phone: editedProfile.phone.trim() || undefined,
        expertise: editedProfile.expertise,
      };

      const updated = await updateUser(profile._id, payload);

      const ui: ProfileUI = {
        ...profile,
        name: updated.name,
        role: updated.role,
        department: updated.department || "",
        status: (updated.status || "available") as UserStatus,
        phone: updated.phone || "",
        expertise: updated.expertise || [],
        lastActive: updated.updatedAt || profile.lastActive,
      };

      setProfile(ui);
      setEditedProfile(ui);
      setIsEditing(false);
      showToast("ok", "Profile updated ✅");
    } catch (e: any) {
      showToast("err", e?.response?.data?.message || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-content">
          <div className="empty-state">
            <Loader2 size={64} strokeWidth={1} />
            <h3>Loading profile...</h3>
            <p>Please wait</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-content">
          <div className="empty-state">
            <AlertCircle size={64} strokeWidth={1} />
            <h3>Failed to load profile</h3>
            <p>{error}</p>
            <button className="action-btn edit-btn" onClick={loadProfile}>
              <Settings size={18} />
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        {/* Toast */}
        {toast && (
          <div className="error-banner" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {toast.type === "ok" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Profile Header */}
        <div className="profile-header">
          <div className="header-background"></div>
          <div className="header-content">
            <div className="avatar-section">
              <div className="avatar-container">
                <div className="avatar">
                  <User size={64} />
                </div>
                {isEditing && (
                  <button className="avatar-upload-btn" aria-label="Upload photo" type="button">
                    <Camera size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="profile-info">
              <div className="info-main">
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input name-input"
                    value={editedProfile.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={!canEdit}
                  />
                ) : (
                  <h1 className="profile-name">{profile.name || "—"}</h1>
                )}

                <div className="profile-badges">
                  <span className={`role-badge ${roleConfig.class}`}>
                    {roleConfig.icon}
                    {roleConfig.label}
                  </span>

                  <span className="status-badge active">
                    <CheckCircle size={14} />
                    {profile.status || "available"}
                  </span>
                </div>
              </div>

              <div className="profile-actions">
                {canEdit ? (
                  isEditing ? (
                    <>
                      <button className="action-btn save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={18} /> : <Save size={18} />}
                        Save Changes
                      </button>
                      <button className="action-btn cancel-btn" onClick={handleEditToggle} disabled={saving}>
                        <X size={18} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="action-btn edit-btn" onClick={handleEditToggle}>
                      <Edit size={18} />
                      Edit Profile
                    </button>
                  )
                ) : (
                  <button className="action-btn cancel-btn" onClick={() => navigate(-1)}>
                    <X size={18} />
                    Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className={`stat-card stat-${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-navigation">
          <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <User size={18} />
            Overview
          </button>
          <button className={`tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
            <Lock size={18} />
            Security
          </button>
          <button className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`} onClick={() => setActiveTab("preferences")}>
            <Settings size={18} />
            Preferences
          </button>
        </div>

        {/* Content */}
        <div className="tabs-content">
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="tab-panel">
              <div className="content-grid">
                {/* Personal */}
                <div className="info-card">
                  <div className="card-header">
                    <h3 className="card-title">Personal Information</h3>
                    <User size={20} className="card-icon" />
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <div className="info-label">
                        <Mail size={16} />
                        <span>Email</span>
                      </div>
                      <div className="info-value">{profile.email}</div>
                    </div>

                    <div className="info-row">
                      <div className="info-label">
                        <Phone size={16} />
                        <span>Phone</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="tel"
                          className="edit-input"
                          value={editedProfile.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          disabled={!canEdit}
                        />
                      ) : (
                        <div className="info-value">{profile.phone || "-"}</div>
                      )}
                    </div>

                    <div className="info-row">
                      <div className="info-label">
                        <MapPin size={16} />
                        <span>Location</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editedProfile.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          disabled={!canEdit}
                          placeholder="(optional)"
                        />
                      ) : (
                        <div className="info-value">{profile.location || "-"}</div>
                      )}
                    </div>

                    <div className="info-row">
                      <div className="info-label">
                        <Calendar size={16} />
                        <span>Joined</span>
                      </div>
                      <div className="info-value">{formatDate(profile.joinedDate)}</div>
                    </div>
                  </div>
                </div>

                {/* Work */}
                <div className="info-card">
                  <div className="card-header">
                    <h3 className="card-title">Work Information</h3>
                    <Briefcase size={20} className="card-icon" />
                  </div>
                  <div className="card-content">
                    <div className="info-row">
                      <div className="info-label">
                        <Briefcase size={16} />
                        <span>Department</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editedProfile.department}
                          onChange={(e) => handleInputChange("department", e.target.value)}
                          disabled={!canEdit}
                        />
                      ) : (
                        <div className="info-value">{profile.department || "-"}</div>
                      )}
                    </div>

                    <div className="info-row">
                      <div className="info-label">
                        <Award size={16} />
                        <span>Role</span>
                      </div>

                      {isEditing && (user as any)?.role === "admin" ? (
                        <select
                          className="edit-input"
                          value={editedProfile.role}
                          onChange={(e) => handleInputChange("role", e.target.value as any)}
                        >
                          <option value="user">user</option>
                          <option value="agent">agent</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <div className="info-value">
                          <span className={`role-badge-small ${roleConfig.class}`}>{roleConfig.label}</span>
                        </div>
                      )}
                    </div>

                    <div className="info-row">
                      <div className="info-label">
                        <Activity size={16} />
                        <span>Last Active</span>
                      </div>
                      <div className="info-value">{formatDate(profile.lastActive)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div className="info-card bio-card">
                <div className="card-header">
                  <h3 className="card-title">Expertise</h3>
                  <Award size={20} className="card-icon" />
                </div>

                <div className="card-content">
                  {isEditing ? (
                    <input
                      className="edit-input"
                      value={editedProfile.expertise.join(", ")}
                      onChange={(e) =>
                        setEditedProfile((p) => ({
                          ...p,
                          expertise: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="linux, networking, security"
                      disabled={!canEdit}
                    />
                  ) : profile.expertise?.length ? (
                    <p className="bio-text">{profile.expertise.join(", ")}</p>
                  ) : (
                    <p className="bio-text">-</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security (UI only) */}
          {activeTab === "security" && (
            <div className="tab-panel">
              <div className="info-card">
                <div className="card-header">
                  <h3 className="card-title">Password & Security</h3>
                  <Lock size={20} className="card-icon" />
                </div>

                <div className="card-content">
                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon">
                        <Key size={20} />
                      </div>
                      <div className="security-details">
                        <h4 className="security-title">Password</h4>
                        <p className="security-description">Change your password from Settings (API not wired yet)</p>
                      </div>
                    </div>
                    <button className="security-btn" type="button" disabled>
                      <Edit size={16} />
                      Change
                    </button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon">
                        <Shield size={20} />
                      </div>
                      <div className="security-details">
                        <h4 className="security-title">Two-Factor Authentication</h4>
                        <p className="security-description">Enable 2FA (API not wired yet)</p>
                      </div>
                    </div>
                    <button className="security-btn" type="button" disabled>
                      <Settings size={16} />
                      Enable
                    </button>
                  </div>

                  <div className="security-item">
                    <div className="security-info">
                      <div className="security-icon">
                        <Activity size={20} />
                      </div>
                      <div className="security-details">
                        <h4 className="security-title">Active Sessions</h4>
                        <p className="security-description">View sessions (API not wired yet)</p>
                      </div>
                    </div>
                    <button className="security-btn" type="button" disabled>
                      <Eye size={16} />
                      View
                    </button>
                  </div>

                  <div className="security-item danger">
                    <div className="security-info">
                      <div className="security-icon">
                        <AlertCircle size={20} />
                      </div>
                      <div className="security-details">
                        <h4 className="security-title">Delete Account</h4>
                        <p className="security-description">Disabled for safety</p>
                      </div>
                    </div>
                    <button className="security-btn danger-btn" type="button" disabled>
                      <X size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences (UI only) */}
          {activeTab === "preferences" && (
            <div className="tab-panel">
              <div className="info-card">
                <div className="card-header">
                  <h3 className="card-title">Notification Preferences</h3>
                  <Bell size={20} className="card-icon" />
                </div>
                <div className="card-content">
                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Email Notifications</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Push Notifications</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Weekly Summary</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="card-header">
                  <h3 className="card-title">Display Preferences</h3>
                  <Settings size={20} className="card-icon" />
                </div>
                <div className="card-content">
                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Language</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <select className="preference-select">
                      <option>English</option>
                      <option>العربية</option>
                    </select>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Timezone</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <select className="preference-select">
                      <option>Asia/Hebron (GMT+2)</option>
                      <option>Europe/London (GMT+0)</option>
                      <option>America/New_York (GMT-5)</option>
                    </select>
                  </div>

                  <div className="preference-item">
                    <div className="preference-info">
                      <h4 className="preference-title">Date Format</h4>
                      <p className="preference-description">UI only</p>
                    </div>
                    <select className="preference-select">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="logout-section">
          <button className="logout-btn" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
 