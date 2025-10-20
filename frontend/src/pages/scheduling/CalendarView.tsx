// frontend/src/pages/scheduling/CalendarView.tsx - FIXED STATUS ERROR
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Calendar,
  Clock,
  User,
  MapPin,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getParticipants,
  getSupportWorkers,
  formatTime,
  formatDate,
  type Appointment,
  type Participant,
  type SupportWorker
} from '../../services/scheduling';
import toast from 'react-hot-toast';

type ViewType = 'month' | 'week' | 'day';

interface CalendarEvent extends Appointment {
  color: string;
  participantInfo?: Participant;
  supportWorkerInfo?: SupportWorker;
}

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    supportWorker: '',
    participant: '',
    serviceType: '',
    status: ''
  });

  // Calculate date range based on view type
  const getDateRange = () => {
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
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Query for appointments
  const { 
    data: appointments = [], 
    isLoading: appointmentsLoading, 
    error: appointmentsError,
    refetch: refetchAppointments 
  } = useQuery<Appointment[]>({
    queryKey: ['calendar-appointments', startDate, endDate, filters],
    queryFn: () => {
      const params: any = { start_date: startDate, end_date: endDate };
      
      if (filters.supportWorker) {
        params.support_worker_id = parseInt(filters.supportWorker);
      }
      if (filters.participant) {
        params.participant_id = parseInt(filters.participant);
      }
      if (filters.status) {
        params.status = filters.status;
      }
      
      return getAppointments(params);
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 1 * 60 * 1000 // Consider stale after 1 minute
  });

  // Query for participants and support workers for filter dropdowns
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: getParticipants,
    staleTime: 10 * 60 * 1000 // Participants don't change often
  });

  const { data: supportWorkers = [] } = useQuery<SupportWorker[]>({
    queryKey: ['support-workers'],
    queryFn: getSupportWorkers,
    staleTime: 10 * 60 * 1000 // Support workers don't change often
  });

  // Mutation for updating appointment
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Appointment> }) =>
      updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  });

  // Mutation for deleting appointment
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: number) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      toast.success('Appointment deleted successfully');
      setSelectedAppointment(null);
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  });

  // FIXED: Safe utility functions to handle undefined/null values
  const formatStatus = (status: string | undefined | null): string => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status: string | undefined | null): string => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': 
      case 'checked': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | undefined | null) => {
    if (!status) return <Clock size={16} className="text-gray-600" />;
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending':
      case 'checked': return <Clock size={16} className="text-yellow-600" />;
      case 'cancelled': return <AlertTriangle size={16} className="text-red-600" />;
      case 'completed': return <CheckCircle size={16} className="text-blue-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string | undefined | null): string => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const priorityLower = priority.toLowerCase();
    switch (priorityLower) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Safe status color for grid display
  const getStatusColorForGrid = (status: string | undefined | null): string => {
    if (!status) return 'bg-gray-500';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': 
      case 'checked': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Transform appointments to calendar events with colors and additional info
  const calendarEvents: CalendarEvent[] = appointments.map(appointment => {
    const participantInfo = participants.find(p => p.id === appointment.participant_id);
    const supportWorkerInfo = supportWorkers.find(w => w.id === appointment.support_worker_id);
    
    // Assign colors based on status - with safe checking
    let color = '#6B7280'; // gray default
    const status = appointment.status;
    if (status) {
      const statusLower = status.toLowerCase();
      switch (statusLower) {
        case 'confirmed':
          color = '#10B981'; // green
          break;
        case 'pending':
        case 'checked':
          color = '#F59E0B'; // yellow
          break;
        case 'cancelled':
          color = '#EF4444'; // red
          break;
        case 'completed':
          color = '#3B82F6'; // blue
          break;
      }
    }

    return {
      ...appointment,
      color,
      participantInfo,
      supportWorkerInfo
    };
  });

  // Filter events based on search criteria
  const filteredEvents = calendarEvents.filter(event => {
    if (filters.serviceType && event.service_type && !event.service_type.toLowerCase().includes(filters.serviceType.toLowerCase())) {
      return false;
    }
    return true;
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleAppointmentClick = (appointment: CalendarEvent) => {
    setSelectedAppointment(appointment);
  };

  const handleQuickStatusUpdate = async (appointmentId: number, status: string) => {
    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        updates: { status: status as any }
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeleteAppointment = async (appointmentId: number) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointmentMutation.mutateAsync(appointmentId);
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  const formatDateHeader = () => {
    switch (viewType) {
      case 'month':
        return currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderCalendarGrid = () => {
    if (viewType === 'month') {
      return renderMonthView();
    } else if (viewType === 'week') {
      return renderWeekView();
    } else {
      return renderDayView();
    }
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    const currentWeek = new Date(startDate);
    
    while (currentWeek <= lastDay || currentWeek.getDay() !== 0) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeek);
        const dayEvents = filteredEvents.filter(event => {
          if (!event.start_time) return false;
          const eventDate = new Date(event.start_time).toDateString();
          return eventDate === day.toDateString();
        });
        
        week.push(
          <div 
            key={day.toISOString()} 
            className={`min-h-[120px] p-1 border border-gray-200 ${
              day.getMonth() !== currentDate.getMonth() ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${day.toDateString() === new Date().toDateString() ? 'bg-blue-50' : ''}`}
          >
            <div className="font-medium text-sm mb-1">{day.getDate()}</div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  onClick={() => handleAppointmentClick(event)}
                  className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                  style={{ backgroundColor: event.color + '20', color: event.color }}
                  title={`${event.participant_name || 'Unknown'} - ${event.start_time ? formatTime(event.start_time.split('T')[1] || '') : 'No time'}`}
                >
                  {event.start_time ? formatTime(event.start_time.split('T')[1] || '') : 'No time'} {event.participant_name || 'Unknown'}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
              )}
            </div>
          </div>
        );
        currentWeek.setDate(currentWeek.getDate() + 1);
      }
      weeks.push(
        <div key={weeks.length} className="grid grid-cols-7">
          {week}
        </div>
      );
    }
    
    return (
      <div className="space-y-0">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-700 border border-gray-200">
              {day}
            </div>
          ))}
        </div>
        {weeks}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      
      const dayEvents = filteredEvents.filter(event => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time).toDateString();
        return eventDate === day.toDateString();
      });
      
      days.push(
        <div key={day.toISOString()} className="border border-gray-200 min-h-[400px]">
          <div className={`p-2 font-medium text-center border-b ${
            day.toDateString() === new Date().toDateString() ? 'bg-blue-100' : 'bg-gray-50'
          }`}>
            <div className="text-sm text-gray-600">
              {day.toLocaleDateString('en-AU', { weekday: 'short' })}
            </div>
            <div className="text-lg">{day.getDate()}</div>
          </div>
          <div className="p-2 space-y-2">
            {dayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => handleAppointmentClick(event)}
                className="p-2 rounded cursor-pointer hover:shadow-md transition-shadow text-sm"
                style={{ backgroundColor: event.color + '20', borderLeft: `4px solid ${event.color}` }}
              >
                <div className="font-medium">{event.start_time ? formatTime(event.start_time.split('T')[1] || '') : 'No time'}</div>
                <div className="text-gray-600">{event.participant_name || 'Unknown participant'}</div>
                <div className="text-gray-500 text-xs">{event.service_type || 'Unknown service'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return <div className="grid grid-cols-7 gap-0">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time).toDateString();
      return eventDate === currentDate.toDateString();
    }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    
    const hours = [];
    for (let hour = 7; hour < 20; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      const slotEvents = dayEvents.filter(event => {
        if (!event.start_time) return false;
        const eventHour = parseInt(event.start_time.split('T')[1]?.split(':')[0] || '0');
        return eventHour === hour;
      });
      
      hours.push(
        <div key={hour} className="border-b border-gray-200 min-h-[60px] flex">
          <div className="w-20 p-2 text-sm text-gray-500 border-r border-gray-200">
            {timeSlot}
          </div>
          <div className="flex-1 p-2 space-y-1">
            {slotEvents.map(event => (
              <div
                key={event.id}
                onClick={() => handleAppointmentClick(event)}
                className="p-2 rounded cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: event.color + '20', borderLeft: `4px solid ${event.color}` }}
              >
                <div className="font-medium">{event.participant_name || 'Unknown participant'}</div>
                <div className="text-sm text-gray-600">
                  {event.start_time ? formatTime(event.start_time.split('T')[1] || '') : 'No start time'} - {event.end_time ? formatTime(event.end_time.split('T')[1] || '') : 'No end time'}
                </div>
                <div className="text-sm text-gray-500">{event.service_type || 'Unknown service'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return <div className="border border-gray-200">{hours}</div>;
  };

  // Loading state
  if (appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (appointmentsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-medium text-red-800">Error Loading Calendar</h3>
          </div>
          <p className="text-red-700 mt-2">{appointmentsError.message}</p>
          <button
            onClick={() => refetchAppointments()}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/scheduling')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div className="border-l border-gray-300 h-6"></div>
          <h1 className="text-3xl font-bold text-gray-800">Calendar View</h1>
          <div className="text-sm text-gray-500">
            {filteredEvents.length} appointment{filteredEvents.length !== 1 ? 's' : ''} found
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchAppointments()}
            disabled={appointmentsLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={appointmentsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/scheduling/appointment/new')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            New Appointment
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {formatDateHeader()}
              </h2>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewType === view
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Worker</label>
                <select
                  value={filters.supportWorker}
                  onChange={(e) => setFilters({...filters, supportWorker: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Workers</option>
                  {supportWorkers.map(worker => (
                    <option key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                <select
                  value={filters.participant}
                  onChange={(e) => setFilters({...filters, participant: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Participants</option>
                  {participants.map(participant => (
                    <option key={participant.id} value={participant.id.toString()}>
                      {participant.first_name} {participant.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <input
                  type="text"
                  value={filters.serviceType}
                  onChange={(e) => setFilters({...filters, serviceType: e.target.value})}
                  placeholder="Filter by service type"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="checked">Checked</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-6">
          <div className="text-sm font-medium text-gray-700">Status Legend:</div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Confirmed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Cancelled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {renderCalendarGrid()}
      </div>

      {/* Appointment Detail Sidebar */}
      {selectedAppointment && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColorForGrid(selectedAppointment.status)}`}></div>
                  <span className="text-sm capitalize">{formatStatus(selectedAppointment.status)}</span>
                </div>
              </div>

              {/* Time */}
              {selectedAppointment.start_time && selectedAppointment.end_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <div className="flex items-center text-gray-900">
                    <Clock size={16} className="mr-2" />
                    <span>
                      {formatTime(selectedAppointment.start_time.split('T')[1] || '')} - {formatTime(selectedAppointment.end_time.split('T')[1] || '')}
                    </span>
                  </div>
                </div>
              )}

              {/* Participant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participant</label>
                <div className="flex items-center text-gray-900">
                  <User size={16} className="mr-2" />
                  <span>{selectedAppointment.participant_name || 'Unknown participant'}</span>
                </div>
                {selectedAppointment.participantInfo && (
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedAppointment.participantInfo.phone_number && <div>Phone: {selectedAppointment.participantInfo.phone_number}</div>}
                    {selectedAppointment.participantInfo.city && selectedAppointment.participantInfo.state && <div>Location: {selectedAppointment.participantInfo.city}, {selectedAppointment.participantInfo.state}</div>}
                  </div>
                )}
              </div>

              {/* Support Worker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Worker</label>
                <div className="flex items-center text-gray-900">
                  <User size={16} className="mr-2" />
                  <span>{selectedAppointment.support_worker_name || 'Unknown worker'}</span>
                </div>
                {selectedAppointment.supportWorkerInfo && (
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedAppointment.supportWorkerInfo.email && <div>Email: {selectedAppointment.supportWorkerInfo.email}</div>}
                    {selectedAppointment.supportWorkerInfo.phone && <div>Phone: {selectedAppointment.supportWorkerInfo.phone}</div>}
                    {selectedAppointment.supportWorkerInfo.skills && selectedAppointment.supportWorkerInfo.skills.length > 0 && <div>Skills: {selectedAppointment.supportWorkerInfo.skills.join(', ')}</div>}
                  </div>
                )}
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <span className="text-gray-900">{selectedAppointment.service_type || 'Unknown service'}</span>
              </div>

              {/* Location */}
              {selectedAppointment.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="flex items-center text-gray-900">
                    <MapPin size={16} className="mr-2" />
                    <span>{selectedAppointment.location}</span>
                  </div>
                </div>
              )}

              {/* Priority */}
              {selectedAppointment.priority && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedAppointment.priority)}`}>
                    {formatStatus(selectedAppointment.priority)}
                  </span>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-6 border-t border-gray-200 space-y-3">
                {/* Status update buttons */}
                {selectedAppointment.status === 'pending' && (
                  <button
                    onClick={() => handleQuickStatusUpdate(selectedAppointment.id, 'confirmed')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Confirm Appointment'}
                  </button>
                )}
                
                {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'pending') && (
                  <button
                    onClick={() => handleQuickStatusUpdate(selectedAppointment.id, 'completed')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Mark Complete'}
                  </button>
                )}

                <button
                  onClick={() => navigate(`/scheduling/appointment/${selectedAppointment.id}/edit`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit Appointment
                </button>
                
                {selectedAppointment.participant_id && (
                  <button
                    onClick={() => navigate(`/participants/${selectedAppointment.participant_id}`)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Participant Profile
                  </button>
                )}

                <button
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                  disabled={deleteAppointmentMutation.isPending}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteAppointmentMutation.isPending ? (
                    'Deleting...'
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Appointment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;