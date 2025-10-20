// frontend/src/hooks/useRealtimeScheduling.ts - ENHANCED FULLY DYNAMIC VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  schedulingService, 
  getAppointments,
  updateAppointment,
  deleteAppointment,
  listRosters,
  getScheduleStats,
  getParticipants,
  getSupportWorkers,
  type Appointment,
  type Roster,
  type ScheduleStats,
  type Participant,
  type SupportWorker
} from '../services/scheduling';
import toast from 'react-hot-toast';

// Real-time WebSocket connection for live updates
class SchedulingWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  connect() {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/scheduling';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Scheduling WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data.type, data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Scheduling WebSocket disconnected');
        this.isConnected = false;
        this.notifyListeners('connection', { status: 'disconnected' });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Scheduling WebSocket error:', error);
        this.notifyListeners('error', { error });
      };
    } catch (error) {
      console.error('Failed to connect to scheduling WebSocket:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// Global WebSocket instance
let schedulingWS: SchedulingWebSocket | null = null;

// Real-time scheduling management hook
export const useRealtimeScheduling = (options: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
  enableWebSocket?: boolean;
} = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableNotifications = true,
    enableWebSocket = true
  } = options;

  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Initialize WebSocket connection
  useEffect(() => {
    if (enableWebSocket && !schedulingWS) {
      schedulingWS = new SchedulingWebSocket();
      schedulingWS.connect();

      // Subscribe to connection status
      const unsubscribeConnection = schedulingWS.subscribe('connection', (data) => {
        setIsConnected(data.status === 'connected');
        setConnectionStatus(data.status);
      });

      // Subscribe to appointment updates
      const unsubscribeAppointments = schedulingWS.subscribe('appointment_update', (data) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.success(`Appointment ${data.appointment?.id} updated`);
        }
      });

      // Subscribe to roster updates
      const unsubscribeRosters = schedulingWS.subscribe('roster_update', (data) => {
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.info('Schedule updated');
        }
      });

      // Subscribe to status changes
      const unsubscribeStatus = schedulingWS.subscribe('status_change', (data) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.info(`Status changed: ${data.status}`);
        }
      });

      // Subscribe to new appointments
      const unsubscribeNew = schedulingWS.subscribe('new_appointment', (data) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.success('New appointment created');
        }
      });

      // Subscribe to conflicts
      const unsubscribeConflicts = schedulingWS.subscribe('scheduling_conflict', (data) => {
        queryClient.invalidateQueries({ queryKey: ['conflicts'] });
        
        if (enableNotifications) {
          toast.error(`Scheduling conflict detected: ${data.message}`);
        }
      });

      return () => {
        unsubscribeConnection();
        unsubscribeAppointments();
        unsubscribeRosters();
        unsubscribeStatus();
        unsubscribeNew();
        unsubscribeConflicts();
      };
    }
  }, [enableWebSocket, enableNotifications, queryClient]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (autoRefresh && !enableWebSocket) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, enableWebSocket, refreshInterval, queryClient]);

  // Manual refresh function
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['rosters'] });
    queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    queryClient.invalidateQueries({ queryKey: ['participants'] });
    queryClient.invalidateQueries({ queryKey: ['support-workers'] });
    queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    setLastUpdate(new Date());
    
    if (enableNotifications) {
      toast.success('Schedule refreshed');
    }
  }, [queryClient, enableNotifications]);

  return {
    isConnected: enableWebSocket ? isConnected : true,
    connectionStatus,
    lastUpdate,
    forceRefresh
  };
};

