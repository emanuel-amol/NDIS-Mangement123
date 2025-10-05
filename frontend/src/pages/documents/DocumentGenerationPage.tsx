// frontend/src/pages/documents/DocumentGenerationPage.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Package,
  Settings,
  ExternalLink
} from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template_available: boolean;
}

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  ndis_number?: string;
  status: string;
}

export default function DocumentGenerationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [generatingTemplates, setGeneratingTemplates] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (id) {
      fetchParticipant();
    }
  }, [id]);

  const fetchParticipant = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      if (response.ok) {
        const data = await response.json();
        setParticipant(data);
        // Load templates after participant is loaded
        await loadTemplates();
      } else if (response.status === 404) {
        navigate('/participants');
      } else {
        console.error('Failed to load participant');
        setError('Failed to load participant information');
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      setError('Network error loading participant');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/document-generation/templates`);
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else if (response.status === 404) {
        console.warn('Templates endpoint not found - document generation service may not be initialized');
        setTemplates([]);
        setError('Document generation service not initialized');
      } else {
        console.error('Failed to load templates:', response.status);
        setError(`Failed to load templates: ${response.statusText}`);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to connect to document generation service');
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const generateSingleDocument = async (template: DocumentTemplate) => {
    if (!template.template_available) {
      alert('Template file is not available. Please contact administrator.');
      return;
    }

    setGeneratingTemplates(prev => new Set(prev).add(template.id));
    
    try {
      const response = await fetch(`${API_BASE_URL}/document-generation/participants/${id}/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          format: 'pdf',
          store_in_database: true,
          additional_data: null
        }),
      });

      if (response.ok) {
        // Get the content type to determine if it's PDF or HTML
        const contentType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        
        // Generate filename
        const extension = contentType.includes('pdf') ? 'pdf' : 'html';
        const filename = `${template.name}_${participant?.first_name}_${participant?.last_name}.${extension}`;
        
        // Download the file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace(/\s+/g, '_');
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        const fileType = extension.toUpperCase();
        alert(`${template.name} generated successfully as ${fileType}!`);
        
      } else {
        const error = await response.json();
        alert(`Failed to generate ${template.name}: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert(`Network error generating ${template.name}. Please check your connection and try again.`);
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
    
    const previewUrl = `${API_BASE_URL}/document-generation/participants/${id}/generate-document/${template.id}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const previewTemplateData = async (template: DocumentTemplate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/document-generation/participants/${id}/preview-template-data`, {
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
        // Open data in new window for inspection
        const dataWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        if (dataWindow) {
          dataWindow.document.write(`
            <html>
              <head>
                <title>Template Data Preview: ${template.name}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    line-height: 1.6;
                    color: #333;
                  }
                  pre { 
                    background: #f5f5f5; 
                    padding: 15px; 
                    border-radius: 5px; 
                    overflow-x: auto; 
                    border: 1px solid #ddd;
                  }
                  h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                  h2 { color: #374151; }
                  h3 { color: #6b7280; }
                  .participant-info {
                    background: #e0f2fe;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                  }
                </style>
              </head>
              <body>
                <h1>Template Data Preview</h1>
                <h2>${template.name}</h2>
                <div class="participant-info">
                  <strong>Participant:</strong> ${participant?.first_name} ${participant?.last_name}<br>
                  <strong>NDIS Number:</strong> ${participant?.ndis_number || 'Pending'}<br>
                  <strong>Status:</strong> ${participant?.status}
                </div>
                <h3>Available Data Variables:</h3>
                <pre>${JSON.stringify(data.data, null, 2)}</pre>
                <div style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 5px;">
                  <strong>Note:</strong> This data will be used to populate the template when generating the document.
                </div>
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
      alert('Error loading template data. Please check your connection and try again.');
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
      alert('Please select at least one template to generate');
      return;
    }

    setBulkGenerating(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/document-generation/participants/${id}/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_ids: Array.from(selectedTemplates),
          format: 'pdf'
        }),
      });

      if (response.ok) {
        // Download the ZIP file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const filename = `Documents_${participant?.first_name}_${participant?.last_name}.zip`;
        a.download = filename.replace(/\s+/g, '_');
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert(`${selectedTemplates.size} documents generated and downloaded as ZIP file!`);
        setSelectedTemplates(new Set());
        
      } else {
        const error = await response.json();
        alert(`Failed to generate documents: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating bulk documents:', error);
      alert('Network error during bulk generation. Please check your connection and try again.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const initializeDefaultTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/document-generation/initialize-templates`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        alert(`Default templates initialized successfully!\nCreated: ${result.templates_created?.join(', ') || 'Default templates'}`);
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(`Failed to initialize templates: ${error.detail || 'Unknown error'}\nPlease contact your administrator.`);
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      alert('Error initializing templates. Please check your connection and contact your administrator if the problem persists.');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'service_agreements': '📄',
      'intake_documents': '📋',
      'medical_consent': '🏥',
      'care_plans': '💖',
      'risk_assessments': '🛡️',
      'reporting_documents': '📊',
      'general_documents': '📁'
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'service_agreements': 'bg-blue-50 border-blue-200 text-blue-800',
      'intake_documents': 'bg-green-50 border-green-200 text-green-800',
      'medical_consent': 'bg-red-50 border-red-200 text-red-800',
      'care_plans': 'bg-pink-50 border-pink-200 text-pink-800',
      'risk_assessments': 'bg-orange-50 border-orange-200 text-orange-800',
      'reporting_documents': 'bg-purple-50 border-purple-200 text-purple-800',
      'general_documents': 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colors[category] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const formatCategoryName = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participant information...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Participant Not Found</h2>
          <p className="text-gray-600 mb-6">The requested participant could not be found or there was an error loading their information.</p>
          <div className="space-x-3">
            <button 
              onClick={() => navigate('/participants')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Participants
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableTemplates = templates.filter(t => t.template_available);
  const unavailableTemplates = templates.filter(t => !t.template_available);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participant.id}/documents`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Documents
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={20} />
                    Generate Documents
                  </h1>
                  <p className="text-sm text-gray-600">
                    {participant.first_name} {participant.last_name} • {participant.ndis_number || 'NDIS Number Pending'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedTemplates.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {selectedTemplates.size} selected
                  </span>
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
                    Generate Selected ({selectedTemplates.size})
                  </button>
                </div>
              )}
              
              <button
                onClick={() => navigate(`/participants/${participant.id}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <User size={16} />
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                Generate Documents
              </h3>
              <p className="text-sm text-gray-600">Generate official documents for {participant.first_name} {participant.last_name}</p>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
              <span className="text-gray-600">Loading document templates...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Service Unavailable</h4>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-3">
                <button
                  onClick={loadTemplates}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry Connection
                </button>
                {error.includes('not initialized') && (
                  <button
                    onClick={initializeDefaultTemplates}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Initialize Service
                  </button>
                )}
              </div>
            </div>
          ) : availableTemplates.length === 0 && unavailableTemplates.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h4>
              <p className="text-gray-600 mb-4">Document templates need to be initialized by an administrator.</p>
              <button
                onClick={initializeDefaultTemplates}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Initialize Default Templates
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Available Templates */}
              {availableTemplates.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    Available Templates ({availableTemplates.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTemplates.map((template) => (
                      <div key={template.id} className={`border-2 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getCategoryColor(template.category)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center flex-1">
                            <span className="text-2xl mr-3">{getCategoryIcon(template.category)}</span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                {template.name}
                                <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                              </h4>
                              <p className="text-xs text-gray-600">{formatCategoryName(template.category)}</p>
                            </div>
                          </div>
                          
                          <label className="flex items-center ml-3">
                            <input
                              type="checkbox"
                              checked={selectedTemplates.has(template.id)}
                              onChange={() => toggleTemplateSelection(template.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-600">Select</span>
                          </label>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-4">{template.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => previewDocument(template)}
                            className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            title="Preview document"
                          >
                            <Eye size={12} />
                            Preview
                          </button>
                          
                          <button
                            onClick={() => previewTemplateData(template)}
                            className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            title="View template data"
                          >
                            <Settings size={12} />
                            Data
                          </button>
                          
                          <button
                            onClick={() => generateSingleDocument(template)}
                            disabled={generatingTemplates.has(template.id)}
                            className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {generatingTemplates.has(template.id) ? (
                              <Loader2 className="animate-spin" size={12} />
                            ) : (
                              <Download size={12} />
                            )}
                            Generate
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
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-3 grayscale">{getCategoryIcon(template.category)}</span>
                          <div>
                            <h4 className="font-medium text-gray-600">{template.name}</h4>
                            <p className="text-xs text-gray-500">{formatCategoryName(template.category)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                        <p className="text-xs text-yellow-600">Template file not available - contact administrator</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Section */}
              {availableTemplates.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <ExternalLink className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Document Generation Tips</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Use "Preview" to see how the document will look before generating</li>
                        <li>• Use "Data" to inspect what participant information will be included</li>
                        <li>• Select multiple templates and use "Generate Selected" for bulk downloads</li>
                        <li>• Generated documents are automatically formatted and ready to print</li>
                        <li>• If PDF generation is not available, documents will be provided as styled HTML files</li>
                        <li>• All generated documents include current participant data and are timestamped</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}