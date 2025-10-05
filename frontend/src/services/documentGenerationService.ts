// frontend/src/services/documentGenerationService.js
// API service for document generation

const API_BASE_URL = 'http://localhost:8000/api/v1';
const DOC_GEN_BASE = `${API_BASE_URL}/document-generation`;

export const documentGenerationService = {
  /**
   * Get all available templates
   * @param {string} category - Optional category filter
   */
  async getTemplates(category = null) {
    const url = category 
      ? `${DOC_GEN_BASE}/templates?category=${category}`
      : `${DOC_GEN_BASE}/templates`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Get template categories
   */
  async getCategories() {
    const response = await fetch(`${DOC_GEN_BASE}/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Validate generation requirements
   * @param {number} participantId 
   * @param {string} templateId 
   */
  async validateRequirements(participantId, templateId) {
    const response = await fetch(
      `${DOC_GEN_BASE}/participants/${participantId}/validate/${templateId}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Preview template data
   * @param {number} participantId 
   * @param {string} templateId 
   */
  async previewTemplateData(participantId, templateId) {
    const response = await fetch(
      `${DOC_GEN_BASE}/participants/${participantId}/preview-template-data`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      }
    );
    if (!response.ok) {
      throw new Error(`Preview failed: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Preview document as HTML
   * @param {number} participantId 
   * @param {string} templateId 
   */
  getPreviewUrl(participantId, templateId) {
    return `${DOC_GEN_BASE}/participants/${participantId}/generate-document/${templateId}/preview`;
  },

  /**
   * Generate a single document
   * @param {number} participantId 
   * @param {string} templateId 
   * @param {object} options - { format: 'pdf'|'html', storeInDatabase: true, additionalData: {} }
   */
  async generateDocument(participantId, templateId, options = {}) {
    const {
      format = 'pdf',
      storeInDatabase = true,
      additionalData = null
    } = options;

    const response = await fetch(
      `${DOC_GEN_BASE}/participants/${participantId}/generate-document`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          format,
          store_in_database: storeInDatabase,
          additional_data: additionalData
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Document generation failed');
    }

    return await response.blob();
  },

  /**
   * Download a generated document
   * @param {number} participantId 
   * @param {string} templateId 
   * @param {string} filename - Optional custom filename
   */
  async downloadDocument(participantId, templateId, filename = null) {
    const blob = await this.generateDocument(participantId, templateId);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document_${templateId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generate multiple documents as ZIP
   * @param {number} participantId 
   * @param {string[]} templateIds 
   * @param {string} format - 'pdf' or 'html'
   */
  async bulkGenerate(participantId, templateIds, format = 'pdf') {
    const response = await fetch(
      `${DOC_GEN_BASE}/participants/${participantId}/bulk-generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_ids: templateIds,
          format
        })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Bulk generation failed');
    }

    return await response.blob();
  },

  /**
   * Download bulk generated documents
   * @param {number} participantId 
   * @param {string[]} templateIds 
   * @param {string} filename - Optional custom filename
   */
  async downloadBulk(participantId, templateIds, filename = null) {
    const blob = await this.bulkGenerate(participantId, templateIds);
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `documents_${participantId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Regenerate an existing document
   * @param {number} participantId 
   * @param {number} documentId 
   * @param {string} reason 
   */
  async regenerateDocument(participantId, documentId, reason = 'Manual regeneration') {
    const response = await fetch(
      `${DOC_GEN_BASE}/participants/${participantId}/regenerate-document/${documentId}?reason=${encodeURIComponent(reason)}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`Regeneration failed: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Get service status
   */
  async getServiceStatus() {
    const response = await fetch(`${DOC_GEN_BASE}/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch service status: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Initialize default templates
   */
  async initializeTemplates() {
    const response = await fetch(`${DOC_GEN_BASE}/initialize-templates`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error(`Failed to initialize templates: ${response.statusText}`);
    }
    return await response.json();
  }
};

export default documentGenerationService;