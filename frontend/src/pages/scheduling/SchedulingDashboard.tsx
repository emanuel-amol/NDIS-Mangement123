// frontend/src/pages/scheduling/SchedulingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Filter,
  AlertTriangle,
  CheckCircle,
  User,
  CalendarDays,
  MapPin,
  Bell
} from 'lucide-react';

interface ScheduleStats {
  total_appointments: number;
  today_appointments: number;
  pending_requests: number;
  support_workers_scheduled: number;
  participants_scheduled: number;
}

interface UpcomingAppointment {
  id: number;
  participant_name: string;
  support_worker_name: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  urgency: 'normal' | 'urgent';
}

const SchedulingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ScheduleStats>({
    total_appointments: 0,
    today_appointments: 0,
    pending_requests: 0,
    support_workers_scheduled: 0,
    participants_scheduled: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'pending'>('all');

  useEffect(() => {
    fetchSchedulingData();
  }, []);

  const fetchSchedulingData = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        total_appointments: 156,
        today_appointments: 23,
        pending_requests: 7,
        support_workers_scheduled: 45,
        participants_scheduled: 89
      });

      setUpcomingAppointments([
        {
          id: 1,
          participant_name: 'Jordan Smith',
          support_worker_name: 'Sarah Wilson',
          start_time: '2025-01-20T09:00:00',
          end_time: '2025-01-20T11:00:00',
          service_type: 'Personal Care',
          location: 'Home Visit',
          status: 'confirmed',
          urgency: 'normal'
        },
        {
          id: 2,
          participant_name: 'Amrita Kumar',
          support_worker_name: 'Michael Chen',
          start_time: '2025-01-20T10:30:00',
          end_time: '2025-01-20T12:30:00',
          service_type: 'Community Access',
          location: 'Shopping Centre',
          status: 'pending',
          urgency: 'urgent'
        },
        {
          id: 3,
          participant_name: 'Linh Nguyen',
          support_worker_name: 'Emma Thompson',
          start_time: '2025-01-20T14:00:00',
          end_time: '2025-01-20T16:00:00',
          service_type: 'Domestic Assistance',
          location: 'Home Visit',
          status: 'confirmed',
          urgency: 'normal'
        }
      ]);
    } catch (error) {
      console.error('Error fetching scheduling data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'cancelled': return <AlertTriangle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Scheduling Dashboard</h1>
          <p className="text-gray-600">Manage appointments, rosters, and support worker schedules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/scheduling/calendar')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar size={20} />
            Calendar View
          </button>
          <button
            onClick={() => navigate('/scheduling/appointment/new')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            New Appointment
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Calendar className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_appointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CalendarDays className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today_appointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="text-yellow-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Users className="text-purple-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Support Workers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.support_workers_scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center">
            <User className="text-indigo-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Participants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.participants_scheduled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search appointments by participant, support worker, or service type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Appointments</option>
              <option value="today">Today Only</option>
              <option value="week">This Week</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/scheduling/roster')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-blue-500"
        >
          <div className="flex items-center mb-4">
            <Users className="text-blue-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Roster Management</h3>
          </div>
          <p className="text-sm text-gray-600">Manage support worker rosters and availability</p>
        </button>

        <button
          onClick={() => navigate('/scheduling/requests')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-yellow-500"
        >
          <div className="flex items-center mb-4">
            <Bell className="text-yellow-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Schedule Requests</h3>
          </div>
          <p className="text-sm text-gray-600">Review and approve schedule change requests</p>
        </button>

        <button
          onClick={() => navigate('/scheduling/settings')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-gray-500"
        >
          <div className="flex items-center mb-4">
            <Calendar className="text-gray-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Schedule Settings</h3>
          </div>
          <p className="text-sm text-gray-600">Configure scheduling rules and preferences</p>
        </button>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h3>
          <p className="text-sm text-gray-600">Next appointments requiring attention</p>
        </div>
        
        <div className="p-6">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming appointments</h4>
              <p className="text-gray-400">All appointments are up to date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    appointment.urgency === 'urgent' ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => navigate(`/scheduling/appointment/${appointment.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(appointment.status)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      {appointment.urgency === 'urgent' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(appointment.start_time)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Participant</div>
                      <div className="text-sm text-gray-600">{appointment.participant_name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Support Worker</div>
                      <div className="text-sm text-gray-600">{appointment.support_worker_name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Time</div>
                      <div className="text-sm text-gray-600">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Service</div>
                      <div className="text-sm text-gray-600">{appointment.service_type}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center text-sm text-gray-600">
                    <MapPin size={14} className="mr-1" />
                    {appointment.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulingDashboard;