// frontend/src/components/documents/DocumentVersionHistory.tsx - COMPLETE ENHANCED VERSION
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
  Info,
  GitBranch,
  Layers,
  History,
  Database,
  TrendingUp,
  BarChart3,
  Activity,
  Diff,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DocumentVersion {
  id: number;
  version_number: number;
  filename: string;
  file_size: number;
  mime_type: string;
  changes_summary: string;
  change_metadata?: {
    change_type?: string;
    changed_fields?: string[];
    field_changes?: Record<string, any>;
    file_size_change?: number;
    rollback_reason?: string;
    rolled_back_to_version?: number;
  };
  file_hash?: string;
  is_metadata_only?: boolean;
  created_at: string;
  created_by: string;
  is_current: boolean;
  replaced_at?: string;
  replaced_by_version_id?: number;
}

interface VersionAnalytics {
  total_versions: number;
  first_version_date: string;
  latest_version_date: string;
  unique_contributors: number;
  contributors: string[];
  versions_per_day: number;
  file_size_evolution: {
    initial_size: number;
    current_size: number;
    total_size_change: number;
    largest_size: number;
    smallest_size: number;
    average_size_change: number;
  };
  change_type_distribution: Record<string, number>;
  rollback_count: number;
}

interface VersionComparison {
  version1: {
    id: number;
    version_number: number;
    created_at: string;
    created_by: string;
    file_size: number;
    changes_summary: string;
  };
  version2: {
    id: number;
    version_number: number;
    created_at: string;
    created_by: string;
    file_size: number;
    changes_summary: string;
  };
  differences: {
    file_size_change: number;
    time_between_versions: number;
    different_creators: boolean;
    file_content_changed?: boolean;
  };
  change_analysis?: {
    change_type_1: string;
    change_type_2: string;
    different_change_types: boolean;
    file_size_change_1: number;
    file_size_change_2: number;
    affected_fields_1: string[];
    affected_fields_2: string[];
  };
}

