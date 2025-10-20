// frontend/src/pages/documents/Documents.tsx - FIXED VERSION
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Search, Filter, Calendar, AlertTriangle, Sparkles } from "lucide-react";
import { DocumentService } from "../../services/documentService";
import { OrganizationDocumentStats, ExpiringDocument, ExpiredDocument } from "../../types/document.types";
import DocumentSearch from "../../components/DocumentSearch";
import DocumentInsights from "../../components/DocumentInsights";
import { useRAG } from "../../hooks/useRAG";

type Participant = {
  id: number;
  full_name: string;
  ndis_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  document_count: number;
  last_upload?: string;
  expired_documents: number;
  expiring_soon: number;
};

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function Documents() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [orgStats, setOrgStats] = useState<OrganizationDocumentStats | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'expiring'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'smart-search'>('overview');
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [trackedDocs, setTrackedDocs] = useState<number[]>([]);
  const [ragProcessingLoading, setRagProcessingLoading] = useState(false);
  const rag = useRAG(selectedParticipantId ?? undefined);
  const {
    status: ragStatus,
    statusLoading: ragStatusLoading,
    refreshStatus: refreshRagStatus,
    processingStatuses,
    fetchProcessingStatus,
  } = rag;

  useEffect(() => {
    loadDocumentData();
  }, []);

  useEffect(() => {
    if (!selectedParticipantId && participants.length > 0) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  useEffect(() => {
    const fetchProcessingStatusForParticipant = async () => {
      if (!selectedParticipantId) return;
      try {
        setRagProcessingLoading(true);
        const docs = await DocumentService.getParticipantDocuments(selectedParticipantId, {
          sort_by: 'updated_at',
          sort_order: 'desc',
          page_size: 5,
        });
        const docIds = docs.map((doc) => doc.id);
        setTrackedDocs(docIds);
        await Promise.all(docIds.map((docId) => fetchProcessingStatus(docId)));
      } catch (error) {
        console.error('Error fetching document processing status:', error);
      } finally {
        setRagProcessingLoading(false);
      }
    };

    fetchProcessingStatusForParticipant();
  }, [selectedParticipantId, fetchProcessingStatus]);

  const loadDocumentData = async () => {
    try {
      setLoading(true);
      
      // Load organization stats
      try {
        const stats = await DocumentService.getOrganizationDocumentStats();
        setOrgStats(stats);
      } catch (error) {
        console.error('Error loading org stats:', error);
        // Set default stats if API fails
        setOrgStats({
          total_documents: 0,
          participants_with_documents: 0,
          by_category: {},
          expired_documents: 0,
          expiring_soon: 0,
          recent_uploads: 0
        });
      }
      
      // Load expiring and expired documents (these endpoints might not exist yet)
      try {
        const [expiring, expired] = await Promise.all([
          DocumentService.getExpiringDocuments(30),
          DocumentService.getExpiredDocuments()
        ]);
        setExpiringDocs(expiring);
        setExpiredDocs(expired);
      } catch (error) {
        console.error('Error loading expiring/expired docs:', error);
        setExpiringDocs([]);
        setExpiredDocs([]);
      }
      
      // Load real participants from API
      try {
        const response = await fetch(`${API_BASE_URL}/participants`);
        if (response.ok) {
          const realParticipants = await response.json();
          
          // Process participants with document stats
          const participantsWithStats = await Promise.all(
            realParticipants.map(async (participant: any) => {
              try {
                const participantStats = await DocumentService.getParticipantDocumentStats(participant.id);
                const documents = await DocumentService.getParticipantDocuments(participant.id, {
                  sort_by: 'created_at',
                  sort_order: 'desc',
                  page_size: 1
                });
                
                return {
                  id: participant.id,
                  full_name: `${participant.first_name} ${participant.last_name}`,
                  ndis_number: participant.ndis_number,
                  email: participant.email_address,
                  phone: participant.phone_number,
                  document_count: participantStats.total_documents,
                  expired_documents: participantStats.expired_documents,
                  expiring_soon: participantStats.expiring_soon,
                  last_upload: documents.length > 0 ? documents[0].created_at : undefined
                };
              } catch (error) {
                // If participant has no documents or error, return with zero stats
                return {
                  id: participant.id,
                  full_name: `${participant.first_name} ${participant.last_name}`,
                  ndis_number: participant.ndis_number,
                  email: participant.email_address,
                  phone: participant.phone_number,
                  document_count: 0,
                  expired_documents: 0,
                  expiring_soon: 0,
                  last_upload: undefined
                };
              }
            })
          );
          
          setParticipants(participantsWithStats);
        } else {
          throw new Error('Failed to fetch participants');
        }
      } catch (error) {
        console.error('Error loading participants:', error);
        // Fall back to empty array if API fails
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error loading document data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRagOverview = async () => {
    if (!selectedParticipantId) return;
    try {
      setRagProcessingLoading(true);
      let docIds = trackedDocs;
      if (!docIds.length) {
        const docs = await DocumentService.getParticipantDocuments(selectedParticipantId, {
          sort_by: 'updated_at',
          sort_order: 'desc',
          page_size: 5,
        });
        docIds = docs.map((doc) => doc.id);
        setTrackedDocs(docIds);
      }
      await Promise.all(docIds.map((docId) => fetchProcessingStatus(docId)));
      await refreshRagStatus();
    } catch (error) {
      console.error('Error refreshing RAG overview:', error);
    } finally {
      setRagProcessingLoading(false);
    }
  };

  const list = useMemo(() => {
    let filtered = participants;
    
    // Apply search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.full_name.toLowerCase().includes(s) ||
          (p.ndis_number || "").toLowerCase().includes(s) ||
          (p.email || "").toLowerCase().includes(s)
      );
    }
    
    // Apply document status filter
    if (filterType === 'expired') {
      filtered = filtered.filter(p => p.expired_documents > 0);
    } else if (filterType === 'expiring') {
      filtered = filtered.filter(p => p.expiring_soon > 0);
    }
    
    return filtered;
  }, [participants, search, filterType]);

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === selectedParticipantId) ?? null,
    [participants, selectedParticipantId]
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Document Management</h1>
          <p className="text-gray-600">Manage participant documents across your organization</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/participants')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Users size={16} />
            Manage Participants
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('smart-search')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${
              activeTab === 'smart-search'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            Smart Search
          </button>
        </div>
        {activeTab === 'smart-search' && selectedParticipant && (
          <span className="text-xs font-medium text-gray-500">
            Viewing AI tools for {selectedParticipant.full_name}
          </span>
        )}
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center">
                <FileText className="text-blue-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{orgStats?.total_documents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center">
                <Users className="text-green-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Participants with Docs</p>
                  <p className="text-2xl font-bold text-gray-900">{orgStats?.participants_with_documents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertTriangle className="text-red-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Expired Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{orgStats?.expired_documents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center">
                <Calendar className="text-yellow-500 mr-3" size={24} />
                <div>
                  <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                  <p className="text-2xl font-bold text-gray-900">{orgStats?.expiring_soon || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search participants by name, NDIS number, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'expired' | 'expiring')}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Participants</option>
                  <option value="expired">Has Expired Documents</option>
                  <option value="expiring">Has Expiring Documents</option>
                </select>
              </div>
            </div>
            
            {/* Participants Table */}
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Participant</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Documents</th>
                  <th className="text-left p-3">Last Upload</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-500 text-center" colSpan={6}>
                      {search || filterType !== 'all' ? 'No participants found matching your criteria.' : 'No participants found.'}
                    </td>
                  </tr>
                ) : (
                  list.map((p) => {
                    const isSelected = selectedParticipantId === p.id;
                    const processingEntries = isSelected ? Object.values(processingStatuses) : [];
                    const hasFailed = processingEntries.some((entry) => entry.status === "failed");
                    const inProgress = processingEntries.some((entry) => entry.status === "processing");
                    const completed = processingEntries.length > 0 && processingEntries.every((entry) => entry.status === "completed");

                    return (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{p.full_name}</div>
                            <div className="text-sm text-gray-500">{p.ndis_number || "NDIS Number Pending"}</div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          <div>{p.phone || "-"}</div>
                          {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-blue-500" />
                              <span className="font-medium">{p.document_count}</span>
                              <span className="text-sm text-gray-500">documents</span>
                            </div>
                            {ragStatus?.embeddings_available && p.document_count > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                                <Sparkles className="h-3 w-3" />
                                AI-enhanced
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {formatDate(p.last_upload)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {p.expired_documents > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                <AlertTriangle size={12} className="mr-1" />
                                {p.expired_documents} expired
                              </span>
                            )}
                            {p.expiring_soon > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                <Calendar size={12} className="mr-1" />
                                {p.expiring_soon} expiring
                              </span>
                            )}
                            {p.expired_documents === 0 && p.expiring_soon === 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                All current
                              </span>
                            )}
                            {isSelected && processingEntries.length > 0 && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  hasFailed
                                    ? "bg-red-100 text-red-700"
                                    : inProgress
                                    ? "bg-yellow-100 text-yellow-700"
                                    : completed
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {hasFailed ? "Processing failed" : inProgress ? "Processing..." : "RAG ready"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              onClick={() => navigate(`/participants/${p.id}/documents`)}
                            >
                              Manage Documents
                            </button>
                            <button
                              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                              onClick={() => navigate(`/participants/${p.id}`)}
                            >
                              View Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Actions Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setFilterType('expired')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-2">
                  <AlertTriangle className="text-red-500 mr-2" size={20} />
                  <span className="font-medium">Review Expired Documents</span>
                </div>
                <p className="text-sm text-gray-600">Check and renew {orgStats?.expired_documents || 0} expired documents</p>
              </button>
              
              <button 
                onClick={() => setFilterType('expiring')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-2">
                  <Calendar className="text-yellow-500 mr-2" size={20} />
                  <span className="font-medium">Documents Expiring Soon</span>
                </div>
                <p className="text-sm text-gray-600">Review {orgStats?.expiring_soon || 0} documents expiring within 30 days</p>
              </button>
              
              <button 
                onClick={() => navigate('/participants')}
                className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-2">
                  <Users className="text-blue-500 mr-2" size={20} />
                  <span className="font-medium">Add New Participant</span>
                </div>
                <p className="text-sm text-gray-600">Create a new participant profile and upload documents</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Smart Search & Insights</h2>
                <p className="text-sm text-gray-600">
                  Use semantic search to discover relevant information within a participant's documents.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="text-sm font-medium text-gray-600">Participant</label>
                <select
                  value={selectedParticipantId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedParticipantId(value ? Number(value) : null);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select participant...</option>
                  {participants.map((participantOption) => (
                    <option key={participantOption.id} value={participantOption.id}>
                      {participantOption.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {ragStatus && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3 w-3" />
                {ragStatus.embeddings_available ? "Semantic search enabled" : "Keyword search mode"}
              </div>
            )}
          </div>

          {selectedParticipantId ? (
            <>
              <DocumentSearch
                participantId={selectedParticipantId}
                rag={rag}
                onViewDocument={(documentId) => navigate(`/participants/${selectedParticipantId}/documents?highlight=${documentId}`)}
                onViewContext={(result) =>
                  navigate(`/participants/${selectedParticipantId}/documents?highlight=${result.document_id}`)
                }
              />

              <DocumentInsights
                status={ragStatus}
                processingStatuses={processingStatuses}
                loading={ragStatusLoading || ragProcessingLoading}
                onRefreshStatus={refreshRagOverview}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              Select a participant to explore AI-powered document search and insights.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
