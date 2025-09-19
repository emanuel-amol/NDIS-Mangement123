// frontend/src/pages/documents/DocumentViewer.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  Tag, 
  User, 
  FileText,
  AlertTriangle,
  Clock,
  History,
  ExternalLink,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { DocumentMetadata } from '../../types/document.types';
import { DocumentService } from '../../services/documentService';

export default function DocumentViewer() {
  const { participantId, documentId } = useParams<{ participantId: string; documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantName, setParticipantName] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (participantId && documentId) {
      fetchDocument();
      fetchParticipantName();
    }
  }, [participantId, documentId]);

  const fetchDocument = async () => {
    try {
      const data = await DocumentService.getDocument(parseInt(participantId!), parseInt(documentId!));
      setDocument(data);
    } catch (error) {
      console.error('Error fetching document:', error);
      setPreviewError('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantName = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (response.ok) {
        const participant = await response.json();
        setParticipantName(`${participant.first_name} ${participant.last_name}`);
      }
    } catch (error) {
      console.error('Error fetching participant name:', error);
      setParticipantName('Unknown Participant');
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    
    try {
      await DocumentService.downloadDocument(
        parseInt(participantId!), 
        document.id, 
        document.original_filename
      );
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    
    if (!window.confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      await DocumentService.deleteDocument(parseInt(participantId!), document.id);
      alert('Document deleted successfully');
      navigate(`/participants/${participantId}/documents`);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  const renderDocumentPreview = () => {
    if (!document) return null;

    // Use the DocumentService method to get the correct preview URL
    const previewUrl = DocumentService.getPreviewUrl(parseInt(participantId!), document.id);

    // Handle different file types
    if (document.mime_type.startsWith('image/')) {
      return (
        <div className="relative bg-gray-100 rounded-lg p-4">
          <img 
            src={previewUrl}
            alt={document.title}
            className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            onError={() => setPreviewError('Failed to load image preview')}
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-xs px-3"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>
        </div>
      );
    }

    if (document.mime_type === 'application/pdf') {
      return (
        <div className="w-full">
          <div className="bg-gray-100 rounded-lg p-2 mb-4">
            <iframe
              src={previewUrl}
              className="w-full h-[600px] border-0 rounded"
              title={document.title}
              onError={() => setPreviewError('PDF preview not supported in this browser')}
            />
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <FileText className="text-blue-600 mr-2" size={20} />
              <div>
                <p className="text-sm font-medium text-blue-800">PDF Document Preview</p>
                <p className="text-sm text-blue-600">
                  If the preview doesn't load properly, try downloading the file or opening in a new tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (document.mime_type === 'text/plain') {
      return (
        <div className="w-full">
          <iframe
            src={previewUrl}
            className="w-full h-96 border rounded-lg bg-white"
            title={document.title}
            onError={() => setPreviewError('Text preview not available')}
          />
        </div>
      );
    }

    // For other file types, show download options
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
        <div className="text-6xl mb-4">{getFileIcon(document.mime_type)}</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{document.original_filename}</h3>
        <p className="text-gray-600 mb-4">{formatFileSize(document.file_size)}</p>
        <p className="text-sm text-gray-500 mb-6">
          Preview not available for this file type.<br/>
          Download the file to view its contents.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download size={16} />
            Download File
          </button>
          <button
            onClick={() => window.open(previewUrl, '_blank')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ExternalLink size={16} />
            Open in New Tab
          </button>
        </div>
      </div>
    );
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'service_agreements': 'Service Agreements',
      'medical_consent': 'Medical Consent',
      'intake_documents': 'Intake Documents',
      'general_documents': 'General Documents',
      'reporting_documents': 'Reporting Documents',
      'care_plans': 'Care Plans',
      'risk_assessments': 'Risk Assessments'
    };
    return categoryMap[category] || category;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    return '📄';
  };

  const isExpired = (): boolean => {
    if (!document?.expiry_date) return false;
    return new Date(document.expiry_date) < new Date();
  };

  const isExpiringSoon = (): boolean => {
    if (!document?.expiry_date) return false;
    const expiry = new Date(document.expiry_date);
    const soon = new Date();
    soon.setDate(soon.getDate() + 30); // 30 days warning
    return expiry <= soon && expiry >= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-6">The requested document could not be found.</p>
          <button 
            onClick={() => navigate(`/participants/${participantId}/documents`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participantId}/documents`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Documents
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{document.title}</h1>
                <p className="text-sm text-gray-600">Document for {participantName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => window.open(DocumentService.getPreviewUrl(parseInt(participantId!), document.id), '_blank')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <ExternalLink size={16} />
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
              
              {previewError ? (
                <div className="border-2 border-red-300 rounded-lg p-8 text-center bg-red-50">
                  <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-red-800 mb-2">Preview Error</h3>
                  <p className="text-red-600 mb-4">{previewError}</p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Download size={16} />
                    Download File Instead
                  </button>
                </div>
              ) : (
                renderDocumentPreview()
              )}
            </div>
          </div>

          {/* Document Details */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-3">
                {isExpired() ? (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="text-red-600 mr-2" size={20} />
                    <div>
                      <p className="font-medium text-red-800">Document Expired</p>
                      <p className="text-sm text-red-600">This document has passed its expiry date</p>
                    </div>
                  </div>
                ) : isExpiringSoon() ? (
                  <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="text-yellow-600 mr-2" size={20} />
                    <div>
                      <p className="font-medium text-yellow-800">Expiring Soon</p>
                      <p className="text-sm text-yellow-600">This document expires within 30 days</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Eye className="text-green-600 mr-2" size={20} />
                    <div>
                      <p className="font-medium text-green-800">Document Active</p>
                      <p className="text-sm text-green-600">This document is current and valid</p>
                    </div>
                  </div>
                )}

                {document.visible_to_support_worker && (
                  <div className="flex items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <Eye className="text-purple-600 mr-2" size={16} />
                    <p className="text-sm text-purple-800">Visible to support workers</p>
                  </div>
                )}

                {document.version > 1 && (
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <History className="text-blue-600 mr-2" size={16} />
                    <p className="text-sm text-blue-800">Version {document.version} (has previous versions)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">{getCategoryName(document.category)}</p>
                </div>
                
                {document.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{document.description}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">File Size</label>
                  <p className="text-gray-900">{formatFileSize(document.file_size)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">File Type</label>
                  <p className="text-gray-900">{document.mime_type}</p>
                </div>
                
                {document.expiry_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expiry Date</label>
                    <div className="flex items-center">
                      <Calendar size={16} className="text-gray-400 mr-2" />
                      <p className="text-gray-900">{formatDate(document.expiry_date)}</p>
                    </div>
                  </div>
                )}
                
                {document.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {document.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                        >
                          <Tag size={10} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Uploaded By</label>
                  <div className="flex items-center">
                    <User size={16} className="text-gray-400 mr-2" />
                    <p className="text-gray-900">{document.uploaded_by}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Upload Date</label>
                  <p className="text-gray-900">{formatDate(document.created_at)}</p>
                </div>
                
                {document.updated_at && document.updated_at !== document.created_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{formatDate(document.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Edit size={16} />
                  Edit Document
                </button>
                
                {document.version > 1 && (
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <History size={16} />
                    View Version History
                  </button>
                )}
                
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  Delete Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}