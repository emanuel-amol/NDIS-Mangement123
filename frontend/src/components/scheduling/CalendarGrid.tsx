// frontend/src/components/scheduling/CalendarGrid.tsx
import React from 'react';
import { Clock, User, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

interface Appointment {
  id: number;
  participant_id: number;
  participant_name: string;
  support_worker_id: number;
  support_worker_name: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface CalendarGridProps {
  viewType: 'month' | 'week' | 'day';
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  loading?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  viewType,
  currentDate,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
  loading
}) => {
  const getMonthDays = () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days = [];
    
    // Add previous month days
    const startDay = start.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = new Date(start);
      prevDay.setDate(prevDay.getDate() - i - 1);
      days.push({ date: prevDay, isCurrentMonth: false });
    }
    
    // Add current month days
    for (let day = 1; day <= end.getDate(); day++) {
      days.push({ date: new Date(start.getFullYear(), start.getMonth(), day), isCurrentMonth: true });
    }
    
    // Add next month days to complete the grid
    const remaining = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remaining; day++) {
      const nextDay = new Date(end);
      nextDay.setDate(nextDay.getDate() + day);
      days.push({ date: nextDay, isCurrentMonth: false });
    }
    
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const getAppointmentsForHour = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      const aptHour = aptDate.getHours();
      return aptDate.toDateString() === date.toDateString() && 
             aptHour <= hour && 
             new Date(apt.end_time).getHours() > hour;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 border-green-600';
      case 'pending': return 'bg-yellow-500 border-yellow-600';
      case 'cancelled': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getPriorityIndicator = (priority?: string) => {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Month View
  if (viewType === 'month') {
    const monthDays = getMonthDays();
    
    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-100 p-3 text-center font-medium text-gray-700">
              {day}
            </div>
          ))}
          
          {/* Days */}
          {monthDays.map((dayInfo, index) => {
            const dayAppointments = getAppointmentsForDate(dayInfo.date);
            const isToday = dayInfo.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`bg-white min-h-24 p-2 relative ${
                  !dayInfo.isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''
                } ${isToday ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors`}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                  {dayInfo.date.getDate()}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={`text-xs p-1 rounded cursor-pointer text-white ${getStatusColor(apt.status)} truncate hover:opacity-80`}
                      title={`${apt.participant_name} - ${formatTime(apt.start_time)}`}
                    >
                      {getPriorityIndicator(apt.priority)} {apt.participant_name}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
                
                {isToday && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Week View
  if (viewType === 'week') {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="p-4">
        <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 p-3"></div>
          {weekDays.map(day => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={day.toDateString()} className={`bg-gray-100 p-3 text-center font-medium ${isToday ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                <div>{day.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                <div className="text-lg">{day.getDate()}</div>
              </div>
            );
          })}
          
          {/* Time slots */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="bg-gray-100 p-2 text-xs text-gray-600 text-center">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map(day => {
                const hourAppointments = getAppointmentsForHour(day, hour);
                return (
                  <div
                    key={`${day.toDateString()}-${hour}`}
                    className="bg-white min-h-12 p-1 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onTimeSlotClick?.(day, hour)}
                  >
                    {hourAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                        className={`text-xs p-1 mb-1 rounded cursor-pointer text-white ${getStatusColor(apt.status)} hover:opacity-80`}
                      >
                        <div className="font-medium truncate">
                          {getPriorityIndicator(apt.priority)} {apt.participant_name}
                        </div>
                        <div className="truncate opacity-90">
                          {formatTime(apt.start_time)} - {apt.support_worker_name}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Day View
  if (viewType === 'day') {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">
              {currentDate.toLocaleDateString('en-AU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-px bg-gray-200">
            <div className="bg-gray-100 p-3 font-medium text-gray-700">Time</div>
            <div className="bg-gray-100 p-3 font-medium text-gray-700">Appointments</div>
            
            {hours.map(hour => {
              const hourAppointments = getAppointmentsForHour(currentDate, hour);
              return (
                <React.Fragment key={hour}>
                  <div className="bg-white p-3 text-sm text-gray-600 border-b border-gray-100">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div
                    className="bg-white p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors min-h-16"
                    onClick={() => onTimeSlotClick?.(currentDate, hour)}
                  >
                    {hourAppointments.map(apt => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                        className={`p-2 mb-2 rounded cursor-pointer text-white ${getStatusColor(apt.status)} hover:opacity-80`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {getPriorityIndicator(apt.priority)} {apt.participant_name}
                            </div>
                            <div className="text-sm opacity-90">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </div>
                            <div className="text-sm opacity-90">
                              {apt.support_worker_name}
                            </div>
                            {apt.location && (
                              <div className="text-xs opacity-80 flex items-center gap-1">
                                <MapPin size={12} />
                                {apt.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {apt.status === 'confirmed' && <CheckCircle size={16} />}
                            {apt.status === 'pending' && <Clock size={16} />}
                            {apt.status === 'cancelled' && <AlertCircle size={16} />}
                          </div>
                        </div>
                        {apt.notes && (
                          <div className="text-xs opacity-80 mt-1">
                            {apt.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};