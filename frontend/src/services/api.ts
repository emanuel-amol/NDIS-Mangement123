// frontend/src/services/api.ts - COMPLETE FILE WITH TYPE MANAGEMENT

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

// Headers for admin requests
const getAdminHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_API_KEY,
});

// ==========================================
// INTERFACES
// ==========================================

export interface DynamicDataEntry {
  id: number;
  type: string;
  code: string;
  label: string;
  is_active: boolean;
  meta?: any;
}

export interface NewTypeRequest {
  type_name: string;
  description?: string;
  first_entry: {
    code: string;
    label: string;
    is_active?: boolean;
    meta?: any;
  };
}

export interface TypeListResponse {
  types: string[];
}

export interface TypeExistsResponse {
  exists: boolean;
  type_name: string;
}

export interface TypeStatsResponse {
  type: string;
  total_entries: number;
  active_entries: number;
  inactive_entries: number;
}

export interface TypeDeleteResponse {
  message: string;
  type_name: string;
  deleted_entries: number;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  service_provider_id?: number;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
}

export interface ApplicationSettings {
  application_name?: string;
  logo_url?: string;
  favicon_url?: string;
  copyright_text?: string;
  default_meta_keywords?: string;
  default_meta_description?: string;
  default_social_share_image?: string;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  office_address?: string;
  contact_number?: string;
  email_address?: string;
  social_links?: Record<string, string>;
  playstore_link?: string;
  appstore_link?: string;
  current_app_version?: string;
  additional_settings?: Record<string, any>;
}

// ==========================================
// DYNAMIC DATA API WITH TYPE MANAGEMENT
// ==========================================

export const dynamicDataAPI = {
  // Existing data entry methods
  getByType: async (type: string, includeInactive: boolean = false): Promise<DynamicDataEntry[]> => {
    const url = `${API_BASE_URL}/dynamic-data/${type}${includeInactive ? '?all=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${type} data`);
    return res.json();
  },

  create: async (type: string, data: any): Promise<DynamicDataEntry> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/${type}`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create entry');
    }
    return res.json();
  },

  update: async (id: number, data: any): Promise<DynamicDataEntry> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/${id}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update entry');
    }
    return res.json();
  },

  setStatus: async (id: number, isActive: boolean): Promise<DynamicDataEntry> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/${id}/status?is_active=${isActive}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update status');
    }
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to delete entry');
    }
  },

  // NEW: Type Management Methods
  listTypes: async (): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/types/list`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', res.status, errorText);
      throw new Error('Failed to fetch types');
    }
    const data: TypeListResponse = await res.json();
    return data.types;
  },

  createType: async (request: NewTypeRequest): Promise<DynamicDataEntry> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/types/create`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create type');
    }
    return res.json();
  },

  checkTypeExists: async (typeName: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/types/${typeName}/exists`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to check type existence');
    const data: TypeExistsResponse = await res.json();
    return data.exists;
  },

  deleteType: async (typeName: string): Promise<TypeDeleteResponse> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/types/${typeName}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to delete type');
    }
    return res.json();
  },

  getTypeStats: async (typeName: string): Promise<TypeStatsResponse> => {
    const res = await fetch(`${API_BASE_URL}/dynamic-data/types/${typeName}/stats`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to get type statistics');
    }
    return res.json();
  },
};

// ==========================================
// ADMIN API
// ==========================================

export const adminAPI = {
  getSystemStatus: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/system-status`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  initializeDynamicData: async (forceRefresh: boolean = false) => {
    const res = await fetch(`${API_BASE_URL}/admin/initialize-dynamic-data?force_refresh=${forceRefresh}`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to initialize dynamic data');
    }
    return res.json();
  },

  getDynamicDataSummary: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/dynamic-data/summary`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dynamic data summary');
    return res.json();
  },

  getApplicationSettings: async (): Promise<ApplicationSettings> => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/application`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch application settings');
    return res.json();
  },

  updateApplicationSettings: async (updates: Partial<ApplicationSettings>): Promise<ApplicationSettings> => {
    const res = await fetch(`${API_BASE_URL}/admin/settings/application`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update application settings');
    }
    return res.json();
  },
};

// ==========================================
// USER API
// ==========================================

export const userAPI = {
  getUsers: async (filters?: {
    role?: string;
    status?: string;
    keywords?: string;
    skip?: number;
    limit?: number;
  }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const res = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  createUser: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    role: string;
    service_provider_id?: number;
  }): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create user');
    }
    return res.json();
  },

  updateUser: async (userId: number, updates: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update user');
    }
    return res.json();
  },

  setUserStatus: async (userId: number, isActive: boolean): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status?is_active=${isActive}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update user status');
    }
    return res.json();
  },

  resetUserPassword: async (userId: number, sendEmail: boolean = true): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password?send_email=${sendEmail}`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to reset password');
    }
    return res.json();
  },

  deleteUser: async (userId: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to delete user');
    }
  },
};

// ==========================================
// ROLE API
// ==========================================

export const roleAPI = {
  getRoles: async (): Promise<Role[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/roles`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch roles');
    return res.json();
  },

  createRole: async (roleData: {
    name: string;
    display_name: string;
    description?: string;
    permissions: string[];
  }): Promise<Role> => {
    const res = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(roleData),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create role');
    }
    return res.json();
  },
};