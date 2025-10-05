// frontend/src/pages/referral/ReferralManagement.tsx - DEBUG VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  FileText,
  Phone,
  Mail,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

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
  
  // Representative
  rep_first_name: string | null;
  rep_last_name: string | null;
  rep_phone_number: string | null;
  rep_email_address: string | null;
  rep_relationship: string | null;
  
  // NDIS
  ndis_number: string | null;
  plan_type: string;
  plan_manager_name: string | null;
  plan_manager_agency: string | null;
  available_funding: string | null;
  plan_start_date: string | null;
  plan_review_date: string | null;
  client_goals: string;
  support_category: string;
  
  // Referrer
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_agency: string | null;
  referrer_role: string | null;
  referrer_email: string;
  referrer_phone: string;
  
  // Referral details
  referred_for: string;
  referred_for_other: string | null;
  reason_for_referral: string;
  urgency_level: string;
  current_supports: string | null;
  support_goals: string | null;
  accessibility_needs: string | null;
  cultural_considerations: string | null;
  
  // Status
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [expandedReferral, setExpandedReferral] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [referrals, searchTerm, statusFilter, urgencyFilter]);

  const fetchReferrals = async () => {
    try {
      console.log('🔍 Fetching referrals from:', `${API_BASE_URL}/participants/referrals`);
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received data:', data);
        console.log('📊 Number of referrals:', data.length);
        
        if (data.length > 0) {
          console.log('📋 First referral sample:', JSON.stringify(data[0], null, 2));
          console.log('📋 Fields in first referral:', Object.keys(data[0]));
        }
        
        setReferrals(data);
        setDebugInfo(`✅ Loaded ${data.length} referrals successfully`);
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        setDebugInfo(`❌ Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching referrals:', error);
      setDebugInfo(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;
    console.log('🔎 Starting filter with', referrals.length, 'referrals');

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ref => ref.status === statusFilter);
      console.log('📊 After status filter:', filtered.length);
    }

    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(ref => ref.urgency_level === urgencyFilter);
      console.log('📊 After urgency filter:', filtered.length);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(ref =>
        ref.first_name.toLowerCase().includes(search) ||
        ref.last_name.toLowerCase().includes(search) ||
        ref.phone_number.includes(search) ||
        ref.email_address?.toLowerCase().includes(search) ||
        ref.ndis_number?.toLowerCase().includes(search) ||
        ref.referrer_first_name.toLowerCase().includes(search) ||
        ref.referrer_last_name.toLowerCase().includes(search)
      );
      console.log('📊 After search filter:', filtered.length);
    }

    setFilteredReferrals(filtered);
    console.log('✅ Final filtered count:', filtered.length);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-teal-100 text-teal-800';
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

  const toggleExpand = (id: number) => {
    setExpandedReferral(expandedReferral === id ? null : id);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Debug Info Banner */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-mono text-blue-800">{debugInfo}</p>
          <button
            onClick={() => {
              console.log('🔍 Current state:');
              console.log('Total referrals:', referrals.length);
              console.log('Filtered referrals:', filteredReferrals.length);
              console.log('All referrals:', referrals);
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Log current state to console
          </button>
        </div>
      )}

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
            onClick={fetchReferrals}
            className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            🔄 Refresh
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
              <option value="approved">Approved</option>
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
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No referrals found</h3>
          <p className="text-gray-400">No referrals have been submitted yet</p>
          <button
            onClick={fetchReferrals}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
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
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {referral.first_name} {referral.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Calendar size={14} />
                          Submitted: {formatDate(referral.created_at)}
                          {referral.date_of_birth && (
                            <>
                              <span className="text-gray-400">•</span>
                              DOB: {formatDate(referral.date_of_birth)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full border ${getUrgencyColor(referral.urgency_level)}`}>
                      {formatText(referral.urgency_level)} priority
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(referral.status)}`}>
                      {formatText(referral.status)}
                    </span>
                    {referral.file_count > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600 flex items-center gap-1">
                        <FileText size={12} />
                        {referral.file_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <Phone size={12} />
                      Contact
                    </h4>
                    <p className="text-sm text-gray-800">{referral.phone_number}</p>
                    {referral.email_address && (
                      <p className="text-xs text-gray-600 truncate">{referral.email_address}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Support Details</h4>
                    <p className="text-sm text-gray-800">{formatText(referral.disability_type)}</p>
                    <p className="text-xs text-gray-600">{formatText(referral.support_category)}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Referrer</h4>
                    <p className="text-sm text-gray-800">
                      {referral.referrer_first_name} {referral.referrer_last_name}
                    </p>
                    {referral.referrer_agency && (
                      <p className="text-xs text-gray-600">{referral.referrer_agency}</p>
                    )}
                  </div>
                </div>

                {/* Referral Summary */}
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <h4 className="text-xs font-semibold text-blue-800 mb-1">Referral Purpose</h4>
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">{formatText(referral.referred_for)}</span>
                  </p>
                  {referral.reason_for_referral && (
                    <p className="text-xs text-blue-700 mt-2 line-clamp-2">{referral.reason_for_referral}</p>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedReferral === referral.id && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(referral, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => toggleExpand(referral.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {expandedReferral === referral.id ? (
                      <>
                        <ChevronUp size={16} />
                        Hide Debug Data
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Show Debug Data
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => navigate(`/referrals/${referral.id}`)}
                    className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    Review & Validate
                  </button>
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