// frontend/src/pages/main-application/Dashboard.tsx - UPDATED WITH REFERRAL ROUTING
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Calendar, 
  FileText, 
  Home, 
  DollarSign, 
  UserPlus, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Building,
  BarChart3,
  RefreshCw
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch participant stats
      const participantStatsResponse = await fetch(`${API_BASE_URL}/participants/stats`);
      if (participantStatsResponse.ok) {
        const participantStats = await participantStatsResponse.json();
        setStats(prev => ({
          ...prev,
          participants: participantStats
        }));
      }

      // Fetch referrals (for stats calculation)
      const referralsResponse = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (referralsResponse.ok) {
        const referrals = await referralsResponse.json();
        const pendingReferrals = referrals.filter((r: any) => r.status === 'submitted' || r.status === 'pending');
        const convertedReferrals = referrals.filter((r: any) => r.status === 'converted_to_participant');
        
        // Calculate this week's referrals
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
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Quick actions with proper routing
  const quickActions = [
    {
      title: 'Add New Participant',
      description: 'Manage participant records',
      icon: UserPlus,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => navigate('/participants'), // Routes to participants page where they can click "Add New"
    },
    {
      title: 'View All Participants',
      description: 'Manage existing participants',
      icon: Users,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => navigate('/participants'),
    },
    {
      title: 'Schedule Appointment',
      description: 'Book new appointment',
      icon: Calendar,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => navigate('/scheduling/appointment/new'),
    },
    {
      title: 'Generate Invoice',
      description: 'Create new invoice',
      icon: DollarSign,
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => navigate('/invoicing/generate'),
    },
    {
      title: 'Manage Documents',
      description: 'Upload and organize documents',
      icon: FileText,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: () => navigate('/documents'),
    },
    {
      title: 'SIL Properties',
      description: 'Manage homes and properties',
      icon: Home,
      color: 'bg-teal-600 hover:bg-teal-700',
      onClick: () => navigate('/sil'),
    },
  ];

  const handleRefresh = () => {
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your NDIS services.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Participants</p>
              <p className="text-3xl font-bold text-gray-900">{stats.participants.total}</p>
              <p className="text-sm text-green-600">
                +{stats.participants.new_this_week} this week
              </p>
            </div>
            <Users className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Participants</p>
              <p className="text-3xl font-bold text-gray-900">{stats.participants.active}</p>
              <p className="text-sm text-gray-600">
                {stats.participants.onboarded} onboarded
              </p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Referrals</p>
              <p className="text-3xl font-bold text-gray-900">{stats.referrals.pending}</p>
              <p className="text-sm text-blue-600">
                +{stats.referrals.this_week} this week
              </p>
            </div>
            <Clock className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Prospective</p>
              <p className="text-3xl font-bold text-gray-900">{stats.participants.prospective}</p>
              <p className="text-sm text-gray-600">
                In onboarding process
              </p>
            </div>
            <Activity className="text-purple-500" size={40} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
          <p className="text-sm text-gray-500">Common tasks and shortcuts</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-4 rounded-lg text-white text-left transition-colors ${action.color}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon size={24} />
                  <Plus size={16} className="opacity-70" />
                </div>
                <h3 className="font-medium text-lg mb-1">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity & Workflow Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Workflow Status</h2>
            <button
              onClick={() => navigate('/prospective')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Need Care Plans</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.workflow.needs_care_plan}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Need Risk Assessment</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.workflow.needs_risk_assessment}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Ready for Onboarding</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.workflow.ready_for_onboarding}</span>
            </div>

            {stats.workflow.overdue > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center">
                  <AlertTriangle className="text-orange-500 mr-2" size={16} />
                  <span className="text-gray-700 font-medium">Overdue Tasks</span>
                </div>
                <span className="font-semibold text-orange-700">{stats.workflow.overdue}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">System Overview</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="text-blue-500 mr-3" size={20} />
                <span className="text-gray-700">Participant Management</span>
              </div>
              <button
                onClick={() => navigate('/participants')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Manage →
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="text-purple-500 mr-3" size={20} />
                <span className="text-gray-700">Scheduling & Appointments</span>
              </div>
              <button
                onClick={() => navigate('/scheduling')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View →
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="text-green-500 mr-3" size={20} />
                <span className="text-gray-700">Invoicing & Payments</span>
              </div>
              <button
                onClick={() => navigate('/invoicing')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Manage →
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Home className="text-teal-500 mr-3" size={20} />
                <span className="text-gray-700">SIL Properties</span>
              </div>
              <button
                onClick={() => navigate('/sil')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View →
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="text-indigo-500 mr-3" size={20} />
                <span className="text-gray-700">Document Management</span>
              </div>
              <button
                onClick={() => navigate('/documents')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Manage →
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="text-orange-500 mr-3" size={20} />
                <span className="text-gray-700">Reports & Analytics</span>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      {stats.workflow.overdue > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
          <div className="flex">
            <AlertTriangle className="text-orange-400 mr-3 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm text-orange-700">
                <strong>Attention Required:</strong> You have {stats.workflow.overdue} overdue workflow tasks that need immediate attention.
              </p>
              <button
                onClick={() => navigate('/prospective')}
                className="mt-2 text-sm text-orange-800 underline hover:text-orange-900"
              >
                Review overdue tasks →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;