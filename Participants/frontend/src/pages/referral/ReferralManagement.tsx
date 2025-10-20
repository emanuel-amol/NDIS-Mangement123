import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone_number: string;
  email_address: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  preferred_contact: string | null;
  disability_type: string;
  
  rep_first_name: string | null;
  rep_last_name: string | null;
  rep_phone_number: string | null;
  rep_email_address: string | null;
  rep_relationship: string | null;
  
  ndis_number: string | null;
  plan_type: string;
  plan_manager_name: string | null;
  plan_manager_agency: string | null;
  available_funding: string | null;
  plan_start_date: string | null;
  plan_review_date: string | null;
  client_goals: string;
  support_category: string;
  
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_agency: string | null;
  referrer_role: string | null;
  referrer_email: string;
  referrer_phone: string;
  
  referred_for: string;
  referred_for_other: string | null;
  reason_for_referral: string;
  urgency_level: string;
  current_supports: string | null;
  support_goals: string | null;
  accessibility_needs: string | null;
  cultural_considerations: string | null;
  
  status: string;
  created_at: string;
  updated_at: string | null;
  internal_notes: string | null;
  file_count: number;
}

const ReferralManagement: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, searchTerm, statusFilter, urgencyFilter]);

  const fetchReferrals = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      console.log('📡 Fetching referrals from:', `${API_BASE_URL}/participants/referrals`);
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received initial data:', data);
        console.log('📊 Number of referrals:', data.length);
        
        // Fetch full details for each referral to get all fields including referred_for
        console.log('🔍 Fetching detailed info for each referral...');
        const detailedReferrals = await Promise.all(
          data.map(async (referral: any) => {
            try {
              const detailUrl = `${API_BASE_URL}/participants/referrals/${referral.id}`;
              console.log(`🔍 Fetching details from: ${detailUrl}`);
              const detailResponse = await fetch(detailUrl);
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                console.log(`✅ Got details for referral ${referral.id}:`, detailData);
                return detailData;
              } else {
                console.error(`❌ Failed to fetch details for referral ${referral.id}`);
                return referral;
              }
            } catch (error) {
              console.error(`❌ Error fetching details for referral ${referral.id}:`, error);
              return referral;
            }
          })
        );
        
        console.log('📋 All detailed referrals:', detailedReferrals);
        
        // Filter out onboarded participants (approved, rejected, converted statuses)
        const activeReferrals = detailedReferrals.filter((ref: Referral) => 
          !['approved', 'rejected', 'converted'].includes(ref.status)
        );
        
        console.log('✅ Active referrals after filtering:', activeReferrals);
        setReferrals(activeReferrals);
      } else {
        console.error('❌ Failed to fetch referrals:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching referrals:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ref => ref.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(ref => ref.urgency_level?.toLowerCase() === urgencyFilter.toLowerCase());
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(ref =>
        ref.first_name?.toLowerCase().includes(search) ||
        ref.last_name?.toLowerCase().includes(search) ||
        ref.phone_number?.includes(search) ||
        ref.email_address?.toLowerCase().includes(search) ||
        ref.ndis_number?.toLowerCase().includes(search) ||
        ref.referrer_first_name?.toLowerCase().includes(search) ||
        ref.referrer_last_name?.toLowerCase().includes(search)
      );
    }

    setFilteredReferrals(filtered);
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyLower = urgency?.toLowerCase() || '';
    switch (urgencyLower) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: 
        console.log('Unknown urgency level:', urgency);
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return <AlertCircle size={18} className="text-red-600" />;
      case 'high': return <AlertTriangle size={18} className="text-orange-600" />;
      case 'medium': return <Clock size={18} className="text-yellow-600" />;
      case 'low': return <CheckCircle size={18} className="text-green-600" />;
      default: return <Clock size={18} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatText = (text: string | null) => {
    if (!text) return '';
    return text.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Referral Management</h1>
          <p className="text-gray-600">Review and validate participant referrals</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{filteredReferrals.length}</span> of {referrals.length} referral{referrals.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => {
              console.log('🔍 Debug - All referrals:', referrals);
              console.log('🔍 Debug - Filtered referrals:', filteredReferrals);
              console.log('🔍 Debug - First referral keys:', referrals[0] ? Object.keys(referrals[0]) : 'No referrals');
            }}
            className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Debug
          </button>
          <button
            onClick={() => fetchReferrals(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, NDIS number, phone, email, or referrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Urgency</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      {filteredReferrals.length === 0 && referrals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No active referrals</h3>
          <p className="text-gray-400">No referrals are currently pending review</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Search className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No matching referrals</h3>
          <p className="text-gray-400">Try adjusting your search criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setUrgencyFilter('all');
            }}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReferrals.map((referral) => (
            <div key={referral.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold text-gray-800">
                          {referral.first_name} {referral.last_name}
                        </h3>
                        <div className="flex items-center gap-1" title={`${formatText(referral.urgency_level)} Priority`}>
                          {getUrgencyIcon(referral.urgency_level)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(referral.created_at)}
                        </span>
                        {referral.ndis_number && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              NDIS: {referral.ndis_number}
                            </span>
                          </>
                        )}
                        <span className="text-gray-400">•</span>
                        <span className="font-medium text-blue-700">
                          {formatText(referral.referred_for)}
                        </span>
                        {referral.disability_type && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">
                              {formatText(referral.disability_type)}
                            </span>
                          </>
                        )}
                      </div>
                      {referral.reason_for_referral && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {referral.reason_for_referral}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getUrgencyColor(referral.urgency_level)}`}>
                      {formatText(referral.urgency_level)}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(referral.status)}`}>
                      {formatText(referral.status)}
                    </span>
                    <button
                      onClick={() => navigate(`/referrals/${referral.id}`)}
                      className="ml-2 px-6 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralManagement;