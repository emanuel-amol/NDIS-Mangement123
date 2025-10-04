// frontend/src/pages/main-application/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  FileText, 
  Home, 
  DollarSign, 
  UserPlus, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Bell,
  TrendingUp,
  UserCheck
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface DashboardStats {
  participants: {
    total: number;
    active: number;
    prospective: number;
    onboarded: number;
    new_this_week: number;
  };
  referrals: {
    total: number;
    pending: number;
    converted: number;
    this_week: number;
  };
  workflow: {
    needs_care_plan: number;
    needs_risk_assessment: number;
    ready_for_onboarding: number;
    overdue: number;
  };
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  time: string;
}

interface ScheduleShift {
  id: string;
  workerName: string;
  participantName: string;
  startTime: string;
}

interface ExpiringDoc {
  id: string;
  workerName: string;
  participantName: string;
  startTime: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  type: 'birthday' | 'anniversary' | 'review';
}

interface Appointment {
  id: string;
  participantName: string;
  date: string;
  time: string;
  type: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    participants: {
      total: 0,
      active: 0,
      prospective: 0,
      onboarded: 0,
      new_this_week: 0,
    },
    referrals: {
      total: 0,
      pending: 0,
      converted: 0,
      this_week: 0,
    },
    workflow: {
      needs_care_plan: 0,
      needs_risk_assessment: 0,
      ready_for_onboarding: 0,
      overdue: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  // Mock data for features not yet in the system
  const mockAlerts: Alert[] = [
    { id: '1', type: 'info', message: 'New participant referral received - Sarah Johnson', time: '2 hours ago' },
    { id: '2', type: 'warning', message: 'Care plan review due for John Smith', time: '5 hours ago' },
    { id: '3', type: 'success', message: 'Invoice #INV-2024-045 paid successfully', time: '1 day ago' },
  ];

  const mockScheduleShifts: ScheduleShift[] = [
    { id: '1', workerName: 'Emma Wilson', participantName: 'John Smith', startTime: '09:00 AM' },
    { id: '2', workerName: 'Michael Brown', participantName: 'Sarah Davis', startTime: '10:30 AM' },
    { id: '3', workerName: 'Lisa Anderson', participantName: 'Robert Miller', startTime: '02:00 PM' },
  ];

  const mockExpiringDocs: ExpiringDoc[] = [
    { id: '1', workerName: 'Emma Wilson', participantName: 'First Aid Certificate', startTime: 'Expires in 15 days' },
    { id: '2', workerName: 'Michael Brown', participantName: 'NDIS Worker Check', startTime: 'Expires in 23 days' },
    { id: '3', workerName: 'David Lee', participantName: 'Police Check', startTime: 'Expires in 30 days' },
  ];

  const mockBirthdays: Event[] = [
    { id: '1', title: 'Sarah Johnson', date: 'Oct 8', type: 'birthday' },
    { id: '2', title: 'Michael Chen', date: 'Oct 12', type: 'birthday' },
  ];

  const mockAnniversaries: Event[] = [
    { id: '1', title: 'Emma Wilson - 2 Years', date: 'Oct 15', type: 'anniversary' },
  ];

  const mockReviews: Event[] = [
    { id: '1', title: 'John Smith - Care Plan Review', date: 'Oct 10', type: 'review' },
    { id: '2', title: 'Sarah Davis - Quarterly Review', date: 'Oct 18', type: 'review' },
  ];

  const mockAppointments: Appointment[] = [
    { id: '1', participantName: 'John Smith', date: 'Oct 5', time: '10:00 AM', type: 'Care Review' },
    { id: '2', participantName: 'Sarah Johnson', date: 'Oct 6', time: '02:30 PM', type: 'Initial Assessment' },
    { id: '3', participantName: 'Robert Miller', date: 'Oct 7', time: '11:00 AM', type: 'Follow-up' },
  ];

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      const participantStatsResponse = await fetch(`${API_BASE_URL}/participants/stats`);
      if (participantStatsResponse.ok) {
        const participantStats = await participantStatsResponse.json();
        setStats(prev => ({
          ...prev,
          participants: participantStats
        }));
      }

      const referralsResponse = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (referralsResponse.ok) {
        const referrals = await referralsResponse.json();
        const pendingReferrals = referrals.filter((r: any) => r.status === 'submitted' || r.status === 'pending');
        const convertedReferrals = referrals.filter((r: any) => r.status === 'converted_to_participant');
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekReferrals = referrals.filter((r: any) => 
          new Date(r.created_at) >= oneWeekAgo
        );

        setStats(prev => ({
          ...prev,
          referrals: {
            total: referrals.length,
            pending: pendingReferrals.length,
            converted: convertedReferrals.length,
            this_week: thisWeekReferrals.length,
          }
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Staffs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.participants.active}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 text-sm font-medium">+0%</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg mr-4">
              <UserCheck className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Participants</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.participants.onboarded}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 text-sm font-medium">+0%</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg mr-4">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Complaints</p>
              <p className="text-2xl font-semibold text-gray-900">00</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 text-sm font-medium">+0%</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg mr-4">
              <FileText className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Incidents</p>
              <p className="text-2xl font-semibold text-gray-900">00</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 text-sm font-medium">+0%</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Compliance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">HRMS COMPLIANCE</h3>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">0%</div>
                  <div className="text-sm text-gray-500">No data available</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">PARTICIPANTS COMPLIANCE</h3>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">0%</div>
                  <div className="text-sm text-gray-500">No data available</div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Shift */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">SCHEDULE SHIFT</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-3 font-medium">WORKER NAME</th>
                    <th className="pb-3 font-medium">PARTICIPANTS NAME</th>
                    <th className="pb-3 font-medium">START TIME</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {mockScheduleShifts.map((shift) => (
                    <tr key={shift.id} className="border-b border-gray-100">
                      <td className="py-3 text-gray-900">{shift.workerName}</td>
                      <td className="py-3 text-gray-700">{shift.participantName}</td>
                      <td className="py-3 text-gray-700">{shift.startTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiring Documents */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">EXPIRING DOCS</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-3 font-medium">WORKER NAME</th>
                    <th className="pb-3 font-medium">PARTICIPANTS NAME</th>
                    <th className="pb-3 font-medium">START TIME</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {mockExpiringDocs.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100">
                      <td className="py-3 text-gray-900">{doc.workerName}</td>
                      <td className="py-3 text-gray-700">{doc.participantName}</td>
                      <td className="py-3 text-orange-600">{doc.startTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">ALERTS</h3>
              <Bell className="text-gray-400" size={18} />
            </div>
            <div className="space-y-3">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feeds and Events */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Feeds And Events</h3>
            
            {/* Birthdays */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-3">BIRTHDAYS EVENTS</h4>
              <div className="space-y-2">
                {mockBirthdays.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{event.title}</span>
                    <span className="text-gray-500">{event.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Anniversary */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-3">WORK ANNIVERSARY</h4>
              <div className="space-y-2">
                {mockAnniversaries.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{event.title}</span>
                    <span className="text-gray-500">{event.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Reviews */}
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-3">PERFORMANCE REVIEWS</h4>
              <div className="space-y-2">
                {mockReviews.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{event.title}</span>
                    <span className="text-gray-500">{event.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">UPCOMING APPOINTMENTS</h3>
            <div className="space-y-3">
              {mockAppointments.map((apt) => (
                <div key={apt.id} className="border-l-4 border-blue-500 pl-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{apt.participantName}</p>
                  <p className="text-xs text-gray-500">{apt.type}</p>
                  <p className="text-xs text-gray-600 mt-1">{apt.date} at {apt.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;