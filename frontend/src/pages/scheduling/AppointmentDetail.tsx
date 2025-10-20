// frontend/src/pages/scheduling/AppointmentDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Bell,
  MessageSquare,
  Award
} from 'lucide-react';
import {
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getParticipantById,
  getSupportWorkerById,
  formatTime,
  formatDate,
  type Appointment,
  type Participant,
  type SupportWorker
} from '../../services/scheduling';
import toast from 'react-hot-toast';

const AppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNotes, setShowNotes] = useState(false);

  // Safe utility functions
  const formatStatus = (status: string | undefined | null) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': 
      case 'checked': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string | undefined | null) => {
    if (!status) return <Clock size={20} className="text-gray-600" />;
    
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle size={20} className="text-green-600" />;
      case 'pending':
      case 'checked': return <Clock size={20} className="text-yellow-600" />;
      case 'cancelled': return <AlertTriangle size={20} className="text-red-600" />;
      case 'completed': return <CheckCircle size={20} className="text-blue-600" />;
      case 'in_progress': return <RefreshCw size={20} className="text-purple-600" />;
      default: return <Clock size={20} className="text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string | undefined | null) => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Query for appointment details
  const { 
    data: appointment, 
    isLoading: appointmentLoading, 
    error: appointmentError,
    refetch: refetchAppointment 
  } = useQuery<Appointment | null>({
    queryKey: ['appointment', id],
    queryFn: () => id ? getAppointmentById(parseInt(id)) : Promise.resolve(null),
    enabled: !!id,
    retry: 2
  });

  // Query for participant details
  const { data: participant } = useQuery<Participant | null>({
    queryKey: ['participant', appointment?.participant_id],
    queryFn: () => appointment?.participant_id ? getParticipantById(appointment.participant_id) : Promise.resolve(null),
    enabled: !!appointment?.participant_id,
    retry: 2
  });

  // Query for support worker details
  const { data: supportWorker } = useQuery<SupportWorker | null>({
    queryKey: ['support-worker', appointment?.support_worker_id],
    queryFn: () => appointment?.support_worker_id ? getSupportWorkerById(appointment.support_worker_id) : Promise.resolve(null),
    enabled: !!appointment?.support_worker_id,
    retry: 2
  });

  // Mutation for updating appointment
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ updates }: { updates: Partial<Appointment> }) =>
      updateAppointment(appointment!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  });

  // Mutation for deleting appointment
  const deleteAppointmentMutation = useMutation({
    mutationFn: () => deleteAppointment(appointment!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted successfully');
      navigate('/scheduling');
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  });

  const handleStatusUpdate = async (newStatus: string) => {
    if (!appointment) return;
    
    try {
      await updateAppointmentMutation.mutateAsync({
        updates: { status: newStatus as any }
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appointment) return;

    const confirmMessage = `Are you sure you want to delete this appointment?

Participant: ${appointment.participant_name || 'Unknown'}
Support Worker: ${appointment.support_worker_name || 'Unknown'}
Date: ${appointment.start_time ? formatDate(appointment.start_time) : 'Unknown'}
Time: ${appointment.start_time && appointment.end_time ? 
  `${formatTime(appointment.start_time.split('T')[1] || '')} - ${formatTime(appointment.end_time.split('T')[1] || '')}` : 
  'Unknown'}

This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      try {
        await deleteAppointmentMutation.mutateAsync();
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  const isToday = () => {
    if (!appointment?.start_time) return false;
    const today = new Date().toISOString().split('T')[0];
    return appointment.start_time.split('T')[0] === today;
  };

  const isUpcoming = () => {
    if (!appointment?.start_time) return false;
    return new Date(appointment.start_time) > new Date();
  };

  const calculateDuration = () => {
    if (!appointment?.start_time || !appointment?.end_time) return '';
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  // Loading state
  if (appointmentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (appointmentError || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Appointment Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The appointment you're looking for doesn't exist or has been removed.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => navigate('/scheduling')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scheduling
            </button>
            <button
              onClick={() => refetchAppointment()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
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
            <div className="flex items-center">
              <button
                onClick={() => navigate('/scheduling')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Scheduling
              </button>
              <div className="border-l border-gray-300 h-6 mx-4"></div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <h1 className="text-xl font-semibold text-gray-900">
                  Appointment #{appointment.id}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetchAppointment()}
                disabled={appointmentLoading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={appointmentLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              
              <button
                onClick={() => navigate(`/scheduling/appointment/${appointment.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>
              
              <button
                onClick={handleDeleteAppointment}
                disabled={deleteAppointmentMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteAppointmentMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleteAppointmentMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`border-b ${
        appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' :
        appointment.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
        appointment.status === 'cancelled' ? 'bg-red-50 border-red-200' :
        appointment.status === 'completed' ? 'bg-blue-50 border-blue-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(appointment.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
                  {formatStatus(appointment.status)}
                </span>
              </div>
              
              {appointment.priority && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(appointment.priority)}`}>
                  {formatStatus(appointment.priority)} Priority
                </span>
              )}
              
              {appointment.recurring && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  Recurring
                </span>
              )}
              
              {isToday() && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  Today
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              Last updated: {appointment.updated_at ? new Date(appointment.updated_at).toLocaleString('en-AU') : 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Appointment Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                  <div className="space-y-2">
                    {appointment.start_time && (
                      <div className="flex items-center text-gray-900">
                        <Calendar size={16} className="mr-2 text-blue-600" />
                        <span>{formatDate(appointment.start_time)}</span>
                      </div>
                    )}
                    {appointment.start_time && appointment.end_time && (
                      <div className="flex items-center text-gray-900">
                        <Clock size={16} className="mr-2 text-green-600" />
                        <span>
                          {formatTime(appointment.start_time.split('T')[1] || '')} - {formatTime(appointment.end_time.split('T')[1] || '')}
                        </span>
                      </div>
                    )}
                    {calculateDuration() && (
                      <div className="text-sm text-gray-600">
                        Duration: {calculateDuration()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                  <div className="text-gray-900">{appointment.service_type || 'Not specified'}</div>
                </div>

                {/* Location */}
                {appointment.location && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <div className="flex items-center text-gray-900">
                      <MapPin size={16} className="mr-2 text-red-600" />
                      <span>{appointment.location}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Type: {appointment.location_type?.replace('_', ' ') || 'Not specified'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Participant Information */}
            {participant && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Participant Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-4">
                      <User size={20} className="mr-3 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {participant.first_name} {participant.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">Participant</p>
                      </div>
                    </div>
                    
                    {participant.phone_number && (
                      <div className="flex items-center mb-2">
                        <Phone size={16} className="mr-2 text-gray-400" />
                        <span className="text-gray-900">{participant.phone_number}</span>
                      </div>
                    )}
                    
                    {participant.email && (
                      <div className="flex items-center mb-2">
                        <Mail size={16} className="mr-2 text-gray-400" />
                        <span className="text-gray-900">{participant.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {participant.street_address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <div className="text-gray-900">
                          <div>{participant.street_address}</div>
                          <div>{participant.city}, {participant.state} {participant.postcode}</div>
                        </div>
                      </div>
                    )}
                    
                    {participant.disability_type && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Disability Type</label>
                        <div className="text-gray-900">{participant.disability_type}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => navigate(`/participants/${participant.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            )}

            {/* Support Worker Information */}
            {supportWorker && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Support Worker Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-4">
                      <User size={20} className="mr-3 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">{supportWorker.name}</h3>
                        <p className="text-sm text-gray-600">{supportWorker.role || 'Support Worker'}</p>
                      </div>
                    </div>
                    
                    {supportWorker.phone && (
                      <div className="flex items-center mb-2">
                        <Phone size={16} className="mr-2 text-gray-400" />
                        <span className="text-gray-900">{supportWorker.phone}</span>
                      </div>
                    )}
                    
                    {supportWorker.email && (
                      <div className="flex items-center mb-2">
                        <Mail size={16} className="mr-2 text-gray-400" />
                        <span className="text-gray-900">{supportWorker.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {supportWorker.skills && supportWorker.skills.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                        <div className="flex flex-wrap gap-1">
                          {supportWorker.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {supportWorker.certifications && supportWorker.certifications.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                        <div className="space-y-1">
                          {supportWorker.certifications.map((cert, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <Award size={14} className="mr-2 text-yellow-500" />
                              {cert}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {supportWorker.performance_metrics && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {Math.round(supportWorker.performance_metrics.completion_rate)}%
                        </div>
                        <div className="text-xs text-gray-500">Completion Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.round(supportWorker.performance_metrics.punctuality_score)}%
                        </div>
                        <div className="text-xs text-gray-500">Punctuality</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {supportWorker.performance_metrics.participant_satisfaction.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">Satisfaction</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600">
                          {supportWorker.performance_metrics.total_hours_this_month}h
                        </div>
                        <div className="text-xs text-gray-500">This Month</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <MessageSquare size={16} />
                    {showNotes ? 'Hide' : 'Show'} Notes
                  </button>
                </div>
                
                {showNotes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {appointment.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Confirm Appointment'}
                  </button>
                )}
                
                {(appointment.status === 'confirmed' && isUpcoming()) && (
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Mark In Progress'}
                  </button>
                )}
                
                {appointment.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Mark Complete'}
                  </button>
                )}
                
                {(appointment.status === 'pending' || appointment.status === 'confirmed') && isUpcoming() && (
                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={updateAppointmentMutation.isPending}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {updateAppointmentMutation.isPending ? 'Updating...' : 'Cancel Appointment'}
                  </button>
                )}
                
                <button
                  onClick={() => navigate(`/scheduling/appointment/${appointment.id}/edit`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit Details
                </button>
                
                <button
                  onClick={() => navigate('/scheduling/appointment/new', { 
                    state: { duplicateFrom: appointment } 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Duplicate Appointment
                </button>
              </div>
            </div>

            {/* Appointment History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">History</h3>
              
              <div className="space-y-3 text-sm">
                {appointment.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">
                      {new Date(appointment.created_at).toLocaleDateString('en-AU')}
                    </span>
                  </div>
                )}
                
                {appointment.updated_at && appointment.updated_at !== appointment.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Modified:</span>
                    <span className="text-gray-900">
                      {new Date(appointment.updated_at).toLocaleDateString('en-AU')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <span className="text-gray-900 capitalize">{formatStatus(appointment.status)}</span>
                </div>
                
                {appointment.recurring && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recurrence:</span>
                    <span className="text-gray-900">{appointment.recurrence_pattern || 'Weekly'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell size={16} className="mr-2" />
                Notifications
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={appointment.send_notifications || false}
                    onChange={(e) => updateAppointmentMutation.mutate({
                      updates: { send_notifications: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Email notifications enabled
                  </label>
                </div>
                
                <p className="text-xs text-gray-500">
                  Participants and support workers will be notified of changes to this appointment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;
