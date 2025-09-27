// frontend/src/services/scheduling.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_API_KEY
};

export type RosterStatus = 'checked'|'confirmed'|'notified'|'cancelled';

export interface RosterCreate {
  service_org_id?: number;
  service_id?: number;
  vehicle_id?: number;
  worker_id?: number;
  support_date: string;        // YYYY-MM-DD
  start_time: string;          // HH:MM:SS
  end_time: string;            // HH:MM:SS
  quantity?: number;
  ratio_worker_to_participant?: number;
  eligibility?: string;
  transport_km?: number;
  transport_worker_expenses?: number;
  transport_non_labour?: number;
  notes?: string;
  status?: RosterStatus;
  is_group_support?: boolean;
  participants: { participant_id: number }[];
  tasks?: { title: string; is_done?: boolean }[];
  worker_notes?: { note: string }[];
  recurrences?: Array<{
    pattern_type: 'daily'|'weekly'|'monthly';
    interval?: number;
    by_weekdays?: number[];
    by_monthday?: number;
    by_setpos?: number;
    by_weekday?: number;
    start_date: string;
    end_date: string;
  }>;
}

export interface Roster extends RosterCreate { id: number; }

export async function listRosters(params: {
  start?: string; end?: string; worker_id?: number; participant_id?: number; status?: RosterStatus;
} = {}): Promise<Roster[]> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) q.append(k, String(v)); });
  const res = await fetch(`${API_BASE_URL}/rostering?${q.toString()}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch rosters');
  return await res.json();
}

export async function createRoster(payload: RosterCreate): Promise<Roster> {
  const res = await fetch(`${API_BASE_URL}/rostering`, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateRoster(id: number, payload: Partial<RosterCreate>): Promise<Roster> {
  const res = await fetch(`${API_BASE_URL}/rostering/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteRoster(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/rostering/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
}