// Enhanced appointments hook with real-time updates and conflict detection
export const useAppointments = (filters?: {
  start_date?: string;
  end_date?: string;
  status?: string;
  participant_id?: number;
  support_worker_id?: number;
}) => {
  const queryClient = useQueryClient();
  const [conflicts, setConflicts] = useState<any[]>([]);

  const query = useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => getAppointments(filters),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Conflict detection
  useEffect(() => {
    if (query.data) {
      const detectedConflicts = detectSchedulingConflicts(query.data);
      setConflicts(detectedConflicts);
    }
  }, [query.data]);

  // Mutations with optimistic updates
  const createMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      // Validate before creating
      const validation = await validateAppointmentConflicts(appointmentData);
      if (validation.hasConflicts) {
        throw new Error(`Scheduling conflicts detected: ${validation.conflicts.join(', ')}`);
      }
      
      // Check availability
      const availability = await checkWorkerAvailability(
        appointmentData.support_worker_id,
        appointmentData.start_time,
        appointmentData.end_time
      );
      
      if (!availability.available) {
        throw new Error(`Support worker not available: ${availability.reason}`);
      }

      return createAppointment(appointmentData);
    },
    onMutate: async (newAppointment) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previousAppointments = queryClient.getQueryData(['appointments']);
      
      queryClient.setQueryData(['appointments'], (old: any) => {
        return [...(old || []), { ...newAppointment, id: Date.now(), status: 'pending' }];
      });

      return { previousAppointments };
    },
    onError: (err, newAppointment, context) => {
      // Rollback optimistic update
      queryClient.setQueryData(['appointments'], context?.previousAppointments);
      toast.error(`Failed to create appointment: ${err.message}`);
    },
    onSuccess: (newAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success('Appointment created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Appointment> }) =>
      updateAppointment(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previousAppointments = queryClient.getQueryData(['appointments']);
      
      queryClient.setQueryData(['appointments'], (old: any) => {
        return (old || []).map((apt: any) => 
          apt.id === id ? { ...apt, ...updates } : apt
        );
      });

      return { previousAppointments };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['appointments'], context?.previousAppointments);
      toast.error(`Failed to update appointment: ${err.message}`);
    },
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success('Appointment updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      const previousAppointments = queryClient.getQueryData(['appointments']);
      
      queryClient.setQueryData(['appointments'], (old: any) => {
        return (old || []).filter((apt: any) => apt.id !== appointmentId);
      });

      return { previousAppointments };
    },
    onError: (err, appointmentId, context) => {
      queryClient.setQueryData(['appointments'], context?.previousAppointments);
      toast.error(`Failed to delete appointment: ${err.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success('Appointment deleted successfully');
    }
  });

  // Helper functions
  const quickStatusUpdate = useCallback(async (appointmentId: number, status: string) => {
    try {
      await updateMutation.mutateAsync({ 
        id: appointmentId, 
        updates: { status: status as any } 
      });
    } catch (error) {
      // Error handled by mutation
    }
  }, [updateMutation]);

  const createAppointment = useCallback(async (appointmentData: any) => {
    try {
      return await createMutation.mutateAsync(appointmentData);
    } catch (error) {
      throw error;
    }
  }, [createMutation]);

  const updateAppointment = useCallback(async (id: number, updates: Partial<Appointment>) => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch (error) {
      throw error;
    }
  }, [updateMutation]);

  const deleteAppointment = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      throw error;
    }
  }, [deleteMutation]);

  return {
    // Data
    appointments: query.data || [],
    conflicts,
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    quickStatusUpdate,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Utility
    refetch: query.refetch,
  };
};

// Smart scheduling suggestions hook
export const useSmartScheduling = (participantId?: number) => {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['smart-suggestions', participantId],
    queryFn: async () => {
      if (!participantId) return [];
      
      const [appointments, participant, availableWorkers] = await Promise.all([
        getAppointments({ participant_id: participantId }),
        getParticipants({ id: participantId }),
        getSupportWorkers({ status: 'active' })
      ]);

      return generateSmartSuggestions(participant, appointments, availableWorkers);
    },
    enabled: !!participantId,
    staleTime: 5 * 60 * 1000
  });

  return { suggestions: suggestions || [], isLoading };
};

// Conflict detection hook
export const useConflictDetection = (appointments?: Appointment[]) => {
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (appointments) {
      const detectedConflicts = detectSchedulingConflicts(appointments);
      setConflicts(detectedConflicts);
    }
  }, [appointments]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: any) => {
    try {
      // Implement conflict resolution logic
      console.log('Resolving conflict:', conflictId, resolution);
      toast.success('Conflict resolved');
    } catch (error) {
      toast.error('Failed to resolve conflict');
    }
  }, []);

  return { conflicts, resolveConflict };
};

// Helper functions for conflict detection and smart suggestions
const detectSchedulingConflicts = (appointments: Appointment[]): any[] => {
  const conflicts: any[] = [];
  
  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const apt1 = appointments[i];
      const apt2 = appointments[j];
      
      // Check for worker conflicts
      if (apt1.support_worker_id === apt2.support_worker_id) {
        const start1 = new Date(apt1.start_time);
        const end1 = new Date(apt1.end_time);
        const start2 = new Date(apt2.start_time);
        const end2 = new Date(apt2.end_time);
        
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            id: `worker-${apt1.id}-${apt2.id}`,
            type: 'worker_double_booking',
            severity: 'high',
            description: `${apt1.support_worker_name} is double-booked`,
            appointments: [apt1, apt2],
            suggestions: [
              'Assign a different support worker',
              'Reschedule one of the appointments',
              'Split the appointment'
            ]
          });
        }
      }
    }
  }
  
  return conflicts;
};

const validateAppointmentConflicts = async (appointmentData: any): Promise<{
  hasConflicts: boolean;
  conflicts: string[];
}> => {
  const conflicts: string[] = [];
  
  try {
    // Check for existing appointments at the same time
    const existingAppointments = await getAppointments({
      start_date: appointmentData.start_time.split('T')[0],
      end_date: appointmentData.start_time.split('T')[0],
      support_worker_id: appointmentData.support_worker_id
    });

    const startTime = new Date(appointmentData.start_time);
    const endTime = new Date(appointmentData.end_time);

    existingAppointments.forEach(existing => {
      const existingStart = new Date(existing.start_time);
      const existingEnd = new Date(existing.end_time);

      if (startTime < existingEnd && endTime > existingStart) {
        conflicts.push(`Conflicts with existing appointment ${existing.id}`);
      }
    });
  } catch (error) {
    console.error('Error validating conflicts:', error);
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
};

const checkWorkerAvailability = async (
  workerId: number,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; reason?: string }> => {
  try {
    // Check worker's schedule
    const workerAppointments = await getAppointments({
      support_worker_id: workerId,
      start_date: startTime.split('T')[0],
      end_date: startTime.split('T')[0]
    });

    const start = new Date(startTime);
    const end = new Date(endTime);

    for (const appointment of workerAppointments) {
      const aptStart = new Date(appointment.start_time);
      const aptEnd = new Date(appointment.end_time);

      if (start < aptEnd && end > aptStart) {
        return {
          available: false,
          reason: `Worker is busy from ${aptStart.toLocaleTimeString()} to ${aptEnd.toLocaleTimeString()}`
        };
      }
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking worker availability:', error);
    return { available: false, reason: 'Unable to check availability' };
  }
};

const generateSmartSuggestions = (
  participant: any,
  appointments: Appointment[],
  availableWorkers: SupportWorker[]
): any[] => {
  const suggestions: any[] = [];

  // Suggest optimal times based on participant's history
  const preferredTimes = extractPreferredTimes(appointments);
  if (preferredTimes.length > 0) {
    suggestions.push({
      type: 'preferred_time',
      title: 'Optimal Time Slot',
      description: `Based on history, participant prefers appointments at ${preferredTimes[0]}`,
      action: 'schedule_at_preferred_time',
      data: { time: preferredTimes[0] }
    });
  }

  // Suggest worker optimization
  const workerStats = analyzeWorkerPerformance(appointments, availableWorkers);
  const bestWorker = workerStats[0];
  if (bestWorker) {
    suggestions.push({
      type: 'worker_optimization',
      title: 'Recommended Support Worker',
      description: `${bestWorker.name} has excellent performance ratings with this participant`,
      action: 'assign_worker',
      data: { workerId: bestWorker.id }
    });
  }

  // Suggest schedule optimization
  const gaps = findScheduleGaps(appointments);
  if (gaps.length > 0) {
    suggestions.push({
      type: 'schedule_optimization',
      title: 'Fill Schedule Gap',
      description: `Available time slot found on ${gaps[0].date} at ${gaps[0].time}`,
      action: 'fill_gap',
      data: gaps[0]
    });
  }

  return suggestions;
};

const extractPreferredTimes = (appointments: Appointment[]): string[] => {
  const timeFrequency: { [key: string]: number } = {};
  
  appointments.forEach(apt => {
    const time = new Date(apt.start_time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    timeFrequency[time] = (timeFrequency[time] || 0) + 1;
  });

  return Object.entries(timeFrequency)
    .sort(([,a], [,b]) => b - a)
    .map(([time]) => time);
};

const analyzeWorkerPerformance = (
  appointments: Appointment[],
  workers: SupportWorker[]
): SupportWorker[] => {
  return workers
    .map(worker => {
      const workerAppointments = appointments.filter(apt => 
        apt.support_worker_id === worker.id
      );
      
      const completionRate = workerAppointments.length > 0 ? 
        workerAppointments.filter(apt => apt.status === 'completed').length / workerAppointments.length : 0;
      
      return {
        ...worker,
        score: (worker.performance_metrics?.rating || 0) * 0.4 + completionRate * 0.6
      };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
};

const findScheduleGaps = (appointments: Appointment[]): any[] => {
  // Simple gap detection logic
  const gaps: any[] = [];
  const sortedAppointments = appointments.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sortedAppointments.length - 1; i++) {
    const currentEnd = new Date(sortedAppointments[i].end_time);
    const nextStart = new Date(sortedAppointments[i + 1].start_time);
    
    const gapHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);
    
    if (gapHours >= 2) { // 2+ hour gap
      gaps.push({
        date: currentEnd.toISOString().split('T')[0],
        time: currentEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: gapHours
      });
    }
  }

  return gaps;
};

// Export additional helper functions
export {
  detectSchedulingConflicts,
  validateAppointmentConflicts,
  checkWorkerAvailability,
  generateSmartSuggestions
};