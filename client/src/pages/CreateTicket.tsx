// src/pages/CreateTicket.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import "../style/CreateTicket.css";

import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  Tag,
  MessageSquare,
  Paperclip,
  TrendingUp,
  X,
  Send,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Image,
  Link,
  Calendar,
  Save,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  UserCircle,
  Info,
  Upload,
  FileText,
  Check,
  Building,
  User,
  Wand2,
  Copy,
} from "lucide-react";

// ✅ API
import { createTicket, TicketCategory, TicketPriority } from "../../api/tickets";
import { getDepartments, DepartmentDTO } from "../../api/departments";

// ✅ AI API (make sure you created: client/api/ai.ts)
import { suggestTicketAI } from "../../api/ai";

// ============================================================================
// TYPES
// ============================================================================
interface CategoryOption {
  value: TicketCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface PriorityOption {
  value: TicketPriority;
  label: string;
  className: string;
  icon: React.ReactNode;
  description: string;
}

interface FormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: "" | TicketCategory;
  departmentId: string;
  dueDate: string;
  attachments: File[];
}

interface FormErrors {
  [key: string]: string;
}

type AutoSaveStatus = "saved" | "saving" | "idle";

type AISuggestState = {
  shortSummary: string;
  steps: string[];
  clarifyingQuestion?: string;
  priority: TicketPriority;
  category: TicketCategory;
};

// ============================================================================
// CONSTANTS
// ============================================================================
const CATEGORIES: CategoryOption[] = [
  {
    value: "Technical",
    label: "Technical",
    icon: <Zap size={20} />,
    description: "System errors, bugs, or technical difficulties",
  },
  {
    value: "Security",
    label: "Security",
    icon: <Shield size={20} />,
    description: "Security concerns, vulnerabilities, or access issues",
  },
  {
    value: "Feature",
    label: "Feature Request",
    icon: <Sparkles size={20} />,
    description: "New feature suggestions or enhancements",
  },
  {
    value: "Account",
    label: "Account",
    icon: <UserCircle size={20} />,
    description: "Account management, billing, or subscription issues",
  },
  {
    value: "Bug",
    label: "Bug Report",
    icon: <AlertCircle size={20} />,
    description: "Report unexpected behavior or errors",
  },
];

const PRIORITIES: PriorityOption[] = [
  {
    value: "low",
    label: "Low",
    className: "priority-low",
    icon: <Clock size={16} />,
    description: "Non-urgent, can be scheduled",
  },
  {
    value: "medium",
    label: "Medium",
    className: "priority-medium",
    icon: <TrendingUp size={16} />,
    description: "Important, needs attention soon",
  },
  {
    value: "high",
    label: "High",
    className: "priority-high",
    icon: <AlertCircle size={16} />,
    description: "Critical, requires quick resolution",
  },
  {
    value: "urgent",
    label: "Urgent",
    className: "priority-urgent",
    icon: <Zap size={16} />,
    description: "Emergency, immediate action required",
  },
];

const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
};

const DRAFT_STORAGE_KEY = "draftTicket";

// ============================================================================
// HELPERS
// ============================================================================
function getManagerPreview(dep?: DepartmentDTO | null) {
  const raw: any = dep?.managerId;
  if (!raw) return null;

  // managerId could be string or populated object
  if (typeof raw === "string") return { _id: raw, name: "", email: "", role: "" };

  return {
    _id: raw?._id || "",
    name: raw?.name || "",
    email: raw?.email || "",
    role: raw?.role || "",
  };
}

