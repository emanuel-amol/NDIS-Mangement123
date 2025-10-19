// frontend/src/pages/workflow/InProgress.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Search, Filter, RefreshCw, Heart, Shield, 
  FileText, DollarSign, CheckCircle, Clock, Eye, 
  Edit, Upload, Send, ChevronDown, ChevronUp 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  status: string;
  workflow: {
    care_plan_completed: boolean;
    risk_assessment_completed: boolean;
    documents_generated: boolean;
    quotation_generated: boolean;
    manager_review_status: string;
  };
}

const InProgress: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchInProgressParticipants();
  }, []);

  const fetchInProgressParticipants = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/participants`);
      const allParticipants = await response.json();
      
      const prospective = allParticipants.filter((p: any) => p.status === 'prospective');
      
      const withWorkflow = await Promise.all(
        prospective.map(async (p: any) => {
          try {
            const wfRes = await fetch(`${API_BASE_URL}/care/participants/${p.id}/prospective-workflow`);
            const workflow = wfRes.ok ? await wfRes.json() : getDefaultWorkflow();
            
            // Only include if NOT yet submitted for manager review
            if (workflow.manager_review_status === 'pending' || 
                workflow.manager_review_status === 'approved') {
              return null;
            }
            
            return { ...p, workflow };
          } catch (err) {
            console.error(`Error fetching workflow for ${p.id}:`, err);
            return { ...p, workflow: getDefaultWorkflow() };
          }
        })
      );
      
      setParticipants(withWorkflow.filter((p): p is Participant => p !== null));
    } catch (error) {
      console.error('Error fetching in-progress participants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultWorkflow = () => ({
    care_plan_completed: false,
    risk_assessment_completed: false,
    documents_generated: false,
    quotation_generated: false,
    manager_review_status: 'not_requested'
  });

  const submitForReview = async (participantId: number) => {
    if (!window.confirm('Submit this participant for manager review?')) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/submit-for-manager-review`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        alert('✅ Submitted for manager review!');
        await fetchInProgressParticipants();
      } else {
        const error = await response.json();
        alert(`❌ ${error.detail || 'Failed to submit'}`);
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  const getProgress = (workflow: Participant['workflow']) => {
    const steps = [
      workflow.care_plan_completed,
      workflow.risk_assessment_completed,
      workflow.documents_generated,
      workflow.quotation_generated
    ];
    return Math.round((steps.filter(Boolean).length / steps.length) * 100);
  };

  const isReadyToSubmit = (workflow: Participant['workflow']) => {
    return workflow.care_plan_completed && 
           workflow.risk_assessment_completed &&
           workflow.documents_generated &&
           workflow.quotation_generated;
  };

  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const filteredParticipants = participants.filter(p => {
    if (searchTerm && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (statusFilter !== 'all') {
      const progress = getProgress(p.workflow);
      if (statusFilter === 'incomplete' && progress >= 75) return false;
      if (statusFilter === 'nearly_complete' && progress < 75) return false;
      if (statusFilter === 'ready' && !isReadyToSubmit(p.workflow)) return false;
    }
    
    return true;
  });

  const stats = {
    total: participants.length,
    justStarted: participants.filter(p => getProgress(p.workflow) < 50).length,
    nearlyComplete: participants.filter(p => {
      const prog = getProgress(p.workflow);
      return prog >= 50 && prog < 100;
    }).length,
    ready: participants.filter(p => isReadyToSubmit(p.workflow)).length
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">In Progress</h1>
          <p className="text-gray-600 mt-1">Complete setup for prospective participants</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchInProgressParticipants(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total In Progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-gray-900">{stats.justStarted}</div>
          <div className="text-sm text-gray-600">Just Started</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-gray-900">{stats.nearlyComplete}</div>
          <div className="text-sm text-gray-600">Nearly Complete</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-gray-900">{stats.ready}</div>
          <div className="text-sm text-gray-600">Ready to Submit</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name..."
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
              <option value="all">All Stages</option>
              <option value="incomplete">Just Started</option>
              <option value="nearly_complete">Nearly Complete</option>
              <option value="ready">Ready to Submit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-4">
        {filteredParticipants.map(participant => {
          const progress = getProgress(participant.workflow);
          const ready = isReadyToSubmit(participant.workflow);
          const expanded = expandedCards.has(participant.id);
          
          return (
            <div key={participant.id} className="bg-white rounded-lg shadow border">
              {/* Card Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {participant.first_name} {participant.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {participant.phone_number}
                      {participant.email_address && ` • ${participant.email_address}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Progress */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{progress}% Complete</div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Ready Badge */}
                  {ready && (
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Ready
                    </div>
                  )}
                  
                  {/* Expand/Collapse */}
                  <button
                    onClick={() => toggleCard(participant.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expanded && (
                <div className="border-t p-4">
                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <ChecklistItem 
                        icon={Heart}
                        label="Care Plan"
                        completed={participant.workflow.care_plan_completed}
                        color="pink"
                      />
                      <ChecklistItem 
                        icon={Shield}
                        label="Risk Assessment"
                        completed={participant.workflow.risk_assessment_completed}
                        color="red"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <ChecklistItem 
                        icon={FileText}
                        label="Service Documents"
                        completed={participant.workflow.documents_generated}
                        color="purple"
                      />
                      <ChecklistItem 
                        icon={DollarSign}
                        label="Quotation"
                        completed={participant.workflow.quotation_generated}
                        color="green"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => navigate(`/participants/${participant.id}`)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <Eye size={16} />
                      View Profile
                    </button>
                    
                    <button
                      onClick={() => navigate(`/care/setup/${participant.id}`)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Edit size={16} />
                      Continue Setup
                    </button>
                    
                    <button
                      onClick={() => navigate(`/participants/${participant.id}/documents`)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <Upload size={16} />
                      Documents
                    </button>
                    
                    <button
                      onClick={() => navigate(`/quotations/participants/${participant.id}`)}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <DollarSign size={16} />
                      Quotation
                    </button>
                    
                    {ready && (
                      <button
                        onClick={() => submitForReview(participant.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm ml-auto"
                      >
                        <Send size={16} />
                        Submit for Review
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredParticipants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Clock className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No participants in progress</h3>
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'All prospective participants have been submitted for review'}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper component for checklist items
const ChecklistItem: React.FC<{
  icon: React.ElementType;
  label: string;
  completed: boolean;
  color: string;
}> = ({ icon: Icon, label, completed, color }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-2">
      <Icon size={16} className={`text-${color}-500`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {completed ? (
      <CheckCircle size={18} className="text-green-500" />
    ) : (
      <Clock size={18} className="text-gray-400" />
    )}
  </div>
);

export default InProgress;