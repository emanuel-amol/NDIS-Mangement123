// frontend/src/services/documentService.ts - UPDATED WITH VERSION HISTORY AND APPROVALS
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

export class DocumentService {
  static readonly API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  // Document Management
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

  // Document Categories
  static async getDocumentCategories(): Promise<DocumentCategory[]> {
    const response = await fetch(`${this.API_BASE_URL}/document-categories`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Document Statistics
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

  // Expiring Documents
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

  // Version History (NEW)
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

  // Document Approvals (NEW)
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

  // Workflow Creation (NEW)
  static async createExpiryWorkflows(daysAhead: number = 30): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/document-workflow/create-expiry-workflows?days_ahead=${daysAhead}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create expiry workflows: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Upload Document (ENHANCED)
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

  // Bulk Operations (NEW)
  static async bulkDeleteDocuments(participantId: number, documentIds: number[]): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/bulk-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_ids: documentIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk delete documents: ${response.status} ${response.statusText}`);
    }
  }

  static async bulkUpdateDocuments(
    participantId: number, 
    documentIds: number[], 
    updateData: DocumentUpdateData
  ): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/documents/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_ids: documentIds,
        ...updateData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk update documents: ${response.status} ${response.statusText}`);
    }
  }

  // Search and Filter (ENHANCED)
  static async searchDocuments(query: string, participantId?: number): Promise<DocumentMetadata[]> {
    const params = new URLSearchParams();
    params.append('search', query);
    if (participantId) params.append('participant_id', participantId.toString());
    
    const response = await fetch(`${this.API_BASE_URL}/documents/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search documents: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Document Access Logging (NEW)
  static async logDocumentAccess(
    documentId: number,
    participantId: number,
    accessType: 'view' | 'download' | 'edit' | 'delete'
  ): Promise<void> {
    try {
      await fetch(`${this.API_BASE_URL}/documents/${documentId}/log-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          access_type: accessType,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      // Log access tracking is optional, don't fail the main operation
      console.warn('Failed to log document access:', error);
    }
  }

  // Document Templates (Integration with Generation)
  static async getDocumentTemplates(): Promise<any[]> {
    const response = await fetch(`${this.API_BASE_URL}/templates`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  static async generateDocument(
    participantId: number,
    templateId: string,
    additionalData?: any
  ): Promise<Blob> {
    const response = await fetch(`${this.API_BASE_URL}/participants/${participantId}/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        additional_data: additionalData || {}
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate document: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Utility Methods
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Validation Helpers
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  static validateFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes;
  }

  static validateDocumentData(data: any): string[] {
    const errors: string[] = [];
    
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Document title is required');
    }
    
    if (!data.category) {
      errors.push('Document category is required');
    }
    
    if (data.expiry_date && new Date(data.expiry_date) <= new Date()) {
      errors.push('Expiry date must be in the future');
    }
    
    return errors;
  }
}