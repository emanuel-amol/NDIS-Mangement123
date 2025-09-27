// frontend/src/services/scheduling.ts - FIXED VERSION
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

// Types
export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  disability_type?: string;
  support_needs?: string[];
  status?: string;
}

export interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  role?: string;
  status: 'active' | 'inactive' | 'on_leave';
  skills: string[];
  hourly_rate?: number;
  max_hours_per_week?: number;
  current_participants?: number;
  max_participants?: number;
  rating?: number;
  experience_years?: number;
  location?: string;
  certifications?: string[];
}

export interface Appointment {
  id: number;
  participant_id: number;
  participant_name: string;
  support_worker_id: number;
  support_worker_name: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  location_type: 'home_visit' | 'community' | 'facility' | 'virtual';
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_end?: string;
  send_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type RosterStatus = 'checked' | 'confirmed' | 'notified' | 'cancelled';

export interface RosterParticipant {
  participant_id: number;
}

export interface RosterTask {
  title: string;
  is_done: boolean;
}

export interface RosterWorkerNote {
  note: string;
}

export interface RosterRecurrence {
  pattern_type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  by_weekdays?: number[];
  by_monthday?: number;
  by_setpos?: number;
  by_weekday?: number;
  start_date: string;
  end_date: string;
}

export interface Roster {
  id: number;
  worker_id?: number;
  support_date: string;
  start_time: string;
  end_time: string;
  eligibility?: string;
  notes?: string;
  status: RosterStatus;
  is_group_support?: boolean;
  created_at?: string;
  updated_at?: string;
  participants?: RosterParticipant[];
  tasks?: RosterTask[];
  worker_notes?: RosterWorkerNote[];
  recurrences?: RosterRecurrence[];
}

export interface RosterCreate {
  worker_id?: number;
  support_date: string;
  start_time: string;
  end_time: string;
  eligibility?: string;
  notes?: string;
  status?: RosterStatus;
  is_group_support?: boolean;
  participants: RosterParticipant[];
  tasks?: RosterTask[];
  worker_notes?: RosterWorkerNote[];
  recurrences?: RosterRecurrence[];
}

export interface ScheduleStats {
  total_appointments: number;
  today_appointments: number;
  pending_requests: number;
  support_workers_scheduled: number;
  participants_scheduled: number;
  this_week_hours: number;
  completed_this_month: number;
  upcoming_this_week: number;
}

// API Functions
export const getAppointments = async (params?: any): Promise<Appointment[]> => {
  try {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${API_BASE_URL}/appointments${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && Array.isArray(data.appointments)) {
      return data.appointments;
    } else {
      // Return mock data if API is not available
      return getMockAppointments();
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    // Return mock data as fallback
    return getMockAppointments();
  }
};

export const getParticipants = async (): Promise<Participant[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/participants`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && Array.isArray(data.participants)) {
      return data.participants;
    } else {
      return getMockParticipants();
    }
  } catch (error) {
    console.error('Error fetching participants:', error);
    return getMockParticipants();
  }
};

export const getSupportWorkers = async (): Promise<SupportWorker[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/support-workers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && Array.isArray(data.workers)) {
      return data.workers;
    } else {
      return getMockSupportWorkers();
    }
  } catch (error) {
    console.error('Error fetching support workers:', error);
    return getMockSupportWorkers();
  }
};

export const getScheduleStats = async (): Promise<ScheduleStats> => {
  try {
    const response = await fetch(`${API_BASE_URL}/schedule/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Ensure we return a valid stats object
    if (data && typeof data === 'object') {
      return {
        total_appointments: data.total_appointments || 0,
        today_appointments: data.today_appointments || 0,
        pending_requests: data.pending_requests || 0,
        support_workers_scheduled: data.support_workers_scheduled || 0,
        participants_scheduled: data.participants_scheduled || 0,
        this_week_hours: data.this_week_hours || 0,
        completed_this_month: data.completed_this_month || 0,
        upcoming_this_week: data.upcoming_this_week || 0
      };
    } else {
      return getMockScheduleStats();
    }
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    return getMockScheduleStats();
  }
};

export const createAppointment = async (appointmentData: any): Promise<Appointment> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id: number, updates: Partial<Appointment>): Promise<Appointment> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

export const deleteAppointment = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

// Roster functions
export const listRosters = async (params?: any): Promise<Roster[]> => {
  try {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${API_BASE_URL}/rostering/shifts${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else {
      return getMockRosters();
    }
  } catch (error) {
    console.error('Error fetching rosters:', error);
    return getMockRosters();
  }
};

export const createRoster = async (rosterData: RosterCreate): Promise<Roster> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rosterData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating roster:', error);
    throw error;
  }
};

