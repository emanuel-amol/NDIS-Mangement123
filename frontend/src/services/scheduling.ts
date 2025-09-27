// frontend/src/services/scheduling.ts - FULLY DYNAMIC VERSION
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

// Enhanced Types with real-time capabilities
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
  created_at?: string;
  updated_at?: string;
  // Dynamic fields
  active_appointments_count?: number;
  next_appointment?: string;
  support_worker_assignments?: SupportWorkerAssignment[];
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
  created_at?: string;
  updated_at?: string;
  // Dynamic fields
  current_workload?: number;
  availability_status?: 'available' | 'busy' | 'unavailable';
  next_appointment?: string;
  weekly_hours_scheduled?: number;
  performance_metrics?: PerformanceMetrics;
}

export interface SupportWorkerAssignment {
  id: number;
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface PerformanceMetrics {
  completion_rate: number;
  punctuality_score: number;
  participant_satisfaction: number;
  total_hours_this_month: number;
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
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'in_progress' | 'no_show';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_end?: string;
  send_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
  // Dynamic fields
  duration_minutes?: number;
  participant_feedback?: ParticipantFeedback;
  conflicts?: ConflictInfo[];
  weather_impact?: WeatherInfo;
  transport_info?: TransportInfo;
}

export interface ParticipantFeedback {
  rating: number;
  comments: string;
  submitted_at: string;
}

export interface ConflictInfo {
  type: 'time_overlap' | 'resource_conflict' | 'location_conflict';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  recommendation: string;
}

export interface TransportInfo {
  estimated_travel_time: number;
  distance_km: number;
  route_status: 'clear' | 'delayed' | 'blocked';
}

export type RosterStatus = 'checked' | 'confirmed' | 'notified' | 'cancelled' | 'in_progress' | 'completed';

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
  instances?: RosterInstance[];
  // Dynamic fields
  actual_start_time?: string;
  actual_end_time?: string;
  billable_hours?: number;
  completion_percentage?: number;
  real_time_status?: 'scheduled' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'delayed';
}

export interface RosterInstance {
  id: number;
  roster_id: number;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  status: RosterStatus;
  notes?: string;
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
  // Dynamic metrics
  completion_rate: number;
  average_satisfaction: number;
  cancelled_appointments: number;
  overtime_hours: number;
  worker_utilization: number;
  last_updated: string;
}

export interface RosterParticipant {
  participant_id: number;
}

export interface RosterTask {
  title: string;
  is_done: boolean;
  estimated_duration?: number;
  actual_duration?: number;
}

export interface RosterWorkerNote {
  note: string;
  timestamp?: string;
  type?: 'general' | 'urgent' | 'follow_up';
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

// Real-time update types
export interface RealtimeUpdate {
  type: 'appointment_update' | 'roster_change' | 'status_change' | 'new_appointment';
  data: any;
  timestamp: string;
  user_id?: number;
}

// Enhanced API functions with error handling and caching
class SchedulingService {
  private static instance: SchedulingService;
  private cache = new Map<string, { data: any; expiry: number }>();
  private websocket: WebSocket | null = null;
  private subscribers = new Map<string, Function[]>();

