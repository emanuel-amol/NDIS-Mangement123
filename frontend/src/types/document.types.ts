// frontend/src/types/document.types.ts - DYNAMIC VERSION
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
  expiry_date?: string;
  is_expired: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
  download_url: string;
  status: string;
}

export interface DocumentCategory {
  id: number;
  category_id: string;
  name: string;
  description?: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  config: Record<string, any>;
}

export interface DocumentUploadRequest {
  participant_id: number;
  title: string;
  category: string;
  description?: string;
  tags?: string[];
  visible_to_support_worker?: boolean;
  expiry_date?: string;
}

export interface DocumentSearchFilters {
  participant_id?: number;
  category?: string;
  is_expired?: boolean;
  visible_to_support_worker?: boolean;
  date_from?: string;
  date_to?: string;
  search_query?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface DocumentStats {
  total_documents: number;
  by_category: Record<string, number>;
  expired_documents: number;
  expiring_soon: number;
  recent_uploads: number;
}

export interface OrganizationDocumentStats {
  total_documents: number;
  participants_with_documents: number;
  by_category: Record<string, number>;
  expired_documents: number;
  expiring_soon: number;
  recent_uploads: number;
}

export interface ExpiringDocument {
  id: number;
  participant_id: number;
  title: string;
  category: string;
  expiry_date: string;
  days_until_expiry: number;
}

export interface ExpiredDocument {
  id: number;
  participant_id: number;
  title: string;
  category: string;
  expiry_date: string;
  days_overdue: number;
}

// File upload constants
export const ALLOWED_FILE_TYPES = [
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

export const FILE_TYPE_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/plain': ['.txt']
};