// frontend/src/services/documentService.ts - ENHANCED WITH FULL VERSION CONTROL
import { DocumentMetadata, DocumentCategory, OrganizationDocumentStats, ExpiringDocument, ExpiredDocument } from '../types/document.types';

export interface DocumentSearchParams {
  search?: string;
  category?: string;
  is_expired?: boolean;
  visible_to_support_worker?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface DocumentUpdateData {
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
  visible_to_support_worker?: boolean;
  expiry_date?: string | null;
}

export interface DocumentStats {
  total_documents: number;
  by_category: Record<string, number>;
  expired_documents: number;
  expiring_soon: number;
  recent_uploads: number;
}

// Enhanced Version Control Interfaces
export interface DocumentVersion {
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

export interface VersionAnalytics {
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

export interface VersionComparison {
  version1: any;
  version2: any;
  differences: {
    file_size_change: number;
    time_between_versions: number;
    different_creators: boolean;
    file_content_changed?: boolean;
  };
  change_analysis?: any;
}

export interface RollbackRequest {
  rollback_reason: string;
}

export interface MetadataVersionRequest {
  old_metadata: Record<string, any>;
  new_metadata: Record<string, any>;
  change_reason?: string;
}

export interface CleanupRequest {
  keep_versions?: number;
  keep_days?: number;
}

export class DocumentService {
  static readonly API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  // ==========================================
  // EXISTING DOCUMENT METHODS (PRESERVED)
  // ==========================================

  static async getParticipantDocuments(
    participantId: number, 
    params: DocumentSearchParams = {}
  ): Promise<DocumentMetadata[]> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.is_expired !== undefined) queryParams.append('is_expired', params.is_expired.toString());
    if (params.visible_to_support_worker !== undefined) queryParams.append('visible_to_support_worker', params.visible_to_support_worker.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    const url = `${this.API_BASE_URL}/participants/${participantId}/documents${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  static async getDocument(participantId: number, documentId: number): Promise<DocumentMetadata> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/${documentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async updateDocument(
    participantId: number, 
    documentId: number, 
    updateData: DocumentUpdateData
  ): Promise<DocumentMetadata> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async deleteDocument(participantId: number, documentId: number): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/${documentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.status} ${response.statusText}`);
    }
  }

