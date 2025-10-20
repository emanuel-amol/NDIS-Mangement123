// frontend/src/pages/participant-management/participants.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, Filter, Plus, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../../lib/api';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  ndis_number: string | null;
  phone_number: string;
  email_address: string | null;
  status: 'prospective' | 'onboarded' | 'active' | 'inactive';
  support_category: string;
  plan_start_date: string;
  plan_review_date: string;
  risk_level: 'low' | 'medium' | 'high';
  created_at: string;
}

interface ParticipantStats {
  total: number;
  active: number;
  prospective: number;
  onboarded: number;
  new_this_week: number;
}

const Participants: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<ParticipantStats>({
    total: 0,
    active: 0,
    prospective: 0,
    onboarded: 0,
    new_this_week: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchParticipants();
    fetchStats();
  }, [searchTerm, statusFilter, supportCategoryFilter]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (supportCategoryFilter !== 'all') params.support_category = supportCategoryFilter;
      
      const data = await api.participants.list(params);
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.participants.stats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewProfile = (participantId: number) => {
    navigate(`/participants/${participantId}`);
  };

  const handleEditParticipant = (participantId: number) => {
    // For now, redirect to profile page - you can create a separate edit page later
    navigate(`/participants/${participantId}/edit`);
  };

  const handleAddParticipant = () => {
    navigate('/participants/new');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'prospective':
        return <Clock className="text-yellow-500" size={16} />;
      case 'onboarded':
        return <CheckCircle className="text-blue-500" size={16} />;
      case 'active':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'inactive':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospective':
        return 'bg-yellow-100 text-yellow-800';
      case 'onboarded':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Participant Management</h1>
          <p className="text-gray-600">Manage participant profiles and lifecycle</p>
        </div>
        <button 
          onClick={handleAddParticipant}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Participant
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <User className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Participants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="text-yellow-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Prospective</p>
              <p className="text-2xl font-bold text-gray-900">{stats.prospective}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <div className="flex items-center">
            <User className="text-blue-400 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Onboarded</p>
              <p className="text-2xl font-bold text-gray-900">{stats.onboarded}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Calendar className="text-purple-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">New This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new_this_week}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, NDIS number, or email..."
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
              <option value="prospective">Prospective</option>
              <option value="onboarded">Onboarded</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={supportCategoryFilter}
              onChange={(e) => setSupportCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="core-support">Core Support</option>
              <option value="capacity-building-support">Capacity Building</option>
              <option value="capital-support">Capital Support</option>
              <option value="assistance-with-daily-living">Daily Living</option>
              <option value="transport">Transport</option>
              <option value="social-and-community-participation">Community Participation</option>
              <option value="employment-support">Employment Support</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {participants.map((participant) => (
          <div key={participant.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {participant.first_name} {participant.last_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {participant.ndis_number || 'NDIS Number Pending'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(participant.status)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(participant.status)}`}>
                  {participant.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Risk Level:</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getRiskLevelColor(participant.risk_level)}`}>
                  {participant.risk_level}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Phone:</span>
                <span className="text-sm text-gray-800">{participant.phone_number}</span>
              </div>
              
              {participant.email_address && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="text-sm text-gray-800 truncate max-w-32" title={participant.email_address}>
                    {participant.email_address}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Support Category:</span>
                <span className="text-sm text-gray-800 text-right">
                  {participant.support_category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Plan Period:</span>
              </div>
              <div className="text-sm text-gray-800">
                {formatDate(participant.plan_start_date)} - {formatDate(participant.plan_review_date)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Created: {formatDate(participant.created_at)}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => handleViewProfile(participant.id)}
                className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded hover:bg-blue-100 text-sm transition-colors"
              >
                View Profile
              </button>
              <button 
                onClick={() => handleEditParticipant(participant.id)}
                className="flex-1 bg-gray-50 text-gray-600 py-2 px-3 rounded hover:bg-gray-100 text-sm transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {participants.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No participants found</h3>
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'all' || supportCategoryFilter !== 'all' 
              ? 'Try adjusting your search criteria' 
              : 'Start by converting referrals to participants or adding participants directly'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Participants;