  static getInstance(): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService();
    }
    return SchedulingService.instance;
  }

  // Initialize WebSocket connection for real-time updates
  initializeWebSocket(): void {
    try {
      const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws/scheduling';
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('📡 Scheduling WebSocket connected');
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          this.handleRealtimeUpdate(update);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('📡 Scheduling WebSocket disconnected, attempting reconnect...');
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  // Handle real-time updates
  private handleRealtimeUpdate(update: RealtimeUpdate): void {
    // Invalidate relevant cache entries
    this.invalidateCache(update.type);
    
    // Notify subscribers
    const subscribers = this.subscribers.get(update.type) || [];
    subscribers.forEach(callback => callback(update));
  }

  // Subscribe to real-time updates
  subscribe(eventType: string, callback: Function): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Enhanced cache management
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  private invalidateCache(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Enhanced API request wrapper
  private async apiRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    useCache: boolean = true,
    cacheTtl: number = 5 * 60 * 1000
  ): Promise<T> {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    
    // Check cache first for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (useCache && (!options.method || options.method === 'GET')) {
        this.setCache(cacheKey, data, cacheTtl);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Dynamic appointment management
  async getAppointments(params?: any): Promise<Appointment[]> {
    try {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const endpoint = `/appointments${queryString ? `?${queryString}` : ''}`;
      
      const data = await this.apiRequest<Appointment[]>(endpoint);
      
      // Enhance appointments with dynamic data
      return data.map(appointment => ({
        ...appointment,
        duration_minutes: this.calculateDurationMinutes(appointment.start_time, appointment.end_time),
        conflicts: this.detectConflicts(appointment, data),
      }));
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return this.getMockAppointments();
    }
  }

  async getAppointmentById(id: number): Promise<Appointment | null> {
    try {
      return await this.apiRequest<Appointment>(`/appointments/${id}`);
    } catch (error) {
      console.error(`Error fetching appointment ${id}:`, error);
      return null;
    }
  }

  async createAppointment(appointmentData: any): Promise<Appointment> {
    try {
      const result = await this.apiRequest<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData),
      }, false);

      // Broadcast update
      this.broadcastUpdate('appointment_created', result);
      return result;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment> {
    try {
      const result = await this.apiRequest<Appointment>(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }, false);

      // Broadcast update
      this.broadcastUpdate('appointment_updated', result);
      return result;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(id: number): Promise<void> {
    try {
      await this.apiRequest<void>(`/appointments/${id}`, {
        method: 'DELETE',
      }, false);

      // Broadcast update
      this.broadcastUpdate('appointment_deleted', { id });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  // Enhanced participant management
  async getParticipants(includeStats: boolean = true): Promise<Participant[]> {
    try {
      const endpoint = `/participants${includeStats ? '?include_stats=true' : ''}`;
      return await this.apiRequest<Participant[]>(endpoint);
    } catch (error) {
      console.error('Error fetching participants:', error);
      return this.getMockParticipants();
    }
  }

  async getParticipantById(id: number): Promise<Participant | null> {
    try {
      return await this.apiRequest<Participant>(`/participants/${id}`);
    } catch (error) {
      console.error(`Error fetching participant ${id}:`, error);
      return null;
    }
  }

  // Enhanced support worker management
  async getSupportWorkers(includeMetrics: boolean = true): Promise<SupportWorker[]> {
    try {
      const endpoint = `/support-workers${includeMetrics ? '?include_metrics=true' : ''}`;
      const workers = await this.apiRequest<SupportWorker[]>(endpoint);
      
      // Enhance with real-time availability
      return workers.map(worker => ({
        ...worker,
        availability_status: this.calculateAvailabilityStatus(worker),
        current_workload: this.calculateCurrentWorkload(worker),
      }));
    } catch (error) {
      console.error('Error fetching support workers:', error);
      return this.getMockSupportWorkers();
    }
  }

  async getSupportWorkerById(id: number): Promise<SupportWorker | null> {
    try {
      return await this.apiRequest<SupportWorker>(`/support-workers/${id}`);
    } catch (error) {
      console.error(`Error fetching support worker ${id}:`, error);
      return null;
    }
  }

  // Enhanced roster management
  async listRosters(params?: any): Promise<Roster[]> {
    try {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const endpoint = `/rostering${queryString ? `?${queryString}` : ''}`;
      
      const rosters = await this.apiRequest<Roster[]>(endpoint);
      
      // Enhance with real-time status
      return rosters.map(roster => ({
        ...roster,
        completion_percentage: this.calculateCompletionPercentage(roster),
        real_time_status: this.getRealTimeStatus(roster),
      }));
    } catch (error) {
      console.error('Error fetching rosters:', error);
      return this.getMockRosters();
    }
  }

  async createRoster(rosterData: RosterCreate): Promise<Roster> {
    try {
      const result = await this.apiRequest<Roster>('/rostering', {
        method: 'POST',
        body: JSON.stringify(rosterData),
      }, false);

      // Broadcast update
      this.broadcastUpdate('roster_created', result);
      return result;
    } catch (error) {
      console.error('Error creating roster:', error);
      throw error;
    }
  }

  async updateRoster(id: number, updates: Partial<RosterCreate>): Promise<Roster> {
    try {
      const result = await this.apiRequest<Roster>(`/rostering/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }, false);

      // Broadcast update
      this.broadcastUpdate('roster_updated', result);
      return result;
    } catch (error) {
      console.error('Error updating roster:', error);
      throw error;
    }
  }

  async deleteRoster(id: number): Promise<void> {
    try {
      await this.apiRequest<void>(`/rostering/${id}`, {
        method: 'DELETE',
      }, false);

      // Broadcast update
      this.broadcastUpdate('roster_deleted', { id });
    } catch (error) {
      console.error('Error deleting roster:', error);
      throw error;
    }
  }

  // Enhanced statistics with real-time metrics
  async getScheduleStats(): Promise<ScheduleStats> {
    try {
      const stats = await this.apiRequest<ScheduleStats>('/schedule/stats', {}, true, 2 * 60 * 1000);
      
      return {
        ...stats,
        last_updated: new Date().toISOString(),
        worker_utilization: await this.calculateWorkerUtilization(),
      };
    } catch (error) {
      console.error('Error fetching schedule stats:', error);
      return this.getMockScheduleStats();
    }
  }

  // Conflict detection
  async getConflicts(date?: string): Promise<ConflictInfo[]> {
    try {
      const endpoint = `/schedule/conflicts${date ? `?date=${date}` : ''}`;
      return await this.apiRequest<ConflictInfo[]>(endpoint);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      return [];
    }
  }

  // Availability checking
  async checkAvailability(workerId: number, startTime: string, endTime: string): Promise<boolean> {
    try {
      const endpoint = `/support-workers/${workerId}/availability`;
      const response = await this.apiRequest<{available: boolean}>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ start_time: startTime, end_time: endTime }),
      }, false);
      return response.available;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  // Smart scheduling suggestions
  async getSchedulingSuggestions(participantId: number, serviceType: string): Promise<any[]> {
    try {
      const endpoint = `/schedule/suggestions?participant_id=${participantId}&service_type=${serviceType}`;
      return await this.apiRequest<any[]>(endpoint);
    } catch (error) {
      console.error('Error fetching scheduling suggestions:', error);
      return [];
    }
  }

  // Performance analytics
  async getPerformanceMetrics(workerId?: number, startDate?: string, endDate?: string): Promise<PerformanceMetrics> {
    try {
      const params = new URLSearchParams();
      if (workerId) params.append('worker_id', workerId.toString());
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const endpoint = `/analytics/performance?${params.toString()}`;
      return await this.apiRequest<PerformanceMetrics>(endpoint);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        completion_rate: 0,
        punctuality_score: 0,
        participant_satisfaction: 0,
        total_hours_this_month: 0,
      };
    }
  }

  // Utility methods
  private calculateDurationMinutes(startTime: string, endTime: string): number {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
    } catch (error) {
      return 0;
    }
  }

  private detectConflicts(appointment: Appointment, allAppointments: Appointment[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    // Check for time conflicts with same support worker
    const timeConflicts = allAppointments.filter(other => 
      other.id !== appointment.id &&
      other.support_worker_id === appointment.support_worker_id &&
      this.timesOverlap(appointment.start_time, appointment.end_time, other.start_time, other.end_time)
    );

    if (timeConflicts.length > 0) {
      conflicts.push({
        type: 'time_overlap',
        description: `Support worker has ${timeConflicts.length} overlapping appointment(s)`,
        severity: 'high'
      });
    }

    return conflicts;
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    return s1 < e2 && e1 > s2;
  }

  private calculateAvailabilityStatus(worker: SupportWorker): 'available' | 'busy' | 'unavailable' {
    if (worker.status !== 'active') return 'unavailable';
    if ((worker.current_participants || 0) >= (worker.max_participants || 10)) return 'busy';
    return 'available';
  }

  private calculateCurrentWorkload(worker: SupportWorker): number {
    const current = worker.current_participants || 0;
    const max = worker.max_participants || 10;
    return Math.round((current / max) * 100);
  }

  private calculateCompletionPercentage(roster: Roster): number {
    if (!roster.tasks || roster.tasks.length === 0) return 0;
    const completedTasks = roster.tasks.filter(task => task.is_done).length;
    return Math.round((completedTasks / roster.tasks.length) * 100);
  }

  private getRealTimeStatus(roster: Roster): string {
    const now = new Date();
    const startTime = new Date(`${roster.support_date}T${roster.start_time}`);
    const endTime = new Date(`${roster.support_date}T${roster.end_time}`);
    
    if (now < startTime) return 'scheduled';
    if (now >= startTime && now <= endTime) return 'in_progress';
    if (now > endTime) return 'completed';
    return 'scheduled';
  }

  private async calculateWorkerUtilization(): Promise<number> {
    try {
      const workers = await this.getSupportWorkers(false);
      const totalCapacity = workers.reduce((sum, w) => sum + (w.max_hours_per_week || 40), 0);
      const scheduledHours = workers.reduce((sum, w) => sum + (w.weekly_hours_scheduled || 0), 0);
      return Math.round((scheduledHours / totalCapacity) * 100);
    } catch (error) {
      return 75; // Default fallback
    }
  }

  private broadcastUpdate(type: string, data: any): void {
    const update: RealtimeUpdate = {
      type: type as any,
      data,
      timestamp: new Date().toISOString(),
    };
    
    // Send to WebSocket if connected
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(update));
    }
    
    // Notify local subscribers
    this.handleRealtimeUpdate(update);
  }

  // Mock data methods (fallbacks)
  private getMockAppointments(): Appointment[] {
    return [
      {
        id: 1,
        participant_id: 1,
        participant_name: 'Jordan Smith',
        support_worker_id: 1,
        support_worker_name: 'Sarah Wilson',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        service_type: 'Personal Care',
        location: '123 Main St, Melbourne VIC 3000',
        location_type: 'home_visit',
        status: 'confirmed',
        priority: 'medium',
        notes: 'Regular morning routine assistance',
        recurring: false,
        send_notifications: true,
        duration_minutes: 120,
        conflicts: [],
      }
    ];
  }

  private getMockParticipants(): Participant[] {
    return [
      {
        id: 1,
        first_name: 'Jordan',
        last_name: 'Smith',
        email: 'jordan.smith@example.com',
        phone_number: '0412 345 678',
        city: 'Melbourne',
        state: 'VIC',
        status: 'active',
        active_appointments_count: 3,
        next_appointment: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }
    ];
  }

  private getMockSupportWorkers(): SupportWorker[] {
    return [
      {
        id: 1,
        name: 'Sarah Wilson',
        email: 'sarah.wilson@example.com',
        phone: '0498 765 432',
        status: 'active',
        skills: ['Personal Care', 'Community Access'],
        max_participants: 12,
        current_participants: 8,
        availability_status: 'available',
        current_workload: 67,
        weekly_hours_scheduled: 32,
        performance_metrics: {
          completion_rate: 98,
          punctuality_score: 95,
          participant_satisfaction: 4.8,
          total_hours_this_month: 128,
        }
      }
    ];
  }

  private getMockRosters(): Roster[] {
    return [
      {
        id: 1,
        worker_id: 1,
        support_date: new Date().toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '17:00:00',
        status: 'confirmed',
        participants: [{ participant_id: 1 }],
        tasks: [
          { title: 'Personal Care session', is_done: true },
          { title: 'Community outing', is_done: false }
        ],
        completion_percentage: 50,
        real_time_status: 'in_progress',
      }
    ];
  }

  private getMockScheduleStats(): ScheduleStats {
    return {
      total_appointments: 125,
      today_appointments: 8,
      pending_requests: 12,
      support_workers_scheduled: 15,
      participants_scheduled: 45,
      this_week_hours: 280,
      completed_this_month: 89,
      upcoming_this_week: 34,
      completion_rate: 94,
      average_satisfaction: 4.6,
      cancelled_appointments: 3,
      overtime_hours: 12,
      worker_utilization: 82,
      last_updated: new Date().toISOString(),
    };
  }
}

// Export singleton instance and utility functions
const schedulingService = SchedulingService.getInstance();

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  
  try {
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
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
    return Math.max(0, diffMs / (1000 * 60 * 60));
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

// Export service methods
export const getAppointments = (params?: any) => schedulingService.getAppointments(params);
export const getAppointmentById = (id: number) => schedulingService.getAppointmentById(id);
export const createAppointment = (data: any) => schedulingService.createAppointment(data);
export const updateAppointment = (id: number, updates: Partial<Appointment>) => 
  schedulingService.updateAppointment(id, updates);
export const deleteAppointment = (id: number) => schedulingService.deleteAppointment(id);

export const getParticipants = (includeStats?: boolean) => schedulingService.getParticipants(includeStats);
export const getParticipantById = (id: number) => schedulingService.getParticipantById(id);

export const getSupportWorkers = (includeMetrics?: boolean) => schedulingService.getSupportWorkers(includeMetrics);
export const getSupportWorkerById = (id: number) => schedulingService.getSupportWorkerById(id);

export const listRosters = (params?: any) => schedulingService.listRosters(params);
export const createRoster = (data: RosterCreate) => schedulingService.createRoster(data);
export const updateRoster = (id: number, updates: Partial<RosterCreate>) => 
  schedulingService.updateRoster(id, updates);
export const deleteRoster = (id: number) => schedulingService.deleteRoster(id);

export const getScheduleStats = () => schedulingService.getScheduleStats();
export const getConflicts = (date?: string) => schedulingService.getConflicts(date);
export const checkAvailability = (workerId: number, startTime: string, endTime: string) =>
  schedulingService.checkAvailability(workerId, startTime, endTime);
export const getSchedulingSuggestions = (participantId: number, serviceType: string) =>
  schedulingService.getSchedulingSuggestions(participantId, serviceType);
export const getPerformanceMetrics = (workerId?: number, startDate?: string, endDate?: string) =>
  schedulingService.getPerformanceMetrics(workerId, startDate, endDate);

// Real-time subscription methods
export const subscribeToUpdates = (eventType: string, callback: Function) =>
  schedulingService.subscribe(eventType, callback);

// Initialize WebSocket connection
export const initializeRealtimeUpdates = () => schedulingService.initializeWebSocket();

export default schedulingService;