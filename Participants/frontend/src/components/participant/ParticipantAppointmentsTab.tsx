// frontend/src/components/participant/ParticipantAppointmentsTab.tsx - COMPLETE WITH ALL FEATURES
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  FileText,
  Plus,
  Download,
  MoreVertical,
  List,
  CalendarDays,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
  DollarSign,
  AlertCircle as AlertIcon
} from 'lucide-react';
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  getSupportWorkers,
  type Appointment,
  type SupportWorker
} from '../../services/scheduling';
import toast from 'react-hot-toast';

interface ParticipantAppointmentsTabProps {
  participantId: number;
  participantName: string;
}

type ViewMode = 'list' | 'week' | 'month';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

const ParticipantAppointmentsTab: React.FC<ParticipantAppointmentsTabProps> = ({
  participantId,
  participantName
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params or defaults
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'week');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get('status') as StatusFilter) || 'all');
  const [selectedWorker, setSelectedWorker] = useState<number | null>(
    searchParams.get('worker') ? parseInt(searchParams.get('worker')!) : null
  );
  const [selectedService, setSelectedService] = useState<string | null>(searchParams.get('service') || null);
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || ''
  });
  
  const [currentDate, setCurrentDate] = useState(() => {
    const startParam = searchParams.get('start');
    return startParam ? new Date(startParam) : new Date();
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const [showActionCard, setShowActionCard] = useState<{ id: number; x: number; y: number } | null>(null);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'appointments');
    if (viewMode !== 'week') params.set('view', viewMode);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (selectedWorker) params.set('worker', selectedWorker.toString());
    if (selectedService) params.set('service', selectedService);
    if (dateRangeFilter.start) params.set('start', dateRangeFilter.start);
    if (dateRangeFilter.end) params.set('end', dateRangeFilter.end);
    
    setSearchParams(params, { replace: true });
  }, [viewMode, statusFilter, selectedWorker, selectedService, dateRangeFilter, setSearchParams]);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: dateRangeFilter.start || start.toISOString().split('T')[0],
      end: dateRangeFilter.end || end.toISOString().split('T')[0]
    };
  }, [currentDate, viewMode, dateRangeFilter]);

  // Fetch appointments
  const { data: appointments = [], isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: ['participant-appointments', participantId, dateRange.start, dateRange.end, statusFilter, selectedWorker],
    queryFn: async () => {
      const params: any = {
        participant_id: participantId,
        start_date: dateRange.start,
        end_date: dateRange.end
      };
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (selectedWorker) params.support_worker_id = selectedWorker;

      return await getAppointments(params);
    }
  });

  // Fetch support workers
  const { data: supportWorkers = [] } = useQuery<SupportWorker[]>({
    queryKey: ['support-workers'],
    queryFn: getSupportWorkers
  });

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    if (!selectedService) return appointments;
    return appointments.filter(apt => apt.service_type === selectedService);
  }, [appointments, selectedService]);

  // Get unique service types
  const serviceTypes = useMemo(() => {
    const types = new Set(appointments.map(apt => apt.service_type));
    return Array.from(types).filter(Boolean);
  }, [appointments]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Appointment> }) =>
      updateAppointment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-appointments', participantId] });
      toast.success('Appointment updated successfully');
      setShowActionCard(null);
    },
    onError: () => toast.error('Failed to update appointment')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-appointments', participantId] });
      toast.success('Appointment deleted successfully');
      setShowActionCard(null);
    },
    onError: () => toast.error('Failed to delete appointment')
  });

  // Action handlers
  const handleCompleteAppointment = async (appointment: Appointment) => {
    const outcome = prompt('Enter session outcome/notes (optional):');
    await updateMutation.mutateAsync({
      id: appointment.id,
      updates: { 
        status: 'completed' as any,
        notes: outcome ? `${appointment.notes || ''}\n\nOutcome: ${outcome}`.trim() : appointment.notes
      }
    });
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      await updateMutation.mutateAsync({
        id: appointment.id,
        updates: { 
          status: 'cancelled' as any,
          notes: `${appointment.notes || ''}\n\nCancellation reason: ${reason}`.trim()
        }
      });
    }
  };

  const handleNoShowAppointment = async (appointment: Appointment) => {
    const reason = prompt('Please provide a reason for no-show:');
    if (reason) {
      await updateMutation.mutateAsync({
        id: appointment.id,
        updates: { 
          status: 'no_show' as any,
          notes: `${appointment.notes || ''}\n\nNo-show reason: ${reason}`.trim()
        }
      });
    }
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(appointment.id);
    }
  };

  const handleCreateCaseNote = (appointment: Appointment) => {
    navigate(`/participants/${participantId}/case-notes/new`, {
      state: { appointmentId: appointment.id }
    });
  };

  const handleExportCSV = () => {
    const csvData = filteredAppointments.map(apt => ({
      Date: formatDate(apt.start_time),
      Time: `${formatTime(apt.start_time)} - ${formatTime(apt.end_time)}`,
      Service: apt.service_type,
      Worker: apt.support_worker_name || 'Unknown',
      Location: apt.location || 'Not specified',
      Status: apt.status,
      Notes: apt.notes || ''
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-${participantName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Appointments exported successfully');
  };

  const handleExportICal = () => {
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Participant Appointments//EN\n';
    
    filteredAppointments.forEach(apt => {
      const startDT = new Date(apt.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDT = new Date(apt.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${apt.id}@appointments\n`;
      ical += `DTSTAMP:${startDT}\n`;
      ical += `DTSTART:${startDT}\n`;
      ical += `DTEND:${endDT}\n`;
      ical += `SUMMARY:${apt.service_type} - ${participantName}\n`;
      ical += `DESCRIPTION:Worker: ${apt.support_worker_name}\\nLocation: ${apt.location}\n`;
      ical += `LOCATION:${apt.location}\n`;
      ical += `STATUS:${apt.status.toUpperCase()}\n`;
      ical += 'END:VEVENT\n';
    });
    
    ical += 'END:VCALENDAR';
    
    const blob = new Blob([ical], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-${participantName.replace(/\s+/g, '-')}.ics`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Calendar file exported successfully');
  };

  // Utility functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const time = dateStr.split('T')[1];
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'checked': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
      case 'no_show':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const navigateToday = () => setCurrentDate(new Date());

  // Quick Action Card Component
  const QuickActionCard: React.FC<{ appointment: Appointment; onClose: () => void }> = ({ appointment, onClose }) => (
    <div className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-56" 
         style={{ top: showActionCard?.y, left: showActionCard?.x }}>
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <span className="text-sm font-semibold">{formatTime(appointment.start_time)}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1">
        <button onClick={() => navigate(`/scheduling/appointment/${appointment.id}`)}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
          <FileText size={14} /> View Details
        </button>
        <button onClick={() => navigate(`/scheduling/appointment/${appointment.id}/edit`)}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
          <Edit size={14} /> Edit
        </button>
        {appointment.status === 'confirmed' && (
          <>
            <button onClick={() => { handleCompleteAppointment(appointment); onClose(); }}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-green-50 text-green-700 rounded flex items-center gap-2">
              <CheckCircle size={14} /> Complete
            </button>
            <button onClick={() => { handleNoShowAppointment(appointment); onClose(); }}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-orange-50 text-orange-700 rounded flex items-center gap-2">
              <AlertTriangle size={14} /> No-show
            </button>
          </>
        )}
        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <button onClick={() => { handleCancelAppointment(appointment); onClose(); }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 text-red-700 rounded flex items-center gap-2">
            <XCircle size={14} /> Cancel
          </button>
        )}
        {appointment.status === 'completed' && (
          <button onClick={() => { handleCreateCaseNote(appointment); onClose(); }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-purple-50 text-purple-700 rounded flex items-center gap-2">
            <FileText size={14} /> Create Case Note
          </button>
        )}
        <button onClick={() => { handleDeleteAppointment(appointment); onClose(); }}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 text-red-700 rounded flex items-center gap-2">
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );

  // Status Legend
  const StatusLegend = () => (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-yellow-400"></span> Pending
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-green-400"></span> Confirmed
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-blue-400"></span> Completed
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-orange-400"></span> No-show
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full bg-red-400"></span> Cancelled
      </span>
    </div>
  );

  // Render views...
  const renderWeekView = () => {
    const weekDays = [];
    const startDate = new Date(dateRange.start);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDays.push(date);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          const dayAppointments = filteredAppointments.filter(apt => 
            apt.start_time?.split('T')[0] === dayStr
          );
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div key={dayStr} className="bg-white min-h-[150px]">
              <div className={`p-2 border-b ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}>
                <div className={`text-sm font-medium ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                  {day.toLocaleDateString('en-AU', { weekday: 'short' })}
                </div>
                <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                  {day.getDate()}
                </div>
              </div>
              <div className="p-2 space-y-1">
                {dayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`p-2 rounded border cursor-pointer hover:shadow-md transition-shadow relative ${getStatusColor(apt.status)}`}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setShowActionCard({ id: apt.id, x: rect.left, y: rect.bottom + 5 });
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium truncate flex-1">
                        {formatTime(apt.start_time)}
                      </div>
                      {apt.recurring && <RefreshCw size={10} className="text-gray-500" />}
                    </div>
                    <div className="text-xs truncate">{apt.service_type}</div>
                    <div className="text-xs truncate text-gray-600">{apt.support_worker_name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = lastDay.getDate();
    
    const weeks = [];
    let currentWeek = [];
    
    for (let i = 0; i < startDay; i++) currentWeek.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return (
      <div className="space-y-px bg-gray-200">
        <div className="grid grid-cols-7 gap-px">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">{day}</div>
          ))}
        </div>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-px">
            {week.map((day, dayIdx) => {
              if (!day) return <div key={dayIdx} className="bg-gray-50 min-h-[100px]" />;

              const dayStr = day.toISOString().split('T')[0];
              const dayAppointments = filteredAppointments.filter(apt => apt.start_time?.split('T')[0] === dayStr);
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <div key={dayIdx} className="bg-white min-h-[100px]">
                  <div className={`p-1 text-sm ${isToday ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                  <div className="p-1 space-y-1">
                    {dayAppointments.slice(0, 2).map(apt => (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded border cursor-pointer truncate flex items-center gap-1 ${getStatusColor(apt.status)}`}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setShowActionCard({ id: apt.id, x: rect.left, y: rect.bottom + 5 });
                        }}
                      >
                        {apt.recurring && <RefreshCw size={8} />}
                        {formatTime(apt.start_time)} {apt.service_type}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 p-1">+{dayAppointments.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    const sortedAppointments = [...filteredAppointments].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    if (sortedAppointments.length === 0) {
      return (
        <div className="text-center py-16">
          <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
          <p className="text-gray-500 mb-6">
            {statusFilter !== 'all' 
              ? 'No appointments found with the selected filters.'
              : `Get started by creating ${participantName}'s first appointment.`}
          </p>
          <button
            onClick={() => navigate(`/scheduling/appointment/new?participant_id=${participantId}`)}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Appointment
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker(s)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAppointments.map(apt => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{formatDate(apt.start_time)}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        {apt.recurring && <RefreshCw size={12} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{apt.service_type}</div>
                  {apt.estimated_cost && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <DollarSign size={12} /> ${apt.estimated_cost.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{apt.support_worker_name || 'Unknown'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900 truncate max-w-xs">{apt.location || 'Not specified'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                    {getStatusIcon(apt.status)}
                    <span className="ml-1 capitalize">{apt.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/scheduling/appointment/${apt.id}`)}
                            className="text-blue-600 hover:text-blue-900 text-sm">View</button>
                    <button onClick={() => navigate(`/scheduling/appointment/${apt.id}/edit`)}
                            className="text-gray-600 hover:text-gray-900"><Edit size={16} /></button>
                    {apt.status === 'confirmed' && (
                      <>
                        <button onClick={() => handleCompleteAppointment(apt)}
                                className="text-green-600 hover:text-green-900"><CheckCircle size={16} /></button>
                        <button onClick={() => handleNoShowAppointment(apt)}
                                className="text-orange-600 hover:text-orange-900"><AlertTriangle size={16} /></button>
                      </>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button onClick={() => handleCancelAppointment(apt)}
                              className="text-red-600 hover:text-red-900"><XCircle size={16} /></button>
                    )}
                    {apt.status === 'completed' && (
                      <button onClick={() => handleCreateCaseNote(apt)}
                              className="text-purple-600 hover:text-purple-900"><FileText size={16} /></button>
                    )}
                    <button onClick={() => handleDeleteAppointment(apt)}
                            className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Appointments</h2>
          <p className="mt-1 text-sm text-gray-500">Manage appointments for {participantName}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => window.print()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Print
          </button>
          <div className="relative">
            <button onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              More <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button onClick={() => { handleExportCSV(); setShowMoreMenu(false); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Download className="mr-3 h-4 w-4" /> Export CSV
                  </button>
                  <button onClick={() => { handleExportICal(); setShowMoreMenu(false); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Download className="mr-3 h-4 w-4" /> Export iCal
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => navigate(`/scheduling/appointment/new?participant_id=${participantId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-medium border ${viewMode === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} rounded-l-md`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('week')}
                    className={`px-4 py-2 text-sm font-medium border-t border-b ${viewMode === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
              Week
            </button>
            <button onClick={() => setViewMode('month')}
                    className={`px-4 py-2 text-sm font-medium border ${viewMode === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} rounded-r-md`}>
              Month
            </button>
          </div>

          {viewMode !== 'list' && (
            <div className="flex items-center space-x-2">
              <button onClick={navigatePrevious} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={navigateToday} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50">
                Today
              </button>
              <button onClick={navigateNext} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 ml-4">
                {currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Filter className="mr-2 h-4 w-4" /> Filters
          {(statusFilter !== 'all' || selectedWorker || selectedService || dateRangeFilter.start) && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Status Legend */}
      {viewMode !== 'list' && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <StatusLegend />
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Worker</label>
              <select value={selectedWorker || ''} onChange={(e) => setSelectedWorker(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="">All Workers</option>
                {supportWorkers.map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select value={selectedService || ''} onChange={(e) => setSelectedService(e.target.value || null)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="">All Services</option>
                {serviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input type="date" value={dateRangeFilter.start}
                       onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                       className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
                <input type="date" value={dateRangeFilter.end}
                       onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                       className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => {
              setStatusFilter('all');
              setSelectedWorker(null);
              setSelectedService(null);
              setDateRangeFilter({ start: '', end: '' });
            }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow">
        {viewMode === 'list' && renderListView()}
        {viewMode === 'week' && <div className="p-4">{renderWeekView()}</div>}
        {viewMode === 'month' && <div className="p-4">{renderMonthView()}</div>}
      </div>

      {/* Quick Action Card */}
      {showActionCard && (() => {
        const apt = filteredAppointments.find(a => a.id === showActionCard.id);
        return apt ? <QuickActionCard appointment={apt} onClose={() => setShowActionCard(null)} /> : null;
      })()}
    </div>
  );
};

export default ParticipantAppointmentsTab;