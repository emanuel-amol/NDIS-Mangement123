// frontend/src/lib/api.ts
// Central Axios client + typed helpers for Dynamic Data APIs

import axios from "axios";

/**
 * Supports Vite (VITE_*) and CRA (REACT_APP_*).
 * Default: local FastAPI dev server.
 */
const ENV_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    ((import.meta as any).env.VITE_API_BASE_URL as string)) ||
  (process.env.REACT_APP_API_BASE_URL as string) ||
  "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: ENV_BASE,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// ---------------- Types ----------------
export interface DynamicDataType {
  id: string;
  name: string; // internal, e.g., "contact_methods"
  display_name?: string | null;
  description?: string | null;
  is_active: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicDataPoint {
  id: string;
  data_type_id: string;
  name: string; // internal, e.g., "email"
  display_name?: string | null; // human label
  description?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CreatePointDTO = {
  data_type_id: string;
  name: string;
  display_name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdatePointDTO = Partial<
  Pick<
    DynamicDataPoint,
    "name" | "display_name" | "description" | "sort_order" | "is_active"
  >
>;

// ------------- API helpers -------------
export async function getDataTypes(activeOnly = false) {
  const { data } = await api.get<DynamicDataType[]>(
    `/dynamic-data/data-types`,
    { params: { active_only: activeOnly } }
  );
  return data;
}

export async function getDataPoints(
  typeName: string,
  activeOnly = false
): Promise<DynamicDataPoint[]> {
  const { data } = await api.get<DynamicDataPoint[]>(
    `/dynamic-data/data-types/${encodeURIComponent(typeName)}/points`,
    { params: { active_only: activeOnly } }
  );
  return data;
}

export async function createDataPoint(payload: CreatePointDTO) {
  const { data } = await api.post<DynamicDataPoint>(
    `/dynamic-data/data-points`,
    payload
  );
  return data;
}

export async function updateDataPoint(pointId: string, payload: UpdatePointDTO) {
  const { data } = await api.put<DynamicDataPoint>(
    `/dynamic-data/data-points/${encodeURIComponent(pointId)}`,
    payload
  );
  return data;
}

export async function deleteDataPoint(pointId: string) {
  await api.delete(`/dynamic-data/data-points/${encodeURIComponent(pointId)}`);
}

export async function setPointActive(pointId: string, isActive: boolean) {
  return updateDataPoint(pointId, { is_active: isActive });
}

// Provide a default export for files that do `import api from ".../lib/api"`
export default api;
