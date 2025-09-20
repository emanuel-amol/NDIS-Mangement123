// frontend/src/services/api.ts - COMPLETE API SERVICE WITH ADMIN ENDPOINTS
import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-secret-key-change-in-production';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create admin axios instance with API key authentication
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Key': ADMIN_API_KEY,
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Admin API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface DynamicDataEntry {
  id: number;
  type: string;
  code: string;
  label: string;
  is_active: boolean;
  meta?: any;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  service_provider_id?: number;
  created_at: string;
  last_login?: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
  is_system_role: boolean;
  is_active: boolean;
}

export interface SystemStatus {
  system_health: string;
  database_status: string;
  users: {
    total: number;
    active: number;
    admins: number;
  };
  participants: {
    total: number;
    active: number;
  };
  referrals: {
    total: number;
    pending: number;
  };
  dynamic_data: {
    total: number;
    active: number;
    types: string[];
  };
  version: string;
  uptime: string;
}

export interface ApplicationSettings {
  application_name: string;
  logo_url?: string;
  favicon_url?: string;
  copyright_text: string;
  default_meta_keywords?: string;
  default_meta_description?: string;
  default_social_share_image?: string;
  maintenance_mode: boolean;
  maintenance_message?: string;
  office_address?: string;
  contact_number?: string;
  email_address?: string;
  social_links: Record<string, string>;
  playstore_link?: string;
  appstore_link?: string;
  current_app_version?: string;
  additional_settings: Record<string, any>;
}

// ==========================================
// DYNAMIC DATA API
// ==========================================

export const dynamicDataAPI = {
  // Get dynamic data by type
  getByType: async (type: string, includeInactive: boolean = false): Promise<DynamicDataEntry[]> => {
    const response = await api.get(`/dynamic-data/${type}`, {
      params: { all: includeInactive }
    });
    return response.data;
  },

  // Create new dynamic data entry
  create: async (type: string, data: Omit<DynamicDataEntry, 'id' | 'type'>): Promise<DynamicDataEntry> => {
    const response = await adminApi.post(`/admin/dynamic-data/${type}`, {
      ...data,
      type
    });
    return response.data;
  },

  // Update dynamic data entry
  update: async (id: number, data: Partial<DynamicDataEntry>): Promise<DynamicDataEntry> => {
    const response = await adminApi.patch(`/admin/dynamic-data/${id}`, data);
    return response.data;
  },

  // Set status (active/inactive)
  setStatus: async (id: number, isActive: boolean): Promise<DynamicDataEntry> => {
    const response = await adminApi.patch(`/admin/dynamic-data/${id}/status`, null, {
      params: { is_active: isActive }
    });
    return response.data;
  },

  // Delete dynamic data entry
  delete: async (id: number): Promise<void> => {
    await adminApi.delete(`/admin/dynamic-data/${id}`);
  },

  // Get all available types
  getTypes: async (): Promise<{ types: string[] }> => {
    const response = await api.get('/admin/dynamic-data/types/list');
    return response.data;
  }
};

// ==========================================
// ADMIN API
// ==========================================

export const adminAPI = {
  // System Status
  getSystemStatus: async (): Promise<SystemStatus> => {
    const response = await adminApi.get('/admin/system-status');
    return response.data;
  },

  // Initialize system with default data
  initializeSystem: async (): Promise<{ message: string; initialized: string[] }> => {
    const response = await adminApi.post('/admin/initialize-system');
    return response.data;
  },

  // Settings
  getApplicationSettings: async (): Promise<ApplicationSettings> => {
    const response = await adminApi.get('/admin/settings/application');
    return response.data;
  },

  updateApplicationSettings: async (updates: Partial<ApplicationSettings>): Promise<{
    settings: ApplicationSettings;
    message: string;
  }> => {
    const response = await adminApi.patch('/admin/settings/application', updates);
    return response.data;
  },

  getProviderSettings: async (providerId: number): Promise<any> => {
    const response = await adminApi.get(`/admin/settings/provider/${providerId}`);
    return response.data;
  }
};

// ==========================================
// USER MANAGEMENT API
// ==========================================

