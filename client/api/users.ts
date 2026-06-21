// client/api/users.ts
import api from "./api";

export type UserRole = "user" | "agent" | "manager" | "admin";
export type UserStatus = "available" | "busy" | "offline";

export interface UserDTO {
  _id: string;
  name: string;
  email: string;
  role: UserRole;

  // legacy/display (optional)
  department?: string;

  // ✅ main relation (can be string OR populated object from backend)
  departmentId?: string | { _id: string; name?: string };

  status?: UserStatus;
  phone?: string;
  expertise?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Payload used by POST /api/users */
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;

  department?: string;
  departmentId?: string;

  status?: UserStatus;
  phone?: string;
  expertise?: string[];
}

/** Payload used by PUT /api/users/:id */
export type UpdateUserPayload = {
  name?: string;
  role?: UserRole;

  department?: string;
  departmentId?: string;

  status?: UserStatus;
  phone?: string;
  expertise?: string[];
};

function unwrapUsers(data: any): UserDTO[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeId(val: any): string {
  return val?._id?.toString?.() ?? val?.toString?.() ?? "";
}

/**
 * ✅ Useful helper: always return departmentId as a string when possible
 */
export function getUserDepartmentId(user: UserDTO | null | undefined): string {
  if (!user) return "";
  const dep = (user as any).departmentId;
  const id = normalizeId(dep);
  return id || "";
}

/* =========================
   API Calls
========================= */

/**
 * GET /api/users
 * Returns all users (admin usually) or whatever your backend permits.
 */
export async function getUsers(params?: Record<string, any>): Promise<UserDTO[]> {
  const res = await api.get("/api/users", { params });
  return unwrapUsers(res.data);
}

/**
 * ✅ NEW
 * GET /api/users/department-employees
 * - manager: no params needed (backend uses req.user.departmentId)
 * - admin: pass departmentId to select department
 */
export async function getDepartmentEmployees(departmentId?: string): Promise<UserDTO[]> {
  const res = await api.get("/api/users/department-employees", {
    params: departmentId ? { departmentId } : undefined,
  });
  return unwrapUsers(res.data);
}


/**
 * GET /api/users/:id
 */
export async function getUserById(id: string): Promise<UserDTO> {
  const res = await api.get(`/api/users/${id}`);
  return res.data as UserDTO;
}

/**
 * POST /api/users
 */
export async function createUser(payload: CreateUserPayload): Promise<UserDTO> {
  const res = await api.post("/api/users", payload);
  return res.data as UserDTO;
}

/**
 * PUT /api/users/:id
 */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserDTO> {
  const res = await api.put(`/api/users/${id}`, payload);
  return res.data as UserDTO;
}

/**
 * DELETE /api/users/:id
 */
export async function deleteUser(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/api/users/${id}`);
  return res.data as { message: string };
}

/**
 * GET /api/users/:id (alias)
 */
export async function getMyProfile(id: string): Promise<UserDTO> {
  const res = await api.get<UserDTO>(`/api/users/${id}`);
  return res.data;
}
