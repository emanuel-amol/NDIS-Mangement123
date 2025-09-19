// frontend/src/types/document.types.ts - UPDATED WITH VERSION HISTORY AND APPROVALS

export interface DocumentMetadata {
  id: number;
  participant_id: number;
  title: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  category: string;
  description?: string;
  tags: string[];
  version: number;
  is_current_version: boolean;
  visible_to_support_worker: boolean;
  expiry_date?: string | null;
  is_expired: boolean;
  status: DocumentStatus;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
  download_url: string;
  
  // New fields for workflow integration
  workflow_status?: WorkflowStatus;
  approval_required?: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  
  // Parent/child relationships for versions
  parent_document_id?: number;
  child_document_ids?: number[];
}

export interface DocumentCategory {
  id: number;
  category_id: string;
  name: string;
  description: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  config: {
    auto_expiry_days?: number;
    requires_approval?: boolean;
    visible_to_support_worker_default?: boolean;
    allowed_file_types?: string[];
    max_file_size?: number;
  };
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  changes_summary?: string;
  replaced_by_version_id?: number;
  created_at: string;
  created_by: string;
  is_current: boolean;
}

export interface DocumentApproval {
  id: number;
  document_id: number;
  approver_name: string;
  approver_role: string;
  approval_status: 'approved' | 'rejected' | 'pending';
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface DocumentWorkflow {
  id: number;
  participant_id: number;
  document_id?: number;
  workflow_type: WorkflowType;
  status: WorkflowStatus;
  assigned_to?: string;
  priority: WorkflowPriority;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  workflow_data: {
    category?: string;
    requires_manager_approval?: boolean;
    original_filename?: string;
    expiry_date?: string;
    auto_created?: boolean;
  };
  created_at: string;
  updated_at?: string;
}

export interface DocumentAccess {
  id: number;
  document_id: number;
  user_id: number;
  user_role: string;
  access_type: AccessType;
  accessed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface DocumentNotification {
  id: number;
  document_id: number;
  participant_id: number;
  notification_type: NotificationType;
  recipient_email: string;
  recipient_role: string;
  message: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

// Enums and Union Types
export type DocumentStatus = 'active' | 'pending_approval' | 'rejected' | 'archived' | 'expired';

export type WorkflowType = 'approval' | 'review' | 'expiry' | 'compliance';

export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';

export type WorkflowPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AccessType = 'view' | 'download' | 'upload' | 'edit' | 'delete' | 'approve' | 'reject';

export type NotificationType = 'expiry_warning' | 'approval_required' | 'approved' | 'rejected' | 'new_version';

// Filter and Search Interfaces
export interface DocumentFilter {
  participant_id?: number;
  category?: string;
  status?: DocumentStatus;
  is_expired?: boolean;
  visible_to_support_worker?: boolean;
  workflow_status?: WorkflowStatus;
  date_from?: string;
  date_to?: string;
  search_query?: string;
  tags?: string[];
  uploaded_by?: string;
  approved_by?: string;
}

export interface DocumentSearchParams {
  search?: string;
  category?: string;
  status?: DocumentStatus;
  is_expired?: boolean;
  visible_to_support_worker?: boolean;
  sort_by?: 'created_at' | 'title' | 'category' | 'expiry_date' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface DocumentUploadRequest {
  title: string;
  category: string;
  description?: string;
  tags?: string[];
  visible_to_support_worker?: boolean;
  expiry_date?: string;
  requires_approval?: boolean;
}

export interface DocumentUpdateRequest {
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
  visible_to_support_worker?: boolean;
  expiry_date?: string | null;
}

// Statistics and Analytics
export interface DocumentStats {
  total_documents: number;
  by_category: Record<string, number>;
  by_status: Record<DocumentStatus, number>;
  expired_documents: number;
  expiring_soon: number;
  recent_uploads: number;
  pending_approvals: number;
  average_file_size: number;
  total_storage_used: number;
}

export interface OrganizationDocumentStats extends DocumentStats {
  participants_with_documents: number;
  categories_in_use: number;
  average_documents_per_participant: number;
  approval_rate: number;
  average_approval_time_hours: number;
}

export interface ParticipantDocumentStats extends DocumentStats {
  participant_id: number;
  participant_name: string;
  last_upload_date?: string;
  compliance_score: number;
  missing_required_documents: string[];
}

// Workflow and Approval Specific
export interface ApprovalRequest {
  approver_name: string;
  approver_role: string;
  comments?: string;
}

export interface RejectionRequest {
  approver_name: string;
  approver_role: string;
  comments: string;
  rejection_reason: string;
}

export interface WorkflowAction {
  action_type: 'approve' | 'reject' | 'request_changes' | 'reassign';
  performer_name: string;
  performer_role: string;
  comments?: string;
  reassign_to?: string;
}

// Expiring and Expired Documents
export interface ExpiringDocument {
  id: number;
  participant_id: number;
  title: string;
  category: string;
  expiry_date: string;
  days_until_expiry: number;
  participant_name?: string;
}

export interface ExpiredDocument {
  id: number;
  participant_id: number;
  title: string;
  category: string;
  expiry_date: string;
  days_overdue: number;
  participant_name?: string;
}

// Bulk Operations
export interface BulkDocumentAction {
  document_ids: number[];
  action: 'delete' | 'archive' | 'update_category' | 'update_visibility' | 'bulk_approve' | 'bulk_reject';
  action_data?: {
    category?: string;
    visible_to_support_worker?: boolean;
    approver_name?: string;
    approver_role?: string;
    comments?: string;
  };
}

export interface BulkActionResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    document_id: number;
    error_message: string;
  }>;
}

// Template Integration
export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template_available: boolean;
  required_data: string[];
  output_format: 'pdf' | 'html' | 'docx';
}

export interface GeneratedDocumentResult {
  template_id: string;
  template_name: string;
  filename: string;
  file_size: number;
  generated_at: string;
  download_url: string;
  preview_url: string;
}

// Validation and Error Handling
export interface DocumentValidationError {
  field: string;
  message: string;
  code: string;
}

export interface DocumentOperationResult {
  success: boolean;
  message: string;
  document_id?: number;
  errors?: DocumentValidationError[];
  warnings?: string[];
}

// Component Props Interfaces
export interface DocumentListProps {
  participantId?: number;
  categoryFilter?: string;
  statusFilter?: DocumentStatus;
  showSearch?: boolean;
  showFilters?: boolean;
  allowBulkActions?: boolean;
  onDocumentSelect?: (document: DocumentMetadata) => void;
  onDocumentAction?: (action: string, document: DocumentMetadata) => void;
}

export interface DocumentViewerProps {
  document: DocumentMetadata;
  participantId: number;
  allowEdit?: boolean;
  allowDelete?: boolean;
  showVersionHistory?: boolean;
  onDocumentUpdate?: (updatedDocument: DocumentMetadata) => void;
  onDocumentDelete?: (documentId: number) => void;
}

export interface DocumentUploadProps {
  participantId: number;
  allowedCategories?: string[];
  defaultCategory?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onUploadSuccess?: (document: DocumentMetadata) => void;
  onUploadError?: (error: string) => void;
}

// Constants
export const DOCUMENT_STATUSES: Array<{value: DocumentStatus; label: string; color: string}> = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'archived', label: 'Archived', color: 'gray' },
  { value: 'expired', label: 'Expired', color: 'orange' }
];

