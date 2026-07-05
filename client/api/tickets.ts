// client/api/tickets.ts
import api from "./api";

export type TicketStatus = "open" | "in-progress" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "Technical" | "Security" | "Feature" | "Account" | "Bug";

export type WatcherPermission = "read" | "write";

export interface TicketWatcherDTO {
  userId: any; // populated user or id (varies by backend)
  permission: WatcherPermission;
  addedBy?: any;
  addedAt?: string;
}

export interface TicketDTO {
  _id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;

  createdBy?: any;     // could be ObjectId OR populated user
  assignee?: any;      // could be ObjectId OR populated user

  departmentId?: any;
  watchers?: TicketWatcherDTO[];

  attachments?: Array<{
    filename: string;
    url: string;
    mimetype?: string;
    size?: number;
    uploadedAt?: string;
  }>;
  dueDate?: string;
  tags?: string[];
  favoritedBy?: any[];
  archivedAt?: string | null;
  archivedBy?: any;
  deletedAt?: string | null;
  deletedBy?: any;
  resolution?: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDTO {
  _id: string;
  ticketId: string;
  userId: any;
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    mimetype?: string;
    size?: number;
    uploadedAt?: string;
  }>;
  sentiment?: "neutral" | "frustrated" | "angry";
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailsResponse {
  ticket: TicketDTO;
  comments: CommentDTO[];
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  category: TicketCategory;
  departmentId: string;

  priority?: TicketPriority;
  status?: TicketStatus;

  assignee?: string; // on create: ONLY department manager id if provided
  dueDate?: string;
  tags?: string[];
}

export type UpdateTicketPayload = Partial<CreateTicketPayload>;

export interface SmartTriageSimilarTicket {
  _id: string;
  title: string;
  score: number;
}

export interface SmartTriageResponse {
  category: TicketCategory;
  priority: TicketPriority;
  shortSummary?: string;
  steps?: string[];
  clarifyingQuestion?: string;
  similarTickets?: SmartTriageSimilarTicket[];
  department?: {
    _id: string;
    name: string;
    managerId?: any;
  } | null;
  assignee?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    activeTickets: number;
  } | null;
  reasons: string[];
}

/**
 * ✅ Always normalize to TicketDTO[]
 * Supports:
 * - res.data = TicketDTO[]
 * - res.data = { tickets: TicketDTO[], ... }
 * - res.data = { data: TicketDTO[] }
 */
export async function getTickets(params?: Record<string, any>) {
  const res = await api.get("/api/tickets", { params });

  const d: any = res.data;

  if (Array.isArray(d)) return d as TicketDTO[];
  if (Array.isArray(d?.tickets)) return d.tickets as TicketDTO[];
  if (Array.isArray(d?.data)) return d.data as TicketDTO[];

  return [] as TicketDTO[];
}

export async function getTicketById(id: string): Promise<TicketDetailsResponse> {
  const res = await api.get(`/api/tickets/${id}`);
  return res.data as TicketDetailsResponse;
}

export async function smartTriageTicket(params: {
  title: string;
  description: string;
}): Promise<SmartTriageResponse> {
  const res = await api.post("/api/tickets/smart-triage", params);
  return res.data as SmartTriageResponse;
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const res = await api.patch(`/api/tickets/${id}/status`, { status });
  return res.data as TicketDTO;
}

export async function createTicket(payload: CreateTicketPayload): Promise<TicketDTO> {
  const res = await api.post<TicketDTO>("/api/tickets", payload);
  return res.data;
}

export async function updateTicket(id: string, payload: UpdateTicketPayload): Promise<TicketDTO> {
  const res = await api.put<TicketDTO>(`/api/tickets/${id}`, payload);
  return res.data;
}

export async function addTicketComment(id: string, text: string) {
  const res = await api.post(`/api/tickets/${id}/comments`, { text });
  return res.data as { comment: CommentDTO };
}

export async function getManagerInbox() {
  const res = await api.get("/api/tickets/inbox");
  return res.data as TicketDTO[];
}

export async function assignTicket(ticketId: string, assigneeId: string) {
  const res = await api.patch(`/api/tickets/${ticketId}/assign`, { assigneeId });
  return res.data as TicketDTO;
}

// ✅ Watchers
export async function addWatcher(ticketId: string, userId: string, permission: WatcherPermission) {
  const res = await api.post(`/api/tickets/${ticketId}/watchers`, { userId, permission });
  return res.data as TicketDTO;
}

export async function removeWatcher(ticketId: string, userId: string) {
  const res = await api.delete(`/api/tickets/${ticketId}/watchers/${userId}`);
  return res.data as TicketDTO;
}

// ✅ Statistics
export async function getTicketStats() {
  const res = await api.get("/api/tickets/stats");
  return res.data as {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

// ✅ Favorites
export async function getFavorites() {
  return getTickets({ favorited: "true" });
}

export async function toggleFavorite(ticketId: string) {
  const res = await api.post(`/api/tickets/${ticketId}/favorite`);
  return res.data as { ticket: TicketDTO; isFavorited: boolean };
}

export async function archiveTicket(ticketId: string) {
  const res = await api.post(`/api/tickets/${ticketId}/archive`);
  return res.data as { message: string; ticket: TicketDTO };
}

export async function unarchiveTicket(ticketId: string) {
  const res = await api.post(`/api/tickets/${ticketId}/unarchive`);
  return res.data as { message: string; ticket: TicketDTO };
}

export async function softDeleteTicket(ticketId: string) {
  const res = await api.delete(`/api/tickets/${ticketId}`);
  return res.data as { message: string; ticketId: string };
}

// ✅ Recycle Bin
export async function getRecycleBin() {
  const res = await api.get("/api/tickets", { params: { deleted: "true" } });
  return (Array.isArray(res.data) ? res.data : []) as TicketDTO[];
}

export async function restoreTicket(ticketId: string) {
  const res = await api.post(`/api/tickets/${ticketId}/restore`);
  return res.data as { message: string; ticket: TicketDTO };
}

export async function permanentDelete(ticketId: string) {
  const res = await api.delete(`/api/tickets/${ticketId}/permanent`);
  return res.data as { message: string };
}

// ✅ Archived Tickets
export async function getArchivedTickets() {
  const res = await api.get("/api/tickets", { params: { archived: "true" } });
  return (Array.isArray(res.data) ? res.data : []) as TicketDTO[];
}

// ✅ Pending Tickets
export async function getPendingTickets() {
  return getTickets({ status: "pending" });
}

// ✅ Completed Tickets
export async function getCompletedTickets() {
  const res = await api.get("/api/tickets", { params: { status: "resolved,closed" } });
  return (Array.isArray(res.data) ? res.data : []) as TicketDTO[];
}

// ✅ Active Tickets (open + in-progress)
export async function getActiveTickets() {
  const res = await api.get("/api/tickets", { params: { status: "open,in-progress" } });
  return (Array.isArray(res.data) ? res.data : []) as TicketDTO[];
}

// ✅ Recent Updates (sorted by updatedAt)
export async function getRecentUpdates() {
  const tickets = await getTickets();
  return tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// ✅ Team Projects (tickets with multiple watchers)
export async function getTeamProjects() {
  const tickets = await getTickets();
  return tickets.filter((t) => (t.watchers?.length || 0) > 1);
}

// Optional view helpers (only work if backend supports ?view=...)
export async function getMyCreatedTickets() {
  return getTickets({ view: "created" });
}
export async function getAssignedToMeTickets() {
  return getTickets({ view: "assigned" });
}
export async function getWatchingTickets() {
  return getTickets({ view: "watching" });
}
