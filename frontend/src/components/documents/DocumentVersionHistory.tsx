// frontend/src/components/documents/DocumentVersionHistory.tsx
import React, { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  Eye, 
  FileText, 
  Calendar, 
  User,
  GitBranch,
  Clock
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
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  participantId,
  documentId,
  isOpen,
  onClose
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions();
    }
  }, [isOpen, documentId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/document-workflow/documents/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading document versions:', error);
    } finally {
      setLoading(false);
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
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadVersion = async (versionId: number, filename: string) => {
    try {
      // Note: You'd need to implement a version-specific download endpoint
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/${documentId}/versions/${versionId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      alert('Error downloading document version');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" size={24} />
            Document Version History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading version history...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No Version History</h3>
              <p className="text-gray-400">This document has no version history available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    version.is_current 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          version.is_current 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          v{version.version_number}
                        </div>
                        {index < versions.length - 1 && (
                          <div className="w-px h-8 bg-gray-300 mx-auto mt-2"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            Version {version.version_number}
                            {version.is_current && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Current
                              </span>
                            )}
                          </h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {version.changes_summary || 'No changes summary provided'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span>{version.created_by}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{formatDate(version.created_at)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <FileText size={12} />
                            <span>{formatFileSize(version.file_size)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDownloadVersion(version.id, version.filename)}
                        className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        title="Download this version"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};