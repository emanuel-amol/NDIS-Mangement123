// frontend/src/services/adminUsers.ts - IMPROVED WITH BETTER ERROR HANDLING
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
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch {
      // If response isn't JSON, use the text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch {
        // Use the default HTTP error message
      }
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function listUsers(params: { role?: UserRole; q?: string } = {}): Promise<User[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.role) searchParams.set('role', params.role);
    if (params.q) searchParams.set('q', params.q);
    
    console.log('Fetching users from:', `${API_BASE_URL}/admin/users?${searchParams.toString()}`);
    
    const response = await fetch(`${API_BASE_URL}/admin/users?${searchParams.toString()}`, { 
      headers,
      method: 'GET'
    });
    
    return await handleResponse<User[]>(response);
  } catch (error) {
    console.error('Error in listUsers:', error);
    throw error;
  }
}

export async function createUser(payload: UserCreate): Promise<User> {
  try {
    console.log('Creating user with payload:', { ...payload, password: '[REDACTED]' });
    console.log('API endpoint:', `${API_BASE_URL}/admin/users`);
    console.log('Headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    return await handleResponse<User>(response);
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function updateUser(userId: number, updates: Partial<User>): Promise<User> {
  try {
    console.log('Updating user', userId, 'with:', updates);
    
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    
    return await handleResponse<User>(response);
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

export async function deleteUser(userId: number): Promise<void> {
  try {
    console.log('Deleting user:', userId);
    
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      await handleResponse(response); // This will throw with proper error message
    }
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
}

export async function resetUserPassword(userId: number): Promise<{ temporary_password: string }> {
  try {
    console.log('Resetting password for user:', userId);
    
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers
    });
    
    return await handleResponse<{ temporary_password: string }>(response);
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    throw error;
  }
}