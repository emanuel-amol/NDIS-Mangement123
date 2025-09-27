// Fixed SchedulingDashboard.tsx with safe status handling

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Filter,
  AlertTriangle,
  CheckCircle,
  User,
  CalendarDays,
  MapPin,
  Bell,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

// Import the fixed utility functions
import {
  formatStatus,
  getStatusColor,
  getStatusIcon,
  getPriorityColor,
  isToday,
  isUpcoming,
  parseAppointmentData,
  handleApiError,
  type AppointmentStatus,
  type PriorityLevel
} from '../utils/statusUtils'; // Adjust path as needed

import {
  getScheduleStats,
  getAppointments,
  updateAppointment,
  deleteAppointment,
  formatTime,
  formatDate,
  type Appointment,
  type ScheduleStats
} from '../../services/scheduling';
import toast from 'react-hot-toast';

const SchedulingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'pending'>('all');

  // Get current date ranges for filtering
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));

  // Query for schedule statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<ScheduleStats>({
    queryKey: ['schedule-stats'],
    queryFn: getScheduleStats,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  });

  // Query for appointments based on filter
  const getAppointmentParams = () => {
    switch (filterType) {
      case 'today':
        return { start_date: today, end_date: today };
      case 'week':
        return { 
          start_date: weekStart.toISOString().split('T')[0], 
          end_date: weekEnd.toISOString().split('T')[0] 
        };
      case 'pending':
        return { status: 'pending' };
      default:
        return { 
          start_date: today, 
          end_date: weekEnd.toISOString().split('T')[0] 
        };
    }
  };

  const { 
    data: rawAppointments = [], 
    isLoading: appointmentsLoading, 
    error: appointmentsError,
    refetch: refetchAppointments 
  } = useQuery<Appointment[]>({
    queryKey: ['appointments', filterType, searchTerm],
    queryFn: () => getAppointments(getAppointmentParams()),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 1 * 60 * 1000
  });

  // Parse and sanitize appointments data
  const appointments = rawAppointments.map(parseAppointmentData);

  // Mutation for updating appointment status
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Appointment> }) =>
      updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      console.error('Error updating appointment:', error);
      toast.error(`Failed to update appointment: ${errorMessage}`);
    }
  });

  // Filter appointments based on search term
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.participant_name.toLowerCase().includes(searchLower) ||
      appointment.support_worker_name.toLowerCase().includes(searchLower) ||
      appointment.service_type.toLowerCase().includes(searchLower) ||
      appointment.location.toLowerCase().includes(searchLower)
    );
  });

  const handleQuickStatusUpdate = async (appointmentId: number, status: AppointmentStatus) => {
    if (!status) return;
    
    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        updates: { status: status as any }
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  // Loading state
  if (statsLoading || appointmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (statsError || appointmentsError) {
    const errorMessage = handleApiError(statsError || appointmentsError);
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-medium text-red-800">Error Loading Scheduling Data</h3>
          </div>
          <p className="text-red-700 mt-2">{errorMessage}</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
              queryClient.invalidateQueries({ queryKey: ['appointments'] });
            }}
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Scheduling Dashboard</h1>
          <p className="text-gray-600">
            Manage appointments, rosters, and support worker schedules
            {stats && (
              <span className="ml-2 text-sm text-blue-600">
                • {stats.today_appointments || 0} appointments today
                • {stats.pending_requests || 0} pending requests
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetchAppointments()}
            disabled={appointmentsLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={20} className={appointmentsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/scheduling/calendar')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar size={20} />
            Calendar View
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

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <Calendar className="text-blue-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_appointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <CalendarDays className="text-green-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today_appointments || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center">
              <Clock className="text-yellow-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_requests || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <Users className="text-purple-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Support Workers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.support_workers_scheduled || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
            <div className="flex items-center">
              <User className="text-indigo-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.participants_scheduled || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500">
            <div className="flex items-center">
              <TrendingUp className="text-teal-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Weekly Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.this_week_hours || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search appointments by participant, support worker, or service type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Upcoming</option>
              <option value="today">Today Only</option>
              <option value="week">This Week</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {filterType === 'today' ? 'Today\'s Appointments' :
                 filterType === 'week' ? 'This Week\'s Appointments' :
                 filterType === 'pending' ? 'Pending Appointments' :
                 'Upcoming Appointments'}
              </h3>
              <p className="text-sm text-gray-600">
                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
                {searchTerm && ` for "${searchTerm}"`}
              </p>
            </div>
            {filteredAppointments.length > 0 && (
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
              <h4 className="text-lg font-medium text-gray-500 mb-2">
                {searchTerm ? 'No matching appointments found' : 'No appointments found'}
              </h4>
              <p className="text-gray-400">
                {searchTerm ? 'Try adjusting your search terms' : 'All appointments are up to date'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                    appointment.priority === 'high' ? 'border-red-200 bg-red-50' : 
                    isToday(appointment.start_time) ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => navigate(`/scheduling/appointment/${appointment.id}`)}
                >
                  {/* Today indicator */}
                  {isToday(appointment.start_time) && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Today
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(appointment.status as AppointmentStatus)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status as AppointmentStatus)}`}>
                          {formatStatus(appointment.status as AppointmentStatus)}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(appointment.priority as PriorityLevel)}`}>
                        {formatStatus(appointment.priority as AppointmentStatus)} Priority
                      </span>
                      {appointment.recurring && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.start_time ? formatDate(appointment.start_time) : 'No date'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Participant</div>
                      <div className="text-sm text-gray-600">{appointment.participant_name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Support Worker</div>
                      <div className="text-sm text-gray-600">{appointment.support_worker_name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Time</div>
                      <div className="text-sm text-gray-600">
                        {appointment.start_time && appointment.end_time ? (
                          `${formatTime(appointment.start_time.split('T')[1] || '')} - ${formatTime(appointment.end_time.split('T')[1] || '')}`
                        ) : 'Time not set'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Service</div>
                      <div className="text-sm text-gray-600">{appointment.service_type}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={14} className="mr-1" />
                      {appointment.location}
                    </div>
                    
                    {/* Quick action buttons */}
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => handleQuickStatusUpdate(appointment.id, 'confirmed')}
                          disabled={updateAppointmentMutation.isPending}
                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {(appointment.status === 'confirmed' || appointment.status === 'pending') && isUpcoming(appointment.start_time) && (
                        <button
                          onClick={() => handleQuickStatusUpdate(appointment.id, 'cancelled')}
                          disabled={updateAppointmentMutation.isPending}
                          className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/scheduling/appointment/${appointment.id}/edit`)}
                        className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
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
  );
};

export default SchedulingDashboard;