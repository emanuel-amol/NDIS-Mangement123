// frontend/src/pages/scheduling/AppointmentDetail.tsx - FIXED
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Phone, 
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface AppointmentDetails {
  id: number;
  participant_id: number;
  participant_name: string;
  participant_phone: string;
  support_worker_id: number;
  support_worker_name: string;
  support_worker_phone: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  location_type: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function AppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAppointment();
    }
  }, [id]);

  const loadAppointment = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
      } else {
        console.error('Failed to load appointment:', response.status);
        setAppointment(null);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (newStatus: string) => {
    if (!appointment) return;

    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAppointment(prev => prev ? { ...prev, status: newStatus as any } : null);
        alert(`Appointment ${newStatus} successfully`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Error updating appointment status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-600" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-600" size={20} />;
      case 'completed':
        return <CheckCircle className="text-blue-600" size={20} />;
      default:
        return <AlertCircle className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // FIXED: Ensure duration calculation returns a string
  const getDuration = () => {
    if (!appointment) return '';
    try {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Round to 1 decimal place and ensure it's a string
      const roundedHours = Math.round(hours * 10) / 10;
      return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'Unknown duration';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Appointment Not Found</h2>
          <button
            onClick={() => navigate('/scheduling')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to Scheduling
          </button>
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
            
            <button
              onClick={() => navigate(`/scheduling/appointment/${appointment.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    <span className="ml-2">{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(appointment.priority)}`}>
                    {appointment.priority.charAt(0).toUpperCase() + appointment.priority.slice(1)} Priority
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="text-gray-400 mt-1" size={20} />
                    <div>
                      <h3 className="font-medium text-gray-900">Date & Time</h3>
                      <p className="text-gray-600">{formatDateTime(appointment.start_time)}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)} ({getDuration()})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="text-gray-400 mt-1" size={20} />
                    <div>
                      <h3 className="font-medium text-gray-900">Service Type</h3>
                      <p className="text-gray-600">{appointment.service_type}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={20} />
                    <div>
                      <h3 className="font-medium text-gray-900">Location</h3>
                      <p className="text-gray-600">
                        {typeof appointment.location === 'string' 
                          ? appointment.location 
                          : appointment.location?.address || 'Location not specified'
                        }
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {appointment.location_type?.replace('_', ' ') || 'Visit'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </div>

            {/* Status Management */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h2>
              <div className="flex gap-3">
                {appointment.status !== 'confirmed' && (
                  <button
                    onClick={() => updateAppointmentStatus('confirmed')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Confirm
                  </button>
                )}
                
                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                  <button
                    onClick={() => updateAppointmentStatus('completed')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Mark Complete
                  </button>
                )}
                
                {appointment.status !== 'cancelled' && (
                  <button
                    onClick={() => updateAppointmentStatus('cancelled')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={16} />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participant Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{appointment.participant_name}</h4>
                    <p className="text-sm text-gray-500">Participant</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone size={16} />
                  <span>{appointment.participant_phone}</span>
                </div>
                
                <div className="pt-3">
                  <button
                    onClick={() => navigate(`/participants/${appointment.participant_id}`)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Full Profile →
                  </button>
                </div>
              </div>
            </div>

            {/* Support Worker Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Worker</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{appointment.support_worker_name}</h4>
                    <p className="text-sm text-gray-500">Support Worker</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone size={16} />
                    <span>{appointment.support_worker_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">History</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600 mt-1">
                    {formatDateTime(appointment.created_at)}
                  </p>
                </div>
                
                {appointment.updated_at && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Last Updated:</span>
                    <p className="text-gray-600 mt-1">
                      {formatDateTime(appointment.updated_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}