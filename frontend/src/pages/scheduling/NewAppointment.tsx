// frontend/src/pages/scheduling/NewAppointment.tsx - FIXED BACKEND INTEGRATION
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Calendar, User, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { 
  createRoster, 
  getParticipants, 
  getSupportWorkers,
  type RosterCreate,
  type Participant, 
  type SupportWorker 
} from '../../services/scheduling';
import toast from 'react-hot-toast';

interface AppointmentFormData {
  participant_id: number;
  worker_id: number;
  support_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  is_recurring: boolean;
  recurrence_end_date?: string;
  send_notifications: boolean;
}

export default function NewAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<AppointmentFormData>({
    participant_id: parseInt(searchParams.get('participant_id') || '0'),
    worker_id: parseInt(searchParams.get('support_worker_id') || '0'),
    support_date: searchParams.get('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0],
    start_time: searchParams.get('start_time')?.split('T')[1]?.substring(0, 5) || '09:00',
    end_time: '17:00',
    service_type: searchParams.get('service_type') || 'Personal Care',
    location: '',
    priority: 'medium',
    notes: '',
    is_recurring: false,
    send_notifications: true
  });

  // Query for participants
  const { data: participants = [], isLoading: participantsLoading, error: participantsError } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: getParticipants,
    retry: 2
  });

  // Query for support workers  
  const { data: supportWorkers = [], isLoading: workersLoading, error: workersError } = useQuery<SupportWorker[]>({
    queryKey: ['support-workers'],
    queryFn: getSupportWorkers,
    retry: 2
  });

  // Mutation for creating appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      // Convert appointment data to roster format
      const rosterData: RosterCreate = {
        worker_id: data.worker_id,
        support_date: data.support_date,
        start_time: data.start_time + ':00',
        end_time: data.end_time + ':00',
        eligibility: data.service_type,
        notes: data.notes,
        status: 'checked', // Default status for new appointments
        is_group_support: false,
        participants: [{ participant_id: data.participant_id }],
        tasks: [{ title: `${data.service_type} session`, is_done: false }]
      };

      // Add recurrence if specified
      if (data.is_recurring && data.recurrence_end_date) {
        rosterData.recurrences = [{
          pattern_type: 'weekly',
          interval: 1,
          by_weekdays: [new Date(data.support_date).getDay()],
          start_date: data.support_date,
          end_date: data.recurrence_end_date
        }];
      }

      return createRoster(rosterData);
    },
    onSuccess: (result) => {
      toast.success('Appointment created successfully!');
      navigate(`/scheduling/appointment/${result.id}`);
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      toast.error(`Failed to create appointment: ${error.message || 'Unknown error'}`);
    }
  });

  // Auto-populate location when participant is selected
  useEffect(() => {
    if (formData.participant_id && participants.length > 0) {
      const participant = participants.find(p => p.id === formData.participant_id);
      if (participant && !formData.location) {
        const location = `${participant.street_address || ''}, ${participant.city || ''}, ${participant.state || ''}`.trim().replace(/^,\s*/, '') || 'Home Visit';
        setFormData(prev => ({ ...prev, location }));
      }
    }
  }, [formData.participant_id, participants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.participant_id) {
      toast.error('Please select a participant');
      return;
    }
    if (!formData.worker_id) {
      toast.error('Please select a support worker');
      return;
    }
    if (!formData.support_date) {
      toast.error('Please select a date');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('Please select start and end times');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }
    if (formData.is_recurring && !formData.recurrence_end_date) {
      toast.error('Please select an end date for recurring appointments');
      return;
    }

    try {
      await createAppointmentMutation.mutateAsync(formData);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`1970-01-01T${formData.start_time}:00`);
      const end = new Date(`1970-01-01T${formData.end_time}:00`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : '';
    }
    return '';
  };

  // Loading state
  if (participantsLoading || workersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  // Error state for critical data
  if (participantsError && workersError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Form Data</h2>
          <p className="text-gray-600 mb-6">
            Could not load participants and support workers. Please check your connection and try again.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/scheduling')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scheduling
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
                <h1 className="text-xl font-semibold text-gray-900">New Appointment</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Participant Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant *
                </label>
                <select
                  required
                  value={formData.participant_id}
                  onChange={(e) => setFormData({...formData, participant_id: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Select Participant</option>
                  {participants.map(participant => (
                    <option key={participant.id} value={participant.id}>
                      {participant.first_name} {participant.last_name}
                      {participant.city && ` - ${participant.city}, ${participant.state}`}
                    </option>
                  ))}
                </select>
                {participantsError && (
                  <p className="mt-1 text-sm text-red-600">
                    Warning: Could not load all participants
                  </p>
                )}
              </div>

              {/* Support Worker Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Worker *
                </label>
                <select
                  required
                  value={formData.worker_id}
                  onChange={(e) => setFormData({...formData, worker_id: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Select Support Worker</option>
                  {supportWorkers.filter(w => w.status === 'active').map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                      {worker.skills.length > 0 && ` - ${worker.skills.slice(0, 2).join(', ')}`}
                    </option>
                  ))}
                </select>
                {workersError && (
                  <p className="mt-1 text-sm text-red-600">
                    Warning: Could not load all support workers
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Date & Time</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.support_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, support_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {calculateDuration() && (
                  <p className="mt-1 text-sm text-gray-600">
                    Duration: {calculateDuration()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Service Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Personal Care">Personal Care</option>
                  <option value="Community Access">Community Access</option>
                  <option value="Domestic Assistance">Domestic Assistance</option>
                  <option value="Social Participation">Social Participation</option>
                  <option value="Skill Development">Skill Development</option>
                  <option value="Transport">Transport</option>
                  <option value="Respite Care">Respite Care</option>
                  <option value="Therapeutic Support">Therapeutic Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as 'high' | 'medium' | 'low'})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Enter location or address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave blank to use participant's address
              </p>
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Options</h2>
            
            <div className="space-y-6">
              {/* Recurring Appointment */}
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recurring" className="ml-2 text-sm font-medium text-gray-700">
                    Make this a recurring appointment
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Creates weekly recurring appointments on the same day and time
                </p>
              </div>

              {/* Recurrence End Date */}
              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat Until *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.recurrence_end_date || ''}
                    min={formData.support_date}
                    onChange={(e) => setFormData({...formData, recurrence_end_date: e.target.value})}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Send Notifications */}
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={formData.send_notifications}
                    onChange={(e) => setFormData({...formData, send_notifications: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifications" className="ml-2 text-sm font-medium text-gray-700">
                    Send notifications to participant and support worker
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  placeholder="Add any special instructions, requirements, or notes about this appointment..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/scheduling')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAppointmentMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Create Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}