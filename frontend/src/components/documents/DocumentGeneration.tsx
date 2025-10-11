// frontend/src/components/documents/DocumentGeneration.tsx - ABSOLUTE FIX
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export const DocumentGeneration: React.FC<DocumentGenerationProps> = ({
  participantId,
  participantName = "Participant",
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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    console.log('🔄 DocumentGeneration mounted, loading templates...');
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    console.log('📞 loadTemplates() called');
    try {
      setLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/api/v1/templates`;
      console.log('🔍 Fetching from:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Raw data:', data);
        
        let templateList: DocumentTemplate[] = [];
        
        if (Array.isArray(data)) {
          templateList = data;
        } else if (data.templates && Array.isArray(data.templates)) {
          templateList = data.templates;
        } else if (data.data && Array.isArray(data.data)) {
          templateList = data.data;
        }
        
        console.log('✅ Templates loaded:', templateList.length);
        setTemplates(templateList);
        
      } else if (response.status === 404) {
        console.error('❌ Templates endpoint not found (404)');
        setError('Document generation service not initialized');
        setTemplates([]);
      } else {
        console.error('❌ Failed:', response.status);
        setError(`Failed to load templates: ${response.statusText}`);
        setTemplates([]);
      }
    } catch (error) {
      console.error('❌ Exception:', error);
      setError('Failed to connect to document generation service');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSingleDocument = async (template: DocumentTemplate) => {
    if (!template.template_available || !participantId) {
      alert('Template or participant not available');
      return;
    }

    setGeneratingTemplates(prev => new Set(prev).add(template.id));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/participants/${participantId}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          additional_data: {}
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || '';
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
        
        alert(`${template.name} generated successfully!`);
        if (onDocumentGenerated) {
          onDocumentGenerated(template.id, filename);
        }
      } else {
        const error = await response.json();
        alert(`Failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Network error generating ${template.name}`);
    } finally {
      setGeneratingTemplates(prev => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  };

  const previewDocument = (template: DocumentTemplate) => {
    if (!template.template_available || !participantId) return;
    const url = `${API_BASE_URL}/api/v1/participants/${participantId}/generate-document/${template.id}/preview`;
    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
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
    if (selectedTemplates.size === 0 || !participantId) {
      alert('Please select at least one template');
      return;
    }

    setBulkGenerating(true);
    
    try {
      const templateIds = Array.from(selectedTemplates).join(',');
      const response = await fetch(`${API_BASE_URL}/api/v1/participants/${participantId}/bulk-generate?template_ids=${templateIds}`);

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
      console.error('Error:', error);
      alert('Network error during bulk generation');
    } finally {
      setBulkGenerating(false);
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

  const availableTemplates = templates.filter(t => t && t.template_available);
  const unavailableTemplates = templates.filter(t => t && !t.template_available);

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
          <button onClick={loadTemplates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-yellow-500 mb-4" size={48} />
          <h4 className="text-lg font-medium mb-2">No Templates Available</h4>
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
        </div>
      )}
    </div>
  );
};

export default DocumentGeneration;

// Page wrapper that extracts participant from URL
export const DocumentGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Extract participant ID from URL
  const pathParts = window.location.pathname.split('/');
  const participantIdIndex = pathParts.indexOf('participants') + 1;
  const participantId = parseInt(pathParts[participantIdIndex]);

  useEffect(() => {
    console.log('📍 DocumentGenerationPage mounted');
    console.log('🔢 Participant ID from URL:', participantId);
    
    if (!participantId || isNaN(participantId)) {
      console.error('❌ Invalid participant ID:', participantId);
      setLoading(false);
      return;
    }

    const loadParticipant = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/api/v1/participants/${participantId}`;
        console.log('🔍 Fetching participant from:', url);
        
        const response = await fetch(url);
        console.log('📡 Participant response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Participant loaded:', data);
          setParticipant(data);
        } else {
          console.error('❌ Failed to load participant');
        }
      } catch (error) {
        console.error('❌ Exception loading participant:', error);
      } finally {
        setLoading(false);
      }
    };

    loadParticipant();
  }, [participantId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </div>
    );
  }

  if (!participantId || isNaN(participantId) || !participant) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Invalid Participant</h3>
          <p className="text-red-700 mb-4">Could not load participant information.</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DocumentGeneration 
        participantId={participantId}
        participantName={participantName}
        showBackButton={true}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};