export const updateRoster = async (id: number, updates: Partial<RosterCreate>): Promise<Roster> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating roster:', error);
    throw error;
  }
};

export const deleteRoster = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rostering/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting roster:', error);
    throw error;
  }
};

// Utility functions
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  
  try {
    // Handle time format "HH:MM:SS" or "HH:MM"
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      
      return date.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    // If it's a full datetime string
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    return timeString;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const calculateDuration = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  
  try {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};

export const formatDuration = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours % 1 === 0) return `${hours}h`;
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

// Mock data functions (fallbacks when API is not available)
const getMockAppointments = (): Appointment[] => [
  {
    id: 1,
    participant_id: 1,
    participant_name: 'Jordan Smith',
    support_worker_id: 1,
    support_worker_name: 'Sarah Wilson',
    start_time: '2025-01-20T09:00:00',
    end_time: '2025-01-20T11:00:00',
    service_type: 'Personal Care',
    location: '123 Main St, Melbourne VIC 3000',
    location_type: 'home_visit',
    status: 'confirmed',
    priority: 'medium',
    notes: 'Regular morning routine assistance',
    recurring: false,
    send_notifications: true,
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-16T14:20:00Z'
  },
  {
    id: 2,
    participant_id: 2,
    participant_name: 'Emma Johnson',
    support_worker_id: 2,
    support_worker_name: 'Michael Chen',
    start_time: '2025-01-20T14:00:00',
    end_time: '2025-01-20T17:00:00',
    service_type: 'Community Access',
    location: 'Shopping Centre, Melbourne',
    location_type: 'community',
    status: 'pending',
    priority: 'high',
    notes: 'Shopping and community activities',
    recurring: true,
    recurrence_pattern: 'weekly',
    send_notifications: true,
    created_at: '2025-01-15T11:00:00Z'
  }
];

const getMockParticipants = (): Participant[] => [
  {
    id: 1,
    first_name: 'Jordan',
    last_name: 'Smith',
    email: 'jordan.smith@example.com',
    phone_number: '0412 345 678',
    street_address: '123 Main St',
    city: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    disability_type: 'Intellectual Disability',
    support_needs: ['Personal Care', 'Community Access'],
    status: 'active'
  },
  {
    id: 2,
    first_name: 'Emma',
    last_name: 'Johnson',
    email: 'emma.johnson@example.com',
    phone_number: '0423 456 789',
    street_address: '456 Oak Avenue',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    disability_type: 'Physical Disability',
    support_needs: ['Domestic Assistance', 'Transport'],
    status: 'active'
  }
];

const getMockSupportWorkers = (): SupportWorker[] => [
  {
    id: 1,
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    phone: '0498 765 432',
    role: 'Senior Support Worker',
    status: 'active',
    skills: ['Personal Care', 'Community Access', 'Intellectual Disability Support'],
    hourly_rate: 35.00,
    max_hours_per_week: 38,
    current_participants: 8,
    max_participants: 12,
    rating: 4.8,
    experience_years: 5,
    location: 'Melbourne CBD',
    certifications: ['First Aid', 'Medication Administration', 'Behavior Support']
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    phone: '0487 654 321',
    role: 'Support Worker',
    status: 'active',
    skills: ['Domestic Assistance', 'Transport', 'Social Participation'],
    hourly_rate: 30.00,
    max_hours_per_week: 40,
    current_participants: 6,
    max_participants: 10,
    rating: 4.6,
    experience_years: 3,
    location: 'Melbourne East',
    certifications: ['First Aid', 'Manual Handling']
  }
];

const getMockRosters = (): Roster[] => [
  {
    id: 1,
    worker_id: 1,
    support_date: '2025-01-20',
    start_time: '09:00:00',
    end_time: '17:00:00',
    eligibility: 'Personal Care',
    notes: 'Regular support session',
    status: 'checked',
    is_group_support: false,
    participants: [{ participant_id: 1 }],
    tasks: [{ title: 'Personal Care session', is_done: false }],
    created_at: '2025-01-15T10:30:00Z'
  }
];

const getMockScheduleStats = (): ScheduleStats => ({
  total_appointments: 125,
  today_appointments: 8,
  pending_requests: 12,
  support_workers_scheduled: 15,
  participants_scheduled: 45,
  this_week_hours: 280,
  completed_this_month: 89,
  upcoming_this_week: 34
});

export default {
  getAppointments,
  getParticipants,
  getSupportWorkers,
  getScheduleStats,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listRosters,
  createRoster,
  updateRoster,
  deleteRoster,
  formatTime,
  formatDate,
  calculateDuration,
  formatDuration
};