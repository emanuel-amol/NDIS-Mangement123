// frontend/src/components/documents/DocumentGeneration.tsx - COMPLETE FILE
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Package,
  Settings,
  ExternalLink,
  RefreshCw,
  Info
} from 'lucide-react';
import { DocumentGenerationService } from '../../services/documentGenerationService';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template_available: boolean;
}

interface DocumentGenerationProps {
  participantId: number;
  participantName: string;
  onDocumentGenerated?: (templateId: string, filename: string) => void;
  className?: string;
}

export const DocumentGeneration: React.FC<DocumentGenerationProps> = ({
  participantId,
  participantName,
  onDocumentGenerated,
  className = ""
}) => {
  // State management
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, [participantId]);

  /**
   * Load available templates from the API
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check service availability first
      const serviceCheck = await DocumentGenerationService.checkServiceAvailability();
      setServiceAvailable(serviceCheck.available);
      
      if (!serviceCheck.available) {
        setError(serviceCheck.error || 'Document generation service unavailable');
        setTemplates([]);
        return;
      }
      
      // Load templates
      const data = await DocumentGenerationService.getTemplates();
      setTemplates(data);
      
      if (data.length === 0) {
        setError('No templates are configured. Please contact your administrator.');
      }
      
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(DocumentGenerationService.handleApiError(error));
      setTemplates([]);
      setServiceAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate a single document
   */
  const generateSingleDocument = async (template: DocumentTemplate) => {
    // Validate template
    const validationError = DocumentGenerationService.validateTemplateData(template, participantId);
    if (validationError) {
      alert(validationError);
      return;
    }

    setGeneratingTemplates(prev => new Set(prev).add(template.id));
    
    try {
      console.log(`Generating document: ${template.name} for participant ${participantId}`);
      
      const result = await DocumentGenerationService.generateDocument(
        participantId, 
        template.id
      );
      
      // Generate a clean filename
      const filename = DocumentGenerationService.generateFilename(
        template.name,
        participantName,
        DocumentGenerationService.getFileExtension(result.contentType)
      );
      
      // Download the file
      DocumentGenerationService.downloadFile(result.blob, filename);
      
      // Notify parent component
      onDocumentGenerated?.(template.id, filename);
      
      // Show success message
      const fileType = DocumentGenerationService.getFileExtension(result.contentType).toUpperCase();
      alert(`✅ ${template.name} generated successfully as ${fileType}!`);
      
    } catch (error) {
      console.error('Error generating document:', error);
      const errorMessage = DocumentGenerationService.handleApiError(error);
      alert(`❌ Failed to generate ${template.name}:\n${errorMessage}`);
    } finally {
      setGeneratingTemplates(prev => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  };

  /**
   * Preview a document in a new window
   */
  const previewDocument = (template: DocumentTemplate) => {
    const validationError = DocumentGenerationService.validateTemplateData(template, participantId);
    if (validationError) {
      alert(validationError);
      return;
    }
    
    const previewUrl = DocumentGenerationService.getPreviewUrl(participantId, template.id);
    const previewWindow = window.open(
      previewUrl, 
      '_blank', 
      'width=900,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
    );
    
    if (!previewWindow) {
      alert('Preview blocked by popup blocker. Please allow popups for this site and try again.');
    }
  };

  /**
   * Preview template data
   */
  const previewTemplateData = async (template: DocumentTemplate) => {
    try {
      const data = await DocumentGenerationService.previewTemplateData(participantId, template.id);
      
      // Create a formatted preview window
      const dataWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      if (!dataWindow) {
        alert('Preview blocked by popup blocker. Please allow popups for this site and try again.');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Template Data Preview: ${template.name}</title>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px; 
                line-height: 1.6;
                color: #374151;
                background: #f9fafb;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              h1 { 
                color: #1f2937; 
                border-bottom: 3px solid #3b82f6; 
                padding-bottom: 10px; 
                margin-bottom: 20px;
              }
              h2 { 
                color: #374151; 
                background: #f3f4f6;
                padding: 12px;
                border-radius: 6px;
                margin: 20px 0 10px 0;
              }
              h3 { 
                color: #6b7280; 
                margin: 20px 0 10px 0;
              }
              pre { 
                background: #1f2937; 
                color: #f9fafb;
                padding: 20px; 
                border-radius: 6px; 
                overflow-x: auto; 
                font-size: 14px;
                line-height: 1.4;
              }
              .participant-info {
                background: #dbeafe;
                border: 1px solid #3b82f6;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 25px;
              }
              .note {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                padding: 15px;
                border-radius: 6px;
                margin-top: 25px;
              }
              .template-info {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 25px;
              }
              .data-key {
                color: #059669;
                font-weight: 600;
              }
              .data-value {
                color: #1f2937;
              }
              .null-value {
                color: #9ca3af;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📋 Template Data Preview</h1>
              
              <div class="template-info">
                <h2>📄 ${template.name}</h2>
                <p><strong>Category:</strong> ${DocumentGenerationService.formatCategoryName(template.category)}</p>
                <p><strong>Description:</strong> ${template.description}</p>
              </div>
              
              <div class="participant-info">
                <h3>👤 Participant Information</h3>
                <p><strong>Name:</strong> ${participantName}</p>
                <p><strong>ID:</strong> ${participantId}</p>
              </div>
              
              <h3>🔧 Available Template Variables</h3>
              <pre>${JSON.stringify(data.data, null, 2)}</pre>
              
              <div class="note">
                <strong>💡 Note:</strong> This data will be automatically populated into the template when generating the document. 
                Missing or null values will be handled gracefully by the template engine.
              </div>
            </div>
          </body>
        </html>
      `;
      
      dataWindow.document.write(htmlContent);
      dataWindow.document.close();
      
    } catch (error) {
      console.error('Error loading template data:', error);
      const errorMessage = DocumentGenerationService.handleApiError(error);
      alert(`Failed to load template data:\n${errorMessage}`);
    }
  };

  /**
   * Toggle template selection for bulk generation
   */
  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  /**
   * Generate multiple documents as ZIP
   */
  const bulkGenerateDocuments = async () => {
    if (selectedTemplates.size === 0) {
      alert('Please select at least one template to generate');
      return;
    }

    setBulkGenerating(true);
    
    try {
      console.log(`Bulk generating ${selectedTemplates.size} documents for participant ${participantId}`);
      
      const templateIds = Array.from(selectedTemplates);
      const result = await DocumentGenerationService.generateBulkDocuments(participantId, templateIds);
      
      // Download the ZIP file
      DocumentGenerationService.downloadFile(result.blob, result.filename);
      
      alert(`✅ ${selectedTemplates.size} documents generated and downloaded as ZIP file!`);
      
      // Clear selections
      setSelectedTemplates(new Set());
      
    } catch (error) {
      console.error('Error generating bulk documents:', error);
      const errorMessage = DocumentGenerationService.handleApiError(error);
      alert(`❌ Failed to generate bulk documents:\n${errorMessage}`);
    } finally {
      setBulkGenerating(false);
    }
  };

  /**
   * Initialize default templates
   */
  const initializeDefaultTemplates = async () => {
    try {
      setLoading(true);
      console.log('Initializing default templates...');
      
      const result = await DocumentGenerationService.initializeDefaultTemplates();
      
      alert(`✅ Default templates initialized successfully!\n\nCreated templates:\n${result.templates_created?.join('\n- ') || 'Standard NDIS templates'}`);
      
      // Reload templates
      await loadTemplates();
      
    } catch (error) {
      console.error('Error initializing templates:', error);
      const errorMessage = DocumentGenerationService.handleApiError(error);
      alert(`❌ Failed to initialize templates:\n${errorMessage}\n\nPlease contact your administrator.`);
    } finally {
      setLoading(false);
    }
  };

  // Get template categories for organization
  const availableTemplates = templates.filter(t => t.template_available);
  const unavailableTemplates = templates.filter(t => !t.template_available);

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading document templates...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !serviceAvailable) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Document Generation Unavailable</h4>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadTemplates}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} />
              Retry Connection
            </button>
            {error.includes('not initialized') && (
              <div className="pt-2">
                <button
                  onClick={initializeDefaultTemplates}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Settings size={16} />
                  Initialize Service
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will create default NDIS document templates
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No templates state
  if (templates.length === 0 && serviceAvailable) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h4>
          <p className="text-gray-600 mb-6">No document templates are currently configured for generation.</p>
          <button
            onClick={initializeDefaultTemplates}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings size={16} />
            Initialize Default Templates
          </button>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Generate Documents
          </h3>
          <p className="text-sm text-gray-600">
            Generate official documents for {participantName}
          </p>
        </div>
        
        {/* Bulk Generation Controls */}
        {selectedTemplates.size > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedTemplates.size} selected
            </div>
            <button
              onClick={bulkGenerateDocuments}
              disabled={bulkGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {bulkGenerating ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Package size={16} />
              )}
              Generate ZIP ({selectedTemplates.size})
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Available Templates */}
        {availableTemplates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Available Templates ({availableTemplates.length})
              </h4>
              {availableTemplates.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={availableTemplates.length === selectedTemplates.size}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTemplates(new Set(availableTemplates.map(t => t.id)));
                      } else {
                        setSelectedTemplates(new Set());
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="select-all" className="cursor-pointer">
                    Select All
                  </label>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTemplates.map((template) => (
                <div 
                  key={template.id} 
                  className={`border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${DocumentGenerationService.getCategoryColor(template.category)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-2xl mr-3 flex-shrink-0">
                        {DocumentGenerationService.getCategoryIcon(template.category)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate">{template.name}</span>
                          <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          {DocumentGenerationService.formatCategoryName(template.category)}
                        </p>
                      </div>
                    </div>
                    
                    <label className="flex items-center ml-3 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.has(template.id)}
                        onChange={() => toggleTemplateSelection(template.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">Select</span>
                    </label>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => previewDocument(template)}
                      className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      title="Preview document in new window"
                    >
                      <Eye size={12} />
                      Preview
                    </button>
                    
                    <button
                      onClick={() => previewTemplateData(template)}
                      className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      title="View template variables and data"
                    >
                      <Settings size={12} />
                      Data
                    </button>
                    
                    <button
                      onClick={() => generateSingleDocument(template)}
                      disabled={generatingTemplates.has(template.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      title="Generate and download this document"
                    >
                      {generatingTemplates.has(template.id) ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Download size={12} />
                      )}
                      {generatingTemplates.has(template.id) ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable Templates */}
        {unavailableTemplates.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="text-yellow-500" size={20} />
              Templates Not Available ({unavailableTemplates.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unavailableTemplates.map((template) => (
                <div key={template.id} className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 opacity-75">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3 grayscale">
                      {DocumentGenerationService.getCategoryIcon(template.category)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-600 truncate">{template.name}</h4>
                      <p className="text-xs text-gray-500 truncate">
                        {DocumentGenerationService.formatCategoryName(template.category)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-yellow-500" size={14} />
                    <p className="text-xs text-yellow-600">Template file not available on server</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help and Tips Section */}
        {availableTemplates.length > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">How to Use Document Generation</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Preview:</strong> See how the document will look before generating</li>
                  <li>• <strong>Data:</strong> Inspect what participant information will be included</li>
                  <li>• <strong>Generate:</strong> Create and download individual documents</li>
                  <li>• <strong>Bulk Generate:</strong> Select multiple templates and download as ZIP</li>
                  <li>• <strong>Formats:</strong> Documents are generated as PDF when possible, HTML as fallback</li>
                  <li>• <strong>Data:</strong> All documents include current participant information and are timestamped</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Service Status */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${serviceAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            Document generation service: {serviceAvailable ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={loadTemplates}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            title="Refresh templates"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};