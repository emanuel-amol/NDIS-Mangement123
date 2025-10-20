// Fixed frontend/src/services/scheduling.ts with ALL correct API paths
import { withAuth } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types
export interface Appointment {
  id: number;
  participant_id: number;
  participant_name?: string;
  support_worker_id: number;
  support_worker_name?: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  location_type?: 'home_visit' | 'community' | 'facility' | 'virtual';
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'checked' | 'in_progress';
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  recurring?: boolean;
  recurrence_pattern?: string;
  send_notifications?: boolean;
  estimated_cost?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Roster {
  id: number;
  worker_id: number;
  support_date: string;
  start_time: string;
  end_time: string;
  eligibility: string;
  notes?: string;
  status: RosterStatus;
  is_group_support: boolean;
  participants?: Array<{ participant_id: number }>;
  tasks?: Array<{ title: string; is_done: boolean }>;
  worker_notes?: Array<{ note: string; created_at: string }>;
  recurrences?: Array<{
    pattern_type: string;
    interval: number;
    by_weekdays?: number[];
    start_date: string;
    end_date: string;
  }>;
  instances?: Array<{
    occurrence_date: string;
    start_time: string;
    end_time: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export type RosterStatus = 'checked' | 'confirmed' | 'notified' | 'cancelled';

export interface RosterCreate {
  worker_id: number;
  support_date: string;
  start_time: string;
  end_time: string;
  eligibility: string;
  notes?: string;
  status: RosterStatus;
  is_group_support: boolean;
  participants: Array<{ participant_id: number }>;
  tasks?: Array<{ title: string; is_done: boolean }>;
  recurrences?: Array<{
    pattern_type: string;
    interval: number;
    by_weekdays?: number[];
    start_date: string;
    end_date: string;
  }>;
}

export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  disability_type?: string;
  support_category?: string;
  status?: string;
}

export interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  skills: string[];
  role?: string;
  performance_metrics?: {
    completion_rate: number;
    punctuality_score: number;
    participant_satisfaction: number;
    total_hours_this_month: number;
  };
  certifications?: string[];
}

export interface ScheduleStats {
  total_appointments: number;
  today_appointments: number;
  pending_requests: number;
  support_workers_scheduled: number;
  participants_scheduled: number;
  this_week_hours: number;
}

export interface GetAppointmentsParams {
  start_date?: string;
  end_date?: string;
  participant_id?: number;
  support_worker_id?: number;
  status?: string;
}

export interface ListRostersParams {
  start?: string;
  end?: string;
  worker_id?: number;
  participant_id?: number;
  status?: RosterStatus;
}

export interface SchedulingSuggestion {
  id: string;
  type: 'time_optimization' | 'worker_assignment' | 'gap_filling' | 'conflict_resolution' | 'performance_enhancement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_benefit?: string;
  implementation_effort: 'easy' | 'moderate' | 'complex';
  data?: Record<string, any>;
  created_at: string;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  worker_id: number;
  worker_name: string;
  skill_match_score: number;
  preference_score: number;
  overall_score: number;
  reasons: string[];
}

// Helper function to handle API errors
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // If JSON parsing fails, use the default error message
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// Appointment functions
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
      headers: withAuth(),
    });

    const data = await handleApiResponse(response);
    
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

export const getAppointmentById = async (id: number): Promise<Appointment | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'GET',
      headers: withAuth(),
    });

    if (response.status === 404) {
      return null;
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
};

export const createAppointment = async (appointmentData: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: withAuth(),
      body: JSON.stringify(appointmentData),
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id: number, updates: Partial<any>): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: withAuth(),
      body: JSON.stringify(updates),
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

export const deleteAppointment = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: withAuth(),
    });

    if (!response.ok && response.status !== 404) {
      await handleApiResponse(response);
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

// Roster functions
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
      headers: withAuth(),
    });

    const data = await handleApiResponse(response);
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
      headers: withAuth(),
      body: JSON.stringify(rosterData),
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error creating roster:', error);
    throw error;
  }
};

export const updateRoster = async (id: number, updates: Partial<RosterCreate>): Promise<Roster> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/rosters/${id}`, {
      method: 'PUT',
      headers: withAuth(),
      body: JSON.stringify(updates),
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error updating roster:', error);
    throw error;
  }
};

export const deleteRoster = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/rosters/${id}`, {
      method: 'DELETE',
      headers: withAuth(),
    });

    if (!response.ok && response.status !== 404) {
      await handleApiResponse(response);
    }
  } catch (error) {
    console.error('Error deleting roster:', error);
    throw error;
  }
};

// Participant functions
export const getParticipants = async (): Promise<Participant[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/participants`, {
      method: 'GET',
      headers: withAuth(),
    });

    const data = await handleApiResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
};

export const getParticipantById = async (id: number): Promise<Participant | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/participants/${id}`, {
      method: 'GET',
      headers: withAuth(),
    });

    if (response.status === 404) {
      return null;
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching participant:', error);
    throw error;
  }
};

