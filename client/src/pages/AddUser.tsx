// src/pages/AddUser.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import "../style/AddUser.css";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  X,
  Building,
  Calendar,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle,
  ActivityIcon,
} from "lucide-react";

// ✅ API
import { createUser, CreateUserPayload, UserRole, UserStatus } from "../../api/users";
import { getDepartments, DepartmentDTO, updateDepartment } from "../../api/departments";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  role: UserRole | "";
  departmentId: string; // ✅ NEW: real departmentId
  status: UserStatus;

  // UI-only fields (not sent to backend)
  position: string;
  location: string;
  employeeId: string;
  startDate: string;

  password: string;
  confirmPassword: string;

  bio: string;
  language: string;
  timezone: string;
}

interface FormErrors {
  [key: string]: string;
}

const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ Role-based access check
  if (user?.role !== "admin") {
    return (
      <div className="add-user-page">
        <div className="add-user-content">
          <div className="access-denied-container">
            <div className="access-denied-card">
              <div className="access-denied-icon">
                <Lock size={64} />
              </div>
              <h2 className="access-denied-title">Access Restricted</h2>
              <p className="access-denied-message">
                You don't have permission to access this page. User creation is only available for administrators.
              </p>
              <div className="access-denied-info">
                <p className="info-label">Your Current Role:</p>
                <span className="role-badge">{user?.role || "Guest"}</span>
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

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",

    role: "",
    departmentId: "",
    status: "available",

    position: "",
    location: "",
    employeeId: "",
    startDate: "",

    password: "",
    confirmPassword: "",

    bio: "",
    language: "en",
    timezone: "Asia/Jerusalem",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [apiError, setApiError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // ✅ Departments
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState("");

  // ✅ Only for manager role: should we set him as dept manager?
  const [setAsDeptManager, setSetAsDeptManager] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setDeptLoading(true);
        setDeptError("");
        const data = await getDepartments();
        if (!mounted) return;
        setDepartments(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        setDeptError(e?.response?.data?.message || e?.message || "Failed to load departments");
        setDepartments([]);
      } finally {
        if (!mounted) return;
        setDeptLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedDept = useMemo(() => {
    return departments.find((d) => d._id === formData.departmentId) || null;
  }, [departments, formData.departmentId]);

  const fullName = useMemo(() => {
    const fn = formData.firstName.trim();
    const ln = formData.lastName.trim();
    return `${fn}${fn && ln ? " " : ""}${ln}`.trim();
  }, [formData.firstName, formData.lastName]);

  const handleCancel = () => {
    navigate("/admin/users");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // if role changed away from manager, hide manager checkbox behavior
    if (name === "role" && value !== "manager") {
      setSetAsDeptManager(false);
    }
    if (name === "role" && value === "manager") {
      setSetAsDeptManager(true);
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (apiError) setApiError("");
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.role) newErrors.role = "Role is required";

    // ✅ For your workflow: department is required for all except admin
    if (formData.role && formData.role !== "admin") {
      if (!formData.departmentId) newErrors.departmentId = "Department is required";
    }

    // ✅ If manager role and setAsDeptManager => department must be selected
    if (formData.role === "manager" && setAsDeptManager && !formData.departmentId) {
      newErrors.departmentId = "Manager must have a department";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      admin: "role-admin",
      manager: "role-manager",
      agent: "role-member",
      user: "role-member",
    };
    return classes[role] || "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError("");

    try {
      // ✅ Send what backend accepts (+ departmentId as an extra if backend supports it)
      const payload: any = {
        name: fullName,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role as UserRole,
        status: formData.status,
        phone: formData.phone.trim() || undefined,

        // keep department string for compatibility (optional)
        department: selectedDept?.name || undefined,

        // ✅ NEW: departmentId (recommended to store in backend user model)
        departmentId: formData.departmentId || undefined,
      };

      const createdUser: any = await createUser(payload);

      // ✅ If role=manager and checkbox enabled -> set this user as department manager
      if (formData.role === "manager" && setAsDeptManager && formData.departmentId && createdUser?._id) {
        await updateDepartment(formData.departmentId, { managerId: createdUser._id });
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/admin/users");
      }, 1200);
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-page">
      <div className="add-user-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-top">
            <button className="back-btn" onClick={handleCancel} type="button">
              <ArrowLeft size={20} />
              Back to Users
            </button>
          </div>

          <div className="header-main">
            <div className="header-icon">
              <User size={32} />
            </div>
            <div className="header-text">
              <h1 className="page-title">Add New User</h1>
              <p className="page-subtitle">Create a new user account with role and department</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="success-banner">
            <CheckCircle size={24} />
            <div className="success-text">
              <h3>User Created Successfully!</h3>
              <p>Redirecting to users list...</p>
            </div>
          </div>
        )}

        {apiError && (
          <div
            className="error-banner"
            style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}
          >
            <AlertCircle size={20} />
            <div>
              <strong>Failed:</strong> {apiError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-user-form">
          {/* Personal Information */}
          <div className="form-section">
            <div className="section-header">
              <User size={20} />
              <h2>Personal Information</h2>
            </div>

            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">
                    First Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={errors.firstName ? "error" : ""}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.firstName}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">
                    Last Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={errors.lastName ? "error" : ""}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={16} /> Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? "error" : ""}
                    placeholder="user@tadbeer.com"
                  />
                  {errors.email && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.email}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    <Phone size={16} /> Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? "error" : ""}
                    placeholder="+972-599-123456"
                  />
                  {errors.phone && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="location">
                  <MapPin size={16} /> Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="form-section">
            <div className="section-header">
              <Briefcase size={20} />
              <h2>Work Information</h2>
            </div>

            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employeeId">
                    <Building size={16} /> Employee ID
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="EMP-001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startDate">
                    <Calendar size={16} /> Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="position">
                    <Briefcase size={16} /> Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g., Senior Developer"
                  />
                </div>

                {/* ✅ Department from API */}
                <div className="form-group">
                  <label htmlFor="departmentId">
                    <Building size={16} /> Department{" "}
                    {formData.role && formData.role !== "admin" ? <span className="required">*</span> : null}
                  </label>

                  <select
                    id="departmentId"
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className={errors.departmentId ? "error" : ""}
                    disabled={deptLoading}
                  >
                    <option value="">{deptLoading ? "Loading departments..." : "Select Department"}</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  {deptError && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {deptError}
                    </span>
                  )}
                  {errors.departmentId && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.departmentId}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">
                    <Shield size={16} /> Role <span className="required">*</span>
                  </label>

                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={errors.role ? "error" : ""}
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="agent">Agent</option>
                    <option value="user">User</option>
                  </select>

                  {errors.role && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.role}
                    </span>
                  )}

                  {formData.role && (
                    <div className="role-preview">
                      <span className={`role-badge ${getRoleBadgeClass(formData.role)}`}>
                        <Shield size={14} />
                        {formData.role === "admin" && "Administrator"}
                        {formData.role === "manager" && "Manager"}
                        {formData.role === "agent" && "Agent"}
                        {formData.role === "user" && "User"}
                      </span>
                    </div>
                  )}

                  {/* ✅ Manager assignment rule */}
                  {formData.role === "manager" && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        id="setAsDeptManager"
                        type="checkbox"
                        checked={setAsDeptManager}
                        onChange={(e) => setSetAsDeptManager(e.target.checked)}
                      />
                      <label htmlFor="setAsDeptManager" style={{ cursor: "pointer" }}>
                        Set this user as the <strong>Department Manager</strong>
                      </label>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="status">
                    <ActivityIcon size={14} /> Status
                  </label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              {/* Optional info reminder */}
              {formData.role === "manager" && setAsDeptManager && selectedDept?.managerId && (
                <div className="error-banner" style={{ marginTop: 12 }}>
                  <AlertCircle size={18} />
                  <div style={{ marginLeft: 10 }}>
                    <strong>Note:</strong> This department already has a manager.
                    Updating will replace the current manager.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="form-section">
            <div className="section-header">
              <Lock size={20} />
              <h2>Security & Access</h2>
            </div>

            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">
                    <Lock size={16} /> Password <span className="required">*</span>
                  </label>

                  <div className="password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? "error" : ""}
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {errors.password && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.password}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <Lock size={16} /> Confirm Password <span className="required">*</span>
                  </label>

                  <div className="password-input">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={errors.confirmPassword ? "error" : ""}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <span className="error-message">
                      <AlertCircle size={14} />
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences (UI only now) */}
          <div className="form-section">
            <div className="section-header">
              <Globe size={20} />
              <h2>Preferences</h2>
            </div>

            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="language">
                    <Globe size={16} /> Language
                  </label>
                  <select id="language" name="language" value={formData.language} onChange={handleChange}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="timezone">
                    <Globe size={16} /> Timezone
                  </label>
                  <select id="timezone" name="timezone" value={formData.timezone} onChange={handleChange}>
                    <option value="Asia/Jerusalem">Asia/Jerusalem (GMT+2)</option>
                    <option value="Asia/Hebron">Asia/Hebron (GMT+2)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="bio">
                  <FileText size={16} /> Bio / Notes
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any additional notes about the user..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
              <X size={18} /> Cancel
            </button>

            <button type="submit" className="btn-submit" disabled={loading || success}>
              {loading ? (
                <>
                  <div className="spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default AddUser;
