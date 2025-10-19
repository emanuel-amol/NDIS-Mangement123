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
// RAG TYPES
// ==========================================

export interface RAGStatus {
  embeddings_available: boolean;
  embedding_model?: string | null;
  features: {
    semantic_search: boolean;
    keyword_search: boolean;
    document_chunking: boolean;
    [key: string]: boolean;
  };
  configuration: {
    chunk_size: number;
    chunk_overlap: number;
    min_chunk_size: number;
    [key: string]: number;
  };
}

export interface RAGSource {
  document_id: number;
  similarity_score: number;
  document_title: string;
}

export interface RAGAnswerResponse {
  participant_id: number;
  question: string;
  answer: string;
  document_context_used: boolean;
  sources_count: number;
  sources?: RAGSource[];
}

export interface RAGSearchResult {
  chunk_id: number;
  document_id: number;
  chunk_text: string;
  chunk_index: number;
  similarity_score: number;
  metadata: Record<string, any>;
  search_type: string;
}

export interface RAGSearchResponse {
  query: string;
  total_results: number;
  results: RAGSearchResult[];
  search_type: string;
}

export interface DocumentProcessingStatus {
  document_id: number;
  status: string;
  message?: string;
  job_id?: number;
  job_type?: string;
  chunks_created?: number;
  chunks_embedded?: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  chunk_count?: number;
}

export interface DocumentChunkSummary {
  id: number;
  chunk_index: number;
  chunk_text: string;
  chunk_size: number;
  has_embedding: boolean;
  embedding_vector?: number[] | null;
  metadata: Record<string, any> | null;
}

export interface DocumentChunksResponse {
  document_id: number;
  total_chunks: number;
  chunks: DocumentChunkSummary[];
}

export interface CarePlanRAGResponse {
  suggestion_id: number;
  participant_id: number;
  suggestion_type: string;
  content: string;
  provider: string;
  model: string;
  created_at: string;
  document_context_used?: boolean;
  sources?: RAGSource[];
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

// ==========================================
// RAG API
// ==========================================

export const ragAPI = {
  getStatus: async (): Promise<RAGStatus> => {
    const res = await fetch(`${API_BASE_URL}/documents/rag-status`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to fetch RAG status');
    }
    return res.json();
  },

  searchDocuments: async (
    participantId: number,
    query: string,
    topK: number = 5,
    similarityThreshold: number = 0.3
  ): Promise<RAGSearchResponse> => {
    const res = await fetch(`${API_BASE_URL}/documents/participants/${participantId}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: topK,
        similarity_threshold: similarityThreshold,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Document search failed');
    }
    return res.json();
  },

  askAIAboutParticipant: async (
    participantId: number,
    question: string
  ): Promise<RAGAnswerResponse> => {
    const res = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to ask AI about participant');
    }
    return res.json();
  },

  generateCarePlanWithRAG: async (
    participantId: number
  ): Promise<CarePlanRAGResponse> => {
    const res = await fetch(
      `${API_BASE_URL}/participants/${participantId}/ai/care-plan/suggest-with-context`,
      {
        method: 'POST',
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to generate RAG-enhanced care plan');
    }
    return res.json();
  },

  getDocumentProcessingStatus: async (
    documentId: number
  ): Promise<DocumentProcessingStatus> => {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/processing-status`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to fetch document processing status');
    }
    return res.json();
  },

  getDocumentChunks: async (
    documentId: number,
    includeEmbeddings: boolean = false
  ): Promise<DocumentChunksResponse> => {
    const res = await fetch(
      `${API_BASE_URL}/documents/${documentId}/chunks${includeEmbeddings ? '?include_embeddings=true' : ''}`
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to fetch document chunks');
    }
    return res.json();
  },
};