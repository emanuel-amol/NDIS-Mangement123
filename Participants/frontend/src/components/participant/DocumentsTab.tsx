// frontend/src/components/participant/DocumentsTab.tsx - WITH AUTO-REFRESH
import React, { useState, useCallback } from 'react';
import { DocumentManagement } from '../documents/DocumentManagement';
import { DocumentGeneration } from '../documents/DocumentGeneration';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Sparkles, RefreshCw } from 'lucide-react';

interface DocumentsTabProps {
  participantId: number | string;
  participantName: string;
}

export default function DocumentsTab({ participantId, participantName }: DocumentsTabProps) {
  const [activeView, setActiveView] = useState<'list' | 'generate'>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ NEW: Trigger for refresh
  
  // Get user role from auth
  // Get user role from auth context
const { user } = useAuth();
const userRole = user?.role || user?.user_metadata?.role || 'viewer';
const isServiceManager = userRole === 'SERVICE_MANAGER';
const isProviderAdmin = userRole === 'PROVIDER_ADMIN';
const allowUpload = true;
const allowDelete = isServiceManager || isProviderAdmin;
  
  // ✅ NEW: Callback when documents are generated
  const handleDocumentGenerated = useCallback((templateId: string, filename: string) => {
    console.log('✅ Document generated:', templateId, filename);
    // Trigger refresh of document list
    setRefreshTrigger(prev => prev + 1);
    // Optionally show success message
    setTimeout(() => {
      setActiveView('list'); // Switch back to list view to see the new document
    }, 500);
  }, []);
  
  // ✅ NEW: Callback when bulk documents are generated
  const handleBulkDocumentsGenerated = useCallback((count: number) => {
    console.log('✅ Bulk documents generated:', count);
    // Trigger refresh of document list
    setRefreshTrigger(prev => prev + 1);
    // Switch to list view after a short delay
    setTimeout(() => {
      setActiveView('list');
    }, 1000);
  }, []);
  
  // ✅ NEW: Manual refresh function
  const handleManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  const numericParticipantId = typeof participantId === 'string' 
    ? parseInt(participantId) 
    : participantId;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={18} />
            Document List
          </button>
          
          <button
            onClick={() => setActiveView('generate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'generate'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={18} />
            Generate Documents
          </button>
        </div>
        
        {/* Manual Refresh Button */}
        {activeView === 'list' && (
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh document list"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeView === 'list' ? (
          <DocumentManagement
            participantId={numericParticipantId}
            participantName={participantName}
            userRole={userRole}
            allowUpload={allowUpload}
            allowDelete={allowDelete}
            refreshTrigger={refreshTrigger} // ✅ Pass refresh trigger
            onShowVersionHistory={(documentId) => {
              console.log('Show version history for:', documentId);
            }}
          />
        ) : (
          <DocumentGeneration
            participantId={numericParticipantId}
            participantName={participantName}
            onDocumentGenerated={handleDocumentGenerated} // ✅ Pass callback
            onBulkDocumentsGenerated={handleBulkDocumentsGenerated} // ✅ Pass bulk callback
            showBackButton={false} // We handle navigation with tabs
          />
        )}
      </div>
    </div>
  );
}