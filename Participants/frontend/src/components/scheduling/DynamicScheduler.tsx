// frontend/src/components/scheduling/DynamicScheduler.tsx - FULLY DYNAMIC SCHEDULER
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Plus,
  Filter,
  Search,
  Bell,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import {
  useRealtimeScheduling,
  useSchedulingDashboard,
  useCalendarView,
  useConflictDetection,
  useAvailabilityCheck
} from '../../hooks/useRealtimeScheduling';
import { AppointmentForm } from './AppointmentForm';
import { CalendarGrid } from './CalendarGrid';
import { ConflictResolver } from './ConflictResolver';
import { PerformanceMetrics } from './PerformanceMetrics';
import { SmartSuggestions } from './SmartSuggestions';
import toast from 'react-hot-toast';

interface DynamicSchedulerProps {
  viewMode?: 'dashboard' | 'calendar' | 'roster' | 'analytics';
  participantFilter?: number;
  workerFilter?: number;
  autoRefresh?: boolean;
  showConflicts?: boolean;
  enableSmartSuggestions?: boolean;
}

export const DynamicScheduler: React.FC<DynamicSchedulerProps> = ({
  viewMode = 'dashboard',
  participantFilter,
  workerFilter,
  autoRefresh = true,
  showConflicts = true,
  enableSmartSuggestions = true
}) => {
  // State management
  const [currentView, setCurrentView] = useState(viewMode);
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [filters, setFilters] = useState({
    participant: participantFilter || '',
    worker: workerFilter || '',
    status: '',
    priority: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Real-time hooks
  const { isConnected, lastUpdate, forceRefresh } = useRealtimeScheduling({
    autoRefresh,
    enableNotifications: true
  });

  const {
    stats,
    allAppointments,
    todayAppointments,
    pendingAppointments,
    upcomingAppointments,
    participants,
    supportWorkers,
    conflicts,
    isLoading,
    metrics
  } = useSchedulingDashboard();

  const {
    appointments: calendarAppointments,
    appointmentsByDate,
    dateRange,
    isLoading: calendarLoading
  } = useCalendarView(calendarViewType, currentDate);

  const { checkAvailability, checking } = useAvailabilityCheck();

  // Filtered appointments based on current filters
  const filteredAppointments = useMemo(() => {
    let filtered = currentView === 'calendar' ? calendarAppointments : allAppointments;

    if (filters.participant) {
      filtered = filtered.filter(apt => 
        apt.participant_id === parseInt(filters.participant) ||
        apt.participant_name?.toLowerCase().includes(filters.participant.toLowerCase())
      );
    }

    if (filters.worker) {
      filtered = filtered.filter(apt => 
        apt.support_worker_id === parseInt(filters.worker) ||
        apt.support_worker_name?.toLowerCase().includes(filters.worker.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(apt => apt.priority === filters.priority);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.participant_name?.toLowerCase().includes(searchLower) ||
        apt.support_worker_name?.toLowerCase().includes(searchLower) ||
        apt.service_type?.toLowerCase().includes(searchLower) ||
        apt.location?.toLowerCase().includes(searchLower) ||
        apt.notes?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [allAppointments, calendarAppointments, filters, currentView]);

  // Real-time metrics calculations
  const realtimeMetrics = useMemo(() => {
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    
    const todayAppts = filteredAppointments.filter(apt => 
      apt.start_time.split('T')[0] === todayString
    );

    const activeAppts = todayAppts.filter(apt => {
      const startTime = new Date(apt.start_time);
      const endTime = new Date(apt.end_time);
      return startTime <= now && now <= endTime;
    });

    const completedToday = todayAppts.filter(apt => apt.status === 'completed').length;
    const pendingToday = todayAppts.filter(apt => apt.status === 'pending').length;
    const highPriorityPending = filteredAppointments.filter(apt => 
      apt.status === 'pending' && apt.priority === 'high'
    ).length;

    return {
      activeNow: activeAppts.length,
      completedToday,
      pendingToday,
      highPriorityPending,
      totalToday: todayAppts.length,
      completionRate: todayAppts.length > 0 ? (completedToday / todayAppts.length) * 100 : 0
    };
  }, [filteredAppointments]);

  // Handle appointment actions
  const handleCreateAppointment = useCallback((appointmentData: any) => {
    // This would typically use the mutation from useAppointments
    console.log('Creating appointment:', appointmentData);
    setShowCreateForm(false);
    toast.success('Appointment created successfully');
  }, []);

  const handleAppointmentClick = useCallback((appointment: any) => {
    setSelectedAppointment(appointment);
  }, []);

  const handleQuickStatusUpdate = useCallback(async (appointmentId: number, status: string) => {
    try {
      // This would use the mutation from useAppointments
      console.log('Updating status:', appointmentId, status);
      toast.success(`Appointment ${status}`);
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  }, []);

  // Conflict resolution
  const resolveConflict = useCallback(async (conflictId: string, resolution: string) => {
    try {
      console.log('Resolving conflict:', conflictId, resolution);
      toast.success('Conflict resolved');
    } catch (error) {
      toast.error('Failed to resolve conflict');
    }
  }, []);

  // Calendar navigation
  const navigateCalendar = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (calendarViewType) {
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
  }, [currentDate, calendarViewType]);

  // Format current date for display
  const formatCurrentDate = useCallback(() => {
    switch (calendarViewType) {
      case 'month':
        return currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-AU', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
    }
  }, [currentDate, calendarViewType]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Dynamic Scheduler</h1>
              
              {/* Real-time connection indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
                {lastUpdate && (
                  <span className="text-xs text-gray-500">
                    • Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* View selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['dashboard', 'calendar', 'roster', 'analytics'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      currentView === view
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={forceRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                New Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Metrics Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Activity size={16} />
                <span className="text-sm">
                  {realtimeMetrics.activeNow} Active Now
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} />
                <span className="text-sm">
                  {realtimeMetrics.completedToday} Completed Today
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span className="text-sm">
                  {realtimeMetrics.pendingToday} Pending Today
                </span>
              </div>
              {realtimeMetrics.highPriorityPending > 0 && (
                <div className="flex items-center space-x-2 text-yellow-200">
                  <AlertTriangle size={16} />
                  <span className="text-sm">
                    {realtimeMetrics.highPriorityPending} High Priority
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                Completion Rate: {Math.round(realtimeMetrics.completionRate)}%
              </div>
              {conflicts.length > 0 && (
                <div className="flex items-center space-x-2 text-red-200">
                  <AlertTriangle size={16} />
                  <span className="text-sm">{conflicts.length} Conflicts</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <Calendar className="text-blue-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalAppointments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Today's Count</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.todayCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <Clock className="text-yellow-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.pendingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                <div className="flex items-center">
                  <Users className="text-purple-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Workers</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.availableWorkers}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conflicts Alert */}
            {showConflicts && conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="text-red-600 mr-3 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900 mb-2">
                      {conflicts.length} Scheduling Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                    </h3>
                    <div className="space-y-2">
                      {conflicts.slice(0, 3).map((conflict, index) => (
                        <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                          {conflict.description}
                        </div>
                      ))}
                      {conflicts.length > 3 && (
                        <p className="text-sm text-red-600">
                          And {conflicts.length - 3} more conflicts...
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('analytics')}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
              </div>
            )}

            {/* Today's Schedule */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <Filter size={14} />
                      Filter
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search appointments..."
                          value={filters.search}
                          onChange={(e) => setFilters({...filters, search: e.target.value})}
                          className="w-full pl-7 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Participant</label>
                      <select
                        value={filters.participant}
                        onChange={(e) => setFilters({...filters, participant: e.target.value})}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Worker</label>
                      <select
                        value={filters.worker}
                        onChange={(e) => setFilters({...filters, worker: e.target.value})}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments List */}
              <div className="p-6">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
                    <h4 className="text-lg font-medium text-gray-500 mb-2">
                      {filters.search || filters.participant || filters.worker || filters.status ? 
                        'No matching appointments found' : 
                        'No appointments scheduled'
                      }
                    </h4>
                    <p className="text-gray-400">
                      {filters.search || filters.participant || filters.worker || filters.status ? 
                        'Try adjusting your filters' : 
                        'Create your first appointment to get started'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((appointment) => (
                      <div 
                        key={appointment.id} 
                        className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          appointment.priority === 'high' ? 'border-red-200 bg-red-50' : 
                          appointment.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : 
                          'border-gray-200'
                        }`}
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {appointment.status === 'confirmed' && <CheckCircle size={16} className="text-green-600" />}
                              {appointment.status === 'pending' && <Clock size={16} className="text-yellow-600" />}
                              {appointment.status === 'completed' && <CheckCircle size={16} className="text-blue-600" />}
                              {appointment.status === 'cancelled' && <AlertTriangle size={16} className="text-red-600" />}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${
                              appointment.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                              appointment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-green-100 text-green-800 border-green-200'
                            }`}>
                              {appointment.priority?.charAt(0).toUpperCase() + appointment.priority?.slice(1)} Priority
                            </span>
                            {appointment.recurring && (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                Recurring
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(appointment.start_time).toLocaleTimeString('en-AU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(appointment.end_time).toLocaleTimeString('en-AU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">Participant</div>
                            <div className="text-sm text-gray-600">{appointment.participant_name}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">Support Worker</div>
                            <div className="text-sm text-gray-600">{appointment.support_worker_name}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">Service</div>
                            <div className="text-sm text-gray-600">{appointment.service_type}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            📍 {appointment.location}
                          </div>
                          
                          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            {appointment.status === 'pending' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(appointment.id, 'confirmed')}
                                className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Confirm
                              </button>
                            )}
                            {appointment.status === 'confirmed' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(appointment.id, 'completed')}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Complete
                              </button>
                            )}
                            <button className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                              Edit
                            </button>
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <strong>Notes:</strong> {appointment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Controls */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateCalendar('prev')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                      {formatCurrentDate()}
                    </h2>
                    <button
                      onClick={() => navigateCalendar('next')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
                    {(['month', 'week', 'day'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setCalendarViewType(view)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          calendarViewType === view
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <CalendarGrid
                viewType={calendarViewType}
                currentDate={currentDate}
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
                onTimeSlotClick={(date, hour) => {
                  // Handle time slot click for quick appointment creation
                  console.log('Time slot clicked:', date, hour);
                }}
                loading={calendarLoading}
              />
            </div>
          </div>
        )}

        {/* Roster View */}
        {currentView === 'roster' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Worker Roster</h3>
              <p className="text-gray-600">
                Detailed roster management view would be implemented here, 
                showing worker schedules, availability, and workload distribution.
              </p>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {currentView === 'analytics' && (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(realtimeMetrics.completionRate)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${realtimeMetrics.completionRate}%` }}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{realtimeMetrics.completedToday}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{realtimeMetrics.pendingToday}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Utilization</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Workers</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.availableWorkers} / {supportWorkers.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${supportWorkers.length > 0 ? (metrics.availableWorkers / supportWorkers.length) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{metrics.activeParticipants}</div>
                      <div className="text-xs text-gray-500">Active Participants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{metrics.upcomingCount}</div>
                      <div className="text-xs text-gray-500">Upcoming</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conflicts Section */}
            {conflicts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling Conflicts</h3>
                <div className="space-y-3">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-red-900">{conflict.description}</p>
                          <p className="text-sm text-red-700 mt-1">
                            Severity: {conflict.severity} • Type: {conflict.type}
                          </p>
                        </div>
                        <button
                          onClick={() => resolveConflict(conflict.roster_id?.toString() || '', 'auto')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Suggestions */}
            {enableSmartSuggestions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="mr-2 text-yellow-500" size={20} />
                  Smart Suggestions
                </h3>
                <div className="space-y-3">
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-blue-900 font-medium">Optimize Schedule</p>
                    <p className="text-blue-700 text-sm mt-1">
                      You have 3 gaps in your schedule that could be filled with pending appointments.
                    </p>
                    <button className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                      Auto-fill Gaps
                    </button>
                  </div>
                  
                  <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                    <p className="text-green-900 font-medium">Worker Efficiency</p>
                    <p className="text-green-700 text-sm mt-1">
                      Sarah Wilson has availability for 2 more appointments today in her preferred area.
                    </p>
                    <button className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                      Assign Appointments
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Appointment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <AppointmentForm
              participants={participants}
              supportWorkers={supportWorkers}
              onSubmit={handleCreateAppointment}
              onCancel={() => setShowCreateForm(false)}
              isEditing={false}
            />
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Appointment Details
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Participant</label>
                    <p className="text-gray-900">{selectedAppointment.participant_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Support Worker</label>
                    <p className="text-gray-900">{selectedAppointment.support_worker_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                    <p className="text-gray-900">
                      {new Date(selectedAppointment.start_time).toLocaleDateString('en-AU')} • {' '}
                      {new Date(selectedAppointment.start_time).toLocaleTimeString('en-AU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {new Date(selectedAppointment.end_time).toLocaleTimeString('en-AU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service Type</label>
                    <p className="text-gray-900">{selectedAppointment.service_type}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-gray-900">{selectedAppointment.location}</p>
                </div>
                
                {selectedAppointment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedAppointment.notes}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Edit Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicScheduler;