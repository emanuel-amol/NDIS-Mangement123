// frontend/src/services/documentGenerationService.ts - COMPLETE FILE
interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template_available: boolean;
}

interface TemplatePreviewData {
  template_id: string;
  participant_id: number;
  data: Record<string, any>;
}

interface DocumentGenerationRequest {
  template_id: string;
  additional_data?: Record<string, any>;
}

interface BulkGenerationResponse {
  message: string;
  generated_count: number;
  failed_templates?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export class DocumentGenerationService {
  
  /**
   * Get all available document templates
   */
  static async getTemplates(category?: string): Promise<DocumentTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (category) {
        params.append('category', category);
      }
      
      const url = `${API_BASE_URL}/templates${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching templates from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('TEMPLATES_NOT_FOUND');
        }
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Templates loaded:', data);
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Generate a single document for a participant
   */
  static async generateDocument(
    participantId: number,
    templateId: string,
    additionalData?: Record<string, any>
  ): Promise<{ blob: Blob; contentType: string; filename: string }> {
    try {
      const requestBody: DocumentGenerationRequest = {
        template_id: templateId,
        additional_data: additionalData || {}
      };

      console.log('Generating document:', { participantId, templateId, additionalData });

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Document generation failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || 'application/pdf';
      
      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      } else {
        // Generate filename based on content type
        const extension = this.getFileExtension(contentType);
        filename = `document_${templateId}.${extension}`;
      }

      return { blob, contentType, filename };
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  /**
   * Generate multiple documents as a ZIP file
   */
  static async generateBulkDocuments(
    participantId: number,
    templateIds: string[]
  ): Promise<{ blob: Blob; filename: string }> {
    try {
      if (templateIds.length === 0) {
        throw new Error('No templates selected for bulk generation');
      }

      const templateIdsParam = templateIds.join(',');
      console.log('Generating bulk documents:', { participantId, templateIds });

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/bulk-generate?template_ids=${templateIdsParam}`);

      if (!response.ok) {
        let errorMessage = 'Bulk document generation failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'documents.zip';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      return { blob, filename };
    } catch (error) {
      console.error('Error generating bulk documents:', error);
      throw error;
    }
  }

  /**
   * Preview template data for a participant
   */
  static async previewTemplateData(
    participantId: number,
    templateId: string
  ): Promise<TemplatePreviewData> {
    try {
      console.log('Previewing template data:', { participantId, templateId });

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/preview-template-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Template preview failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error previewing template data:', error);
      throw error;
    }
  }

  /**
   * Get preview URL for a template (opens in new window)
   */
  static getPreviewUrl(participantId: number, templateId: string): string {
    return `${API_BASE_URL}/participants/${participantId}/generate-document/${templateId}/preview`;
  }

  /**
   * Initialize default templates (admin function)
   */
  static async initializeDefaultTemplates(): Promise<{ message: string; templates_created: string[] }> {
    try {
      console.log('Initializing default templates');

      const response = await fetch(`${API_BASE_URL}/initialize-templates`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMessage = 'Template initialization failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Templates initialized:', result);
      return result;
    } catch (error) {
      console.error('Error initializing templates:', error);
      throw error;
    }
  }

  /**
   * Check if document generation service is available
   */
  static async checkServiceAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`);
      
      if (response.ok) {
        return { available: true };
      } else if (response.status === 404) {
        return { 
          available: false, 
          error: 'Document generation service not initialized' 
        };
      } else {
        return { 
          available: false, 
          error: `Service unavailable: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      console.error('Error checking service availability:', error);
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Download a blob as a file
   */
  static downloadFile(blob: Blob, filename: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('File downloaded:', filename);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Get file extension based on content type
   */
  static getFileExtension(contentType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/html': 'html',
      'application/zip': 'zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt'
    };

    for (const [type, ext] of Object.entries(typeMap)) {
      if (contentType.includes(type)) {
        return ext;
      }
    }

    return 'pdf'; // default fallback
  }

  /**
   * Generate a clean filename for a document
   */
  static generateFilename(
    templateName: string, 
    participantName: string, 
    extension: string = 'pdf'
  ): string {
    // Clean the names - remove special characters and extra spaces
    const cleanTemplateName = templateName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    
    const cleanParticipantName = participantName
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    
    // Add timestamp for uniqueness
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    
    return `${cleanTemplateName}_${cleanParticipantName}_${timestamp}.${extension}`;
  }

  /**
   * Get category icon for template display
   */
  static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'service_agreements': '📄',
      'intake_documents': '📋',
      'medical_consent': '🏥',
      'care_plans': '💖',
      'risk_assessments': '🛡️',
      'reporting_documents': '📊',
      'general_documents': '📁',
      'sda_agreements': '🏠',
      'legal_documents': '⚖️'
    };
    return icons[category] || '📄';
  }

  /**
   * Get category color for template display
   */
  static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'service_agreements': 'bg-blue-50 border-blue-200 text-blue-800',
      'intake_documents': 'bg-green-50 border-green-200 text-green-800',
      'medical_consent': 'bg-red-50 border-red-200 text-red-800',
      'care_plans': 'bg-pink-50 border-pink-200 text-pink-800',
      'risk_assessments': 'bg-orange-50 border-orange-200 text-orange-800',
      'reporting_documents': 'bg-purple-50 border-purple-200 text-purple-800',
      'general_documents': 'bg-gray-50 border-gray-200 text-gray-800',
      'sda_agreements': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'legal_documents': 'bg-indigo-50 border-indigo-200 text-indigo-800'
    };
    return colors[category] || 'bg-gray-50 border-gray-200 text-gray-800';
  }

  /**
   * Format category name for display
   */
  static formatCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      'service_agreements': 'Service Agreements',
      'intake_documents': 'Intake Documents',
      'medical_consent': 'Medical Consent',
      'care_plans': 'Care Plans',
      'risk_assessments': 'Risk Assessments',
      'reporting_documents': 'Reporting Documents',
      'general_documents': 'General Documents',
      'sda_agreements': 'SDA Agreements',
      'legal_documents': 'Legal Documents'
    };

    return nameMap[category] || category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate template data before generation
   */
  static validateTemplateData(template: DocumentTemplate, participantId: number): string | null {
    if (!template) {
      return 'Template not found';
    }

    if (!template.template_available) {
      return 'Template file is not available on the server';
    }

    if (!participantId || participantId <= 0) {
      return 'Invalid participant ID';
    }

    return null; // No validation errors
  }

  /**
   * Handle API errors consistently
   */
  static handleApiError(error: any): string {
    if (error instanceof Error) {
      if (error.message === 'TEMPLATES_NOT_FOUND') {
        return 'Document generation service is not initialized. Please contact your administrator.';
      }
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred. Please try again or contact support.';
  }

  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(category: string): Promise<DocumentTemplate[]> {
    try {
      const allTemplates = await this.getTemplates();
      return allTemplates.filter(template => template.category === category);
    } catch (error) {
      console.error('Error getting templates by category:', error);
      throw error;
    }
  }

  /**
   * Get available categories
   */
  static async getAvailableCategories(): Promise<string[]> {
    try {
      const templates = await this.getTemplates();
      const categories = new Set(templates.map(template => template.category));
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error getting available categories:', error);
      throw error;
    }
  }
}