interface DocumentVersionHistoryProps {
  participantId: number;
  documentId: number;
  documentTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestore?: (versionId: number) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  participantId,
  documentId,
  documentTitle = 'Document',
  isOpen,
  onClose,
  onVersionRestore
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [analytics, setAnalytics] = useState<VersionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'analytics' | 'compare'>('history');
  const [selectedVersions, setSelectedVersions] = useState<[number?, number?]>([undefined, undefined]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [comparingVersions, setComparingVersions] = useState(false);

  useEffect(() => {
    if (isOpen && documentId > 0) {
      fetchVersionHistory();
      fetchVersionAnalytics();
    }
  }, [isOpen, documentId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching version history for document ${documentId}`);
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/detailed`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Version history response:', data);

        const parsedVersions = Array.isArray(data)
          ? data
          : Array.isArray(data?.version_history)
            ? data.version_history
            : Array.isArray(data?.data)
              ? data.data
              : [];

        if (!Array.isArray(parsedVersions)) {
          console.warn('Version history payload missing iterable data');
          setVersions([]);
        } else {
          setVersions(parsedVersions as DocumentVersion[]);
        }
      } else if (response.status === 404) {
        console.warn('Document version history not found');
        setError('Document not found or no version history available');
      } else {
        console.error('Failed to load version history:', response.status, response.statusText);
        setError(`Failed to load version history: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching version history:', error);
      setError('Network error loading version history');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/analytics`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        console.warn('Analytics not available:', response.status);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const compareVersions = async (version1Id: number, version2Id: number) => {
    if (version1Id === version2Id) {
      alert('Please select two different versions to compare');
      return;
    }

    setComparingVersions(true);
    setComparison(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/versions/${version1Id}/compare/${version2Id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setComparison(data);
      } else {
        throw new Error('Failed to compare versions');
      }
    } catch (error) {
      console.error('Error comparing versions:', error);
      alert('Failed to compare versions');
    } finally {
      setComparingVersions(false);
    }
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/versions/${version.id}/download`
      );
      
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
    const previewUrl = `${API_BASE_URL}/documents/${documentId}/versions/${version.id}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!onVersionRestore) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to restore version ${version.version_number}?\n\n` +
      `This will create a new version and cannot be undone.\n` +
      `Current data will be replaced with version ${version.version_number} data.`
    );
    
    if (!confirmed) return;
    
    setRestoring(version.id);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/versions/${version.id}/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollback_reason: `Restored to version ${version.version_number} via version history`
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Version ${version.version_number} restored successfully!\nNew version ${result.new_version_number} created.`);
        await fetchVersionHistory(); // Refresh the list
        await fetchVersionAnalytics(); // Refresh analytics
        onVersionRestore(version.id);
      } else {
        throw new Error('Failed to restore version');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version. Please try again.');
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

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
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

  const getChangeTypeColor = (changeType?: string) => {
    switch (changeType) {
      case 'file_update': return 'bg-blue-100 text-blue-800';
      case 'metadata_update': return 'bg-purple-100 text-purple-800';
      case 'rollback': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'file_update': return <FileText size={12} />;
      case 'metadata_update': return <Database size={12} />;
      case 'rollback': return <RotateCcw size={12} />;
      default: return <Activity size={12} />;
    }
  };

  const handleVersionSelection = (versionId: number, position: 0 | 1) => {
    const newSelection: [number?, number?] = [...selectedVersions];
    newSelection[position] = versionId;
    setSelectedVersions(newSelection);
    
    if (newSelection[0] && newSelection[1]) {
      compareVersions(newSelection[0], newSelection[1]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
              <p className="text-sm text-gray-600">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b bg-gray-50">
          <div className="flex space-x-1 p-4">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <GitBranch size={16} className="mr-2 inline" />
              Version History
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={16} className="mr-2 inline" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'compare'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Diff size={16} className="mr-2 inline" />
              Compare
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 border-b-2 border-blue-600" />
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
            <>
              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Info Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Version History Features</p>
                        <p>View all versions, download previous versions, see detailed change summaries, and restore any version. The current version is highlighted in green.</p>
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
                                  {version.change_metadata?.change_type && (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(version.change_metadata.change_type)}`}>
                                      {getChangeTypeIcon(version.change_metadata.change_type)}
                                      <span className="ml-1 capitalize">{version.change_metadata.change_type.replace('_', ' ')}</span>
                                    </span>
                                  )}
                                  {version.is_metadata_only && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                      <Database size={10} className="mr-1" />
                                      Metadata Only
                                    </span>
                                  )}
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
                                
                                {version.change_metadata?.rollback_reason && (
                                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                                    <p className="text-xs text-orange-800">
                                      <strong>Rollback:</strong> {version.change_metadata.rollback_reason}
                                    </p>
                                    {version.change_metadata.rolled_back_to_version && (
                                      <p className="text-xs text-orange-600">
                                        Restored to version {version.change_metadata.rolled_back_to_version}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">File Details</p>
                                <p className="text-sm text-gray-600">
                                  {formatFileSize(version.file_size)} • {version.mime_type}
                                </p>
                                {version.file_hash && (
                                  <p className="text-xs text-gray-500 font-mono mt-1">
                                    Hash: {version.file_hash.substring(0, 16)}...
                                  </p>
                                )}
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
                              {version.replaced_at && (
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>Replaced {formatDate(version.replaced_at)}</span>
                                </div>
                              )}
                            </div>

                            {version.change_metadata?.changed_fields && version.change_metadata.changed_fields.length > 0 && (
                              <div className="mt-3 p-2 bg-gray-50 rounded">
                                <p className="text-xs font-medium text-gray-700 mb-1">Changed Fields:</p>
                                <div className="flex flex-wrap gap-1">
                                  {version.change_metadata.changed_fields.map((field, index) => (
                                    <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                      {field}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
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
                                  <Loader2 className="animate-spin h-4 w-4 border-b-2 border-orange-600" />
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

              {/* Analytics Tab */}
              {activeTab === 'analytics' && analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="text-blue-600" size={20} />
                        <span className="font-medium text-blue-900">Total Versions</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{analytics.total_versions}</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="text-green-600" size={20} />
                        <span className="font-medium text-green-900">Contributors</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{analytics.unique_contributors}</p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-purple-600" size={20} />
                        <span className="font-medium text-purple-900">Activity Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{analytics.versions_per_day.toFixed(2)}/day</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} />
                        File Size Evolution
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Initial Size:</span>
                          <span className="font-medium">{formatFileSize(analytics.file_size_evolution.initial_size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Size:</span>
                          <span className="font-medium">{formatFileSize(analytics.file_size_evolution.current_size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Change:</span>
                          <span className={`font-medium ${analytics.file_size_evolution.total_size_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analytics.file_size_evolution.total_size_change >= 0 ? '+' : ''}
                            {formatFileSize(Math.abs(analytics.file_size_evolution.total_size_change))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Largest Size:</span>
                          <span className="font-medium">{formatFileSize(analytics.file_size_evolution.largest_size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Activity size={16} />
                        Change Types
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.change_type_distribution).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                            <span className="font-medium text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                      {analytics.rollback_count > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-orange-600">Total Rollbacks:</span>
                            <span className="font-medium text-orange-600">{analytics.rollback_count}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <User size={16} />
                      Contributors
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analytics.contributors.map((contributor, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {contributor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    <p>
                      <strong>Document Timeline:</strong> First version created on {formatDate(analytics.first_version_date)}, 
                      latest version on {formatDate(analytics.latest_version_date)}.
                    </p>
                  </div>
                </div>
              )}

              {/* Compare Tab */}
              {activeTab === 'compare' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Compare Versions</h4>
                    <p className="text-sm text-blue-700">Select two versions to compare their differences</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Version</label>
                      <select
                        value={selectedVersions[0] || ''}
                        onChange={(e) => handleVersionSelection(parseInt(e.target.value), 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select first version...</option>
                        {versions.map(v => (
                          <option key={v.id} value={v.id}>
                            Version {v.version_number} - {formatDate(v.created_at)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Second Version</label>
                      <select
                        value={selectedVersions[1] || ''}
                        onChange={(e) => handleVersionSelection(parseInt(e.target.value), 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select second version...</option>
                        {versions.map(v => (
                          <option key={v.id} value={v.id}>
                            Version {v.version_number} - {formatDate(v.created_at)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {comparingVersions && (
                    <div className="text-center py-4">
                      <Loader2 className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Comparing versions...</p>
                    </div>
                  )}

                  {comparison && (
                    <div className="space-y-4">
                      <div className="bg-white border rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Version Comparison</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h6 className="font-medium text-blue-900 mb-2">Version {comparison.version1.version_number}</h6>
                            <p className="text-sm text-blue-700">Created: {formatDate(comparison.version1.created_at)}</p>
                            <p className="text-sm text-blue-700">By: {comparison.version1.created_by}</p>
                            <p className="text-sm text-blue-700">Size: {formatFileSize(comparison.version1.file_size)}</p>
                          </div>
                          
                          <div className="bg-green-50 p-3 rounded-lg">
                            <h6 className="font-medium text-green-900 mb-2">Version {comparison.version2.version_number}</h6>
                            <p className="text-sm text-green-700">Created: {formatDate(comparison.version2.created_at)}</p>
                            <p className="text-sm text-green-700">By: {comparison.version2.created_by}</p>
                            <p className="text-sm text-green-700">Size: {formatFileSize(comparison.version2.file_size)}</p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h6 className="font-medium text-gray-900 mb-3">Differences</h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">File Size Change</p>
                              <p className={`text-lg font-bold ${comparison.differences.file_size_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {comparison.differences.file_size_change >= 0 ? '+' : ''}
                                {formatFileSize(Math.abs(comparison.differences.file_size_change))}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Time Between</p>
                              <p className="text-lg font-bold text-blue-600">
                                {formatDuration(comparison.differences.time_between_versions)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Different Creators</p>
                              <p className={`text-lg font-bold ${comparison.differences.different_creators ? 'text-orange-600' : 'text-green-600'}`}>
                                {comparison.differences.different_creators ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {comparison.change_analysis && (
                          <div className="border-t pt-4 mt-4">
                            <h6 className="font-medium text-gray-900 mb-3">Change Analysis</h6>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-sm text-gray-600 mb-1">Change Types:</p>
                              <div className="flex gap-2 items-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  v{comparison.version1.version_number}: {comparison.change_analysis.change_type_1}
                                </span>
                                <ArrowRight size={14} className="text-gray-400" />
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  v{comparison.version2.version_number}: {comparison.change_analysis.change_type_2}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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
              onClick={() => {
                setVersions([]);
                setAnalytics(null);
                fetchVersionHistory();
                fetchVersionAnalytics();
              }}
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

export default DocumentVersionHistory;