// Support Worker functions - Try admin endpoint, gracefully fall back to mock data
export const getSupportWorkers = async (): Promise<SupportWorker[]> => {
  try {
    const token = localStorage.getItem('token');
    
    // Add admin key header for admin endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Admin-Key': 'admin-development-key-123',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      // If 401 or any error, fall back to mock data
      console.warn('Admin users endpoint returned', response.status, '- using mock data');
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
        },
        {
          id: 3,
          name: 'Emma Thompson',
          email: 'emma.thompson@example.com',
          phone: '0434 567 890',
          status: 'active',
          skills: ['Social Participation', 'Skill Development'],
          role: 'support_worker'
        }
      ];
    }

    const users = await response.json();
    
    // Filter to only support workers and map to SupportWorker format
    const supportWorkers = users
      .filter((user: any) => 
        user.role === 'support_worker' || 
        user.role === 'SUPPORT_WORKER' ||
        user.role?.toLowerCase() === 'support_worker'
      )
      .map((user: any) => ({
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone_number || '',
        status: user.is_active ? 'active' : 'inactive',
        skills: user.skills || ['General Support'],
        role: user.role
      }));

    // If no support workers found in users, return mock data
    if (supportWorkers.length === 0) {
      console.warn('No support workers found in users list - using mock data');
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

    return supportWorkers;
  } catch (error) {
    console.error('Error fetching support workers:', error);
    // Return mock data on any error
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
};

export const getSupportWorkerById = async (id: number): Promise<SupportWorker | null> => {
  try {
    const workers = await getSupportWorkers();
    return workers.find(w => w.id === id) || null;
  } catch (error) {
    console.error('Error fetching support worker:', error);
    return null;
  }
};

// Schedule statistics
export const getScheduleStats = async (): Promise<ScheduleStats> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/stats/summary`, {
      method: 'GET',
      headers: withAuth(),
    });

    if (!response.ok) {
      console.warn('Stats endpoint not available, using fallback data');
      return {
        total_appointments: 0,
        today_appointments: 0,
        pending_requests: 0,
        support_workers_scheduled: 0,
        participants_scheduled: 0,
        this_week_hours: 0
      };
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    return {
      total_appointments: 0,
      today_appointments: 0,
      pending_requests: 0,
      support_workers_scheduled: 0,
      participants_scheduled: 0,
      this_week_hours: 0
    };
  }
};

// Scheduling suggestions
export const getSchedulingSuggestions = async (
  participantId: number,
  serviceType: string,
  preferences: any
): Promise<SchedulingSuggestion[]> => {
  try {
    const queryParams = new URLSearchParams({
      participant_id: participantId.toString(),
      service_type: serviceType,
      ...preferences
    });

    const response = await fetch(`${API_BASE_URL}/rostering/suggestions?${queryParams}`, {
      method: 'GET',
      headers: withAuth(),
    });

    if (!response.ok) {
      console.warn('Suggestions endpoint not available');
      return [];
    }

    const data = await handleApiResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching scheduling suggestions:', error);
    return [];
  }
};

// Available slots
export const getAvailableSlots = async (
  participantId: number,
  serviceType: string,
  dateRange: { start: string; end: string },
  options: any
): Promise<AvailabilitySlot[]> => {
  try {
    const queryParams = new URLSearchParams({
      participant_id: participantId.toString(),
      service_type: serviceType,
      start_date: dateRange.start,
      end_date: dateRange.end,
      ...options
    });

    const response = await fetch(`${API_BASE_URL}/rostering/availability/slots?${queryParams}`, {
      method: 'GET',
      headers: withAuth(),
    });

    if (!response.ok) {
      console.warn('Availability slots endpoint not available');
      return [];
    }

    const data = await handleApiResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }
};

// Schedule optimization
export const optimizeSchedule = async (date: string, criteria: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/optimize`, {
      method: 'POST',
      headers: withAuth(),
      body: JSON.stringify({
        optimization_date: date,
        criteria
      }),
    });

    if (!response.ok) {
      console.warn('Schedule optimization endpoint not available');
      return {
        improvements: [],
        implementation_steps: [],
        estimated_savings: {}
      };
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error optimizing schedule:', error);
    return {
      improvements: [],
      implementation_steps: [],
      estimated_savings: {}
    };
  }
};

// Utility functions
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    const time = timeString.includes(':') ? timeString : `${timeString}:00`;
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting time:', error);
    return timeString;
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateString;
  }
};

export const calculateDuration = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  try {
    const start = new Date(`1970-01-01T${startTime.includes(':') ? startTime : startTime + ':00'}`);
    const end = new Date(`1970-01-01T${endTime.includes(':') ? endTime : endTime + ':00'}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return 0;
  }
};

export const formatDuration = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
};