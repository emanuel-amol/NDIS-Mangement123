// frontend/src/pages/scheduling/EditAppointment.tsx - COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Calendar, AlertTriangle, Save } from 'lucide-react';
import { AppointmentForm } from '../../components/scheduling/AppointmentForm';

interface Participant {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  available: boolean;
}

interface AppointmentData {
  id: number;
  participant_id: number;
  support_worker_id: number;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  location_type: 'home_visit' | 'community' | 'facility' | 'virtual';
  priority: 'high' | 'medium' | 'low';
  status: 'confirmed' | 'pending' | 'cancelled';
  recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end?: string;
  notes?: string;
  send_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function EditAppointment() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [supportWorkers, setSupportWorkers] = useState<SupportWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAppointmentData();
    }
  }, [id]);

  const loadAppointmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load appointment details
      const appointmentRes = await fetch(`${API_BASE_URL}/appointments/${id}`);
      
      if (appointmentRes.ok) {
        const appointmentData = await appointmentRes.json();
        setAppointment(appointmentData);
      } else if (appointmentRes.status === 404) {
        setError('Appointment not found');
        return;
      } else {
        // Mock appointment data for development
        const mockAppointment: AppointmentData = {
          id: parseInt(id!),
          participant_id: 1,
          support_worker_id: 1,
          start_time: '2025-01-20T09:00',
          end_time: '2025-01-20T11:00',
          service_type: 'Personal Care',
          location: '123 Main St, Melbourne VIC',
          location_type: 'home_visit',
          priority: 'medium',
          status: 'confirmed',
          recurring: false,
          notes: 'Regular morning routine assistance',
          send_notifications: true,
          created_at: '2025-01-15T10:30:00Z',
          updated_at: '2025-01-16T14:20:00Z'
        };
        setAppointment(mockAppointment);
      }

      // Load participants and support workers
      await loadFormData();

    } catch (error) {
      console.error('Error loading appointment:', error);
      setError('Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      // Load participants
      const participantsRes = await fetch(`${API_BASE_URL}/participants`);
      if (participantsRes.ok) {
        const participantData = await participantsRes.json();
        setParticipants(participantData.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          phone: p.phone_number,
          address: `${p.city}, ${p.state}`
        })));
      } else {
        // Mock participants data
        setParticipants([
          { id: 1, name: 'Jordan Smith', phone: '0412 345 678', address: 'Melbourne, VIC' },
          { id: 2, name: 'Amrita Kumar', phone: '0423 456 789', address: 'Sydney, NSW' },
          { id: 3, name: 'Linh Nguyen', phone: '0434 567 890', address: 'Brisbane, QLD' }
        ]);
      }

      // Load support workers
      const workersRes = await fetch(`${API_BASE_URL}/support-workers`);
      if (workersRes.ok) {
        const workersData = await workersRes.json();
        setSupportWorkers(workersData);
      } else {
        // Mock support workers data
        setSupportWorkers([
          {
            id: 1,
            name: 'Sarah Wilson',
            email: 'sarah.wilson@example.com',
            phone: '0498 765 432',
            skills: ['Personal Care', 'Community Access'],
            available: true
          },
          {
            id: 2,
            name: 'Michael Chen',
            email: 'michael.chen@example.com',
            phone: '0487 654 321',
            skills: ['Domestic Assistance', 'Transport'],
            available: true
          },
          {
            id: 3,
            name: 'Emma Thompson',
            email: 'emma.thompson@example.com',
            phone: '0476 543 210',
            skills: ['Social Participation', 'Skill Development'],
            available: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      // Set default empty arrays to prevent crashes
      if (participants.length === 0) setParticipants([]);
      if (supportWorkers.length === 0) setSupportWorkers([]);
    }
  };

  const handleUpdate = async (appointmentData: AppointmentData) => {
    try {
      console.log('Updating appointment:', appointmentData);
      
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...appointmentData,
          updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Appointment updated successfully!');
        navigate(`/scheduling/appointment/${id}`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert(`Error updating appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;

    // Show confirmation dialog with appointment details
    const confirmMessage = `Are you sure you want to delete this appointment?

Participant: ${participants.find(p => p.id === appointment.participant_id)?.name || 'Unknown'}
Support Worker: ${supportWorkers.find(w => w.id === appointment.support_worker_id)?.name || 'Unknown'}
Date: ${new Date(appointment.start_time).toLocaleDateString('en-AU')}
Time: ${new Date(appointment.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}

This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Appointment deleted successfully');
        navigate('/scheduling');
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete appointment');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert(`Error deleting appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = false; // You could implement change detection here
    
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        navigate('/scheduling');
      }
    } else {
      navigate('/scheduling');
    }
  };

  const handleDuplicate = () => {
    if (!appointment) return;
    
    // Navigate to new appointment form with pre-filled data
    const duplicateData = {
      participant_id: appointment.participant_id,
      support_worker_id: appointment.support_worker_id,
      service_type: appointment.service_type,
      location: appointment.location,
      location_type: appointment.location_type,
      priority: appointment.priority,
      recurring: appointment.recurring,
      recurrence_pattern: appointment.recurrence_pattern,
      notes: appointment.notes + ' (Duplicate)',
      send_notifications: appointment.send_notifications
    };

    const params = new URLSearchParams();
    Object.entries(duplicateData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    navigate(`/scheduling/appointment/new?${params.toString()}`);
  };

  // Loading state
  if (loading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error}
          </h2>
          <p className="text-gray-600 mb-6">
            The appointment could not be loaded. Please check if the appointment exists or try again.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => navigate('/scheduling')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scheduling
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Appointment not found
  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Appointment Not Found</h2>
          <p className="text-gray-600 mb-6">
            The requested appointment could not be found. It may have been deleted or moved.
          </p>
          <button
            onClick={() => navigate('/scheduling')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
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
                  Edit Appointment #{appointment.id}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                title="Create a duplicate of this appointment"
              >
                <Save size={16} />
                Duplicate
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                title="Delete this appointment permanently"
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Information Banner */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-blue-800">
              <div>
                <span className="font-medium">Participant:</span> {participants.find(p => p.id === appointment.participant_id)?.name || 'Loading...'}
              </div>
              <div>
                <span className="font-medium">Support Worker:</span> {supportWorkers.find(w => w.id === appointment.support_worker_id)?.name || 'Loading...'}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(appointment.start_time).toLocaleDateString('en-AU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div>
                <span className="font-medium">Time:</span> {new Date(appointment.start_time).toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - {new Date(appointment.end_time).toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                appointment.priority === 'high' ? 'bg-red-100 text-red-800' :
                appointment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {appointment.priority.charAt(0).toUpperCase() + appointment.priority.slice(1)} Priority
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Last Updated Info */}
        {appointment.updated_at && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Last updated:</strong> {new Date(appointment.updated_at).toLocaleString('en-AU')}
              {appointment.created_at && appointment.updated_at !== appointment.created_at && (
                <span className="ml-2">
                  (Created: {new Date(appointment.created_at).toLocaleString('en-AU')})
                </span>
              )}
            </p>
          </div>
        )}

        <AppointmentForm
          appointment={appointment}
          participants={participants}
          supportWorkers={supportWorkers}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
          isEditing={true}
        />
      </div>
    </div>
  );
}