  static async downloadDocument(participantId: number, documentId: number, filename: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/${documentId}/download`);
    
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
    }
    
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

  static getPreviewUrl(participantId: number, documentId: number): string {
    return `${this.API_BASE_URL}/participants/${participantId}/documents/${documentId}/download?inline=true`;
  }

  // ==========================================
  // ENHANCED VERSION CONTROL METHODS (NEW)
  // ==========================================

  /**
   * Get detailed version history for a document
   */
  static async getDocumentVersionsDetailed(
    documentId: number, 
    includeMetadata: boolean = true
  ): Promise<{
    document_id: number;
    document_title: string;
    total_versions: number;
    version_history: DocumentVersion[];
  }> {
    const response = await fetch(
      `${this.API_BASE_URL}/documents/${documentId}/versions/detailed?include_metadata=${includeMetadata}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch detailed version history: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Compare two versions of a document
   */
  static async compareVersions(
    documentId: number, 
    version1Id: number, 
    version2Id: number
  ): Promise<VersionComparison> {
    const response = await fetch(
      `${this.API_BASE_URL}/documents/${documentId}/versions/${version1Id}/compare/${version2Id}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to compare versions: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Create a new version by uploading a file
   */
  static async createVersionWithFileUpload(
    documentId: number,
    file: File,
    changesSummary: string,
    changeReason?: string
  ): Promise<DocumentVersion> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('changes_summary', changesSummary);
    if (changeReason) formData.append('change_reason', changeReason);

    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create version with file: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Create a metadata-only version
   */
  static async createMetadataVersion(
    documentId: number,
    request: MetadataVersionRequest
  ): Promise<DocumentVersion> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create metadata version: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Rollback document to a specific version
   */
  static async rollbackToVersion(
    documentId: number,
    versionId: number,
    rollbackReason: string
  ): Promise<{
    message: string;
    new_version_id: number;
    new_version_number: number;
    rolled_back_to_version: number;
    rollback_reason: string;
    created_at: string;
  }> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/${versionId}/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollback_reason: rollbackReason }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to rollback to version: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get version analytics for a document
   */
  static async getVersionAnalytics(documentId: number): Promise<{
    document_id: number;
    document_title: string;
    analytics: VersionAnalytics;
  }> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/analytics`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch version analytics: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Clean up old document versions
   */
  static async cleanupOldVersions(
    documentId: number,
    cleanupRequest: CleanupRequest = { keep_versions: 10, keep_days: 90 }
  ): Promise<{
    message: string;
    document_id: number;
    cleanup_results: {
      deleted_versions: number;
      kept_versions: number;
      deleted_file_size: number;
      total_versions_before: number;
    };
  }> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanupRequest),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cleanup versions: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get version diff between two versions
   */
  static async getVersionDiff(
    documentId: number,
    versionId: number,
    compareVersionId: number,
    diffType: 'text' | 'metadata' | 'binary' = 'metadata'
  ): Promise<any> {
    const response = await fetch(
      `${this.API_BASE_URL}/documents/${documentId}/versions/${versionId}/diff/${compareVersionId}?diff_type=${diffType}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get version diff: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get version summary for recent activity
   */
  static async getVersionSummary(
    documentId: number, 
    days: number = 30
  ): Promise<any> {
    const response = await fetch(
      `${this.API_BASE_URL}/documents/${documentId}/versions/summary?days=${days}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get version summary: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Download a specific version of a document
   */
  static async downloadDocumentVersion(
    documentId: number, 
    versionId: number, 
    filename?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.API_BASE_URL}/documents/${documentId}/versions/${versionId}/download`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download document version: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document_v${versionId}`;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ==========================================
  // BASIC VERSION CONTROL (LEGACY SUPPORT)
  // ==========================================

  static async getDocumentVersions(documentId: number): Promise<any[]> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document versions: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async restoreDocumentVersion(documentId: number, versionId: number): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to restore document version: ${response.status} ${response.statusText}`);
    }
  }

  // ==========================================
  // DOCUMENT CATEGORIES
  // ==========================================

  static async getDocumentCategories(): Promise<DocumentCategory[]> {
    const response = await fetch(`${this.API_BASE_URL}/document-categories`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // DOCUMENT STATISTICS
  // ==========================================

  static async getParticipantDocumentStats(participantId: number): Promise<DocumentStats> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getOrganizationDocumentStats(): Promise<OrganizationDocumentStats> {
    const response = await fetch(`${this.API_BASE_URL}/documents/organization-stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch organization stats: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // EXPIRING DOCUMENTS
  // ==========================================

  static async getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
    const response = await fetch(`${this.API_BASE_URL}/documents/expiring?days_ahead=${daysAhead}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch expiring documents: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getExpiredDocuments(): Promise<ExpiredDocument[]> {
    const response = await fetch(`${this.API_BASE_URL}/documents/expired`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch expired documents: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // DOCUMENT APPROVALS
  // ==========================================

  static async getPendingApprovals(participantId?: number): Promise<any[]> {
    const url = participantId 
      ? `${this.API_BASE_URL}/document-workflow/workflows/pending-approvals?participant_id=${participantId}`
      : `${this.API_BASE_URL}/document-workflow/workflows/pending-approvals`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pending approvals: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async approveDocument(
    documentId: number, 
    approverName: string, 
    approverRole: string, 
    comments?: string
  ): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/document-workflow/documents/${documentId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approver_name: approverName,
        approver_role: approverRole,
        comments: comments
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to approve document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async rejectDocument(
    documentId: number, 
    approverName: string, 
    approverRole: string, 
    comments: string
  ): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/document-workflow/documents/${documentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approver_name: approverName,
        approver_role: approverRole,
        comments: comments
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reject document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getDocumentWorkflowHistory(documentId: number): Promise<any[]> {
    const response = await fetch(`${this.API_BASE_URL}/documents/${documentId}/workflow-history`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch workflow history: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // WORKFLOW CREATION
  // ==========================================

  static async createExpiryWorkflows(daysAhead: number = 30): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/document-workflow/create-expiry-workflows?days_ahead=${daysAhead}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create expiry workflows: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // UPLOAD DOCUMENT
  // ==========================================

  static async uploadDocument(
    participantId: number,
    formData: FormData
  ): Promise<DocumentMetadata> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to upload document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static isDocumentExpired(expiryDate?: string | null): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  static isDocumentExpiringSoon(expiryDate?: string | null, daysThreshold: number = 30): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);
    return expiry <= threshold && expiry >= new Date();
  }

  static getDaysUntilExpiry(expiryDate?: string | null): number | null {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 *