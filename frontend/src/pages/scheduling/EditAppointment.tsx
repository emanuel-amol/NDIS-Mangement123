// frontend/src/pages/scheduling/EditAppointment.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Calendar, AlertTriangle, Save } from 'lucide-react';
import { AppointmentForm } from '../../components/scheduling/AppointmentForm';
import { 
  getAppointmentById, 
  getParticipants, 
  getSupportWorkers,
  updateAppointment,
  deleteAppointment,
  type Appointment,
  type Participant as ParticipantType,
  type SupportWorker
} from '../../services/scheduling';

interface Participant {
  id: number;
  name: string;
  phone: string;
  address: string;
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

export default function EditAppointment() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
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

      // Load appointment details using service function
      const appointmentData = await getAppointmentById(parseInt(id!));
      
      if (!appointmentData) {
        setError('Appointment not found');
        return;
      }

      setAppointment(appointmentData);

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
      // Use service functions
      const [participantData, workersData] = await Promise.all([
        getParticipants(),
        getSupportWorkers()
      ]);

      setParticipants(participantData.map((p: ParticipantType) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        phone: p.phone_number || '',
        address: p.city && p.state ? `${p.city}, ${p.state}` : ''
      })));

      setSupportWorkers(workersData);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const handleUpdate = async (appointmentData: any) => {
    try {
      console.log('Updating appointment:', appointmentData);
      
      await updateAppointment(parseInt(id!), appointmentData);
      
      alert('Appointment updated successfully!');
      navigate(`/scheduling/appointment/${id}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert(`Error updating appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;

    const participantName = participants.find(p => p.id === appointment.participant_id)?.name || 'Unknown';
    const workerName = supportWorkers.find(w => w.id === appointment.support_worker_id)?.name || 'Unknown';

    const confirmMessage = `Are you sure you want to delete this appointment?

Participant: ${participantName}
Support Worker: ${workerName}
Date: ${new Date(appointment.start_time).toLocaleDateString('en-AU')}
Time: ${new Date(appointment.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}

This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAppointment(parseInt(id!));
      alert('Appointment deleted successfully');
      navigate('/scheduling');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert(`Error deleting appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    navigate('/scheduling');
  };

  const handleDuplicate = () => {
    if (!appointment) return;
    
    const duplicateData = {
      participant_id: appointment.participant_id,
      support_worker_id: appointment.support_worker_id,
      service_type: appointment.service_type,
      location: appointment.location,
      location_type: appointment.location_type,
      priority: appointment.priority,
      recurring: appointment.recurring,
      recurrence_pattern: appointment.recurrence_pattern,
      notes: (appointment.notes || '') + ' (Duplicate)',
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
              >
                <Save size={16} />
                Duplicate
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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
              
              {appointment.priority && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  appointment.priority === 'high' ? 'bg-red-100 text-red-800' :
                  appointment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {appointment.priority.charAt(0).toUpperCase() + appointment.priority.slice(1)} Priority
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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