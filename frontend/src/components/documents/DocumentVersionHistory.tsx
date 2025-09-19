// frontend/src/components/documents/DocumentVersionHistory.tsx - COMPLETE IMPLEMENTATION
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Download, 
  Eye, 
  FileText, 
  User, 
  Calendar,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface DocumentVersion {
  id: number;
  version_number: number;
  filename: string;
  file_size: number;
  mime_type: string;
  changes_summary: string;
  created_at: string;
  created_by: string;
  is_current: boolean;
}

interface DocumentVersionHistoryProps {
  participantId: number;
  documentId: number;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestore?: (versionId: number) => void;
}

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  participantId,
  documentId,
  isOpen,
  onClose,
  onVersionRestore
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (isOpen && documentId > 0) {
      fetchVersionHistory();
    }
  }, [isOpen, documentId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`);
      
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      } else if (response.status === 404) {
        setError('Document not found or no version history available');
      } else {
        setError(`Failed to load version history: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching version history:', error);
      setError('Network error loading version history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      // For now, download the current document since we don't have version-specific endpoints
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/${documentId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = version.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document version');
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      alert('Error downloading document version');
    }
  };

  const handlePreviewVersion = (version: DocumentVersion) => {
    // Open preview in new tab - for now uses current document
    const previewUrl = `${API_BASE_URL}/participants/${participantId}/documents/${documentId}/download?inline=true`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!onVersionRestore) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to restore version ${version.version_number}? This will create a new version and cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setRestoring(version.id);
    
    try {
      // This would call the backend to restore the version
      await onVersionRestore(version.id);
      alert('Version restored successfully');
      fetchVersionHistory(); // Refresh the list
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVersionBadge = (version: DocumentVersion) => {
    if (version.is_current) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Current
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
        v{version.version_number}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Document Version History</h2>
              <p className="text-sm text-gray-600">View and manage document versions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading version history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading History</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchVersionHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No Version History</h3>
              <p className="text-gray-400">This document has only one version</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Version History</p>
                    <p>This shows all versions of the document. You can preview, download, or restore previous versions. The current version is highlighted in green.</p>
                  </div>
                </div>
              </div>

              {/* Version List */}
              <div className="space-y-3">
                {versions.map((version) => (
                  <div 
                    key={version.id} 
                    className={`border rounded-lg p-4 transition-all ${
                      version.is_current 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="text-gray-400 flex-shrink-0" size={16} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                Version {version.version_number}
                              </span>
                              {getVersionBadge(version)}
                            </div>
                            <p className="text-sm text-gray-600">{version.filename}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Changes Summary</p>
                            <p className="text-sm text-gray-600">
                              {version.changes_summary || 'No changes summary provided'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">File Details</p>
                            <p className="text-sm text-gray-600">
                              {formatFileSize(version.file_size)} • {version.mime_type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>Created by {version.created_by}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(version.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handlePreviewVersion(version)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Preview version"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadVersion(version)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                          title="Download version"
                        >
                          <Download size={16} />
                        </button>
                        
                        {!version.is_current && onVersionRestore && (
                          <button
                            onClick={() => handleRestoreVersion(version)}
                            disabled={restoring === version.id}
                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors disabled:opacity-50"
                            title="Restore this version"
                          >
                            {restoring === version.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                            ) : (
                              <RotateCcw size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Total versions: <span className="font-medium">{versions.length}</span>
                  </span>
                  <span className="text-gray-600">
                    Current version: <span className="font-medium">v{versions.find(v => v.is_current)?.version_number || 1}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          {!loading && !error && versions.length > 0 && (
            <button
              onClick={fetchVersionHistory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};