// frontend/src/services/documentService.ts - ADD PREVIEW METHOD
import { 
  DocumentMetadata, 
  DocumentCategory, 
  DocumentStats, 
  OrganizationDocumentStats,
  ExpiringDocument,
  ExpiredDocument,
  DocumentSearchFilters 
} from '../types/document.types';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export class DocumentService {
  
  // Add this new method for preview
  static getPreviewUrl(participantId: number, documentId: number): string {
    return `${API_BASE_URL}/participants/${participantId}/documents/${documentId}/download?inline=true`;
  }

  // Also add a method to check if a document can be previewed
  static canPreviewInBrowser(mimeType: string): boolean {
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json'
    ];
    return previewableTypes.includes(mimeType);
  }

  // Document Categories
  static async getDocumentCategories(activeOnly: boolean = true): Promise<DocumentCategory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/document-categories?active_only=${activeOnly}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document categories: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching document categories:', error);
      // Return default categories if API fails
      return [
        {
          id: 1,
          category_id: 'service_agreements',
          name: 'Service Agreements',
          description: 'NDIS service agreements and contracts',
          is_required: true,
          sort_order: 1,
          is_active: true,
          config: {}
        },
        {
          id: 2,
          category_id: 'medical_consent',
          name: 'Medical Consent',
          description: 'Medical consent forms and healthcare directives',
          is_required: true,
          sort_order: 2,
          is_active: true,
          config: {}
        },
        {
          id: 3,
          category_id: 'general_documents',
          name: 'General Documents',
          description: 'Other participant-related documents',
          is_required: false,
          sort_order: 3,
          is_active: true,
          config: {}
        }
      ];
    }
  }

  // Participant Documents
  static async getParticipantDocuments(
    participantId: number,
    filters: DocumentSearchFilters = {}
  ): Promise<DocumentMetadata[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Participant not found or no documents
          return [];
        }
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching participant documents:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async getParticipantDocumentStats(participantId: number): Promise<DocumentStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/stats`);
      if (!response.ok) {
        if (response.status === 404) {
          // Return default stats for participants with no documents
          return {
            total_documents: 0,
            by_category: {},
            expired_documents: 0,
            expiring_soon: 0,
            recent_uploads: 0
          };
        }
        throw new Error(`Failed to fetch document stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching document stats:', error);
      // Return default stats if API fails
      return {
        total_documents: 0,
        by_category: {},
        expired_documents: 0,
        expiring_soon: 0,
        recent_uploads: 0
      };
    }
  }

  static async uploadDocument(
    participantId: number,
    file: File,
    metadata: {
      title: string;
      category: string;
      description?: string;
      tags?: string[];
      visible_to_support_worker?: boolean;
      expiry_date?: string;
    }
  ): Promise<DocumentMetadata> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', metadata.title);
      formData.append('category', metadata.category);
      
      if (metadata.description) {
        formData.append('description', metadata.description);
      }
      
      if (metadata.tags && metadata.tags.length > 0) {
        formData.append('tags', JSON.stringify(metadata.tags));
      }
      
      formData.append('visible_to_support_worker', metadata.visible_to_support_worker ? 'true' : 'false');
      
      if (metadata.expiry_date) {
        formData.append('expiry_date', metadata.expiry_date);
      }

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  static async getDocument(participantId: number, documentId: number): Promise<DocumentMetadata> {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/${documentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  static async deleteDocument(participantId: number, documentId: number): Promise<void> {
    try {
      console.log(`Calling delete API: DELETE ${API_BASE_URL}/participants/${participantId}/documents/${documentId}`);
      
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      console.log(`Delete API response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use the status text
        }
        
        console.error('Delete API error:', errorMessage);
        throw new Error(errorMessage);
      }

      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log('Delete API success response:', result);
      } else {
        console.log('Delete API success (no JSON response)');
      }

    } catch (error) {
      console.error('Error in deleteDocument:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to server');
      }
      
      throw error;
    }
  }

  static async downloadDocument(participantId: number, documentId: number, filename: string): Promise<void> {
    try {
      // Use inline=false to force download
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents/${documentId}/download?inline=false`);

      if (!response.ok) {
        let errorMessage = `Download failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use the status text
        }
        
        throw new Error(errorMessage);
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
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  // Organization-wide Documents
  static async getOrganizationDocumentStats(): Promise<OrganizationDocumentStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/organization-stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch organization stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching organization document stats:', error);
      throw error;
    }
  }

  static async getExpiringDocuments(daysAhead: number = 30, participantId?: number): Promise<ExpiringDocument[]> {
    try {
      const params = new URLSearchParams();
      params.append('days_ahead', daysAhead.toString());
      if (participantId) {
        params.append('participant_id', participantId.toString());
      }

      const response = await fetch(`${API_BASE_URL}/documents/expiring?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Expiring documents endpoint not found - this feature may not be implemented yet');
          return [];
        }
        throw new Error(`Failed to fetch expiring documents: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching expiring documents:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async getExpiredDocuments(participantId?: number): Promise<ExpiredDocument[]> {
    try {
      const params = new URLSearchParams();
      if (participantId) {
        params.append('participant_id', participantId.toString());
      }

      const response = await fetch(`${API_BASE_URL}/documents/expired?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Expired documents endpoint not found - this feature may not be implemented yet');
          return [];
        }
        throw new Error(`Failed to fetch expired documents: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching expired documents:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Utility methods
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    return '📄';
  }

  static isExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  static isExpiringSoon(expiryDate?: string, daysAhead: number = 30): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const soon = new Date();
    soon.setDate(soon.getDate() + daysAhead);
    return expiry <= soon && expiry >= new Date();
  }

  static validateFile(file: File): string | null {
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
      return `File type not supported. Allowed types: ${allowedExtensions.join(', ')}`;
    }

    return null;
  }
}