// frontend/src/components/documents/DocumentManagement.tsx - FIXED VERSION WITH BETTER ERROR HANDLING
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Upload, 
  Search, 
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  Tag,
  FolderOpen,
  History,
  ExternalLink
} from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentService } from '../../services/documentService';
import { 
  DocumentMetadata, 
  DocumentSearchFilters, 
  DocumentStats,
  DocumentCategory
} from '../../types/document.types';

interface DocumentManagementProps {
  participantId: number;
  participantName: string;
  userRole?: 'admin' | 'manager' | 'support_worker';
}

export const DocumentManagement: React.FC<DocumentManagementProps> = ({
  participantId,
  participantName,
  userRole = 'support_worker'
}) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DocumentSearchFilters>({
    participant_id: participantId
  });
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'category'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadInitialData();
  }, [participantId]);

  useEffect(() => {
    fetchDocuments();
  }, [participantId, filters, sortBy, sortOrder, searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        fetchDocuments(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const fetchedCategories = await DocumentService.getDocumentCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const searchFilters: DocumentSearchFilters = {
        ...filters,
        search_query: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const data = await DocumentService.getParticipantDocuments(participantId, searchFilters);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await DocumentService.getParticipantDocumentStats(participantId);
      setStats(data);
    } catch (error) {
      console.error('Error fetching document stats:', error);
    }
  };

  const handleDownload = async (document: DocumentMetadata) => {
    try {
      await DocumentService.downloadDocument(participantId, document.id, document.original_filename);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert(`Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleView = (document: DocumentMetadata) => {
    // Navigate to document viewer
    const url = `/participants/${participantId}/documents/${document.id}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (document: DocumentMetadata) => {
    if (!window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      console.log(`Attempting to delete document ${document.id} for participant ${participantId}`);
      
      await DocumentService.deleteDocument(participantId, document.id);
      
      console.log('Delete successful, updating UI');
      
      // Remove from local state immediately
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Refresh stats
      await fetchStats();
      
      // Show success message
      alert('Document deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting document:', error);
      
      let errorMessage = 'Failed to delete document';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Error: ${errorMessage}`);
      
      // Refresh the document list to make sure we have the correct state
      await fetchDocuments();
    }
  };

  const handleUploadSuccess = async (newDocument: DocumentMetadata) => {
    console.log('Upload successful:', newDocument);
    
    // Add to local state immediately
    setDocuments(prev => [newDocument, ...prev]);
    
    // Refresh stats
    await fetchStats();
    
    // Close upload modal
    setShowUpload(false);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.category_id === categoryId);
    return category?.name || categoryId;
  };

  const canEdit = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Document Management</h2>
          <p className="text-gray-600">Managing documents for {participantName}</p>
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Upload size={20} />
            Upload Document
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <FileText className="text-blue-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center">
              <AlertTriangle className="text-red-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expired_documents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center">
              <Clock className="text-yellow-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiring_soon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <Upload className="text-green-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Recent Uploads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recent_uploads}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search documents by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={filters.is_expired === undefined ? '' : filters.is_expired.toString()}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              is_expired: e.target.value === '' ? undefined : e.target.value === 'true'
            }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="false">Active</option>
            <option value="true">Expired</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'created_at' | 'title' | 'category')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">Sort by Date</option>
            <option value="title">Sort by Name</option>
            <option value="category">Sort by Category</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No documents found</h3>
            <p className="text-gray-400">
              {searchTerm || filters.category ? 'Try adjusting your search criteria' : 'Upload your first document to get started'}
            </p>
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
                        <span className="text-2xl mr-3">{DocumentService.getFileIcon(document.mime_type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {document.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {document.original_filename} • {DocumentService.formatFileSize(document.file_size)}
                          </div>
                          {document.description && (
                            <div className="text-xs text-gray-400 mt-1">
                              {document.description}
                            </div>
                          )}
                          {document.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {document.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                                >
                                  <Tag size={10} className="mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCategoryName(document.category)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {DocumentService.isExpired(document.expiry_date) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle size={12} className="mr-1" />
                            Expired
                          </span>
                        ) : DocumentService.isExpiringSoon(document.expiry_date) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock size={12} className="mr-1" />
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                        
                        {document.visible_to_support_worker && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Eye size={12} className="mr-1" />
                            Visible to SW
                          </span>
                        )}
                        
                        {document.version > 1 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            v{document.version}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {DocumentService.formatDate(document.created_at)}
                      </div>
                      <div className="text-xs text-gray-400">
                        by {document.uploaded_by}
                      </div>
                      {document.expiry_date && (
                        <div className="text-xs text-gray-400">
                          Expires: {DocumentService.formatDate(document.expiry_date)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(document)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        
                        {document.version > 1 && (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            title="View versions"
                          >
                            <History size={16} />
                          </button>
                        )}
                        
                        {canEdit && (
                          <button
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(document)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
      <DocumentUpload
        participantId={participantId}
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};