function joinStepsAsText(steps: string[]) {
  if (!steps?.length) return "";
  return steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

// ============================================================================
// COMPONENT
// ============================================================================
const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    priority: "medium",
    category: "",
    departmentId: "",
    dueDate: "",
    attachments: [],
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");

  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Departments
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState("");

  // ✅ AI Suggest
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiData, setAiData] = useState<AISuggestState | null>(null);
  const [aiStepsText, setAiStepsText] = useState("");
  const [aiApplied, setAiApplied] = useState(false);

  // =========================
  // Fetch departments (works for ALL roles)
  // =========================
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

  // =========================
  // Draft Auto-save
  // =========================
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        formData.title ||
        formData.description ||
        formData.category ||
        formData.departmentId ||
        formData.dueDate
      ) {
        setAutoSaveStatus("saving");
        setTimeout(() => {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 1500);
        }, 350);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [formData]);

  // =========================
  // Draft banner on mount
  // =========================
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed?.title || parsed?.description || parsed?.category || parsed?.departmentId) {
          setHasDraft(true);
          setShowDraftBanner(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // =========================
  // Selected Department + Manager Preview
  // =========================
  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d._id === formData.departmentId) || null;
  }, [departments, formData.departmentId]);

  const managerPreview = useMemo(() => getManagerPreview(selectedDepartment), [selectedDepartment]);

  // =========================
  // Validation
  // =========================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    else if (formData.title.trim().length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
      newErrors.title = `Title must be at least ${VALIDATION_RULES.TITLE_MIN_LENGTH} characters`;
    }

    if (!formData.description.trim()) newErrors.description = "Description is required";
    else if (formData.description.trim().length < VALIDATION_RULES.DESCRIPTION_MIN_LENGTH) {
      newErrors.description = `Description must be at least ${VALIDATION_RULES.DESCRIPTION_MIN_LENGTH} characters`;
    }

    if (!formData.category) newErrors.category = "Please select a category";
    if (!formData.departmentId) newErrors.departmentId = "Please select a department";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ FIX: errors may keep keys with empty strings. We consider “noRealErrors” by values, not by keys.
  const isFormValid = useMemo(() => {
    const noRealErrors = Object.values(errors).every((v) => !v);

    return (
      formData.title.trim().length >= VALIDATION_RULES.TITLE_MIN_LENGTH &&
      formData.description.trim().length >= VALIDATION_RULES.DESCRIPTION_MIN_LENGTH &&
      formData.category !== "" &&
      formData.departmentId !== "" &&
      noRealErrors
    );
  }, [formData.title, formData.description, formData.category, formData.departmentId, errors]);

  // =========================
  // Handlers
  // =========================
  const handleCancel = () => navigate("/tickets");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // ✅ FIX: remove cleared error key (not just set to "")
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (apiError) setApiError("");

    // AI state resets if user changes main content
    if (name === "title" || name === "description") {
      setAiApplied(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.size <= VALIDATION_RULES.MAX_FILE_SIZE);
    setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...validFiles] }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter((file) => file.size <= VALIDATION_RULES.MAX_FILE_SIZE);
    setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...validFiles] }));
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    setAutoSaveStatus("saved");
    setTimeout(() => setAutoSaveStatus("idle"), 1500);
  };

  const handleRestoreDraft = () => {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch {
        // ignore
      }
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowDraftBanner(false);
    setHasDraft(false);
  };

  // =========================
  // ✅ AI Suggest Handler
  // =========================
  const handleAISuggest = async () => {
    setAiError("");
    setApiError("");

    const titleOk = formData.title.trim().length >= VALIDATION_RULES.TITLE_MIN_LENGTH;
    const descOk = formData.description.trim().length >= VALIDATION_RULES.DESCRIPTION_MIN_LENGTH;

    if (!titleOk || !descOk) {
      setAiError(
        `Please enter a valid title (min ${VALIDATION_RULES.TITLE_MIN_LENGTH}) and description (min ${VALIDATION_RULES.DESCRIPTION_MIN_LENGTH}) first.`
      );
      return;
    }

    setAiLoading(true);
    try {
      const res = await suggestTicketAI({
        title: formData.title.trim(),
        description: formData.description.trim(),
      });

      const next: AISuggestState = {
        priority: res.priority,
        category: res.category,
        shortSummary: res.shortSummary,
        steps: Array.isArray(res.steps) ? res.steps : [],
        clarifyingQuestion: res.clarifyingQuestion,
      };

      setAiData(next);
      setAiStepsText(joinStepsAsText(next.steps));

      // Auto-fill category + priority
      setFormData((prev) => ({
        ...prev,
        priority: next.priority,
        category: next.category,
      }));

      // ✅ FIX: remove category error key completely (don’t keep empty key)
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.category;
        return nextErrors;
      });

      setAiApplied(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "AI request failed";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyStepsToDescription = () => {
    const stepsText = aiStepsText.trim();
    if (!stepsText) return;

    setFormData((prev) => {
      const base = prev.description.trim();
      const block = `\n\nAI Suggested Steps:\n${stepsText}\n`;
      // avoid duplicate block if clicked twice
      if (base.includes("AI Suggested Steps:")) return prev;
      return { ...prev, description: `${base}${block}`.trim() };
    });

    // focus textarea for nice UX
    setTimeout(() => {
      descriptionRef.current?.focus();
    }, 0);
  };

  const handleCopySteps = async () => {
    try {
      await navigator.clipboard.writeText(aiStepsText || "");
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError("");

    try {
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        departmentId: formData.departmentId,
      };

      if (formData.dueDate) payload.dueDate = new Date(formData.dueDate).toISOString();

      await createTicket(payload);

      setSuccess(true);
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      setTimeout(() => {
        navigate("/tickets", { state: { message: "Ticket created successfully!" } });
      }, 1100);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        const nice = msg.map((e: any) => e?.message || JSON.stringify(e)).join(" • ");
        setApiError(nice || "Validation error");
      } else {
        setApiError(msg || err?.message || "Failed to create ticket");
      }
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return <Image size={16} />;
    return <FileText size={16} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const classes: Record<string, string> = {
      low: "priority-low",
      medium: "priority-medium",
      high: "priority-high",
      urgent: "priority-urgent",
    };
    return classes[priority] || "";
  };

  return (
    <div className="create-ticket-page">
      <div className="create-ticket-content">
        <div className="page-header">
          <div className="header-top">
            <button className="back-btn" onClick={handleCancel} type="button">
              <ArrowLeft size={20} />
              Back to Tickets
            </button>

            {autoSaveStatus !== "idle" && (
              <div className="auto-save-indicator">
                {autoSaveStatus === "saving" && (
                  <>
                    <Loader2 className="saving-spinner" size={14} />
                    <span>Saving draft...</span>
                  </>
                )}
                {autoSaveStatus === "saved" && (
                  <>
                    <Check size={14} />
                    <span>Draft saved</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="header-main">
            <div className="header-icon">
              <MessageSquare size={32} />
            </div>
            <div className="header-text">
              <h1 className="page-title">Create New Ticket</h1>
              <p className="page-subtitle">
                Select a department — the ticket will go to the department manager automatically.
              </p>
            </div>
          </div>
        </div>

        {success && (
          <div className="success-banner">
            <CheckCircle size={24} />
            <div className="success-text">
              <h3>Ticket Created Successfully!</h3>
              <p>Redirecting to tickets list...</p>
            </div>
          </div>
        )}

        {showDraftBanner && hasDraft && (
          <div className="draft-restore-banner">
            <div className="draft-restore-content">
              <Info size={20} />
              <div className="draft-restore-text">
                <strong>Draft Found</strong>
                <span>You have unsaved changes from a previous session</span>
              </div>
            </div>
            <div className="draft-restore-actions">
              <button className="draft-btn restore" type="button" onClick={handleRestoreDraft}>
                Restore Draft
              </button>
              <button className="draft-btn discard" type="button" onClick={handleDiscardDraft}>
                Discard
              </button>
            </div>
          </div>
        )}

        {apiError && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <div>
              <strong>Failed:</strong> {apiError}
            </div>
          </div>
        )}

        {aiError && (
          <div className="error-banner">
            <Wand2 size={20} />
            <div>
              <strong>AI:</strong> {aiError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-ticket-form">
          {/* Basic Info */}
          <div className="form-section">
            <div className="section-header">
              <Tag size={20} />
              <h2>Basic Information</h2>
            </div>

            <div className="section-content">
              <div className="form-group full-width">
                <label htmlFor="title">
                  Ticket Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={errors.title ? "error" : ""}
                  placeholder="e.g., Login authentication issue on mobile app"
                  maxLength={VALIDATION_RULES.TITLE_MAX_LENGTH}
                />
                <div className="input-meta">
                  <span
                    className={`char-count ${
                      formData.title.length > VALIDATION_RULES.TITLE_MAX_LENGTH - 20 ? "warning" : ""
                    }`}
                  >
                    {formData.title.length}/{VALIDATION_RULES.TITLE_MAX_LENGTH}
                  </span>
                </div>
                {errors.title && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {errors.title}
                  </span>
                )}
              </div>

              {/* Department */}
              <div className="form-group full-width">
                <label htmlFor="departmentId">
                  <Building size={16} /> Department <span className="required">*</span>
                </label>

                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className={errors.departmentId ? "error" : ""}
                  disabled={deptLoading}
                >
                  <option value="">
                    {deptLoading ? "Loading departments..." : "Select Department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                {/* Manager preview */}
                {formData.departmentId && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      opacity: 0.95,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <User size={16} />
                    <strong>Department Manager:</strong>{" "}
                    {managerPreview && (managerPreview.name || managerPreview.email) ? (
                      <span>
                        {managerPreview.name || "Manager"}
                        {managerPreview.email ? ` (${managerPreview.email})` : ""}
                      </span>
                    ) : managerPreview && managerPreview._id ? (
                      <span>Manager ID: {managerPreview._id}</span>
                    ) : (
                      <span style={{ color: "#b91c1c" }}>No manager assigned to this department</span>
                    )}
                  </div>
                )}

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

              {/* Category */}
              <div className="form-group full-width">
                <label htmlFor="category">
                  <Tag size={16} />
                  Category <span className="required">*</span>
                </label>

                <div className="category-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`category-card ${formData.category === cat.value ? "selected" : ""}`}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, category: cat.value }));

                        // ✅ FIX: remove category error key completely
                        if (errors.category) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.category;
                            return next;
                          });
                        }
                      }}
                    >
                      <div className="category-icon">{cat.icon}</div>
                      <div className="category-content">
                        <span className="category-label">{cat.label}</span>
                        <span className="category-description">{cat.description}</span>
                      </div>
                      {formData.category === cat.value && (
                        <div className="category-check">
                          <CheckCircle size={20} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {errors.category && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {errors.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Priority & Due date */}
          <div className="form-section">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={20} />
                <h2>Priority & Schedule</h2>
              </div>

              <button
                type="button"
                onClick={handleAISuggest}
                disabled={aiLoading || loading || success}
                className="btn-draft"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: aiLoading ? 0.8 : 1,
                }}
                title="AI Suggest Category & Priority"
              >
                {aiLoading ? <Loader2 size={16} className="saving-spinner" /> : <Wand2 size={16} />}
                {aiLoading ? "Analyzing..." : "AI Suggest"}
              </button>
            </div>

            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">
                    <TrendingUp size={16} />
                    Priority Level
                  </label>
                  <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} - {p.description}
                      </option>
                    ))}
                  </select>

                  {formData.priority && (
                    <div className="priority-preview">
                      <span className={`priority-badge ${getPriorityBadgeClass(formData.priority)}`}>
                        {PRIORITIES.find((p) => p.value === formData.priority)?.icon}
                        {PRIORITIES.find((p) => p.value === formData.priority)?.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="dueDate">
                    <Calendar size={16} />
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              {/* ✅ AI Suggest Results Panel */}
              {aiData && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(255,255,255,0.6)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Sparkles size={18} />
                    <strong>AI Suggestions</strong>
                    {aiApplied && (
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        (Applied to Category & Priority)
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.95, marginBottom: 8 }}>
                    <strong>Summary:</strong> {aiData.shortSummary}
                  </div>

                  {aiData.clarifyingQuestion && (
                    <div style={{ fontSize: 13, marginBottom: 10, color: "#7c2d12" }}>
                      <strong>Clarifying question:</strong> {aiData.clarifyingQuestion}
                    </div>
                  )}

                  <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                    <strong>Suggested Steps</strong> (editable)
                  </label>

                  <textarea
                    value={aiStepsText}
                    onChange={(e) => setAiStepsText(e.target.value)}
                    rows={6}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                    placeholder="AI steps will appear here..."
                  />

                  <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-draft"
                      onClick={handleApplyStepsToDescription}
                      disabled={!aiStepsText.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <MessageSquare size={16} />
                      Apply steps to Description
                    </button>

                    <button
                      type="button"
                      className="btn-draft"
                      onClick={handleCopySteps}
                      disabled={!aiStepsText.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                      title="Copy steps"
                    >
                      <Copy size={16} />
                      Copy steps
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <div className="section-header">
              <MessageSquare size={20} />
              <h2>Detailed Description</h2>
            </div>

            <div className="section-content">
              <div className="form-group full-width">
                <label htmlFor="description">
                  <MessageSquare size={16} />
                  Description <span className="required">*</span>
                </label>

                <div className="description-editor">
                  <div className="editor-toolbar">
                    <div className="toolbar-group">
                      <button type="button" className="toolbar-btn" title="Bold">
                        <Bold size={16} />
                      </button>
                      <button type="button" className="toolbar-btn" title="Italic">
                        <Italic size={16} />
                      </button>
                      <button type="button" className="toolbar-btn" title="Underline">
                        <Underline size={16} />
                      </button>
                    </div>
                    <div className="toolbar-divider" />
                    <div className="toolbar-group">
                      <button type="button" className="toolbar-btn" title="Bulleted List">
                        <List size={16} />
                      </button>
                      <button type="button" className="toolbar-btn" title="Numbered List">
                        <ListOrdered size={16} />
                      </button>
                    </div>
                    <div className="toolbar-divider" />
                    <div className="toolbar-group">
                      <button type="button" className="toolbar-btn" title="Insert Image">
                        <Image size={16} />
                      </button>
                      <button type="button" className="toolbar-btn" title="Insert Link">
                        <Link size={16} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={descriptionRef}
                    id="description"
                    name="description"
                    placeholder="Provide detailed information:
• What happened?
• Steps to reproduce
• Expected vs actual behavior
• Any error messages"
                    value={formData.description}
                    onChange={handleChange}
                    rows={10}
                    className={errors.description ? "editor-textarea error" : "editor-textarea"}
                    maxLength={VALIDATION_RULES.DESCRIPTION_MAX_LENGTH}
                  />

                  <div className="editor-footer">
                    <span
                      className={`char-count ${
                        formData.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH - 500
                          ? "warning"
                          : ""
                      }`}
                    >
                      {formData.description.length}/{VALIDATION_RULES.DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {errors.description && (
                  <span className="error-message">
                    <AlertCircle size={14} />
                    {errors.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="form-section">
            <div className="section-header">
              <Paperclip size={20} />
              <h2>Attachments</h2>
            </div>

            <div className="section-content">
              <div className="form-group full-width">
                <label>
                  <Paperclip size={16} />
                  Upload Files (Optional - Max 10MB per file)
                </label>

                <div
                  className={`file-upload-area ${isDragOver ? "drag-over" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileUpload}
                    id="file-upload"
                    className="file-input"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <div className="upload-icon">
                      <Upload size={32} />
                    </div>
                    <span className="upload-title">Drag & drop files here</span>
                    <span className="upload-subtitle">or click to browse</span>
                    <div className="upload-formats">
                      <span>PDF</span>
                      <span>DOC</span>
                      <span>Images</span>
                    </div>
                  </label>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="attached-files">
                    <div className="files-header">
                      <h4>Attached Files</h4>
                      <span className="files-count">
                        {formData.attachments.length} file{formData.attachments.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="files-list">
                      {formData.attachments.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="file-item">
                          <div className="file-icon-wrapper">{getFileIcon(file.name)}</div>
                          <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button
                            type="button"
                            className="remove-file-btn"
                            onClick={() => removeAttachment(index)}
                            title="Remove file"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
              <X size={18} />
              Cancel
            </button>

            <div className="actions-right">
              <button
                type="button"
                className="btn-draft"
                onClick={handleSaveDraft}
                disabled={
                  !formData.title && !formData.description && !formData.category && !formData.departmentId
                }
              >
                <Save size={18} />
                Save Draft
              </button>

              <button type="submit" className="btn-submit" disabled={!isFormValid || loading || success}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Create Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CreateTicket;
