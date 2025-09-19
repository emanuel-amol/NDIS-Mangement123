// frontend/src/components/documents/DocumentApproval.tsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  MessageSquare,
  FileText
} from 'lucide-react';

interface PendingApproval {
  id: number;
  participant_id: number;
  document_id: number;
  workflow_type: string;
  status: string;
  priority: string;
  due_date: string;
  metadata: {
    category: string;
    original_filename: string;
    requires_manager_approval: boolean;
  };
  created_at: string;
}

interface DocumentApprovalProps {
  className?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export const DocumentApproval: React.FC<DocumentApprovalProps> = ({ className = "" }) => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/document-workflow/workflows/pending-approvals`);
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data);
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (documentId: number, approve: boolean) => {
    const approverName = prompt('Enter your name:');
    if (!approverName) return;

    const approverRole = prompt('Enter your role:') || 'Manager';
    let comments = '';

    if (!approve) {
      comments = prompt('Enter rejection reason:') || '';
      if (!comments) return;
    } else {
      comments = prompt('Enter approval comments (optional):') || '';
    }

    setProcessing(prev => new Set(prev).add(documentId));

    try {
      const endpoint = approve ? 'approve' : 'reject';
      const response = await fetch(`${API_BASE_URL}/document-workflow/documents/${documentId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approver_name: approverName,
          approver_role: approverRole,
          comments: comments
        }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingApprovals(prev => prev.filter(approval => approval.document_id !== documentId));
        alert(`Document ${approve ? 'approved' : 'rejected'} successfully!`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${approve ? 'approving' : 'rejecting'} document:`, error);
      alert('Network error. Please try again.');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            Pending Document Approvals
          </h3>
          <p className="text-sm text-gray-600">
            {pendingApprovals.length} documents waiting for approval
          </p>
        </div>
        
        <button
          onClick={loadPendingApprovals}
          className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h4 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h4>
          <p className="text-gray-600">No documents pending approval at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                isOverdue(approval.due_date) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-gray-400" size={20} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {approval.metadata.original_filename}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Category: {approval.metadata.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>Participant ID: {approval.participant_id}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span className={isOverdue(approval.due_date) ? 'text-red-600 font-medium' : ''}>
                        Due: {formatDate(approval.due_date)}
                        {isOverdue(approval.due_date) && (
                          <span className="ml-1 text-red-600">(Overdue)</span>
                        )}
                      </span>
                    </div>
                    
                    <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(approval.priority)}`}>
                      {approval.priority} priority
                    </span>
                    
                    {approval.metadata.requires_manager_approval && (
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
                        Manager Approval Required
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleApproval(approval.document_id, true)}
                    disabled={processing.has(approval.document_id)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleApproval(approval.document_id, false)}
                    disabled={processing.has(approval.document_id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
              
              {isOverdue(approval.due_date) && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle size={16} />
                  <span>This approval is overdue and requires immediate attention</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};