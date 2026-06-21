// client/api/departments.ts
import api from "./api";

export type PopulatedManager = {
  _id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
  department?: string;
};

export interface DepartmentDTO {
  _id: string;
  name: string;
  description?: string;

  /**
   * ⚠️ IMPORTANT:
   * Because backend uses .populate("managerId"), this field can be:
   * - string (ObjectId) OR
   * - populated object { _id, name, email, ... }
   */
  managerId?: string | PopulatedManager;

  createdAt?: string;
  updatedAt?: string;
}

// Support different response shapes:
// - [departments]
// - { departments: [...] }
// - { data: [...] }
// - { results: [...] }
function unwrapDepartments(data: any): DepartmentDTO[] {
  if (Array.isArray(data)) return data as DepartmentDTO[];
  if (Array.isArray(data?.departments)) return data.departments as DepartmentDTO[];
  if (Array.isArray(data?.data)) return data.data as DepartmentDTO[];
  if (Array.isArray(data?.results)) return data.results as DepartmentDTO[];
  return [];
}

// GET /api/departments
export async function getDepartments(params?: Record<string, any>): Promise<DepartmentDTO[]> {
  const res = await api.get("/api/departments", { params });
  return unwrapDepartments(res.data);
}

// GET /api/departments/:id
export async function getDepartmentById(id: string): Promise<DepartmentDTO> {
  const res = await api.get(`/api/departments/${id}`);
  return res.data as DepartmentDTO;
}

// POST /api/departments
export type CreateDepartmentPayload = {
  name: string;
  description?: string;
  managerId?: string;
};

export async function createDepartment(payload: CreateDepartmentPayload): Promise<DepartmentDTO> {
  const res = await api.post("/api/departments", payload);
  return res.data as DepartmentDTO;
}

// PUT /api/departments/:id
export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export async function updateDepartment(id: string, payload: UpdateDepartmentPayload): Promise<DepartmentDTO> {
  const res = await api.put(`/api/departments/${id}`, payload);
  return res.data as DepartmentDTO;
}

// DELETE /api/departments/:id
export async function deleteDepartment(id: string): Promise<{ message: string }> {
  const res = await api.delete(`/api/departments/${id}`);
  return res.data as { message: string };
}

/**
 * ✅ Helper (optional) for UI:
 * Read manager name safely regardless of populate shape
 */
export function getManagerName(dept: DepartmentDTO): string {
  const m = dept.managerId as any;
  if (!m) return "";
  if (typeof m === "string") return ""; // not populated
  return m.name || "";
}