export const userAPI = {
  // Get users with filtering
  getUsers: async (params: {
    skip?: number;
    limit?: number;
    role?: string;
    status?: string;
    provider_id?: number;
    keywords?: string;
  } = {}): Promise<User[]> => {
    const response = await adminApi.get('/admin/users', { params });
    return response.data;
  },

  // Create user
  createUser: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    role?: string;
    service_provider_id?: number;
  }): Promise<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    message: string;
  }> => {
    const response = await adminApi.post('/admin/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId: number, updates: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    role?: string;
    service_provider_id?: number;
  }): Promise<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    message: string;
  }> => {
    const response = await adminApi.patch(`/admin/users/${userId}`, updates);
    return response.data;
  },

  // Set user status
  setUserStatus: async (userId: number, isActive: boolean): Promise<{
    id: number;
    email: string;
    is_active: boolean;
    message: string;
  }> => {
    const response = await adminApi.patch(`/admin/users/${userId}/status`, null, {
      params: { is_active: isActive }
    });
    return response.data;
  },

  // Reset user password
  resetUserPassword: async (userId: number, sendEmail: boolean = true): Promise<{
    message: string;
    new_password?: string;
    email_sent: boolean;
  }> => {
    const response = await adminApi.post(`/admin/users/${userId}/reset-password`, null, {
      params: { send_email: sendEmail }
    });
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const response = await adminApi.delete(`/admin/users/${userId}`);
    return response.data;
  }
};

// ==========================================
// ROLE MANAGEMENT API
// ==========================================

export const roleAPI = {
  // Get all roles
  getRoles: async (): Promise<Role[]> => {
    const response = await adminApi.get('/admin/roles');
    return response.data;
  },

  // Create role
  createRole: async (roleData: {
    name: string;
    display_name: string;
    description?: string;
    permissions?: string[];
  }): Promise<{
    id: number;
    name: string;
    display_name: string;
    message: string;
  }> => {
    const response = await adminApi.post('/admin/roles', roleData);
    return response.data;
  }
};

// ==========================================
// REFERRAL API (existing)
// ==========================================

export const referralAPI = {
  // Submit a new referral
  submitReferral: async (referralData: any): Promise<any> => {
    const response = await api.post('/participants/referral-simple', referralData);
    return response.data;
  },

  // Get referrals
  getReferrals: async (skip: number = 0, limit: number = 100): Promise<any[]> => {
    const response = await api.get('/participants/referrals', {
      params: { skip, limit }
    });
    return response.data;
  },

  // Get specific referral
  getReferral: async (referralId: number): Promise<any> => {
    const response = await api.get(`/participants/referrals/${referralId}`);
    return response.data;
  },

  // Update referral status
  updateReferralStatus: async (referralId: number, status: string): Promise<any> => {
    const response = await api.patch(`/participants/referrals/${referralId}/status`, { status });
    return response.data;
  }
};

// ==========================================
// PARTICIPANT API (existing)
// ==========================================

export const participantAPI = {
  // Get participants
  getParticipants: async (params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    support_category?: string;
  } = {}): Promise<any[]> => {
    const response = await api.get('/participants/', { params });
    return response.data;
  },

  // Get specific participant
  getParticipant: async (participantId: number): Promise<any> => {
    const response = await api.get(`/participants/${participantId}`);
    return response.data;
  },

  // Create participant from referral
  createFromReferral: async (referralId: number): Promise<any> => {
    const response = await api.post(`/participants/create-from-referral/${referralId}`);
    return response.data;
  },

  // Get participant stats
  getStats: async (): Promise<any> => {
    const response = await api.get('/participants/stats');
    return response.data;
  }
};

// ==========================================
// HEALTH CHECK API
// ==========================================

export const healthAPI = {
  // Basic health check
  getHealth: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },

  // Detailed status
  getStatus: async (): Promise<any> => {
    const response = await api.get('/status');
    return response.data;
  }
};

// ==========================================
// EMAIL TESTING API
// ==========================================

export const emailAPI = {
  // Test email configuration
  testConfiguration: async (): Promise<any> => {
    const response = await api.post('/email/test-email-configuration');
    return response.data;
  },

  // Get email configuration status
  getConfigurationStatus: async (): Promise<any> => {
    const response = await api.get('/email/email-configuration-status');
    return response.data;
  },

  // Send test email
  sendTestEmail: async (testData: {
    test_email: string;
    test_type: string;
    referral_id?: number;
    participant_id?: number;
    status?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await api.post('/email/send-test-email', testData);
    return response.data;
  }
};

// Export the base API instances for direct use if needed
export { api, adminApi };

// Default export
export default {
  dynamicDataAPI,
  adminAPI,
  userAPI,
  roleAPI,
  referralAPI,
  participantAPI,
  healthAPI,
  emailAPI
};