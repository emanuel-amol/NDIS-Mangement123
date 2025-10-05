// frontend/src/components/participant/DocumentsTab.tsx
import React from 'react';
import { DocumentManagement } from '../documents/DocumentManagement';

export default function DocumentsTab({ participantId, participantName }) {
  return (
    <DocumentManagement
      participantId={participantId}
      participantName={participantName}
      userRole="manager"
      onShowVersionHistory={(documentId) => {
        // Version history is handled within DocumentManagement
        console.log('Show version history for:', documentId);
      }}
    />
  );
}