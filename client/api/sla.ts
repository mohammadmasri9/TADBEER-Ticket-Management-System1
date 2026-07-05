// client/api/sla.ts
import api from "./api";

export interface SLAPolicyDTO {
  _id: string;
  name: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  responseTime: number; // minutes
  resolutionTime: number; // minutes
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLAMetrics {
  totalTickets: number;
  metSLA: number;
  breachedSLA: number;
  atRisk: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  complianceRate: number;
}

export type UpdateSLAPolicyPayload = Partial<
  Pick<SLAPolicyDTO, "name" | "description" | "responseTime" | "resolutionTime" | "isActive">
>;

export async function getSLAPolicies(): Promise<SLAPolicyDTO[]> {
  const res = await api.get("/api/sla/policies");
  return res.data as SLAPolicyDTO[];
}

export async function updateSLAPolicy(id: string, payload: UpdateSLAPolicyPayload): Promise<SLAPolicyDTO> {
  const res = await api.put(`/api/sla/policies/${id}`, payload);
  return res.data as SLAPolicyDTO;
}

export async function getSLAMetrics(): Promise<SLAMetrics> {
  const res = await api.get("/api/sla/metrics");
  return res.data as SLAMetrics;
}
