// frontend/src/hooks/useRealtimeScheduling.ts - FULLY DYNAMIC SCHEDULING HOOKS
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  schedulingService, 
  initializeRealtimeUpdates, 
  subscribeToUpdates,
  type Appointment,
  type Roster,
  type ScheduleStats,
  type Participant,
  type SupportWorker,
  type ConflictInfo
} from '../services/scheduling';
import toast from 'react-hot-toast';

// Real-time scheduling management hook
export const useRealtimeScheduling = (options: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
} = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableNotifications = true
  } = options;

  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionsRef = useRef<(() => void)[]>([]);

  // Initialize real-time connections
  useEffect(() => {
    if (autoRefresh) {
      // Initialize WebSocket
      initializeRealtimeUpdates();
      setIsConnected(true);

      // Subscribe to various update types
      const unsubscribeAppointments = subscribeToUpdates('appointment_update', (update) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.success(`Appointment ${update.data.id} updated`);
        }
      });

      const unsubscribeRosters = subscribeToUpdates('roster_change', (update) => {
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.info(`Roster schedule updated`);
        }
      });

      const unsubscribeStatus = subscribeToUpdates('status_change', (update) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.info(`Status changed: ${update.data.status}`);
        }
      });

      const unsubscribeNew = subscribeToUpdates('new_appointment', (update) => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
        setLastUpdate(new Date());
        
        if (enableNotifications) {
          toast.success('New appointment created');
        }
      });

      // Store unsubscribe functions
      subscriptionsRef.current = [
        unsubscribeAppointments,
        unsubscribeRosters,
        unsubscribeStatus,
        unsubscribeNew
      ];

      return () => {
        // Cleanup subscriptions
        subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
        setIsConnected(false);
      };
    }
  }, [autoRefresh, enableNotifications, queryClient]);

  // Manual refresh function
  const forceRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['rosters'] });
    queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    queryClient.invalidateQueries({ queryKey: ['participants'] });
    queryClient.invalidateQueries({ queryKey: ['support-workers'] });
    setLastUpdate(new Date());
    
    if (enableNotifications) {
      toast.success('Schedule refreshed');
    }
  }, [queryClient, enableNotifications]);

  return {
    isConnected,
    lastUpdate,
    forceRefresh
  };
};

