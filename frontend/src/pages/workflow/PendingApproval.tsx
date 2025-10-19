// frontend/src/pages/workflow/PendingApproval.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Search, Filter, RefreshCw, Eye, Heart, Shield, 
  FileText, DollarSign, CheckCircle, X, Check 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  ndis_number: string | null;
  status: string;
  workflow: {
    care_plan_completed: boolean;
    risk_assessment_completed: boolean;
    documents_generated: boolean;
    quotation_generated: boolean;
    manager_review_status: string;
    manager_comments: string | null;
    workflow_notes: string | null;
    manager_reviewed_at: string | null;
  };
}

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  useEffect(() => {
    fetchPendingParticipants();
  }, []);

  const fetchPendingParticipants = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/participants`);
      const allParticipants = await response.json();
      
      const prospective = allParticipants.filter((p: any) => p.status === 'prospective');
      
      const withWorkflow = await Promise.all(
        prospective.map(async (p: any) => {
          try {
            const wfRes = await fetch(`${API_BASE_URL}/care/participants/${p.id}/prospective-workflow`);
            const workflow = wfRes.ok ? await wfRes.json() : null;
            
            if (!workflow) return null;
            
            // Include if pending OR approved (but not yet converted)
            if (workflow.manager_review_status === 'pending' || 
                workflow.manager_review_status === 'approved') {
              return { ...p, workflow };
            }
            
            return null;
          } catch (err) {
            console.error(`Error fetching workflow for ${p.id}:`, err);
            return null;
          }
        })
      );
      
      setParticipants(withWorkflow.filter((p): p is Participant => p !== null));
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openReviewModal = (participantId: number, action: 'approve' | 'reject') => {
    setSelectedParticipant(participantId);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedParticipant(null);
    setReviewAction(null);
    setReviewComments('');
  };

  const submitReview = async () => {
    if (!selectedParticipant || !reviewAction) return;
    
    if (reviewAction === 'reject' && !reviewComments.trim()) {
      alert('Please provide comments when rejecting');
      return;
    }

    try {
      const endpoint = reviewAction === 'approve'
        ? `${API_BASE_URL}/care/participants/${selectedParticipant}/manager-approve`
        : `${API_BASE_URL}/care/participants/${selectedParticipant}/manager-reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reviewAction === 'reject' 
          ? JSON.stringify({ comments: reviewComments })
          : undefined
      });

      if (response.ok) {
        alert(`✅ Successfully ${reviewAction}d participant`);
        closeReviewModal();
        await fetchPendingParticipants();
      } else {
        const error = await response.json();
        alert(`❌ ${error.detail || 'Failed to submit review'}`);
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  const convertToOnboarded = async (participantId: number) => {
    if (!window.confirm('Convert this participant to Onboarded status? This action finalizes their setup.')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/convert-to-onboarded`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        alert('✅ Participant successfully converted to Onboarded!');
        await fetchPendingParticipants();
      } else {
        const error = await response.json();
        alert(`❌ ${error.detail || 'Failed to convert participant'}`);
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredParticipants = participants.filter(p => {
    if (searchTerm && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && p.workflow.manager_review_status !== 'pending') {
        return false;
      }
      if (statusFilter === 'approved' && p.workflow.manager_review_status !== 'approved') {
        return false;
      }
    }
    
    return true;
  });

  const stats = {
    total: participants.length,
    pending: participants.filter(p => p.workflow.manager_review_status === 'pending').length,
    approved: participants.filter(p => p.workflow.manager_review_status === 'approved').length,
    readyToConvert: participants.filter(p => p.workflow.manager_review_status === 'approved').length
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
          <h1 className="text-3xl font-bold text-gray-900">Pending Approval</h1>
          <p className="text-gray-600 mt-1">Review and approve participants for onboarding</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchPendingParticipants(); }}
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
          <div className="text-sm text-gray-600">Total in Queue</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-sm text-gray-600">Awaiting Review</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-gray-900">{stats.readyToConvert}</div>
          <div className="text-sm text-gray-600">Ready to Convert</div>
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-4">
        {filteredParticipants.map(participant => {
          const isPending = participant.workflow.manager_review_status === 'pending';
          const isApproved = participant.workflow.manager_review_status === 'approved';

          return (
            <div 
              key={participant.id} 
              className={`bg-white rounded-lg shadow border ${isApproved ? 'border-l-4 border-l-green-500' : ''}`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {participant.first_name} {participant.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {participant.phone_number}
                        {participant.email_address && ` • ${participant.email_address}`}
                      </p>
                      {participant.ndis_number && (
                        <p className="text-sm text-gray-500">NDIS: {participant.ndis_number}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isPending ? (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        Pending Review
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Approved
                      </span>
                    )}
                  </div>
                </div>

                {/* Completion Checklist */}
                <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                  <CompletionIcon 
                    icon={Heart}
                    label="Care Plan"
                    completed={participant.workflow.care_plan_completed}
                  />
                  <CompletionIcon 
                    icon={Shield}
                    label="Risk"
                    completed={participant.workflow.risk_assessment_completed}
                  />
                  <CompletionIcon 
                    icon={FileText}
                    label="Documents"
                    completed={participant.workflow.documents_generated}
                  />
                  <CompletionIcon 
                    icon={DollarSign}
                    label="Quote"
                    completed={participant.workflow.quotation_generated}
                  />
                </div>

                {/* Notes */}
                {participant.workflow.workflow_notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">Workflow Notes</div>
                    <div className="text-sm text-blue-800">{participant.workflow.workflow_notes}</div>
                  </div>
                )}

                {participant.workflow.manager_comments && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-900 mb-1">Manager Comments</div>
                    <div className="text-sm text-yellow-800">{participant.workflow.manager_comments}</div>
                  </div>
                )}

                {participant.workflow.manager_reviewed_at && (
                  <div className="mb-4 text-sm text-gray-500">
                    Reviewed: {formatDate(participant.workflow.manager_reviewed_at)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => navigate(`/participants/${participant.id}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Eye size={16} />
                    View Full Profile
                  </button>

                  <button
                    onClick={() => navigate(`/care/plan/${participant.id}`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Heart size={16} />
                    View Care Plan
                  </button>

                  <button
                    onClick={() => navigate(`/participants/${participant.id}/documents`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <FileText size={16} />
                    Documents
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => openReviewModal(participant.id, 'reject')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm ml-auto"
                      >
                        <X size={16} />
                        Reject
                      </button>
                      <button
                        onClick={() => openReviewModal(participant.id, 'approve')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => convertToOnboarded(participant.id)}
                      className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold ml-auto"
                    >
                      <CheckCircle size={16} />
                      Convert to Onboarded
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredParticipants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No participants pending approval</h3>
          <p className="text-gray-400">
            {searchTerm || statusFilter !== 'pending' 
              ? 'Try adjusting your filters' 
              : 'All reviews are complete'}
          </p>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {reviewAction === 'approve' ? 'Approve Participant' : 'Reject Participant'}
              </h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                {reviewAction === 'approve' 
                  ? 'This participant will be marked as approved and ready for onboarding conversion.' 
                  : 'Please provide feedback for why this participant is being rejected.'}
              </p>
              
              {reviewAction === 'reject' && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (Required) *
                  </label>
                  <textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain what needs to be corrected or improved..."
                  />
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeReviewModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                className={`px-4 py-2 rounded-lg font-medium ${
                  reviewAction === 'approve' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {reviewAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for completion icons
const CompletionIcon: React.FC<{
  icon: React.ElementType;
  label: string;
  completed: boolean;
}> = ({ icon: Icon, label, completed }) => (
  <div className="text-center">
    <Icon className={`w-8 h-8 mx-auto mb-1 ${completed ? 'text-green-500' : 'text-gray-400'}`} />
    <div className="text-xs font-medium">{label}</div>
  </div>
);

export default PendingApproval;