export const WORKFLOW_TYPES: Array<{value: WorkflowType; label: string; description: string}> = [
  { value: 'approval', label: 'Approval', description: 'Document requires approval before activation' },
  { value: 'review', label: 'Review', description: 'Document needs periodic review' },
  { value: 'expiry', label: 'Expiry', description: 'Document is approaching expiry date' },
  { value: 'compliance', label: 'Compliance', description: 'Compliance check required' }
];

export const WORKFLOW_PRIORITIES: Array<{value: WorkflowPriority; label: string; color: string}> = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
];

export const ACCESS_TYPES: Array<{value: AccessType; label: string; description: string}> = [
  { value: 'view', label: 'View', description: 'Document was viewed' },
  { value: 'download', label: 'Download', description: 'Document was downloaded' },
  { value: 'upload', label: 'Upload', description: 'Document was uploaded' },
  { value: 'edit', label: 'Edit', description: 'Document was edited' },
  { value: 'delete', label: 'Delete', description: 'Document was deleted' },
  { value: 'approve', label: 'Approve', description: 'Document was approved' },
  { value: 'reject', label: 'Reject', description: 'Document was rejected' }
];

// Default Categories (fallback)
export const DEFAULT_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 1,
    category_id: 'service_agreements',
    name: 'Service Agreements',
    description: 'NDIS service agreements and contracts',
    is_required: true,
    sort_order: 1,
    is_active: true,
    config: {
      requires_approval: true,
      auto_expiry_days: 365,
      allowed_file_types: ['.pdf', '.doc', '.docx']
    }
  },
  {
    id: 2,
    category_id: 'medical_consent',
    name: 'Medical Consent',
    description: 'Medical consent forms and healthcare directives',
    is_required: true,
    sort_order: 2,
    is_active: true,
    config: {
      requires_approval: true,
      auto_expiry_days: 730,
      visible_to_support_worker_default: true
    }
  },
  {
    id: 3,
    category_id: 'intake_documents',
    name: 'Intake Documents',
    description: 'Initial assessment and intake paperwork',
    is_required: true,
    sort_order: 3,
    is_active: true,
    config: {
      requires_approval: false
    }
  },
  {
    id: 4,
    category_id: 'care_plans',
    name: 'Care Plans',
    description: 'Individual care and support plans',
    is_required: false,
    sort_order: 4,
    is_active: true,
    config: {
      requires_approval: true,
      auto_expiry_days: 365,
      visible_to_support_worker_default: true
    }
  },
  {
    id: 5,
    category_id: 'risk_assessments',
    name: 'Risk Assessments',
    description: 'Safety and risk evaluation documents',
    is_required: false,
    sort_order: 5,
    is_active: true,
    config: {
      requires_approval: true,
      auto_expiry_days: 365,
      visible_to_support_worker_default: true
    }
  },
  {
    id: 6,
    category_id: 'medical_reports',
    name: 'Medical Reports',
    description: 'Medical assessments and specialist reports',
    is_required: false,
    sort_order: 6,
    is_active: true,
    config: {
      requires_approval: false,
      visible_to_support_worker_default: true
    }
  },
  {
    id: 7,
    category_id: 'general_documents',
    name: 'General Documents',
    description: 'Other participant-related documents',
    is_required: false,
    sort_order: 7,
    is_active: true,
    config: {
      requires_approval: false
    }
  },
  {
    id: 8,
    category_id: 'reporting_documents',
    name: 'Reporting Documents',
    description: 'Progress reports and compliance documentation',
    is_required: false,
    sort_order: 8,
    is_active: true,
    config: {
      requires_approval: false,
      visible_to_support_worker_default: false
    }
  }
];

// File Type Validation
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/plain'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper functions
export const getStatusColor = (status: DocumentStatus): string => {
  const statusConfig = DOCUMENT_STATUSES.find(s => s.value === status);
  return statusConfig?.color || 'gray';
};

export const getPriorityColor = (priority: WorkflowPriority): string => {
  const priorityConfig = WORKFLOW_PRIORITIES.find(p => p.value === priority);
  return priorityConfig?.color || 'gray';
};

export const isDocumentExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

export const isDocumentExpiringSoon = (expiryDate?: string | null, daysThreshold: number = 30): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return expiry <= threshold && expiry >= new Date();
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};