// Dynamic appointments hook with real-time updates
export const useAppointments = (filters?: {
  start_date?: string;
  end_date?: string;
  status?: string;
  participant_id?: number;
  support_worker_id?: number;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => schedulingService.getAppointments(filters),
    refetchInterval: 60000, // 1 minute background refresh
    staleTime: 30000, // Consider stale after 30 seconds
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: schedulingService.createAppointment,
    onSuccess: (newAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success(`Appointment ${newAppointment.id} created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create appointment: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Appointment> }) =>
      schedulingService.updateAppointment(id, updates),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success(`Appointment ${updatedAppointment.id} updated successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to update appointment: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: schedulingService.deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success('Appointment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete appointment: ${error.message}`);
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

// Dynamic roster management hook
export const useRosterManagement = (filters?: {
  start?: string;
  end?: string;
  worker_id?: number;
  participant_id?: number;
  status?: string;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rosters', filters],
    queryFn: () => schedulingService.listRosters(filters),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: schedulingService.createRoster,
    onSuccess: (newRoster) => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success(`Roster entry ${newRoster.id} created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create roster entry: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      schedulingService.updateRoster(id, updates),
    onSuccess: (updatedRoster) => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      toast.success(`Roster entry ${updatedRoster.id} updated successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to update roster entry: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: schedulingService.deleteRoster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      toast.success('Roster entry deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete roster entry: ${error.message}`);
    }
  });

  return {
    rosters: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createRoster: createMutation.mutate,
    updateRoster: updateMutation.mutate,
    deleteRoster: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
};

// Real-time statistics hook
export const useScheduleStats = (refreshInterval: number = 120000) => {
  const query = useQuery({
    queryKey: ['schedule-stats'],
    queryFn: schedulingService.getScheduleStats,
    refetchInterval,
    staleTime: 60000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Participants hook with caching
export const useParticipants = (includeStats: boolean = true) => {
  const query = useQuery({
    queryKey: ['participants', { includeStats }],
    queryFn: () => schedulingService.getParticipants(includeStats),
    staleTime: 300000, // 5 minutes - participants don't change often
    refetchInterval: 300000,
  });

  return {
    participants: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Support workers hook with performance metrics
export const useSupportWorkers = (includeMetrics: boolean = true) => {
  const query = useQuery({
    queryKey: ['support-workers', { includeMetrics }],
    queryFn: () => schedulingService.getSupportWorkers(includeMetrics),
    staleTime: 180000, // 3 minutes
    refetchInterval: 180000,
  });

  return {
    supportWorkers: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Conflict detection hook
export const useConflictDetection = (date?: string) => {
  const query = useQuery({
    queryKey: ['conflicts', date],
    queryFn: () => schedulingService.getConflicts(date),
    refetchInterval: 120000, // 2 minutes
    staleTime: 60000,
    enabled: !!date, // Only run if date is provided
  });

  return {
    conflicts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Availability checking hook
export const useAvailabilityCheck = () => {
  const [checking, setChecking] = useState(false);

  const checkAvailability = useCallback(async (
    workerId: number,
    startTime: string,
    endTime: string
  ): Promise<boolean> => {
    setChecking(true);
    try {
      const available = await schedulingService.checkAvailability(workerId, startTime, endTime);
      return available;
    } catch (error) {
      toast.error('Failed to check availability');
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    checkAvailability,
    checking,
  };
};

// Smart scheduling suggestions hook
export const useSchedulingSuggestions = (participantId?: number, serviceType?: string) => {
  const query = useQuery({
    queryKey: ['scheduling-suggestions', participantId, serviceType],
    queryFn: () => 
      participantId && serviceType 
        ? schedulingService.getSchedulingSuggestions(participantId, serviceType)
        : Promise.resolve([]),
    enabled: !!(participantId && serviceType),
    staleTime: 300000, // 5 minutes
  });

  return {
    suggestions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Performance analytics hook
export const usePerformanceMetrics = (
  workerId?: number,
  startDate?: string,
  endDate?: string
) => {
  const query = useQuery({
    queryKey: ['performance-metrics', workerId, startDate, endDate],
    queryFn: () => schedulingService.getPerformanceMetrics(workerId, startDate, endDate),
    staleTime: 600000, // 10 minutes
    enabled: !!(workerId || startDate || endDate),
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

// Calendar view hook with optimized data loading
export const useCalendarView = (viewType: 'month' | 'week' | 'day', currentDate: Date) => {
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'week':
        start.setDate(currentDate.getDate() - currentDate.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(start.getDate());
        break;
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // Update date range when view type or current date changes
  useEffect(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'week':
        start.setDate(currentDate.getDate() - currentDate.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(start.getDate());
        break;
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, [viewType, currentDate]);

  const { appointments, isLoading, error } = useAppointments({
    start_date: dateRange.start,
    end_date: dateRange.end
  });

  const { conflicts } = useConflictDetection(dateRange.start);

  // Group appointments by date for easier rendering
  const appointmentsByDate = appointments.reduce((acc, appointment) => {
    const date = appointment.start_time.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {} as Record<string, Appointment[]>);

  return {
    appointments,
    appointmentsByDate,
    conflicts,
    dateRange,
    isLoading,
    error,
  };
};

// Combined scheduling dashboard hook
export const useSchedulingDashboard = () => {
  const { stats, isLoading: statsLoading } = useScheduleStats();
  const { appointments, isLoading: appointmentsLoading } = useAppointments();
  const { conflicts } = useConflictDetection();
  const { participants } = useParticipants(false);
  const { supportWorkers } = useSupportWorkers(false);

  // Calculate today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => 
    apt.start_time.split('T')[0] === today
  );

  // Calculate pending appointments
  const pendingAppointments = appointments.filter(apt => 
    apt.status === 'pending'
  );

  // Calculate upcoming appointments (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    return aptDate >= new Date() && aptDate <= nextWeek;
  });

  return {
    // Stats
    stats,
    
    // Appointments
    allAppointments: appointments,
    todayAppointments,
    pendingAppointments,
    upcomingAppointments,
    
    // Resources
    participants,
    supportWorkers,
    
    // Issues
    conflicts,
    
    // Loading states
    isLoading: statsLoading || appointmentsLoading,
    
    // Quick metrics
    metrics: {
      totalAppointments: appointments.length,
      todayCount: todayAppointments.length,
      pendingCount: pendingAppointments.length,
      upcomingCount: upcomingAppointments.length,
      conflictsCount: conflicts.length,
      activeParticipants: participants.filter(p => p.status === 'active').length,
      availableWorkers: supportWorkers.filter(w => w.status === 'active').length,
    }
  };
};

// Export all hooks
export default {
  useRealtimeScheduling,
  useAppointments,
  useRosterManagement,
  useScheduleStats,
  useParticipants,
  useSupportWorkers,
  useConflictDetection,
  useAvailabilityCheck,
  useSchedulingSuggestions,
  usePerformanceMetrics,
  useCalendarView,
  useSchedulingDashboard,
};