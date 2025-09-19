// frontend/src/pages/documents/DocumentManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  File, 
  Download, 
  Eye, 
  Trash2, 
  Filter, 
  Search,
  Plus,
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Document, DocumentCategory, DocumentStatus, DocumentFilter, DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from '../../types/document.types';

interface DocumentManagementProps {
  participantId?: number;
  showParticipantFilter?: boolean;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ 
  participantId, 
  showParticipantFilter = true 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DocumentFilter>({
    participantId: participantId
  });
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockDocuments: Document[] = [
        {
          id: 1,
          name: 'Care Plan - Jordan Smith.pdf',
          type: 'application/pdf',
          size: 2548736,
          uploadDate: '2025-01-15T10:30:00Z',
          uploadedBy: 'Sarah Wilson',
          participantId: 1,
          category: 'care-plan',
          status: 'approved',
          description: 'Initial care plan for Jordan Smith',
          tags: ['initial', 'approved']
        },
        {
          id: 2,
          name: 'Risk Assessment - Jordan Smith.pdf',
          type: 'application/pdf',
          size: 1847293,
          uploadDate: '2025-01-16T14:20:00Z',
          uploadedBy: 'Michael Chen',
          participantId: 1,
          category: 'risk-assessment',
          status: 'pending',
          description: 'Environmental risk assessment',
          tags: ['pending-review']
        },
        {
          id: 3,
          name: 'Medical Report - Dr Johnson.pdf',
          type: 'application/pdf',
          size: 3294857,
          uploadDate: '2025-01-12T09:15:00Z',
          uploadedBy: 'Admin User',
          participantId: 2,
          category: 'medical-reports',
          status: 'approved',
          description: 'Neurological assessment report',
          tags: ['medical', 'neurology']
        }
      ];

      // Apply filters
      let filteredDocs = mockDocuments;
      
      if (filter.participantId) {
        filteredDocs = filteredDocs.filter(doc => doc.participantId === filter.participantId);
      }
      
      if (filter.category) {
        filteredDocs = filteredDocs.filter(doc => doc.category === filter.category);
      }
      
      if (filter.status) {
        filteredDocs = filteredDocs.filter(doc => doc.status === filter.status);
      }
      
      if (filter.searchTerm) {
        filteredDocs = filteredDocs.filter(doc => 
          doc.name.toLowerCase().includes(filter.searchTerm!.toLowerCase()) ||
          (doc.description && doc.description.toLowerCase().includes(filter.searchTerm!.toLowerCase()))
        );
      }

      setDocuments(filteredDocs);
      setLoading(false);
    }, 1000);
  }, [filter]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: DocumentStatus): string => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpload = async (file: File, category: DocumentCategory, description: string) => {
    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      const newDocument: Document = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'Current User',
        participantId: participantId,
        category: category,
        status: 'pending',
        description: description
      };
      
      setDocuments(prev => [newDocument, ...prev]);
      setUploading(false);
      setShowUploadModal(false);
      alert('Document uploaded successfully!');
    }, 2000);
  };

  const handleDownload = (document: Document) => {
    // Simulate download
    alert(`Downloading: ${document.name}`);
  };

  const handleView = (document: Document) => {
    // Simulate view
    alert(`Viewing: ${document.name}`);
  };

  const handleDelete = (documentId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Document deleted successfully!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-600">Manage participant documents and files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={filter.searchTerm || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filter.category || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value as DocumentCategory || undefined }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filter.status || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as DocumentStatus || undefined }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {DOCUMENT_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {showParticipantFilter && (
            <input
              type="number"
              placeholder="Participant ID"
              value={filter.participantId || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, participantId: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No documents found</h3>
            <p className="text-gray-400">Upload documents to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <File className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{document.name}</div>
                          {document.description && (
                            <div className="text-sm text-gray-500">{document.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {DOCUMENT_CATEGORIES.find(cat => cat.id === document.category)?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(document.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                          {DOCUMENT_STATUSES.find(status => status.value === document.status)?.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(document.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(document.uploadDate)}</div>
                      <div className="text-sm text-gray-500">by {document.uploadedBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(document)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-green-600 hover:text-green-900"
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
          participantId={participantId}
        />
      )}
    </div>
  );
};

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, category: DocumentCategory, description: string) => void;
  uploading: boolean;
  participantId?: number;
}

const UploadModal: React.FC<UploadModalProps> = ({ 
  onClose, 
  onUpload, 
  uploading, 
  participantId 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, category, description);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a description for this document..."
            />
          </div>

          {participantId && (
            <div className="text-sm text-gray-600">
              This document will be associated with Participant ID: {participantId}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentManagement;