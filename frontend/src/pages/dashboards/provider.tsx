// frontend/src/pages/dashboards/provider.tsx
import React, { useState, useEffect } from "react";
import { Users, FileText, Clock, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  referred_for: string;
  status: string;
  created_at: string;
  referrer_first_name: string;
  referrer_last_name: string;
  phone_number: string;
  email_address: string;
}

const ProviderDashboard: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    validated: 0,
    pending: 0,
    newThisWeek: 0
  });

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReferrals(data);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      setStats({
        total: data.length,
        validated: data.filter((r: Referral) => r.status === 'validated').length,
        pending: data.filter((r: Referral) => r.status === 'new' || r.status === 'pending').length,
        newThisWeek: data.filter((r: Referral) => new Date(r.created_at) > weekAgo).length
      });
      
    } catch (error: any) {
      console.error('Error fetching referrals:', error);
      setError(error.message || 'Failed to load referrals');
      
      // Set mock data when API fails
      const mockReferrals: Referral[] = [
        {
          id: 1,
          first_name: 'Jordan',
          last_name: 'Smith',
          referred_for: 'Occupational Therapy',
          status: 'new',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          referrer_first_name: 'Dr. Sarah',
          referrer_last_name: 'Wilson',
          phone_number: '0400 123 456',
          email_address: 'jordan.smith@email.com'
        },
        {
          id: 2,
          first_name: 'Amrita',
          last_name: 'Kumar',
          referred_for: 'Physiotherapy',
          status: 'pending',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          referrer_first_name: 'Dr. Michael',
          referrer_last_name: 'Chen',
          phone_number: '0432 987 654',
          email_address: 'amrita.kumar@email.com'
        },
        {
          id: 3,
          first_name: 'Linh',
          last_name: 'Nguyen',
          referred_for: 'Speech Pathology',
          status: 'validated',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          referrer_first_name: 'Dr. Emma',
          referrer_last_name: 'Davis',
          phone_number: '0450 111 222',
          email_address: 'linh.nguyen@email.com'
        }
      ];
      
      setReferrals(mockReferrals);
      setStats({
        total: 24,
        validated: 15,
        pending: 3,
        newThisWeek: 6
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <FileText size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'validated':
        return <CheckCircle size={16} />;
      case 'rejected':
        return <AlertTriangle size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Provider Dashboard</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Provider Dashboard</h1>
          <p className="text-sm text-gray-600">
            Review and validate participant referral data.
          </p>
        </div>
        <button
          onClick={fetchReferrals}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                API Connection Error: {error}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Showing sample data. Please check your backend connection.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Referrals
                </dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.total}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Validated Referrals
                </dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.validated}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Referrals
                </dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.pending}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  New This Week
                </dt>
                <dd className="text-3xl font-semibold text-gray-900">{stats.newThisWeek}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Referrals
          </h3>
          
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No referrals</h3>
              <p className="mt-1 text-sm text-gray-500">
                No referrals have been submitted yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(referral.status)}
                      <span className="text-sm font-medium text-gray-900">
                        Referral #{referral.id} - {referral.first_name} {referral.last_name}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                        {referral.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Service:</strong> {referral.referred_for}</p>
                      <p><strong>Referred by:</strong> {referral.referrer_first_name} {referral.referrer_last_name}</p>
                      <p><strong>Contact:</strong> {referral.phone_number} | {referral.email_address}</p>
                      <p><strong>Submitted:</strong> {formatDate(referral.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-6">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={referral.status === 'validated'}
                      className={`px-4 py-2 border border-transparent rounded-lg text-sm font-medium shadow-sm ${
                        referral.status === 'validated'
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {referral.status === 'validated' ? 'Validated' : 'Validate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {referrals.length > 5 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all referrals ({referrals.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <FileText className="mr-2 h-4 w-4" />
              Export Referrals
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Users className="mr-2 h-4 w-4" />
              View All Participants
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <CheckCircle className="mr-2 h-4 w-4" />
              Bulk Actions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;