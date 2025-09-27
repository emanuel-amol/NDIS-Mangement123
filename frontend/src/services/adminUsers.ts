// frontend/src/services/adminUsers.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_API_KEY
};

export type UserRole = 'admin' | 'service_provider_admin' | 'coordinator' | 'support_worker' | 'viewer';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

export async function listUsers(params: { role?: UserRole; q?: string } = {}): Promise<User[]> {
  const q = new URLSearchParams();
  if (params.role) q.set('role', params.role);
  if (params.q) q.set('q', params.q);
  const res = await fetch(`${API_BASE_URL}/admin/users?${q.toString()}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createUser(payload: UserCreate): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
