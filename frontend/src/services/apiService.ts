// frontend/src/services/apiService.ts
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`Making API request to: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const status = response.status;
      
      if (!response.ok) {
        let errorMessage = `HTTP ${status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : JSON.stringify(errorData.detail);
          }
        } catch {
          // Use default error message if response is not JSON
        }
        
        return { error: errorMessage, status };
      }

      const data = await response.json();
      return { data, status };
      
    } catch (error: any) {
      console.error('API request failed:', error);
      return { 
        error: error.message || 'Network error - please check your connection', 
        status: 0 
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Specific methods for common endpoints
  async getReferrals() {
    return this.get('/participants/referrals');
  }

  async getReferral(id: number) {
    return this.get(`/participants/referrals/${id}`);
  }

  async createReferral(data: any) {
    return this.post('/participants/referral', data);
  }

  async updateReferral(id: number, data: any) {
    return this.put(`/participants/referrals/${id}`, data);
  }

  async deleteReferral(id: number) {
    return this.delete(`/participants/referrals/${id}`);
  }

  // Health check method
  async healthCheck() {
    return this.get('/health');
  }

  // Method to test if backend is reachable
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get('/');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default ApiService;