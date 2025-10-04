import React, { useState, useEffect } from 'react';
import { HeartHandshake, Calendar, FileText, AlertCircle, UserPlus, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  onClick?: () => void;
}

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  status: string;
  created_at: string;
  disability_type: string;
  urgency_level: string;
  referred_for: string;
  referrer_first_name: string;
  referrer_last_name: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color = "blue", onClick }) => (
  <div 
    className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

const ManagerDashboard: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    myParticipants: 0,
    appointmentsToday: 0,
    pendingCaseNotes: 0,
    incidents: 0
  });

  useEffect(() => {
    fetchReferrals();
    // You can add more data fetching here for participants, appointments, etc.
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (response.ok) {
        const data = await response.json();
        const pendingReferrals = data.filter((ref: Referral) => 
          ref.status === 'submitted' || ref.status === 'pending'
        );
        setReferrals(pendingReferrals);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Service Manager Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={HeartHandshake} 
          label="My Participants" 
          value={stats.myParticipants} 
          onClick={() => navigateTo('/participants')}
        />
        <StatCard 
          icon={UserPlus} 
          label="Pending Referrals" 
          value={referrals.length} 
          color="orange" 
          onClick={() => navigateTo('/referrals')}
        />
        <StatCard 
          icon={Calendar} 
          label="Appointments Today" 
          value={stats.appointmentsToday} 
          color="green" 
          onClick={() => navigateTo('/scheduling')}
        />
        <StatCard 
          icon={FileText} 
          label="Pending Case Notes" 
          value={stats.pendingCaseNotes} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Referrals */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Recent Referrals</h3>
            <button
              onClick={() => navigateTo('/referrals')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending referrals</p>
              <p className="text-sm text-gray-400 mt-1">New referrals will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.slice(0, 3).map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigateTo('/referrals')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {referral.first_name} {referral.last_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(referral.urgency_level)}`}>
                        {referral.urgency_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-600">
                        {referral.disability_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(referral.created_at)}
                      </p>
                    </div>
                  </div>
                  <button 
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo('/referrals');
                    }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={() => navigateTo('/participants')}
              className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Participants
            </button>
            <button 
              onClick={() => navigateTo('/referrals')}
              className="w-full p-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Manage Referrals
            </button>
            <button 
              onClick={() => navigateTo('/scheduling')}
              className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Schedule
            </button>
            <button 
              onClick={() => navigateTo('/reports/participant-ops')}
              className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {referrals.some(r => r.urgency_level === 'urgent') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Urgent Referrals Require Attention</h4>
              <p className="text-sm text-red-700 mt-1">
                You have {referrals.filter(r => r.urgency_level === 'urgent').length} urgent referral(s) that need immediate review.
              </p>
              <button
                onClick={() => navigateTo('/referrals')}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 underline"
              >
                Review Urgent Referrals →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;