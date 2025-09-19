// frontend/src/pages/scheduling/CalendarView.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Calendar,
  Clock,
  User,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { CalendarGrid } from '../../components/scheduling/CalendarGrid';

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
}

type ViewType = 'month' | 'week' | 'day';

const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    supportWorker: '',
    participant: '',
    serviceType: '',
    status: ''
  });

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, viewType]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      // Mock appointments data - replace with actual API call
      const mockAppointments: Appointment[] = [
        {
          id: 1,
          participant_id: 1,
          participant_name: 'Jordan Smith',
          support_worker_id: 1,
          support_worker_name: 'Sarah Wilson',
          start_time: '2025-01-20T09:00:00',
          end_time: '2025-01-20T11:00:00',
          service_type: 'Personal Care',
          location: 'Home Visit',
          status: 'confirmed',
          notes: 'Regular morning routine assistance'
        },
        {
          id: 2,
          participant_id: 2,
          participant_name: 'Amrita Kumar',
          support_worker_id: 2,
          support_worker_name: 'Michael Chen',
          start_time: '2025-01-20T14:00:00',
          end_time: '2025-01-20T16:00:00',
          service_type: 'Community Access',
          location: 'Shopping Centre',
          status: 'pending'
        },
        {
          id: 3,
          participant_id: 3,
          participant_name: 'Linh Nguyen',
          support_worker_id: 3,
          support_worker_name: 'Emma Thompson',
          start_time: '2025-01-21T10:00:00',
          end_time: '2025-01-21T12:00:00',
          service_type: 'Domestic Assistance',
          location: 'Home Visit',
          status: 'confirmed'
        },
        {
          id: 4,
          participant_id: 1,
          participant_name: 'Jordan Smith',
          support_worker_id: 1,
          support_worker_name: 'Sarah Wilson',
          start_time: '2025-01-22T15:00:00',
          end_time: '2025-01-22T17:00:00',
          service_type: 'Social Participation',
          location: 'Community Centre',
          status: 'confirmed'
        }
      ];
      
      setAppointments(mockAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const formatDateHeader = () => {
    switch (viewType) {
      case 'month':
        return currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/scheduling')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div className="border-l border-gray-300 h-6"></div>
          <h1 className="text-3xl font-bold text-gray-800">Calendar View</h1>
        </div>
        
        <button
          onClick={() => navigate('/scheduling/appointment/new')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          New Appointment
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {formatDateHeader()}
              </h2>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewType === view
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Worker</label>
                <select
                  value={filters.supportWorker}
                  onChange={(e) => setFilters({...filters, supportWorker: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Workers</option>
                  <option value="sarah-wilson">Sarah Wilson</option>
                  <option value="michael-chen">Michael Chen</option>
                  <option value="emma-thompson">Emma Thompson</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                <select
                  value={filters.participant}
                  onChange={(e) => setFilters({...filters, participant: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Participants</option>
                  <option value="jordan-smith">Jordan Smith</option>
                  <option value="amrita-kumar">Amrita Kumar</option>
                  <option value="linh-nguyen">Linh Nguyen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters({...filters, serviceType: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Services</option>
                  <option value="personal-care">Personal Care</option>
                  <option value="community-access">Community Access</option>
                  <option value="domestic-assistance">Domestic Assistance</option>
                  <option value="social-participation">Social Participation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow">
        <CalendarGrid
          viewType={viewType}
          currentDate={currentDate}
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
          loading={loading}
        />
      </div>

      {/* Appointment Detail Sidebar */}
      {selectedAppointment && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(selectedAppointment.status)}`}></div>
                  <span className="text-sm capitalize">{selectedAppointment.status}</span>
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <div className="flex items-center text-gray-900">
                  <Clock size={16} className="mr-2" />
                  <span>
                    {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                  </span>
                </div>
              </div>

              {/* Participant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participant</label>
                <div className="flex items-center text-gray-900">
                  <User size={16} className="mr-2" />
                  <span>{selectedAppointment.participant_name}</span>
                </div>
              </div>

              {/* Support Worker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Worker</label>
                <div className="flex items-center text-gray-900">
                  <User size={16} className="mr-2" />
                  <span>{selectedAppointment.support_worker_name}</span>
                </div>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <span className="text-gray-900">{selectedAppointment.service_type}</span>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="flex items-center text-gray-900">
                  <MapPin size={16} className="mr-2" />
                  <span>{selectedAppointment.location}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => navigate(`/scheduling/appointment/${selectedAppointment.id}/edit`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Appointment
                </button>
                <button
                  onClick={() => navigate(`/participants/${selectedAppointment.participant_id}`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Participant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;