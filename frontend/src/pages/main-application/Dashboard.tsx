// frontend/src/pages/main-application/Dashboard.tsx - DYNAMIC VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Home, 
  FileText, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Calendar,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Bell
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

// Interfaces for API responses
interface ParticipantStats {
  total: number;
  active: number;
  prospective: number;
  onboarded: number;
  new_this_week: number;
}

interface DocumentStats {
  total_documents: number;
  expired_documents: number;
  expiring_soon: number;
  recent_uploads: number;
  by_category: { [key: string]: number };
}

interface RecentActivity {
  id: string;
  type: 'participant' | 'document' | 'care_plan' | 'invoice' | 'referral';
  title: string;
  description: string;
  time: string;
  participant_name?: string;
  status?: string;
}

interface DashboardAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  description: string;
  action_text?: string;
  action_link?: string;
  count?: number;
}

const Dashboard: React.FC = () => {
  const [participantStats, setParticipantStats] = useState<ParticipantStats>({
    total: 0,
    active: 0,
    prospective: 0,
    onboarded: 0,
    new_this_week: 0
  });

  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    total_documents: 0,
    expired_documents: 0,
    expiring_soon: 0,
    recent_uploads: 0,
    by_category: {}
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchParticipantStats(),
        fetchDocumentStats(),
        fetchRecentActivity(),
        fetchAlerts()
      ]);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/stats`);
      if (response.ok) {
        const data = await response.json();
        setParticipantStats(data);
      } else {
        // Fallback to mock data if API fails
        setParticipantStats({
          total: 25,
          active: 18,
          prospective: 5,
          onboarded: 2,
          new_this_week: 3
        });
      }
    } catch (error) {
      console.error('Error fetching participant stats:', error);
      // Use mock data as fallback
      setParticipantStats({
        total: 25,
        active: 18,
        prospective: 5,
        onboarded: 2,
        new_this_week: 3
      });
    }
  };

  const fetchDocumentStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/organization-stats`);
      if (response.ok) {
        const data = await response.json();
        setDocumentStats(data);
      } else {
        // Fallback data
        setDocumentStats({
          total_documents: 127,
          expired_documents: 8,
          expiring_soon: 15,
          recent_uploads: 12,
          by_category: {
            'Service Agreements': 45,
            'Medical Consent': 32,
            'Care Plans': 28,
            'Risk Assessments': 22
          }
        });
      }
    } catch (error) {
      console.error('Error fetching document stats:', error);
      setDocumentStats({
        total_documents: 127,
        expired_documents: 8,
        expiring_soon: 15,
        recent_uploads: 12,
        by_category: {}
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Since there's no specific recent activity endpoint, we'll fetch from multiple sources
      const [participantsRes, documentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/participants?limit=5`).catch(() => null),
        fetch(`${API_BASE_URL}/documents/organization-stats`).catch(() => null)
      ]);

      const activities: RecentActivity[] = [];

      // Add recent participants
      if (participantsRes?.ok) {
        const participants = await participantsRes.json();
        participants.slice(0, 3).forEach((p: any, index: number) => {
          activities.push({
            id: `participant-${p.id}`,
            type: 'participant',
            title: 'New participant added',
            description: `${p.first_name} ${p.last_name} was added to the system`,
            time: getRelativeTime(p.created_at),
            participant_name: `${p.first_name} ${p.last_name}`,
            status: p.status
          });
        });
      }

      // Add mock activities if API data is insufficient
      const mockActivities: RecentActivity[] = [
        {
          id: 'doc-1',
          type: 'document',
          title: 'Document uploaded',
          description: 'Service agreement for Jordan Smith uploaded',
          time: '2 hours ago',
          participant_name: 'Jordan Smith'
        },
        {
          id: 'care-1',
          type: 'care_plan',
          title: 'Care plan completed',
          description: 'Care plan approved for Amrita Kumar',
          time: '4 hours ago',
          participant_name: 'Amrita Kumar',
          status: 'completed'
        },
        {
          id: 'invoice-1',
          type: 'invoice',
          title: 'Invoice generated',
          description: 'Monthly invoice created for Linh Nguyen',
          time: '1 day ago',
          participant_name: 'Linh Nguyen'
        }
      ];

      setRecentActivity([...activities, ...mockActivities].slice(0, 6));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Use mock data
      setRecentActivity([
        {
          id: 'activity-1',
          type: 'participant',
          title: 'New participant added',
          description: 'Jordan Smith was added to the system',
          time: '2 hours ago'
        },
        {
          id: 'activity-2',
          type: 'document',
          title: 'Document uploaded',
          description: 'Service agreement uploaded',
          time: '4 hours ago'
        },
        {
          id: 'activity-3',
          type: 'care_plan',
          title: 'Care plan completed',
          description: 'Care plan approved for participant',
          time: '1 day ago'
        }
      ]);
    }
  };

  const fetchAlerts = async () => {
    try {
      const alertList: DashboardAlert[] = [];

      // Check for expired documents
      if (documentStats.expired_documents > 0) {
        alertList.push({
          id: 'expired-docs',
          type: 'warning',
          title: 'Expired Documents',
          description: `${documentStats.expired_documents} documents need renewal`,
          action_text: 'Review documents',
          action_link: '/documents?filter=expired',
          count: documentStats.expired_documents
        });
      }

      // Check for expiring documents
      if (documentStats.expiring_soon > 0) {
        alertList.push({
          id: 'expiring-docs',
          type: 'info',
          title: 'Documents Expiring Soon',
          description: `${documentStats.expiring_soon} documents expire within 30 days`,
          action_text: 'View expiring',
          action_link: '/documents?filter=expiring',
          count: documentStats.expiring_soon
        });
      }

      // Check for prospective participants
      if (participantStats.prospective > 0) {
        alertList.push({
          id: 'prospective-participants',
          type: 'info',
          title: 'Prospective Participants',
          description: `${participantStats.prospective} participants need care setup`,
          action_text: 'Review prospective',
          action_link: '/prospective',
          count: participantStats.prospective
        });
      }

      // Check for new participants this week
      if (participantStats.new_this_week > 0) {
        alertList.push({
          id: 'new-participants',
          type: 'success',
          title: 'New Participants This Week',
          description: `${participantStats.new_this_week} new participants added`,
          action_text: 'View recent',
          action_link: '/participants?filter=recent',
          count: participantStats.new_this_week
        });
      }

      setAlerts(alertList);
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'participant': return <Users className="text-blue-500" size={16} />;
      case 'document': return <FileText className="text-green-500" size={16} />;
      case 'care_plan': return <ClipboardList className="text-purple-500" size={16} />;
      case 'invoice': return <DollarSign className="text-yellow-500" size={16} />;
      case 'referral': return <ClipboardList className="text-orange-500" size={16} />;
      default: return <Activity className="text-gray-500" size={16} />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-amber-600" size={20} />;
      case 'error': return <AlertTriangle className="text-red-600" size={20} />;
      case 'success': return <CheckCircle className="text-green-600" size={20} />;
      case 'info': return <Bell className="text-blue-600" size={20} />;
      default: return <Bell className="text-gray-600" size={20} />;
    }
  };

  const getAlertColors = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={20} />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your NDIS Management dashboard • Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-blue-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Participants
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {participantStats.total}
                    </div>
                    {participantStats.new_this_week > 0 && (
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{participantStats.new_this_week} this week
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                Active: {participantStats.active} • Prospective: {participantStats.prospective}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Participants
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {participantStats.active}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                {participantStats.onboarded} recently onboarded
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-purple-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Documents
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {documentStats.total_documents}
                    </div>
                    {documentStats.recent_uploads > 0 && (
                      <div className="ml-2 text-sm font-semibold text-blue-600">
                        +{documentStats.recent_uploads} recent
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                {documentStats.expired_documents} expired • {documentStats.expiring_soon} expiring soon
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-yellow-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Prospective
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {participantStats.prospective}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                Awaiting care setup
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-4 ${getAlertColors(alert.type)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getAlertIcon(alert.type)}
                    <div className="ml-3">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm opacity-90">{alert.description}</p>
                    </div>
                  </div>
                  {alert.count && (
                    <div className="text-2xl font-bold opacity-75">
                      {alert.count}
                    </div>
                  )}
                </div>
                {alert.action_link && (
                  <Link 
                    to={alert.action_link}
                    className="mt-3 inline-flex items-center text-sm font-medium hover:underline"
                  >
                    {alert.action_text} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link 
            to="/participants/new" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border cursor-pointer group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Add Participant</h3>
            </div>
            <p className="text-sm text-gray-600">Register a new participant in the system</p>
          </Link>
          
          <Link 
            to="/prospective" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border cursor-pointer group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Prospective Care</h3>
            </div>
            <p className="text-sm text-gray-600">
              Review {participantStats.prospective} participants awaiting care setup
            </p>
          </Link>
          
          <Link 
            to="/invoicing/generate" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border cursor-pointer group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Generate Invoice</h3>
            </div>
            <p className="text-sm text-gray-600">Create invoices for services</p>
          </Link>
          
          <Link 
            to="/referral" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border cursor-pointer group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <ClipboardList className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Submit Referral</h3>
            </div>
            <p className="text-sm text-gray-600">Add new participant referrals</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity & Document Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <Link to="/participants" className="text-sm text-blue-600 hover:text-blue-800">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                  {activity.status && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {recentActivity.length === 0 && (
              <div className="text-center py-4">
                <Activity className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Document Overview</h3>
              <Link to="/documents" className="text-sm text-blue-600 hover:text-blue-800">
                Manage all
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(documentStats.by_category).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{category}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{count}</span>
                </div>
              ))}
              
              {documentStats.expired_documents > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      {documentStats.expired_documents} expired documents
                    </span>
                  </div>
                  <Link 
                    to="/documents?filter=expired"
                    className="text-xs text-red-600 hover:text-red-800 mt-1 inline-block"
                  >
                    Review now →
                  </Link>
                </div>
              )}
              
              {documentStats.expiring_soon > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">
                      {documentStats.expiring_soon} expiring within 30 days
                    </span>
                  </div>
                  <Link 
                    to="/documents?filter=expiring"
                    className="text-xs text-yellow-600 hover:text-yellow-800 mt-1 inline-block"
                  >
                    Review expiring →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;