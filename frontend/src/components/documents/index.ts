// frontend/src/components/documents/index.ts - EXPORT ALL DOCUMENT COMPONENTS
export { DocumentManagement } from './DocumentManagement';
export { DocumentApproval } from './DocumentApproval';
export { DocumentGeneration } from './DocumentGeneration';
export { DocumentUpload } from './DocumentUpload';
export { default as DocumentVersionHistory } from './DocumentVersionHistory';

// Re-export types for convenience
export type {
  DocumentMetadata,
  DocumentCategory,
  DocumentVersion,
  DocumentApproval,
  DocumentWorkflow,
  DocumentStats,
  OrganizationDocumentStats,
  ParticipantDocumentStats,
  DocumentFilter,
  DocumentSearchParams,
  DocumentUploadRequest,
  DocumentUpdateRequest,
  ApprovalRequest,
  RejectionRequest,
  ExpiringDocument,
  ExpiredDocument,
  BulkDocumentAction,
  BulkActionResult
} from '../../types/document.types';

// Re-export service for convenience
export { DocumentService } from '../../services/documentService';