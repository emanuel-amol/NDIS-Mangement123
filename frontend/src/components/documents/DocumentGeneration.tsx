// frontend/src/components/documents/DocumentGeneration.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Download, 
  Eye, 
  Package,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft
} from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template_available: boolean;
}

interface DocumentGenerationProps {
  participantId?: number;
  participantName?: string;
  onDocumentGenerated?: (templateId: string, filename: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

// Default values for demo
const DEFAULT_PARTICIPANT_ID = 21;
const DEFAULT_PARTICIPANT_NAME = "Demo Participant";

export const DocumentGeneration: React.FC<DocumentGenerationProps> = ({
  participantId = DEFAULT_PARTICIPANT_ID,
  participantName = DEFAULT_PARTICIPANT_NAME,
  onDocumentGenerated,
  showBackButton = false,
  onBack
}) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const API_BASE_URL = 'http://localhost:8000/api/v1';

  // ✅ FIXED: Added empty dependency array to run only once on mount
  useEffect(() => {
    loadTemplates();
  }, []); // This will only run once when component mounts

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching templates from:', `${API_BASE_URL}/templates`);
      const response = await fetch(`${API_BASE_URL}/templates`);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Raw response data:', data);
        
        // FIXED: Properly handle the response format
        let templateList: DocumentTemplate[] = [];
        
        if (Array.isArray(data)) {
          console.log('✅ Data is array, using directly');
          templateList = data;
        } else if (data.templates && Array.isArray(data.templates)) {
          console.log('✅ Found data.templates array');
          templateList = data.templates;
        } else if (data.data && Array.isArray(data.data)) {
          console.log('✅ Found data.data array');
          templateList = data.data;
        } else {
          console.warn('⚠️ Unexpected response format:', data);
          templateList = [];
        }
        
        console.log('✅ Final template list:', templateList.length, 'templates');
        setTemplates(templateList);
        
      } else if (response.status === 404) {
        console.warn('⚠️ Templates endpoint not found');
        setTemplates([]);
        setError('Document generation service not initialized');
      } else {
        console.error('❌ Failed to load templates:', response.status);
        setError(`Failed to load templates: ${response.statusText}`);
        setTemplates([]);
      }
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      setError('Failed to connect to document generation service');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSingleDocument = async (template: DocumentTemplate) => {
    if (!template.template_available) {
      alert('Template file is not available. Please contact administrator.');
      return;
    }

    setGeneratingTemplates(prev => new Set(prev).add(template.id));
    
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          additional_data: {}
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        
        const extension = contentType.includes('pdf') ? 'pdf' : 'html';
        const filename = `${template.name}_${participantName.replace(/\s+/g, '_')}.${extension}`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        const fileType = extension.toUpperCase();
        alert(`${template.name} generated successfully as ${fileType}!`);
        
        if (onDocumentGenerated) {
          onDocumentGenerated(template.id, filename);
        }
        
      } else {
        const error = await response.json();
        alert(`Failed to generate ${template.name}: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert(`Network error generating ${template.name}. Please check your connection.`);
    } finally {
      setGeneratingTemplates(prev => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  };

  const previewDocument = (template: DocumentTemplate) => {
    if (!template.template_available) {
      alert('Template file is not available. Please contact administrator.');
      return;
    }
    
    const previewUrl = `${API_BASE_URL}/participants/${participantId}/generate-document/${template.id}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes');
  };

  const previewTemplateData = async (template: DocumentTemplate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/preview-template-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const dataWindow = window.open('', '_blank', 'width=800,height=600');
        if (dataWindow) {
          dataWindow.document.write(`
            <html>
              <head>
                <title>Template Data: ${template.name}</title>
                <style>
                  body { font-family: Arial; margin: 20px; line-height: 1.6; }
                  pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
                  h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                </style>
              </head>
              <body>
                <h1>Template Data Preview</h1>
                <h2>${template.name}</h2>
                <p><strong>Participant:</strong> ${participantName} (ID: ${participantId})</p>
                <h3>Available Variables:</h3>
                <pre>${JSON.stringify(data.data, null, 2)}</pre>
              </body>
            </html>
          `);
          dataWindow.document.close();
        }
      } else {
        const error = await response.json();
        alert(`Failed to load template data: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading template data:', error);
      alert('Error loading template data.');
    }
  };

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

  const bulkGenerateDocuments = async () => {
    if (selectedTemplates.size === 0) {
      alert('Please select at least one template');
      return;
    }

    setBulkGenerating(true);
    
    try {
      const templateIds = Array.from(selectedTemplates).join(',');
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/bulk-generate?template_ids=${templateIds}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Documents_${participantName.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert(`${selectedTemplates.size} documents generated!`);
        setSelectedTemplates(new Set());
        
      } else {
        const error = await response.json();
        alert(`Failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating bulk documents:', error);
      alert('Network error during bulk generation.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const initializeDefaultTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/initialize-templates`, { method: 'POST' });
      if (response.ok) {
        alert('Default templates initialized successfully!');
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(`Failed to initialize: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      alert('Error initializing templates.');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'service_agreements': '📄',
      'intake_documents': '📋',
      'medical_consent': '🏥',
      'care_plans': '💖',
      'risk_assessments': '🛡️'
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'service_agreements': 'bg-blue-50 border-blue-200',
      'intake_documents': 'bg-green-50 border-green-200',
      'medical_consent': 'bg-red-50 border-red-200',
      'care_plans': 'bg-pink-50 border-pink-200',
      'risk_assessments': 'bg-orange-50 border-orange-200'
    };
    return colors[category] || 'bg-gray-50 border-gray-200';
  };

  const formatCategoryName = (category: string): string => {
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // FIXED: Ensure templates is always an array before filtering
  const availableTemplates = Array.isArray(templates) ? templates.filter(t => t && t.template_available) : [];
  const unavailableTemplates = Array.isArray(templates) ? templates.filter(t => t && !t.template_available) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-blue-600" size={24} />
            Generate Documents
          </h3>
          <p className="text-sm text-gray-600">For {participantName}</p>
        </div>
        
        {selectedTemplates.size > 0 && (
          <button
            onClick={bulkGenerateDocuments}
            disabled={bulkGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {bulkGenerating ? <Loader2 className="animate-spin" size={16} /> : <Package size={16} />}
            Generate ({selectedTemplates.size})
          </button>
        )}
      </div>

      {error ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h4 className="text-lg font-medium mb-2">Service Unavailable</h4>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button onClick={loadTemplates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Retry
            </button>
            {error.includes('not initialized') && (
              <button onClick={initializeDefaultTemplates} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Initialize
              </button>
            )}
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <h4 className="text-lg font-medium mb-2">No Templates Available</h4>
          <button onClick={initializeDefaultTemplates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Initialize Templates
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {availableTemplates.length > 0 && (
            <div>
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Available Templates ({availableTemplates.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableTemplates.map((template) => (
                  <div key={template.id} className={`border-2 rounded-lg p-4 ${getCategoryColor(template.category)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <span className="text-2xl mr-3">{getCategoryIcon(template.category)}</span>
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-xs text-gray-600">{formatCategoryName(template.category)}</p>
                        </div>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTemplates.has(template.id)}
                          onChange={() => toggleTemplateSelection(template.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </label>
                    </div>
                    
                    <p className="text-sm mb-4">{template.description}</p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => previewDocument(template)}
                        className="flex items-center gap-1 px-3 py-2 text-xs border rounded hover:bg-gray-50"
                      >
                        <Eye size={12} />
                        Preview
                      </button>
                      
                      <button
                        onClick={() => previewTemplateData(template)}
                        className="flex items-center gap-1 px-3 py-2 text-xs border rounded hover:bg-gray-50"
                      >
                        <Settings size={12} />
                        Data
                      </button>
                      
                      <button
                        onClick={() => generateSingleDocument(template)}
                        disabled={generatingTemplates.has(template.id)}
                        className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {generatingTemplates.has(template.id) ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                        Generate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unavailableTemplates.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle className="text-yellow-500" size={20} />
                Unavailable ({unavailableTemplates.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unavailableTemplates.map((template) => (
                  <div key={template.id} className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 opacity-75">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3 grayscale">{getCategoryIcon(template.category)}</span>
                      <div>
                        <h4 className="font-medium text-gray-600">{template.name}</h4>
                        <p className="text-xs text-gray-500">{formatCategoryName(template.category)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                    <p className="text-xs text-yellow-600">Template file not available</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableTemplates.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5" size={16} />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Tips</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Use Preview to see the document before generating</li>
                    <li>• Use Data to inspect participant information</li>
                    <li>• Select multiple templates for bulk download</li>
                    <li>• Documents include current participant data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Also export as default for page routing
export default DocumentGeneration;

// Standalone Page Component wrapper
export const DocumentGenerationPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DocumentGeneration 
        participantId={21}
        participantName="Demo Participant"
        showBackButton={true}
        onBack={() => window.history.back()}
      />
    </div>
  );
};