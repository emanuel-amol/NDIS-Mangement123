// frontend/src/components/documents/DocumentApproval.tsx
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, FileText, User, Calendar } from 'lucide-react';

interface Document {
  id: number;
  filename: string;
  document_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_by?: string;
  submitted_at?: string;
  requires_approval?: boolean;
  approval_notes?: string;
}

interface DocumentApprovalProps {
  participantId: number;
  participantName: string;
}

export function DocumentApproval({ participantId, participantName }: DocumentApprovalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchPendingDocuments();
  }, [participantId]);

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents?status=pending_approval`);
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.log('Using mock approval data for demo');
        // Mock data for demo purposes
        setDocuments([
          {
            id: 1,
            filename: 'Care_Plan_v2.pdf',
            document_type: 'Care Plan',
            status: 'pending_approval',
            created_at: '2024-03-15T10:30:00Z',
            updated_at: '2024-03-15T10:30:00Z',
            submitted_by: 'Sarah Johnson',
            submitted_at: '2024-03-15T10:30:00Z',
            requires_approval: true
          },
          {
            id: 2,
            filename: 'Risk_Assessment_Updated.pdf',
            document_type: 'Risk Assessment',
            status: 'needs_review',
            created_at: '2024-03-14T14:20:00Z',
            updated_at: '2024-03-14T14:20:00Z',
            submitted_by: 'Mike Chen',
            submitted_at: '2024-03-14T14:20:00Z',
            requires_approval: true
          },
          {
            id: 3,
            filename: 'Support_Coordination_Report.docx',
            document_type: 'Support Report',
            status: 'draft',
            created_at: '2024-03-13T09:15:00Z',
            updated_at: '2024-03-13T09:15:00Z',
            submitted_by: 'Emma Wilson',
            requires_approval: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching pending documents:', error);
      // Use mock data on error
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (documentId: number, action: 'approve' | 'reject') => {
    try {
      setProcessing(true);
      
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: approvalNotes,
          approved_by: 'Current User' // This would come from auth context
        })
      });

      if (response.ok) {
        // Remove from pending list
        setDocuments(docs => docs.filter(doc => doc.id !== documentId));
        setSelectedDocument(null);
        setApprovalNotes('');
        
        // Show success message
        alert(`Document ${action}ed successfully!`);
      } else {
        // For demo, just simulate the action
        console.log(`Document ${documentId} ${action}ed with notes: ${approvalNotes}`);
        setDocuments(docs => docs.filter(doc => doc.id !== documentId));
        setSelectedDocument(null);
        setApprovalNotes('');
        alert(`Document ${action}ed successfully! (Demo mode)`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Error processing approval. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'needs_review': return 'bg-orange-100 text-orange-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading pending approvals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Document Approvals</h2>
          <p className="text-sm text-gray-600">
            Review and approve documents for {participantName}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
          <Clock size={16} />
          {documents.length} pending
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No documents pending approval for this participant.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => (
            <div key={document.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{document.filename}</h3>
                    <p className="text-sm text-gray-600">{document.document_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {document.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => window.open(`/participants/${participantId}/documents/${document.id}`, '_blank')}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setSelectedDocument(document)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
              
              {/* Document metadata */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  {document.submitted_by && (
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>Submitted by {document.submitted_by}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{formatDate(document.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Review Document
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedDocument.filename}</h4>
                <p className="text-sm text-gray-600">{selectedDocument.document_type}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted by {selectedDocument.submitted_by} on {formatDate(selectedDocument.updated_at)}
                </p>
                <button
                  onClick={() => window.open(`/participants/${participantId}/documents/${selectedDocument.id}`, '_blank')}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  <FileText size={14} />
                  Open Document in New Tab
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval decision..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleApproval(selectedDocument.id, 'approve')}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle size={16} />
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleApproval(selectedDocument.id, 'reject')}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={16} />
                  {processing ? 'Processing...' : 'Reject'}
                </button>
              </div>
              
              <button
                onClick={() => {
                  setSelectedDocument(null);
                  setApprovalNotes('');
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}