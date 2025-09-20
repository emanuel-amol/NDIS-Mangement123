// frontend/src/components/documents/DocumentApproval.tsx - COMPLETE IMPLEMENTATION
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  Calendar,
  AlertTriangle,
  MessageSquare,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface PendingApproval {
  id: number;
  participant_id: number;
  document_id: number;
  workflow_type: string;
  status: string;
  assigned_to?: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  workflow_data: {
    category?: string;
    requires_manager_approval?: boolean;
    original_filename?: string;
  };
  created_at: string;
  updated_at?: string;
}

interface DocumentApprovalProps {
  participantId?: number;
  participantName?: string;
}

export const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  participantId,
  participantName
}) => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [processingApproval, setProcessingApproval] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverRole, setApproverRole] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchPendingApprovals();
  }, [participantId]);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = participantId 
        ? `${API_BASE_URL}/document-workflow/workflows/pending-approvals?participant_id=${participantId}`
        : `${API_BASE_URL}/document-workflow/workflows/pending-approvals`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data);
      } else if (response.status === 404) {
        setPendingApprovals([]);
      } else {
        setError(`Failed to load pending approvals: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setError('Network error loading pending approvals');
      // Set some mock data for demo
      setPendingApprovals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingApprovals();
  };

  const handleApprovalAction = (approval: PendingApproval, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setApprovalComments('');
    setApproverName('System Manager'); // This would come from auth context
    setApproverRole('Manager'); // This would come from auth context
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedApproval || !approverName.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (approvalAction === 'reject' && !approvalComments.trim()) {
      alert('Comments are required when rejecting a document');
      return;
    }

    setProcessingApproval(selectedApproval.id);

    try {
      const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
      const response = await fetch(`${API_BASE_URL}/document-workflow/documents/${selectedApproval.document_id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approver_name: approverName,
          approver_role: approverRole,
          comments: approvalComments || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Document ${approvalAction}d successfully!`);
        setShowApprovalModal(false);
        setSelectedApproval(null);
        await fetchPendingApprovals(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to ${approvalAction} document: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Network error processing ${approvalAction}. Please try again.`);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleDownloadDocument = async (approval: PendingApproval) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${approval.participant_id}/documents/${approval.document_id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = approval.workflow_data.original_filename || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const handlePreviewDocument = (approval: PendingApproval) => {
    const previewUrl = `${API_BASE_URL}/participants/${approval.participant_id}/documents/${approval.document_id}/download?inline=true`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateRelative = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category?: string): string => {
    if (!category) return 'General';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredApprovals = pendingApprovals.filter(approval => {
    if (filterStatus !== 'all' && approval.status !== filterStatus) return false;
    if (filterPriority !== 'all' && approval.priority !== filterPriority) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading pending approvals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            Document Approvals
            {participantName && (
              <span className="text-base font-normal text-gray-600">for {participantName}</span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            Review and approve pending document submissions
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="text-yellow-500 mr-3" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingApprovals.filter(a => a.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingApprovals.filter(a => isOverdue(a.due_date)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center">
            <AlertTriangle className="text-orange-500 mr-3" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-500">High Priority</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingApprovals.filter(a => a.priority === 'high' || a.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText className="text-blue-500 mr-3" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-500">Manager Review</p>
              <p className="text-xl font-bold text-gray-900">
                {pendingApprovals.filter(a => a.workflow_data.requires_manager_approval).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={20} />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error Loading Approvals</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {pendingApprovals.length === 0 ? 'No Pending Approvals' : 'No Approvals Match Filters'}
          </h3>
          <p className="text-gray-400">
            {pendingApprovals.length === 0 
              ? 'All documents have been processed or no approvals are required.'
              : 'Try adjusting your filter criteria to see more results.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => (
            <div 
              key={approval.id} 
              className={`bg-white rounded-lg shadow border p-6 ${
                isOverdue(approval.due_date) ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {approval.workflow_data.original_filename || `Document ${approval.document_id}`}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(approval.priority)}`}>
                        {approval.priority}
                      </span>
                      {isOverdue(approval.due_date) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Category: {getCategoryName(approval.workflow_data.category)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>Participant ID: {approval.participant_id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Submitted: {formatDateRelative(approval.created_at)}</span>
                      </div>
                      {approval.due_date && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>Due: {formatDate(approval.due_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewDocument(approval)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Preview document"
                  >
                    <Eye size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDownloadDocument(approval)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Download document"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              {approval.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare size={14} className="text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Notes:</p>
                      <p className="text-sm text-gray-600">{approval.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Workflow Type: {approval.workflow_type.replace('_', ' ')}
                  {approval.workflow_data.requires_manager_approval && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                      Manager Approval Required
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleApprovalAction(approval, 'reject')}
                    disabled={processingApproval === approval.id}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <ThumbsDown size={16} />
                    Reject
                  </button>
                  
                  <button
                    onClick={() => handleApprovalAction(approval, 'approve')}
                    disabled={processingApproval === approval.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {processingApproval === approval.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <ThumbsUp size={16} />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve Document' : 'Reject Document'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {selectedApproval.workflow_data.original_filename || `Document ${selectedApproval.document_id}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approver Name *
                  </label>
                  <input
                    type="text"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={approverRole}
                    onChange={(e) => setApproverRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Clinical Supervisor">Clinical Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments {approvalAction === 'reject' && '*'}
                  </label>
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      approvalAction === 'approve' 
                        ? "Optional approval comments..." 
                        : "Please explain why this document is being rejected..."
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  disabled={processingApproval !== null}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={submitApproval}
                  disabled={processingApproval !== null || !approverName.trim() || (approvalAction === 'reject' && !approvalComments.trim())}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processingApproval !== null ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send size={16} />
                  )}
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};