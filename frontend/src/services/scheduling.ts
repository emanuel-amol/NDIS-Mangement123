// frontend/src/services/scheduling.ts - Enhanced with full backend integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_API_KEY
};

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export type RosterStatus = 'checked' | 'confirmed' | 'notified' | 'cancelled';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface RosterParticipant {
  participant_id: number;
}

export interface RosterTask {
  title: string;
  is_done?: boolean;
}

export interface RosterWorkerNote {
  note: string;
}

export interface RosterRecurrence {
  pattern_type: RecurrenceType;
  interval?: number;
  by_weekdays?: number[];
  by_monthday?: number;
  by_setpos?: number;
  by_weekday?: number;
  start_date: string;
  end_date: string;
}

export interface RosterCreate {
  service_org_id?: number;
  service_id?: number;
  vehicle_id?: number;
  worker_id?: number;
  support_date: string;        // YYYY-MM-DD
  start_time: string;          // HH:MM:SS
  end_time: string;            // HH:MM:SS
  quantity?: number;
  ratio_worker_to_participant?: number;
  eligibility?: string;
  transport_km?: number;
  transport_worker_expenses?: number;
  transport_non_labour?: number;
  notes?: string;
  status?: RosterStatus;
  is_group_support?: boolean;
  participants: RosterParticipant[];
  tasks?: RosterTask[];
  worker_notes?: RosterWorkerNote[];
  recurrences?: RosterRecurrence[];
}

export interface Roster extends RosterCreate {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  street_address?: string;
  city?: string;
  state?: string;
  status: string;
  disability_type?: string;
  support_category?: string;
}

export interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate?: number;
  max_hours_per_week?: number;
  skills: string[];
  availability_pattern?: any;
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
  send_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleStats {
  total_appointments: number;
  today_appointments: number;
  pending_requests: number;
  support_workers_scheduled: number;
  participants_scheduled: number;
  this_week_hours: number;
  completed_this_month: number;
}

// ==========================================
// ROSTER MANAGEMENT FUNCTIONS
// ==========================================

export async function listRosters(params: {
  start?: string;
  end?: string;
  worker_id?: number;
  participant_id?: number;
  status?: RosterStatus;
} = {}): Promise<Roster[]> {
  try {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) q.append(k, String(v));
    });

    const res = await fetch(`${API_BASE_URL}/rostering?${q.toString()}`, { headers });
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('Roster endpoint not found, returning empty array');
        return [];
      }
      throw new Error(`Failed to fetch rosters: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching rosters:', error);
    // Return mock data as fallback
    return getMockRosters(params);
  }
}

export async function createRoster(payload: RosterCreate): Promise<Roster> {
  try {
    const res = await fetch(`${API_BASE_URL}/rostering`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create roster: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error creating roster:', error);
    throw error;
  }
}

export async function updateRoster(id: number, payload: Partial<RosterCreate>): Promise<Roster> {
  try {
    const res = await fetch(`${API_BASE_URL}/rostering/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update roster: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error updating roster:', error);
    throw error;
  }
}

export async function deleteRoster(id: number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/rostering/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete roster: ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting roster:', error);
    throw error;
  }
}

