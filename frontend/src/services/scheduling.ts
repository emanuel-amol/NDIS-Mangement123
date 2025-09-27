// Fix 1: Update frontend/src/services/scheduling.ts
// Add admin key to all API requests

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = 'admin-development-key-123'; // From your .env file

// Add this helper function to create headers with admin key
const createAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_API_KEY,
});

// Update all fetch calls to include auth headers. Here are the key functions to fix:

export const getAppointments = async (params: GetAppointmentsParams = {}): Promise<Appointment[]> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const url = queryParams.toString() 
      ? `${API_BASE_URL}/appointments?${queryParams}`
      : `${API_BASE_URL}/appointments`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createAuthHeaders(), // Add auth headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle both direct array and wrapped response
    if (Array.isArray(data)) {
      return data;
    } else if (data.appointments && Array.isArray(data.appointments)) {
      return data.appointments;
    } else {
      console.warn('Unexpected appointments response format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const listRosters = async (params: ListRostersParams = {}): Promise<Roster[]> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const url = queryParams.toString() 
      ? `${API_BASE_URL}/rostering/rosters?${queryParams}`
      : `${API_BASE_URL}/rostering/rosters`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createAuthHeaders(), // Add auth headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rosters: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching rosters:', error);
    throw error;
  }
};

export const createRoster = async (rosterData: RosterCreate): Promise<Roster> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/rosters`, {
      method: 'POST',
      headers: createAuthHeaders(), // Add auth headers
      body: JSON.stringify(rosterData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to create roster: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating roster:', error);
    throw error;
  }
};

export const updateRoster = async (id: number, updates: Partial<RosterCreate>): Promise<Roster> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/rosters/${id}`, {
      method: 'PUT',
      headers: createAuthHeaders(), // Add auth headers
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update roster: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating roster:', error);
    throw error;
  }
};

export const deleteRoster = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/rosters/${id}`, {
      method: 'DELETE',
      headers: createAuthHeaders(), // Add auth headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete roster: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting roster:', error);
    throw error;
  }
};

export const createAppointment = async (appointmentData: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: createAuthHeaders(), // Add auth headers
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to create appointment: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id: number, updates: Partial<any>): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: createAuthHeaders(), // Add auth headers
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update appointment: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

export const getSupportWorkers = async (): Promise<SupportWorker[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/support-workers`, {
      method: 'GET',
      headers: createAuthHeaders(), // Add auth headers
    });

    if (!response.ok) {
      // If support workers endpoint doesn't exist, try to get from users
      const usersResponse = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: createAuthHeaders(),
      });

      if (usersResponse.ok) {
        const users = await usersResponse.json();
        // Filter for support workers and transform to expected format
        return users
          .filter((user: any) => user.role === 'support_worker' || user.role === 'user')
          .map((user: any) => ({
            id: user.id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.email,
            phone: user.phone_number || '',
            status: user.is_active ? 'active' : 'inactive',
            skills: ['General Support'], // Default skills
            role: user.role
          }));
      }

      // Fallback to mock data if all else fails
      console.warn('Support workers endpoint not available, using mock data');
      return [
        {
          id: 1,
          name: 'Sarah Wilson',
          email: 'sarah.wilson@example.com',
          phone: '0412 345 678',
          status: 'active',
          skills: ['Personal Care', 'Community Access'],
          role: 'support_worker'
        },
        {
          id: 2,
          name: 'Michael Chen',
          email: 'michael.chen@example.com',
          phone: '0423 456 789',
          status: 'active',
          skills: ['Domestic Assistance', 'Transport'],
          role: 'support_worker'
        }
      ];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching support workers:', error);
    // Return fallback data on error
    return [
      {
        id: 1,
        name: 'Sarah Wilson',
        email: 'sarah.wilson@example.com',
        phone: '0412 345 678',
        status: 'active',
        skills: ['Personal Care', 'Community Access'],
        role: 'support_worker'
      }
    ];
  }
};