// frontend/src/components/scheduling/AppointmentForm.tsx - FIXED BACKEND INTEGRATION
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, User, MapPin, AlertTriangle, Save } from 'lucide-react';
import { 
  getParticipants, 
  getSupportWorkers,
  type Participant, 
  type SupportWorker,
  type RosterCreate 
} from '../../services/scheduling';

interface AppointmentFormProps {
  appointment?: any; // Existing appointment data for editing
  participants?: Participant[];
  supportWorkers?: SupportWorker[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

interface FormData {
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

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  participants: propParticipants,
  supportWorkers: propSupportWorkers,
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  // Use provided data or fetch from API
  const { data: fetchedParticipants = [] } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: getParticipants,
    enabled: !propParticipants
  });

  const { data: fetchedSupportWorkers = [] } = useQuery<SupportWorker[]>({
    queryKey: ['support-workers'],
    queryFn: getSupportWorkers,
    enabled: !propSupportWorkers
  });

  const participants = propParticipants || fetchedParticipants;
  const supportWorkers = propSupportWorkers || fetchedSupportWorkers;

  // Initialize form data
  const [formData, setFormData] = useState<FormData>(() => {
    if (appointment && isEditing) {
      // Convert existing appointment data
      return {
        participant_id: appointment.participant_id || 0,
        worker_id: appointment.support_worker_id || appointment.worker_id || 0,
        support_date: appointment.start_time?.split('T')[0] || appointment.support_date || new Date().toISOString().split('T')[0],
        start_time: appointment.start_time?.split('T')[1]?.substring(0, 5) || appointment.start_time?.substring(0, 5) || '09:00',
        end_time: appointment.end_time?.split('T')[1]?.substring(0, 5) || appointment.end_time?.substring(0, 5) || '17:00',
        service_type: appointment.service_type || appointment.eligibility || 'Personal Care',
        location: appointment.location || '',
        priority: appointment.priority || 'medium',
        notes: appointment.notes || '',
        is_recurring: appointment.recurring || false,
        recurrence_end_date: appointment.recurrence_end || '',
        send_notifications: appointment.send_notifications !== false
      };
    } else {
      // New appointment with pre-filled data
      return {
        participant_id: appointment?.participant_id || 0,
        worker_id: appointment?.support_worker_id || 0,
        support_date: appointment?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
        start_time: appointment?.start_time?.split('T')[1]?.substring(0, 5) || '09:00',
        end_time: appointment?.end_time?.split('T')[1]?.substring(0, 5) || '17:00',
        service_type: appointment?.service_type || 'Personal Care',
        location: appointment?.location || '',
        priority: appointment?.priority || 'medium',
        notes: appointment?.notes || '',
        is_recurring: false,
        send_notifications: true
      };
    }
  });

  // Auto-populate location when participant changes
  useEffect(() => {
    if (formData.participant_id && participants.length > 0 && !formData.location) {
      const participant = participants.find(p => p.id === formData.participant_id);
      if (participant) {
        const location = `${participant.street_address || ''}, ${participant.city || ''}, ${participant.state || ''}`.trim().replace(/^,\s*/, '') || 'Home Visit';
        setFormData(prev => ({ ...prev, location }));
      }
    }
  }, [formData.participant_id, participants, formData.location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.participant_id) {
      alert('Please select a participant');
      return;
    }
    if (!formData.worker_id) {
      alert('Please select a support worker');
      return;
    }
    if (!formData.support_date) {
      alert('Please select a date');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      alert('Please select start and end times');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time');
      return;
    }

    // Convert form data to the format expected by the backend
    const submitData = {
      id: appointment?.id,
      participant_id: formData.participant_id,
      support_worker_id: formData.worker_id,
      start_time: `${formData.support_date}T${formData.start_time}:00`,
      end_time: `${formData.support_date}T${formData.end_time}:00`,
      service_type: formData.service_type,
      location: formData.location,
      location_type: 'home_visit' as const,
      priority: formData.priority,
      status: appointment?.status || 'pending' as const,
      notes: formData.notes,
      recurring: formData.is_recurring,
      recurrence_end: formData.recurrence_end_date,
      send_notifications: formData.send_notifications
    };

    onSubmit(submitData);
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
  if (participants.length === 0 || supportWorkers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Appointment' : 'New Appointment'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {isEditing ? 'Update appointment details' : 'Create a new appointment for a participant'}
          </p>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User size={20} />
            Basic Information
          </h3>
          
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
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Date & Time
          </h3>
          
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
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Service Details
          </h3>
          
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
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Options</h3>
          
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
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={16} />
            {isEditing ? 'Update Appointment' : 'Create Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};