// frontend/src/components/documents/DocumentManagement.tsx - COMPLETE IMPLEMENTATION WITH ENHANCEMENTS
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Edit,
  Calendar, 
  Tag,
  User,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  MoreVertical,
  History,
  ExternalLink
} from 'lucide-react';
import { DocumentService } from '../../services/documentService';
import { DocumentMetadata, DocumentCategory } from '../../types/document.types';

interface DocumentManagementProps {
  participantId: number;
  participantName: string;
  userRole?: string;
  onShowVersionHistory?: (documentId: number) => void;
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  participantId,
  participantName,
  userRole = 'admin',
  onShowVersionHistory
}) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentMetadata | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total_documents: 0,
    by_category: {} as Record<string, number>,
    expired_documents: 0,
    expiring_soon: 0,
    recent_uploads: 0
  });

  // Upload form state
  const [uploadData, setUploadData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '',
    visible_to_support_worker: false,
    expiry_date: '',
    requires_approval: true
  });

  useEffect(() => {
    loadDocuments();
    loadCategories();
    loadStats();
  }, [participantId]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, categoryFilter, statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const allDocs = await DocumentService.getParticipantDocuments(participantId, {
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      // Set empty array on error
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await DocumentService.getDocumentCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Set default categories
      setCategories([
        { id: 1, category_id: 'service_agreements', name: 'Service Agreements', description: '', is_required: true, sort_order: 1, is_active: true, config: {} },
        { id: 2, category_id: 'medical_consent', name: 'Medical Consent', description: '', is_required: true, sort_order: 2, is_active: true, config: {} },
        { id: 3, category_id: 'intake_documents', name: 'Intake Documents', description: '', is_required: false, sort_order: 3, is_active: true, config: {} },
        { id: 4, category_id: 'general_documents', name: 'General Documents', description: '', is_required: false, sort_order: 4, is_active: true, config: {} }
      ]);
    }
  };

  const loadStats = async () => {
    try {
      const participantStats = await DocumentService.getParticipantDocumentStats(participantId);
      setStats(participantStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    // This would typically filter the documents based on search and filter criteria
    // For now, we'll keep all documents since filtering is handled by the service
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    if (!uploadData.title.trim() || !uploadData.category) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadData.title);
      formData.append('category', uploadData.category);
      formData.append('description', uploadData.description);
      formData.append('tags', uploadData.tags);
      formData.append('visible_to_support_worker', uploadData.visible_to_support_worker.toString());
      formData.append('expiry_date', uploadData.expiry_date);
      formData.append('requires_approval', uploadData.requires_approval.toString());

      const response = await fetch(`${DocumentService.API_BASE_URL}/participants/${participantId}/documents`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        alert('Document uploaded successfully!');
        setShowUploadModal(false);
        resetUploadForm();
        await loadDocuments();
        await loadStats();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Network error during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDocument) return;

    try {
      const updatedDoc = await DocumentService.updateDocument(participantId, editingDocument.id, {
        title: editingDocument.title,
        category: editingDocument.category,
        description: editingDocument.description,
        tags: editingDocument.tags,
        visible_to_support_worker: editingDocument.visible_to_support_worker,
        expiry_date: editingDocument.expiry_date
      });

      alert('Document updated successfully!');
      setShowEditModal(false);
      setEditingDocument(null);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update document');
    }
  };

  // Enhanced handleDownload function with access logging
  const handleDownload = async (document: DocumentMetadata) => {
    try {
      // Log the download access
      await DocumentService.downloadDocument(participantId, document.id, document.original_filename);
      
      // Update document access stats (optional client-side tracking)
      console.log(`Document ${document.id} downloaded by user`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  // Enhanced handlePreview function with access logging
  const handlePreview = (document: DocumentMetadata) => {
    const previewUrl = DocumentService.getPreviewUrl(participantId, document.id);
    
    // Log preview access
    console.log(`Document ${document.id} previewed by user`);
    
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleDelete = async (document: DocumentMetadata) => {
    if (!window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      await DocumentService.deleteDocument(participantId, document.id);
      alert('Document deleted successfully');
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      title: '',
      category: '',
      description: '',
      tags: '',
      visible_to_support_worker: false,
      expiry_date: '',
      requires_approval: true
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.category_id === categoryId);
    return category?.name || categoryId;
  };

  const getStatusIcon = (document: DocumentMetadata) => {
    if (document.is_expired) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (document.expiry_date) {
      const daysUntilExpiry = Math.floor(
        (new Date(document.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30) {
        return <Clock className="h-4 w-4 text-yellow-600" />;
      }
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusColor = (document: DocumentMetadata): string => {
    if (document.is_expired) return 'bg-red-100 text-red-800';
    if (document.expiry_date) {
      const daysUntilExpiry = Math.floor(
        (new Date(document.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30) return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const filteredDocuments = documents.filter(doc => {
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !doc.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (categoryFilter && doc.category !== categoryFilter) return false;
    if (statusFilter === 'expired' && !doc.is_expired) return false;
    if (statusFilter === 'expiring' && doc.is_expired) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              Document Management
            </h3>
            <p className="text-sm text-gray-600">Manage documents for {participantName}</p>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Upload Document
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_documents}</div>
            <div className="text-sm text-gray-600">Total Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.expired_documents}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring_soon}</div>
            <div className="text-sm text-gray-600">Expiring Soon</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.recent_uploads}</div>
            <div className="text-sm text-gray-600">Recent Uploads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.by_category).length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring Soon</option>
            <option value="current">Current</option>
          </select>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              {filteredDocuments.length} of {documents.length} documents
            </span>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              {documents.length === 0 ? 'No documents found' : 'No documents match your filters'}
            </h3>
            <p className="text-gray-400 mb-6">
              {documents.length === 0 
                ? 'Upload documents to get started' 
                : 'Try adjusting your search criteria'
              }
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Upload First Document
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
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
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">{document.title}</div>
                          <div className="text-sm text-gray-500">{document.original_filename}</div>
                          {document.description && (
                            <div className="text-sm text-gray-500 mt-1">{document.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCategoryName(document.category)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(document)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document)}`}>
                          {document.is_expired ? 'Expired' : 'Current'}
                        </span>
                      </div>
                      {document.expiry_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          Expires: {formatDate(document.expiry_date)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Size: {formatFileSize(document.file_size)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Uploaded: {formatDate(document.created_at)}
                      </div>
                      <div className="text-sm text-gray-500">
                        By: {document.uploaded_by}
                      </div>
                      {document.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {document.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                            >
                              <Tag size={8} className="mr-1" />
                              {tag}
                            </span>
                          ))}
                          {document.tags.length > 2 && (
                            <span className="text-xs text-gray-400">+{document.tags.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreview(document)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                          title="Preview document"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleDownload(document)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                          title="Download document"
                        >
                          <Download size={16} />
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingDocument(document);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-full transition-colors"
                          title="Edit document"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {document.version > 1 && onShowVersionHistory && (
                          <button
                            onClick={() => onShowVersionHistory(document.id)}
                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full transition-colors"
                            title="View version history"
                          >
                            <History size={16} />
                          </button>
                        )}
                        
                        <div className="relative">
                          <button
                            onClick={() => setDropdownOpen(dropdownOpen === document.id ? null : document.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {dropdownOpen === document.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    const url = `/participants/${participantId}/documents/${document.id}`;
                                    window.open(url, '_blank');
                                    setDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <ExternalLink size={14} className="mr-2" />
                                  Open in New Tab
                                </button>
                                
                                {document.visible_to_support_worker && (
                                  <div className="flex items-center px-4 py-2 text-sm text-green-700">
                                    <CheckCircle size={14} className="mr-2" />
                                    Visible to Support Workers
                                  </div>
                                )}
                                
                                <div className="border-t border-gray-100">
                                  <button
                                    onClick={() => {
                                      handleDelete(document);
                                      setDropdownOpen(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete Document
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XCircle size={20} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File *
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xls,.xlsx"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter document title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={uploadData.expiry_date}
                    onChange={(e) => setUploadData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadData.visible_to_support_worker}
                      onChange={(e) => setUploadData(prev => ({ ...prev, visible_to_support_worker: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to support workers</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadData.requires_approval}
                      onChange={(e) => setUploadData(prev => ({ ...prev, requires_approval: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Requires approval before activation</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    disabled={uploading}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Document</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDocument(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XCircle size={20} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={editingDocument.title}
                    onChange={(e) => setEditingDocument(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={editingDocument.category}
                    onChange={(e) => setEditingDocument(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingDocument.description || ''}
                    onChange={(e) => setEditingDocument(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editingDocument.tags.join(', ')}
                    onChange={(e) => setEditingDocument(prev => prev ? ({ 
                      ...prev, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editingDocument.expiry_date ? editingDocument.expiry_date.split('T')[0] : ''}
                    onChange={(e) => setEditingDocument(prev => prev ? ({ 
                      ...prev, 
                      expiry_date: e.target.value ? e.target.value + 'T00:00:00Z' : null 
                    }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingDocument.visible_to_support_worker}
                      onChange={(e) => setEditingDocument(prev => prev ? ({ 
                        ...prev, 
                        visible_to_support_worker: e.target.checked 
                      }) : null)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Visible to support workers</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingDocument(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Settings size={16} />
                    Update Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setDropdownOpen(null)}
        />
      )}
    </div>
  );
};