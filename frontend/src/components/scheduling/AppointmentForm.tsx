// frontend/src/components/scheduling/AppointmentForm.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, FileText, Save, X } from 'lucide-react';

interface AppointmentFormData {
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
}

interface AppointmentFormProps {
  appointment?: Partial<AppointmentFormData>;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  participants: Array<{ id: number; name: string; }>;
  supportWorkers: Array<{ id: number; name: string; available?: boolean; }>;
  isEditing?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  onSubmit,
  onCancel,
  participants,
  supportWorkers,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    participant_id: 0,
    support_worker_id: 0,
    start_time: '',
    end_time: '',
    service_type: '',
    location: '',
    location_type: 'home_visit',
    priority: 'medium',
    status: 'confirmed',
    recurring: false,
    notes: '',
    send_notifications: true,
    ...appointment
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const serviceTypes = [
    'Personal Care',
    'Domestic Assistance',
    'Community Access',
    'Social Participation',
    'Skill Development',
    'Transport',
    'Respite Care',
    'Therapy Session',
    'Assessment',
    'Review Meeting'
  ];

  const recurrencePatterns = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const handleInputChange = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.participant_id) newErrors.participant_id = 'Participant is required';
    if (!formData.support_worker_id) newErrors.support_worker_id = 'Support worker is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';
    if (!formData.service_type) newErrors.service_type = 'Service type is required';
    if (!formData.location) newErrors.location = 'Location is required';

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    if (formData.recurring && !formData.recurrence_pattern) {
      newErrors.recurrence_pattern = 'Recurrence pattern is required for recurring appointments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting appointment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-calculate end time when start time changes (default 2 hours)
  useEffect(() => {
    if (formData.start_time && !isEditing) {
      const start = new Date(formData.start_time);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
      setFormData(prev => ({
        ...prev,
        end_time: end.toISOString().slice(0, 16)
      }));
    }
  }, [formData.start_time, isEditing]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar size={20} />
          {isEditing ? 'Edit Appointment' : 'New Appointment'}
        </h3>

        {/* Participant & Support Worker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.participant_id}
              onChange={(e) => handleInputChange('participant_id', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Select Participant</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.participant_id && <p className="mt-1 text-sm text-red-600">{errors.participant_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Support Worker <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.support_worker_id}
              onChange={(e) => handleInputChange('support_worker_id', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Select Support Worker</option>
              {supportWorkers.map(sw => (
                <option key={sw.id} value={sw.id} disabled={sw.available === false}>
                  {sw.name} {sw.available === false && '(Unavailable)'}
                </option>
              ))}
            </select>
            {errors.support_worker_id && <p className="mt-1 text-sm text-red-600">{errors.support_worker_id}</p>}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => handleInputChange('start_time', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => handleInputChange('end_time', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>}
          </div>
        </div>

        {/* Service Type & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.service_type}
              onChange={(e) => handleInputChange('service_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Service Type</option>
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.service_type && <p className="mt-1 text-sm text-red-600">{errors.service_type}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { value: 'home_visit', label: 'Home Visit', icon: '🏠' },
              { value: 'community', label: 'Community', icon: '🏪' },
              { value: 'facility', label: 'Facility', icon: '🏢' },
              { value: 'virtual', label: 'Virtual', icon: '💻' }
            ].map(type => (
              <label key={type.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="location_type"
                  value={type.value}
                  checked={formData.location_type === type.value}
                  onChange={(e) => handleInputChange('location_type', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">
                  {type.icon} {type.label}
                </span>
              </label>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Details <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="Enter specific location details"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
        </div>

        {/* Status & Recurring */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) => handleInputChange('recurring', e.target.checked)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Recurring Appointment</span>
            </label>
          </div>
        </div>

        {/* Recurring Options */}
        {formData.recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recurrence Pattern <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.recurrence_pattern || ''}
                onChange={(e) => handleInputChange('recurrence_pattern', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Pattern</option>
                {recurrencePatterns.map(pattern => (
                  <option key={pattern.value} value={pattern.value}>
                    {pattern.label}
                  </option>
                ))}
              </select>
              {errors.recurrence_pattern && <p className="mt-1 text-sm text-red-600">{errors.recurrence_pattern}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recurrence End Date
              </label>
              <input
                type="date"
                value={formData.recurrence_end || ''}
                onChange={(e) => handleInputChange('recurrence_end', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes or special instructions..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.send_notifications}
              onChange={(e) => handleInputChange('send_notifications', e.target.checked)}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Send notifications to participant and support worker
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Save size={16} />
            )}
            {submitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')} Appointment
          </button>
        </div>
      </div>
    </form>
  );
};