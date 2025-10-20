// frontend/src/lib/api.ts
// Unified API client - automatically includes auth token

import { authProvider } from './auth-provider'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await authProvider.getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders()
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  }

  const url = `${API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.detail || error.message || 'API request failed')
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }
    
    return await response.json()
  } catch (error: any) {
    console.error('API request error:', error)
    throw error
  }
}

export const api = {
  // Appointments
  appointments: {
    list: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      return apiRequest<any[]>(`/appointments${query}`)
    },
    get: (id: number) => apiRequest<any>(`/appointments/${id}`),
    create: (data: any) => apiRequest<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: any) => apiRequest<any>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => apiRequest<void>(`/appointments/${id}`, {
      method: 'DELETE',
    }),
    stats: () => apiRequest<any>('/appointments/stats/summary'),
  },

  // Participants
  participants: {
    list: (params?: Record<string, any>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      return apiRequest<any[]>(`/participants/${query}`)
    },
    get: (id: number) => apiRequest<any>(`/participants/${id}`),
    documents: (id: number) => apiRequest<any[]>(`/participants/${id}/documents`),
    stats: () => apiRequest<any>('/participants/stats'),
  },

  // Support Workers
  supportWorkers: {
    list: () => apiRequest<any[]>('/support-workers'),
    get: (id: number) => apiRequest<any>(`/support-workers/${id}`),
  },

  // Care Plans
  carePlans: {
    get: (participantId: number) =>
      apiRequest<any>(`/care/participants/${participantId}/care-plan`),
    versions: (participantId: number) =>
      apiRequest<any[]>(`/care/participants/${participantId}/care-plan/versions`),
  },

  // Risk Assessments
  riskAssessments: {
    get: (participantId: number) =>
      apiRequest<any>(`/care/participants/${participantId}/risk-assessment`),
    versions: (participantId: number) =>
      apiRequest<any[]>(`/care/participants/${participantId}/risk-assessment/versions`),
  },

  // Prospective Workflow
  prospectiveWorkflow: {
    get: (participantId: number) =>
      apiRequest<any>(`/care/participants/${participantId}/prospective-workflow`),
  },

  // Dashboard
  dashboard: {
    provider: {
      summary: () => apiRequest<any>('/dashboard/provider/summary'),
      drafts: () => apiRequest<any[]>('/dashboard/provider/drafts'),
      waiting: () => apiRequest<any[]>('/dashboard/provider/waiting'),
      alerts: () => apiRequest<any[]>('/dashboard/provider/alerts'),
      week: () => apiRequest<any[]>('/dashboard/provider/week'),
      activity: () => apiRequest<any[]>('/dashboard/provider/activity'),
    },
  },

  // Quotations
  quotations: {
    list: () => apiRequest<any[]>('/quotations/'),
    getByParticipant: (participantId: number) => 
      apiRequest<any[]>(`/quotations/participants/${participantId}`),
    get: (id: number) => apiRequest<any>(`/quotations/${id}`),
    generate: (participantId: number) => 
      apiRequest<any>(`/quotations/participants/${participantId}/generate-from-care-plan`, {
        method: 'POST',
      }),
    finalise: (id: number) => 
      apiRequest<any>(`/quotations/${id}/finalise`, {
        method: 'POST',
      }),
    delete: (id: number) => 
      apiRequest<void>(`/quotations/${id}`, {
        method: 'DELETE',
      }),
    getLatest: (participantId: number) => 
      apiRequest<any>(`/quotations/participants/${participantId}/latest`),
  },

  // Admin
  admin: {
    users: () => apiRequest<any[]>('/admin/users'),
  },
}

export default api