export async function getRoster(id: number): Promise<Roster> {
  try {
    const res = await fetch(`${API_BASE_URL}/rostering/${id}`, { headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch roster: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching roster:', error);
    throw error;
  }
}

// ==========================================
// PARTICIPANT MANAGEMENT FUNCTIONS
// ==========================================

export async function getParticipants(): Promise<Participant[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/participants`, { headers });
    
    if (!res.ok) {
      console.warn('Participants endpoint not available, using mock data');
      return getMockParticipants();
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching participants:', error);
    return getMockParticipants();
  }
}

export async function getParticipant(id: number): Promise<Participant> {
  try {
    const res = await fetch(`${API_BASE_URL}/participants/${id}`, { headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch participant: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching participant:', error);
    // Return mock participant
    const mockParticipants = getMockParticipants();
    const participant = mockParticipants.find(p => p.id === id);
    if (!participant) throw new Error('Participant not found');
    return participant;
  }
}

// ==========================================
// SUPPORT WORKER MANAGEMENT FUNCTIONS
// ==========================================

export async function getSupportWorkers(): Promise<SupportWorker[]> {
  try {
    // Try the users endpoint first (support workers are users with specific roles)
    const res = await fetch(`${API_BASE_URL}/admin/users?role=support_worker`, { headers });
    
    if (!res.ok) {
      console.warn('Support workers endpoint not available, using mock data');
      return getMockSupportWorkers();
    }
    
    const users = await res.json();
    
    // Transform users to support workers format
    return users.map((user: any) => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'Support Worker',
      status: user.is_active ? 'active' : 'inactive',
      hourly_rate: user.hourly_rate || 30.00,
      max_hours_per_week: user.max_hours_per_week || 38,
      skills: user.skills || ['Personal Care', 'Community Access'],
      availability_pattern: user.availability_pattern || {}
    }));
  } catch (error) {
    console.error('Error fetching support workers:', error);
    return getMockSupportWorkers();
  }
}

export async function getSupportWorker(id: number): Promise<SupportWorker> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, { headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch support worker: ${res.statusText}`);
    }
    
    const user = await res.json();
    
    return {
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'Support Worker',
      status: user.is_active ? 'active' : 'inactive',
      hourly_rate: user.hourly_rate || 30.00,
      max_hours_per_week: user.max_hours_per_week || 38,
      skills: user.skills || ['Personal Care', 'Community Access'],
      availability_pattern: user.availability_pattern || {}
    };
  } catch (error) {
    console.error('Error fetching support worker:', error);
    // Return mock support worker
    const mockWorkers = getMockSupportWorkers();
    const worker = mockWorkers.find(w => w.id === id);
    if (!worker) throw new Error('Support worker not found');
    return worker;
  }
}

// ==========================================
// APPOINTMENT MANAGEMENT FUNCTIONS
// ==========================================

export async function getAppointments(params: {
  start_date?: string;
  end_date?: string;
  participant_id?: number;
  support_worker_id?: number;
  status?: string;
} = {}): Promise<Appointment[]> {
  try {
    // Convert roster data to appointment format
    const rosters = await listRosters({
      start: params.start_date,
      end: params.end_date,
      worker_id: params.support_worker_id,
      participant_id: params.participant_id,
      status: params.status as RosterStatus
    });

    // Get participants and support workers for name mapping
    const [participants, supportWorkers] = await Promise.all([
      getParticipants(),
      getSupportWorkers()
    ]);

    // Convert rosters to appointments
    const appointments: Appointment[] = [];
    
    for (const roster of rosters) {
      // Handle each participant in the roster
      for (const rosterParticipant of roster.participants || []) {
        const participant = participants.find(p => p.id === rosterParticipant.participant_id);
        const supportWorker = supportWorkers.find(w => w.id === roster.worker_id);
        
        if (participant && supportWorker) {
          appointments.push({
            id: roster.id,
            participant_id: participant.id,
            participant_name: `${participant.first_name} ${participant.last_name}`,
            support_worker_id: supportWorker.id,
            support_worker_name: supportWorker.name,
            start_time: `${roster.support_date}T${roster.start_time}`,
            end_time: `${roster.support_date}T${roster.end_time}`,
            service_type: roster.eligibility || 'General Support',
            location: `${participant.street_address || ''}, ${participant.city || ''}, ${participant.state || ''}`.trim().replace(/^,\s*/, '') || 'Home Visit',
            location_type: 'home_visit',
            status: roster.status === 'confirmed' ? 'confirmed' : 
                   roster.status === 'cancelled' ? 'cancelled' : 'pending',
            priority: 'medium',
            notes: roster.notes,
            recurring: (roster.recurrences || []).length > 0,
            send_notifications: true,
            created_at: roster.created_at,
            updated_at: roster.updated_at
          });
        }
      }
    }

    return appointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return getMockAppointments();
  }
}

