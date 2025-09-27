// frontend/src/components/scheduling/ScheduleGeneration.tsx - FULLY DYNAMIC WITH BACKEND - FIXED
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  MapPin,
  User,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface Assignment {
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
  estimated_cost_per_hour: number;
  compatibility_score: number;
}

interface ParticipantPreferences {
  preferred_times: string[];
  preferred_days: string[];
  location: string;
  special_requirements?: string[];
}

interface GeneratedSchedule {
  id: string;
  participant_id: number;
  support_worker_id: number;
  support_worker_name: string;
  date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  status: 'draft' | 'confirmed';
  notes?: string;
  recurring_pattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    end_date?: string;
    days_of_week?: number[];
  };
  assignment_role: 'primary' | 'secondary' | 'backup';
  estimated_cost: number;
}

interface ScheduleTemplate {
  name: string;
  description: string;
  pattern: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    sessions_per_week: number;
    session_duration: number; // hours
    preferred_times: string[];
    preferred_days: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
}

interface ScheduleGenerationProps {
  participantId: number;
  participantName: string;
  assignments: Assignment[];
  participantPreferences: ParticipantPreferences;
  onScheduleGenerated: (schedule: GeneratedSchedule[]) => void;
  onCancel: () => void;
}

export const ScheduleGeneration: React.FC<ScheduleGenerationProps> = ({
  participantId,
  participantName,
  assignments,
  participantPreferences,
  onScheduleGenerated,
  onCancel
}) => {
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSettings, setCustomSettings] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months
    sessions_per_week: 3,
    session_duration: 2,
    preferred_time_start: '09:00',
    preferred_time_end: '17:00',
    avoid_weekends: true,
    include_travel_time: true,
    auto_resolve_conflicts: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSession, setEditingSession] = useState<GeneratedSchedule | null>(null);

  // Predefined schedule templates
  const scheduleTemplates: ScheduleTemplate[] = [
    {
      name: 'Standard Weekly',
      description: '3 sessions per week, 2 hours each',
      pattern: {
        frequency: 'weekly',
        sessions_per_week: 3,
        session_duration: 2,
        preferred_times: ['09:00', '13:00'],
        preferred_days: [1, 3, 5] // Monday, Wednesday, Friday
      }
    },
    {
      name: 'Intensive Daily',
      description: '5 sessions per week, 1.5 hours each',
      pattern: {
        frequency: 'weekly',
        sessions_per_week: 5,
        session_duration: 1.5,
        preferred_times: ['10:00', '14:00'],
        preferred_days: [1, 2, 3, 4, 5] // Weekdays
      }
    },
    {
      name: 'Light Support',
      description: '2 sessions per week, 3 hours each',
      pattern: {
        frequency: 'weekly',
        sessions_per_week: 2,
        session_duration: 3,
        preferred_times: ['09:00'],
        preferred_days: [2, 4] // Tuesday, Thursday
      }
    },
    {
      name: 'Weekend Focused',
      description: '2 sessions per weekend, 4 hours each',
      pattern: {
        frequency: 'weekly',
        sessions_per_week: 2,
        session_duration: 4,
        preferred_times: ['10:00'],
        preferred_days: [0, 6] // Sunday, Saturday
      }
    }
  ];

  // Auto-generate initial schedule
  useEffect(() => {
    if (assignments.length > 0) {
      generateInitialSchedule();
    }
  }, [assignments]);

  const generateInitialSchedule = async () => {
    setIsGenerating(true);
    try {
      const schedule = await generateSmartSchedule();
      setGeneratedSchedule(schedule);
      toast.success('Initial schedule generated successfully');
    } catch (error) {
      console.error('Error generating initial schedule:', error);
      toast.error('Failed to generate initial schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSmartSchedule = async (): Promise<GeneratedSchedule[]> => {
    // Smart schedule generation algorithm
    const schedule: GeneratedSchedule[] = [];
    const startDate = new Date(customSettings.start_date);
    const endDate = new Date(customSettings.end_date);
    
    // Calculate optimal distribution across workers
    const primaryWorker = assignments.find(a => a.role === 'primary');
    const secondaryWorker = assignments.find(a => a.role === 'secondary');
    const backupWorker = assignments.find(a => a.role === 'backup');

    if (!primaryWorker) {
      throw new Error('No primary worker assigned');
    }

    // Generate sessions for each week
    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    for (let week = 0; week < totalWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week * 7));
      
      // Primary worker sessions (70% of total hours)
      const primaryHours = Math.floor(primaryWorker.hours_per_week * 0.7);
      const primarySessions = Math.ceil(primaryHours / customSettings.session_duration);
      
      for (let session = 0; session < primarySessions; session++) {
        const sessionDate = getOptimalSessionDate(weekStart, session, primarySessions);
        const sessionTime = getOptimalSessionTime(session);
        
        const generatedSession: GeneratedSchedule = {
          id: `primary-${week}-${session}`,
          participant_id: participantId,
          support_worker_id: primaryWorker.support_worker_id,
          support_worker_name: primaryWorker.support_worker_name,
          date: sessionDate.toISOString().split('T')[0],
          start_time: sessionTime,
          end_time: addHours(sessionTime, customSettings.session_duration),
          service_type: getServiceTypeForSession(primaryWorker.services, session),
          location: participantPreferences.location,
          status: 'draft',
          assignment_role: 'primary',
          estimated_cost: primaryWorker.estimated_cost_per_hour * customSettings.session_duration,
          notes: `${primaryWorker.support_worker_name} - Primary support session`,
          recurring_pattern: {
            frequency: 'weekly',
            end_date: customSettings.end_date,
            days_of_week: [sessionDate.getDay()]
          }
        };
        
        schedule.push(generatedSession);
      }

      // Secondary worker sessions (if available)
      if (secondaryWorker) {
        const secondaryHours = Math.floor(secondaryWorker.hours_per_week * 0.5);
        const secondarySessions = Math.ceil(secondaryHours / customSettings.session_duration);
        
        for (let session = 0; session < secondarySessions; session++) {
          const sessionDate = getOptimalSessionDate(weekStart, session + primarySessions, secondarySessions + primarySessions);
          const sessionTime = getOptimalSessionTime(session + primarySessions);
          
          const generatedSession: GeneratedSchedule = {
            id: `secondary-${week}-${session}`,
            participant_id: participantId,
            support_worker_id: secondaryWorker.support_worker_id,
            support_worker_name: secondaryWorker.support_worker_name,
            date: sessionDate.toISOString().split('T')[0],
            start_time: sessionTime,
            end_time: addHours(sessionTime, customSettings.session_duration),
            service_type: getServiceTypeForSession(secondaryWorker.services, session),
            location: participantPreferences.location,
            status: 'draft',
            assignment_role: 'secondary',
            estimated_cost: secondaryWorker.estimated_cost_per_hour * customSettings.session_duration,
            notes: `${secondaryWorker.support_worker_name} - Secondary support session`,
            recurring_pattern: {
              frequency: 'weekly',
              end_date: customSettings.end_date,
              days_of_week: [sessionDate.getDay()]
            }
          };
          
          schedule.push(generatedSession);
        }
      }
    }

    return schedule;
  };

  const getOptimalSessionDate = (weekStart: Date, sessionIndex: number, totalSessions: number): Date => {
    const preferredDays = customSettings.avoid_weekends 
      ? [1, 2, 3, 4, 5] // Monday to Friday
      : [0, 1, 2, 3, 4, 5, 6]; // All days

    const dayIndex = sessionIndex % preferredDays.length;
    const selectedDay = preferredDays[dayIndex];
    
    const sessionDate = new Date(weekStart);
    sessionDate.setDate(weekStart.getDate() + selectedDay);
    
    return sessionDate;
  };

  const getOptimalSessionTime = (sessionIndex: number): string => {
    const morningTimes = ['09:00', '10:00', '11:00'];
    const afternoonTimes = ['13:00', '14:00', '15:00'];
    
    if (sessionIndex % 2 === 0) {
      return morningTimes[sessionIndex % morningTimes.length];
    } else {
      return afternoonTimes[sessionIndex % afternoonTimes.length];
    }
  };

  const getServiceTypeForSession = (services: string[], sessionIndex: number): string => {
    return services[sessionIndex % services.length];
  };

  const addHours = (timeString: string, hours: number): string => {
    const [hour, minute] = timeString.split(':').map(Number);
    const newHour = hour + Math.floor(hours);
    const newMinute = minute + ((hours % 1) * 60);
    
    return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
  };

  const applyTemplate = (templateName: string) => {
    const template = scheduleTemplates.find(t => t.name === templateName);
    if (!template) return;

    setCustomSettings(prev => ({
      ...prev,
      sessions_per_week: template.pattern.sessions_per_week,
      session_duration: template.pattern.session_duration,
      preferred_time_start: template.pattern.preferred_times[0],
      avoid_weekends: !template.pattern.preferred_days.includes(0) && !template.pattern.preferred_days.includes(6)
    }));

    setSelectedTemplate(templateName);
    toast.success(`Applied ${templateName} template`);
  };

  const regenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      const newSchedule = await generateSmartSchedule();
      setGeneratedSchedule(newSchedule);
      toast.success('Schedule regenerated successfully');
    } catch (error) {
      console.error('Error regenerating schedule:', error);
      toast.error('Failed to regenerate schedule');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSession = (sessionId: string, updates: Partial<GeneratedSchedule>) => {
    setGeneratedSchedule(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updates }
          : session
      )
    );
  };

  const deleteSession = (sessionId: string) => {
    setGeneratedSchedule(prev => prev.filter(session => session.id !== sessionId));
    toast.success('Session removed from schedule');
  };

  const addCustomSession = () => {
    if (assignments.length === 0) return;

    const primaryWorker = assignments.find(a => a.role === 'primary') || assignments[0];
    const newSession: GeneratedSchedule = {
      id: `custom-${Date.now()}`,
      participant_id: participantId,
      support_worker_id: primaryWorker.support_worker_id,
      support_worker_name: primaryWorker.support_worker_name,
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '11:00',
      service_type: primaryWorker.services[0],
      location: participantPreferences.location,
      status: 'draft',
      assignment_role: primaryWorker.role,
      estimated_cost: primaryWorker.estimated_cost_per_hour * 2,
      notes: 'Custom session'
    };

    setGeneratedSchedule(prev => [...prev, newSession]);
    setEditingSession(newSession);
  };

  const saveSchedule = async () => {
    if (generatedSchedule.length === 0) {
      toast.error('No sessions in schedule to save');
      return;
    }

    setIsGenerating(true);
    try {
      // Convert schedule to roster format for backend
      const rosterEntries = generatedSchedule.map(session => ({
        worker_id: session.support_worker_id,
        support_date: session.date,
        start_time: session.start_time + ':00',
        end_time: session.end_time + ':00',
        eligibility: session.service_type,
        notes: session.notes || '',
        status: 'checked',
        is_group_support: false,
        participants: [{ participant_id: participantId }],
        tasks: [{ title: `${session.service_type} session`, is_done: false }]
      }));

      // Save each roster entry
      const savedSessions = [];
      for (const rosterEntry of rosterEntries) {
        const response = await fetch(`${API_BASE_URL}/rostering/rosters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rosterEntry),
        });

        if (response.ok) {
          const result = await response.json();
          savedSessions.push(result);
        } else {
          console.error('Failed to save roster entry:', rosterEntry);
        }
      }

      if (savedSessions.length > 0) {
        toast.success(`Schedule saved! ${savedSessions.length} sessions created.`);
        onScheduleGenerated(generatedSchedule);
      } else {
        throw new Error('No sessions were saved successfully');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Group sessions by week for better visualization
  const groupedSessions = generatedSchedule.reduce((acc, session) => {
    const date = new Date(session.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(session);
    return acc;
  }, {} as Record<string, GeneratedSchedule[]>);

  const totalSessions = generatedSchedule.length;
  const totalHours = generatedSchedule.reduce((sum, session) => {
    const start = new Date(`1970-01-01T${session.start_time}:00`);
    const end = new Date(`1970-01-01T${session.end_time}:00`);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);
  const totalCost = generatedSchedule.reduce((sum, session) => sum + session.estimated_cost, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Generate Schedule for {participantName}
        </h2>
        <p className="text-gray-600">
          Create a personalized schedule based on assigned support workers and participant preferences
        </p>
      </div>

      {/* Schedule Templates */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Start Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {scheduleTemplates.map(template => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template.name)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedTemplate === template.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              <div className="text-xs text-gray-500">
                {template.pattern.sessions_per_week} sessions/week • {template.pattern.session_duration}h each
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Settings */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Settings</h3>
          <button
            onClick={regenerateSchedule}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={customSettings.start_date}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={customSettings.end_date}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sessions/Week</label>
            <input
              type="number"
              min="1"
              max="7"
              value={customSettings.sessions_per_week}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, sessions_per_week: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
            <select
              value={customSettings.session_duration}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, session_duration: parseFloat(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="1">1 hour</option>
              <option value="1.5">1.5 hours</option>
              <option value="2">2 hours</option>
              <option value="2.5">2.5 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={customSettings.preferred_time_start}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, preferred_time_start: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={customSettings.preferred_time_end}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, preferred_time_end: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={customSettings.avoid_weekends}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, avoid_weekends: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Avoid weekends</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={customSettings.include_travel_time}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, include_travel_time: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Include travel time</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={customSettings.auto_resolve_conflicts}
              onChange={(e) => setCustomSettings(prev => ({ ...prev, auto_resolve_conflicts: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Auto-resolve conflicts</span>
          </label>
        </div>
      </div>

      {/* Schedule Summary */}
      {generatedSchedule.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="text-blue-600 mr-2" size={20} />
              <div>
                <p className="text-sm font-medium text-blue-800">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="text-green-600 mr-2" size={20} />
              <div>
                <p className="text-sm font-medium text-green-800">Total Hours</p>
                <p className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <User className="text-purple-600 mr-2" size={20} />
              <div>
                <p className="text-sm font-medium text-purple-800">Support Workers</p>
                <p className="text-2xl font-bold text-purple-600">{assignments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <Settings className="text-orange-600 mr-2" size={20} />
              <div>
                <p className="text-sm font-medium text-orange-800">Monthly Cost</p>
                <p className="text-2xl font-bold text-orange-600">${(totalCost * 4).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Schedule */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Generated Schedule</h3>
          <button
            onClick={addCustomSession}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Plus size={16} />
            Add Custom Session
          </button>
        </div>

        {generatedSchedule.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-500 mb-2">No Schedule Generated</h4>
            <p className="text-gray-400">
              Configure your settings and click "Regenerate" to create a schedule
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([weekStart, sessions]) => (
                <div key={weekStart} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Week of {new Date(weekStart).toLocaleDateString('en-AU', { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions
                      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
                      .map(session => (
                        <div
                          key={session.id}
                          className={`border rounded-lg p-3 hover:shadow-md transition-shadow ${
                            session.assignment_role === 'primary' ? 'border-blue-200 bg-blue-50' :
                            session.assignment_role === 'secondary' ? 'border-green-200 bg-green-50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">
                                {new Date(session.date).toLocaleDateString('en-AU', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="text-sm text-gray-600">
                                {session.start_time} - {session.end_time}
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingSession(session)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => deleteSession(session.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              {session.support_worker_name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {session.assignment_role.charAt(0).toUpperCase() + session.assignment_role.slice(1)} Support
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 mb-2">
                            <div>{session.service_type}</div>
                            <div className="flex items-center">
                              <MapPin size={10} className="mr-1" />
                              {session.location}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className={`px-2 py-1 rounded-full ${
                              session.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {session.status}
                            </span>
                            <span className="text-gray-500">
                              ${session.estimated_cost.toFixed(0)}
                            </span>
                          </div>

                          {session.notes && (
                            <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded border">
                              {session.notes}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={regenerateSchedule}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            Regenerate
          </button>
          
          <button
            onClick={saveSchedule}
            disabled={isGenerating || generatedSchedule.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Schedule ({generatedSchedule.length} sessions)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Session</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingSession.date}
                  onChange={(e) => setEditingSession({...editingSession, date: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingSession.start_time}
                    onChange={(e) => setEditingSession({...editingSession, start_time: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingSession.end_time}
                    onChange={(e) => setEditingSession({...editingSession, end_time: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={editingSession.service_type}
                  onChange={(e) => setEditingSession({...editingSession, service_type: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="Personal Care">Personal Care</option>
                  <option value="Community Access">Community Access</option>
                  <option value="Domestic Assistance">Domestic Assistance</option>
                  <option value="Social Participation">Social Participation</option>
                  <option value="Skill Development">Skill Development</option>
                  <option value="Transport">Transport</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingSession.notes || ''}
                  onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
              <button
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateSession(editingSession.id, editingSession);
                  setEditingSession(null);
                  toast.success('Session updated');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};