// frontend/src/pages/AICareAssistant.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, FileText, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface AISuggestion {
  id: number;
  type: string;
  content: string;
  provider: string;
  model: string;
  created_at: string;
}

export default function AICareAssistant() {
  const { participantId } = useParams<{ participantId: string }>();
  const [loading, setLoading] = useState(false);
  const [carePlanLoading, setCarePlanLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}/ai/suggestions/history?limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.status}`);
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      
      if (!data.suggestions || data.suggestions.length === 0) {
        setError('No AI suggestions found. Generate a care plan or risk assessment to get started.');
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const generateCarePlan = async () => {
    setCarePlanLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}/ai/care-plan/suggest`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to generate care plan: ${response.status}`);
      }
      
      await response.json();
      
      // Refresh suggestions after generation
      await fetchSuggestions();
    } catch (err) {
      console.error('Error generating care plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate care plan');
    } finally {
      setCarePlanLoading(false);
    }
  };

  const generateRiskAssessment = async () => {
    setRiskLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/participants/${participantId}/ai/risk/assess`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to generate risk assessment: ${response.status}`);
      }
      
      await response.json();
      
      // Refresh suggestions after generation
      await fetchSuggestions();
    } catch (err) {
      console.error('Error generating risk assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate risk assessment');
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    if (participantId) {
      fetchSuggestions();
    }
  }, [participantId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'care_plan':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Sparkles className="h-5 w-5 text-purple-600" />;
    }
  };

  const getSuggestionTitle = (type: string) => {
    switch (type) {
      case 'care_plan':
        return 'Care Plan Suggestion';
      case 'risk':
        return 'Risk Assessment';
      case 'note':
        return 'Clinical Note';
      default:
        return 'AI Suggestion';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Care Assistant</h1>
                <p className="text-sm text-gray-600">for Participant {participantId}</p>
              </div>
            </div>
            
            <button
              onClick={fetchSuggestions}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Tools</h2>
          <div className="flex gap-4">
            <button
              onClick={generateCarePlan}
              disabled={carePlanLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {carePlanLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              Generate AI Care Plan
            </button>
            
            <button
              onClick={generateRiskAssessment}
              disabled={riskLoading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {riskLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              Generate AI Risk Assessment
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No AI suggestions yet. Generate a care plan or risk assessment to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          {getSuggestionTitle(suggestion.type)}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatDate(suggestion.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Powered by {suggestion.provider} • {suggestion.model}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {suggestion.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}