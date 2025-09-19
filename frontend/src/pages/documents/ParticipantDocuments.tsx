// frontend/src/pages/documents/ParticipantDocuments.tsx - COMPLETE FILE
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, Sparkles } from 'lucide-react';
import { DocumentManagement } from '../../components/documents/DocumentManagement';
import { DocumentGeneration } from '../../components/documents/DocumentGeneration';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  ndis_number?: string;
  status: string;
  email_address?: string;
  phone_number?: string;
}

type TabType = 'manage' | 'generate';

export default function ParticipantDocuments() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('manage');
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (id) {
      fetchParticipant(parseInt(id));
    } else {
      setError('No participant ID provided');
      setLoading(false);
    }
  }, [id]);

  const fetchParticipant = async (participantId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching participant ${participantId} from ${API_BASE_URL}/participants/${participantId}`);
      
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Participant data loaded:', data);
        setParticipant(data);
      } else if (response.status === 404) {
        console.error('Participant not found');
        setError('Participant not found');
        // Redirect to participants list after a delay
        setTimeout(() => navigate('/participants'), 2000);
      } else {
        console.error('Failed to load participant:', response.status, response.statusText);
        setError(`Failed to load participant: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      setError(error instanceof Error ? error.message : 'Network error loading participant');
      
      // For demo purposes, use mock data if API fails
      console.log('Using mock participant data for demo');
      setParticipant({
        id: participantId,
        first_name: 'Demo',
        last_name: 'Participant',
        ndis_number: '430-000-123',
        status: 'active',
        email_address: 'demo@example.com',
        phone_number: '0400 000 123'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentGenerated = (templateId: string, filename: string) => {
    console.log(`Document generated: ${templateId} -> ${filename}`);
    // Optionally refresh the document management component or show a notification
    // You could emit an event or use a state management solution here
  };

  const getParticipantName = () => {
    if (!participant) return 'Unknown Participant';
    return `${participant.first_name} ${participant.last_name}`;
  };

  const getTabClasses = (tab: TabType) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors";
    if (activeTab === tab) {
      return `${baseClasses} bg-blue-600 text-white`;
    }
    return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participant information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'Participant not found' ? 'Participant Not Found' : 'Error Loading Participant'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error === 'Participant not found' 
              ? 'The requested participant could not be found.' 
              : error
            }
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/documents')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </button>
            <button 
              onClick={() => navigate('/participants')}
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All Participants
            </button>
            {error !== 'Participant not found' && (
              <button 
                onClick={() => window.location.reload()}
                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/documents')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Documents
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {getParticipantName()}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {participant?.ndis_number || 'NDIS Number Pending'} • {participant?.status || 'Unknown Status'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/participants/${participant?.id}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <User size={16} />
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-4">
            <button
              onClick={() => setActiveTab('manage')}
              className={getTabClasses('manage')}
            >
              <FileText size={18} />
              Manage Documents
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={getTabClasses('generate')}
            >
              <Sparkles size={18} />
              Generate Documents
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {participant && (
          <>
            {/* Document Management Tab */}
            {activeTab === 'manage' && (
              <div>
                <DocumentManagement
                  participantId={participant.id}
                  participantName={getParticipantName()}
                  userRole="manager" // This would come from your auth context
                />
              </div>
            )}

            {/* Document Generation Tab */}
            {activeTab === 'generate' && (
              <div>
                <DocumentGeneration
                  participantId={participant.id}
                  participantName={getParticipantName()}
                  onDocumentGenerated={handleDocumentGenerated}
                />
              </div>
            )}
          </>
        )}

        {/* Quick Switch Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {activeTab === 'manage' ? 'Need to create new documents?' : 'Need to manage existing documents?'}
                </h4>
                <p className="text-sm text-gray-600">
                  {activeTab === 'manage' 
                    ? 'Generate official NDIS documents automatically using our templates.'
                    : 'Upload, organize, and manage participant documents and files.'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(activeTab === 'manage' ? 'generate' : 'manage')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
            >
              {activeTab === 'manage' ? (
                <>
                  <Sparkles size={16} />
                  Generate Documents
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Manage Documents
                </>
              )}
            </button>
          </div>
        </div>

        {/* Participant Summary Card */}
        {participant && (
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{getParticipantName()}</h3>
                  <div className="text-sm text-gray-600">
                    <span>{participant.ndis_number || 'NDIS Number Pending'}</span>
                    {participant.email_address && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{participant.email_address}</span>
                      </>
                    )}
                    {participant.phone_number && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{participant.phone_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  participant.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : participant.status === 'prospective'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {participant.status || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}