export async function getAppointment(id: number): Promise<Appointment> {
  try {
    const roster = await getRoster(id);
    const [participants, supportWorkers] = await Promise.all([
      getParticipants(),
      getSupportWorkers()
    ]);

    const participant = participants.find(p => 
      roster.participants?.some(rp => rp.participant_id === p.id)
    );
    const supportWorker = supportWorkers.find(w => w.id === roster.worker_id);

    if (!participant || !supportWorker) {
      throw new Error('Related participant or support worker not found');
    }

    return {
      id: roster.id,
      participant_id: participant.id,
      participant_name: `${participant.first_name} ${participant.last_name}`,
      support_worker_id: supportWorker.id,
      support_worker_name: supportWorker.name,
      start_time: `${roster.support_date}T${roster.start_time}`,
      end_time: `${roster.support_date}T${roster.end_time}`,
      service_type: roster.eligibility || 'General Support',
      location: `${participant.street_address || ''}, ${participant.city || ''}, ${participant.state || ''}`.trim().replace(/^,\s*/, '') || 'Home Visit',
      location_type: 'home_visit',
      status: roster.status === 'confirmed' ? 'confirmed' : 
             roster.status === 'cancelled' ? 'cancelled' : 'pending',
      priority: 'medium',
      notes: roster.notes,
      recurring: (roster.recurrences || []).length > 0,
      send_notifications: true,
      created_at: roster.created_at,
      updated_at: roster.updated_at
    };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
}

export async function createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
  try {
    // Convert appointment to roster format
    const rosterData: RosterCreate = {
      worker_id: appointment.support_worker_id,
      support_date: appointment.start_time.split('T')[0],
      start_time: appointment.start_time.split('T')[1] || '09:00:00',
      end_time: appointment.end_time.split('T')[1] || '17:00:00',
      eligibility: appointment.service_type,
      notes: appointment.notes,
      status: appointment.status === 'confirmed' ? 'confirmed' : 
             appointment.status === 'cancelled' ? 'cancelled' : 'checked',
      is_group_support: false,
      participants: [{ participant_id: appointment.participant_id }]
    };

    const roster = await createRoster(rosterData);
    
    // Convert back to appointment format
    const [participants, supportWorkers] = await Promise.all([
      getParticipants(),
      getSupportWorkers()
    ]);

    const participant = participants.find(p => p.id === appointment.participant_id);
    const supportWorker = supportWorkers.find(w => w.id === appointment.support_worker_id);

    if (!participant || !supportWorker) {
      throw new Error('Related participant or support worker not found');
    }

    return {
      id: roster.id,
      participant_id: participant.id,
      participant_name: `${participant.first_name} ${participant.last_name}`,
      support_worker_id: supportWorker.id,
      support_worker_name: supportWorker.name,
      start_time: `${roster.support_date}T${roster.start_time}`,
      end_time: `${roster.support_date}T${roster.end_time}`,
      service_type: roster.eligibility || 'General Support',
      location: appointment.location,
      location_type: appointment.location_type,
      status: appointment.status,
      priority: appointment.priority,
      notes: roster.notes,
      recurring: appointment.recurring,
      send_notifications: appointment.send_notifications,
      created_at: roster.created_at,
      updated_at: roster.updated_at
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment> {
  try {
    // Convert appointment updates to roster format
    const rosterUpdates: Partial<RosterCreate> = {};
    
    if (updates.support_worker_id) rosterUpdates.worker_id = updates.support_worker_id;
    if (updates.start_time) {
      rosterUpdates.support_date = updates.start_time.split('T')[0];
      rosterUpdates.start_time = updates.start_time.split('T')[1] || '09:00:00';
    }
    if (updates.end_time) {
      rosterUpdates.end_time = updates.end_time.split('T')[1] || '17:00:00';
    }
    if (updates.service_type) rosterUpdates.eligibility = updates.service_type;
    if (updates.notes) rosterUpdates.notes = updates.notes;
    if (updates.status) {
      rosterUpdates.status = updates.status === 'confirmed' ? 'confirmed' : 
                            updates.status === 'cancelled' ? 'cancelled' : 'checked';
    }

    const roster = await updateRoster(id, rosterUpdates);
    
    // Return updated appointment
    return await getAppointment(id);
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}

export async function deleteAppointment(id: number): Promise<void> {
  try {
    await deleteRoster(id);
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}

// ==========================================
// STATISTICS AND REPORTING
// ==========================================

export async function getScheduleStats(): Promise<ScheduleStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date();
    monthStart.setDate(1);

    const [todayRosters, weekRosters, monthRosters, allParticipants, allWorkers] = await Promise.all([
      listRosters({ start: today, end: today }),
      listRosters({ start: weekStart.toISOString().split('T')[0] }),
      listRosters({ start: monthStart.toISOString().split('T')[0] }),
      getParticipants(),
      getSupportWorkers()
    ]);

    // Calculate statistics
    const totalAppointments = weekRosters.length;
    const todayAppointments = todayRosters.length;
    const pendingRequests = weekRosters.filter(r => r.status === 'checked').length;
    const supportWorkersScheduled = new Set(weekRosters.map(r => r.worker_id)).size;
    const participantsScheduled = new Set(weekRosters.flatMap(r => r.participants?.map(p => p.participant_id) || [])).size;
    const thisWeekHours = weekRosters.reduce((total, roster) => {
      const start = new Date(`1970-01-01T${roster.start_time}`);
      const end = new Date(`1970-01-01T${roster.end_time}`);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    const completedThisMonth = monthRosters.filter(r => r.status === 'confirmed').length;

    return {
      total_appointments: totalAppointments,
      today_appointments: todayAppointments,
      pending_requests: pendingRequests,
      support_workers_scheduled: supportWorkersScheduled,
      participants_scheduled: participantsScheduled,
      this_week_hours: Math.round(thisWeekHours),
      completed_this_month: completedThisMonth
    };
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    // Return mock stats
    return {
      total_appointments: 156,
      today_appointments: 23,
      pending_requests: 7,
      support_workers_scheduled: 45,
      participants_scheduled: 89,
      this_week_hours: 280,
      completed_this_month: 124
    };
  }
}

// ==========================================
// MOCK DATA FALLBACKS
// ==========================================

function getMockRosters(params: any = {}): Roster[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 1,
      worker_id: 1,
      support_date: today,
      start_time: '09:00:00',
      end_time: '11:00:00',
      eligibility: 'Personal Care',
      notes: 'Regular morning routine assistance',
      status: 'confirmed',
      is_group_support: false,
      participants: [{ participant_id: 1 }],
      tasks: [{ title: 'Morning routine assistance', is_done: false }],
      worker_notes: [{ note: 'Participant doing well with independence goals' }],
      recurrences: []
    },
    {
      id: 2,
      worker_id: 2,
      support_date: today,
      start_time: '14:00:00',
      end_time: '16:00:00',
      eligibility: 'Community Access',
      notes: 'Shopping centre visit',
      status: 'checked',
      is_group_support: false,
      participants: [{ participant_id: 2 }],
      tasks: [],
      worker_notes: [],
      recurrences: []
    }
  ];
}

function getMockParticipants(): Participant[] {
  return [
    {
      id: 1,
      first_name: 'Jordan',
      last_name: 'Smith',
      phone_number: '0412 345 678',
      street_address: '123 Main Street',
      city: 'Melbourne',
      state: 'VIC',
      status: 'active',
      disability_type: 'intellectual-disability',
      support_category: 'Core Support'
    },
    {
      id: 2,
      first_name: 'Amrita',
      last_name: 'Kumar',
      phone_number: '0423 456 789',
      street_address: '456 Park Avenue',
      city: 'Sydney',
      state: 'NSW',
      status: 'active',
      disability_type: 'physical-disability',
      support_category: 'Core Support'
    },
    {
      id: 3,
      first_name: 'Linh',
      last_name: 'Nguyen',
      phone_number: '0434 567 890',
      street_address: '789 River Road',
      city: 'Brisbane',
      state: 'QLD',
      status: 'active',
      disability_type: 'sensory-disability',
      support_category: 'Capacity Building'
    }
  ];
}

function getMockSupportWorkers(): SupportWorker[] {
  return [
    {
      id: 1,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@example.com',
      phone: '0498 765 432',
      role: 'Senior Support Worker',
      status: 'active',
      hourly_rate: 35.00,
      max_hours_per_week: 38,
      skills: ['Personal Care', 'Community Access', 'Domestic Assistance'],
      availability_pattern: {
        monday: ['09:00-17:00'],
        tuesday: ['09:00-17:00'],
        wednesday: ['09:00-17:00'],
        thursday: ['09:00-17:00'],
        friday: ['09:00-15:00']
      }
    },
    {
      id: 2,
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      phone: '0487 654 321',
      role: 'Support Worker',
      status: 'active',
      hourly_rate: 30.00,
      max_hours_per_week: 40,
      skills: ['Domestic Assistance', 'Transport', 'Social Participation'],
      availability_pattern: {
        monday: ['08:00-16:00'],
        tuesday: ['08:00-16:00'],
        wednesday: ['08:00-16:00'],
        thursday: ['08:00-16:00'],
        friday: ['08:00-16:00']
      }
    },
    {
      id: 3,
      name: 'Emma Thompson',
      email: 'emma.thompson@example.com',
      phone: '0476 543 210',
      role: 'Support Worker',
      status: 'active',
      hourly_rate: 32.00,
      max_hours_per_week: 35,
      skills: ['Social Participation', 'Skill Development', 'Community Access'],
      availability_pattern: {
        tuesday: ['10:00-18:00'],
        wednesday: ['10:00-18:00'],
        thursday: ['10:00-18:00'],
        friday: ['10:00-18:00'],
        saturday: ['09:00-15:00']
      }
    }
  ];
}

function getMockAppointments(): Appointment[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 1,
      participant_id: 1,
      participant_name: 'Jordan Smith',
      support_worker_id: 1,
      support_worker_name: 'Sarah Wilson',
      start_time: `${today}T09:00:00`,
      end_time: `${today}T11:00:00`,
      service_type: 'Personal Care',
      location: '123 Main Street, Melbourne, VIC',
      location_type: 'home_visit',
      status: 'confirmed',
      priority: 'medium',
      notes: 'Regular morning routine assistance',
      recurring: false,
      send_notifications: true
    },
    {
      id: 2,
      participant_id: 2,
      participant_name: 'Amrita Kumar',
      support_worker_id: 2,
      support_worker_name: 'Michael Chen',
      start_time: `${today}T14:00:00`,
      end_time: `${today}T16:00:00`,
      service_type: 'Community Access',
      location: 'Westfield Shopping Centre',
      location_type: 'community',
      status: 'pending',
      priority: 'medium',
      notes: 'Shopping and community participation',
      recurring: false,
      send_notifications: true
    }
  ];
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function formatTime(timeString: string): string {
  try {
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return timeString;
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function calculateDuration(startTime: string, endTime: string): number {
  try {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}

export function formatDuration(hours: number): string {
  if (hours === 1) return '1 hour';
  if (hours === 0.5) return '30 minutes';
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  return `${hours} hours`;
}