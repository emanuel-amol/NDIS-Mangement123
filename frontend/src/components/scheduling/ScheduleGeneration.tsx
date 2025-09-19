// frontend/src/components/scheduling/ScheduleGeneration.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, CheckCircle, AlertTriangle, Settings, RefreshCw } from 'lucide-react';

interface Assignment {
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
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
  };
}

interface ScheduleGenerationProps {
  participantId: number;
  participantName: string;
  assignments: Assignment[];
  participantPreferences: {
    preferred_times: string[];
    preferred_days: string[];
    location: string;
    special_requirements?: string[];
  };
  onScheduleGenerated: (schedules: GeneratedSchedule[]) => void;
  onCancel: () => void;
}

interface ScheduleSettings {
  duration_per_session: number;
  sessions_per_week: number;
  preferred_start_time: string;
  preferred_end_time: string;
  break_between_sessions: number;
  auto_assign_location: boolean;
  generate_recurring: boolean;
  recurring_weeks: number;
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
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ScheduleSettings>({
    duration_per_session: 2, // hours
    sessions_per_week: Math.ceil(assignments.reduce((total, a) => total + a.hours_per_week, 0) / 2),
    preferred_start_time: '09:00',
    preferred_end_time: '17:00',
    break_between_sessions: 30, // minutes
    auto_assign_location: true,
    generate_recurring: true,
    recurring_weeks: 4
  });
  const [showSettings, setShowSettings] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (assignments.length > 0 && !loading) {
      generateInitialSchedule();
    }
  }, [assignments]);

  const generateInitialSchedule = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      const schedule = generateSmartSchedule();
      setGeneratedSchedule(schedule);
      
      // Check for conflicts
      checkForConflicts(schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartSchedule = (): GeneratedSchedule[] => {
    const schedule: GeneratedSchedule[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start tomorrow
    
    // Generate schedule for each assignment
    assignments.forEach((assignment, assignmentIndex) => {
      const sessionsNeeded = Math.ceil(assignment.hours_per_week / settings.duration_per_session);
      const daysAvailable = participantPreferences.preferred_days.length || 5;
      
      // Distribute sessions across the week
      for (let week = 0; week < (settings.generate_recurring ? settings.recurring_weeks : 1); week++) {
        for (let session = 0; session < sessionsNeeded; session++) {
          const dayOffset = Math.floor((session * 7) / sessionsNeeded) + (week * 7);
          const sessionDate = new Date(startDate);
          sessionDate.setDate(startDate.getDate() + dayOffset);
          
          // Skip weekends unless specified
          if (sessionDate.getDay() === 0 || sessionDate.getDay() === 6) {
            if (!participantPreferences.preferred_days.includes('saturday') && 
                !participantPreferences.preferred_days.includes('sunday')) {
              sessionDate.setDate(sessionDate.getDate() + 1);
            }
          }
          
          // Calculate start time
          const baseStartHour = parseInt(settings.preferred_start_time.split(':')[0]);
          const sessionStartHour = baseStartHour + (session * 3); // Space out sessions
          const startTime = `${sessionStartHour.toString().padStart(2, '0')}:00`;
          const endTime = `${(sessionStartHour + settings.duration_per_session).toString().padStart(2, '0')}:00`;
          
          // Determine service type from assignment services
          const serviceType = assignment.services[session % assignment.services.length] || assignment.services[0] || 'General Support';
          
          // Determine location
          const location = settings.auto_assign_location 
            ? participantPreferences.location || 'Home Visit'
            : 'To Be Confirmed';
          
          const scheduleItem: GeneratedSchedule = {
            id: `${participantId}-${assignment.support_worker_id}-${week}-${session}`,
            participant_id: participantId,
            support_worker_id: assignment.support_worker_id,
            support_worker_name: assignment.support_worker_name,
            date: sessionDate.toISOString().split('T')[0],
            start_time: startTime,
            end_time: endTime,
            service_type: serviceType,
            location: location,
            status: 'draft',
            notes: `${assignment.role} worker - ${serviceType}`,
            recurring_pattern: settings.generate_recurring ? {
              frequency: 'weekly',
              end_date: new Date(startDate.getTime() + (settings.recurring_weeks * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            } : undefined
          };
          
          schedule.push(scheduleItem);
        }
      }
    });
    
    // Sort by date and time
    return schedule.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`);
      const dateB = new Date(`${b.date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const checkForConflicts = (schedule: GeneratedSchedule[]) => {
    const foundConflicts: string[] = [];
    const timeSlots = new Map<string, GeneratedSchedule[]>();
    
    // Group by time slots
    schedule.forEach(item => {
      const timeKey = `${item.date}-${item.start_time}`;
      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, []);
      }
      timeSlots.get(timeKey)!.push(item);
    });
    
    // Check for conflicts
    timeSlots.forEach((items, timeKey) => {
      if (items.length > 1) {
        const [date, time] = timeKey.split('-');
        foundConflicts.push(`Multiple sessions scheduled for ${new Date(date).toLocaleDateString()} at ${time}`);
      }
    });
    
    // Check for back-to-back sessions without break
    const sortedSchedule = [...schedule].sort((a, b) => 
      new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime()
    );
    
    for (let i = 0; i < sortedSchedule.length - 1; i++) {
      const current = sortedSchedule[i];
      const next = sortedSchedule[i + 1];
      
      if (current.date === next.date) {
        const currentEnd = new Date(`${current.date}T${current.end_time}`);
        const nextStart = new Date(`${next.date}T${next.start_time}`);
        const timeDiff = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes
        
        if (timeDiff < settings.break_between_sessions) {
          foundConflicts.push(`Insufficient break between sessions on ${new Date(current.date).toLocaleDateString()}`);
        }
      }
    }
    
    setConflicts(foundConflicts);
  };

  const handleRegenerateSchedule = () => {
    const newSchedule = generateSmartSchedule();
    setGeneratedSchedule(newSchedule);
    checkForConflicts(newSchedule);
  };

  const handleEditScheduleItem = (item: GeneratedSchedule, field: string, value: string) => {
    const updatedSchedule = generatedSchedule.map(scheduleItem => {
      if (scheduleItem.id === item.id) {
        return { ...scheduleItem, [field]: value };
      }
      return scheduleItem;
    });
    setGeneratedSchedule(updatedSchedule);
    checkForConflicts(updatedSchedule);
  };

  const handleConfirmSchedule = () => {
    const confirmedSchedule = generatedSchedule.map(item => ({
      ...item,
      status: 'confirmed' as const
    }));
    onScheduleGenerated(confirmedSchedule);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupScheduleByWeek = (schedule: GeneratedSchedule[]) => {
    const weeks = new Map<string, GeneratedSchedule[]>();
    
    schedule.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(item);
    });
    
    return weeks;
  };

  const getTotalHours = () => {
    return generatedSchedule.reduce((total, item) => {
      const start = new Date(`2000-01-01T${item.start_time}`);
      const end = new Date(`2000-01-01T${item.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Schedule</h3>
          <p className="text-gray-600">
            Creating optimal schedule based on participant needs and support worker availability...
          </p>
        </div>
      </div>
    );
  }

  const weeklySchedule = groupScheduleByWeek(generatedSchedule);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Generated Schedule for {participantName}
        </h2>
        <p className="text-gray-600">
          Review and adjust the automatically generated schedule before confirming
        </p>
      </div>

      {/* Schedule Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{generatedSchedule.length}</div>
            <div className="text-sm text-blue-700">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{getTotalHours()}</div>
            <div className="text-sm text-blue-700">Total Hours/Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{assignments.length}</div>
            <div className="text-sm text-blue-700">Support Workers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">{weeklySchedule.size}</div>
            <div className="text-sm text-blue-700">Weeks Planned</div>
          </div>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="text-red-600 mr-3 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-red-900 mb-2">Schedule Conflicts Detected</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={handleRegenerateSchedule}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Schedule Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={settings.duration_per_session}
                onChange={(e) => setSettings({...settings, duration_per_session: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Start Time
              </label>
              <input
                type="time"
                value={settings.preferred_start_time}
                onChange={(e) => setSettings({...settings, preferred_start_time: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred End Time
              </label>
              <input
                type="time"
                value={settings.preferred_end_time}
                onChange={(e) => setSettings({...settings, preferred_end_time: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break Between Sessions (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="120"
                value={settings.break_between_sessions}
                onChange={(e) => setSettings({...settings, break_between_sessions: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recurring Weeks
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.recurring_weeks}
                onChange={(e) => setSettings({...settings, recurring_weeks: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.generate_recurring}
                onChange={(e) => setSettings({...settings, generate_recurring: e.target.checked})}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Generate Recurring Schedule
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Display */}
      <div className="space-y-6">
        {Array.from(weeklySchedule.entries()).map(([weekStart, weekSchedule]) => (
          <div key={weekStart} className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Week of {new Date(weekStart).toLocaleDateString('en-AU', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {weekSchedule.sort((a, b) => 
                  new Date(`${a.date}T${a.start_time}`).getTime() - 
                  new Date(`${b.date}T${b.start_time}`).getTime()
                ).map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
                          <div className="flex items-center mt-1">
                            <Calendar size={16} className="text-blue-600 mr-2" />
                            <span className="font-medium">{formatDate(item.date)}</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Time</label>
                          <div className="flex items-center mt-1">
                            <Clock size={16} className="text-green-600 mr-2" />
                            <input
                              type="time"
                              value={item.start_time}
                              onChange={(e) => handleEditScheduleItem(item, 'start_time', e.target.value)}
                              className="text-sm border-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                            />
                            <span className="mx-1">-</span>
                            <input
                              type="time"
                              value={item.end_time}
                              onChange={(e) => handleEditScheduleItem(item, 'end_time', e.target.value)}
                              className="text-sm border-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Worker</label>
                          <div className="flex items-center mt-1">
                            <User size={16} className="text-purple-600 mr-2" />
                            <span className="font-medium text-sm">{item.support_worker_name}</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Service</label>
                          <div className="mt-1">
                            <select
                              value={item.service_type}
                              onChange={(e) => handleEditScheduleItem(item, 'service_type', e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="Personal Care">Personal Care</option>
                              <option value="Community Access">Community Access</option>
                              <option value="Domestic Assistance">Domestic Assistance</option>
                              <option value="Transport">Transport</option>
                              <option value="Social Participation">Social Participation</option>
                              <option value="Skill Development">Skill Development</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                          <div className="flex items-center mt-1">
                            <MapPin size={16} className="text-red-600 mr-2" />
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) => handleEditScheduleItem(item, 'location', e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleEditScheduleItem(item, 'notes', e.target.value)}
                          placeholder="Add notes..."
                          className="w-full text-sm text-gray-600 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-8">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRegenerateSchedule}
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Regenerate Schedule
          </button>
          <button
            onClick={handleConfirmSchedule}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle size={16} />
            Confirm & Generate ({generatedSchedule.length} sessions)
          </button>
        </div>
      </div>
    </div>
  );
};