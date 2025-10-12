// frontend/src/components/participant/DocumentsTab.tsx - WITH AUTH ROLE
import React from 'react';
import { DocumentManagement } from '../documents/DocumentManagement';
import { auth } from '../../services/auth';

interface DocumentsTabProps {
  participantId: number | string;
  participantName: string;
}

export default function DocumentsTab({ participantId, participantName }: DocumentsTabProps) {
  // Get actual user role from auth
  const userRole = auth.role() || 'viewer';
  
  // Determine permissions based on role
  const isServiceManager = userRole === 'SERVICE_MANAGER';
  const isProviderAdmin = userRole === 'PROVIDER_ADMIN';
  const allowUpload = true; // All authenticated users can upload
  const allowDelete = isServiceManager || isProviderAdmin;
  
  return (
    <DocumentManagement
      participantId={typeof participantId === 'string' ? parseInt(participantId) : participantId}
      participantName={participantName}
      userRole={userRole}
      allowUpload={allowUpload}
      allowDelete={allowDelete}
      onShowVersionHistory={(documentId) => {
        // Version history is handled within DocumentManagement
        console.log('Show version history for:', documentId);
      }}
    />
  );
}