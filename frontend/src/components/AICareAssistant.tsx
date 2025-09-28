// frontend/src/components/AICareAssistant.tsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageCircle, 
  Lightbulb, 
  AlertCircle, 
  CheckCircle, 
  X, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  Clock,
  TrendingUp,
  FileText,
  Shield,
  Users
} from 'lucide-react';
import { aiCarePlanSuggest, aiRiskAssess, aiClinicalNote } from '../services/ai';

interface AISuggestion {
  id: string;
  type: 'goal' | 'support' | 'risk' | 'general';
  title: string;
  description: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  applicable: boolean;
  category?: string;
  implementation?: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedImpact?: string;
}

interface AIResponse {
  ok: boolean;
  suggestion_id: number;
  data: {
    markdown?: string;
    raw?: string;
    suggestions?: AISuggestion[];
    summary?: string;
    notes_analyzed?: number;
    confidence?: string;
  };
  metadata?: {
    text_length?: number;
    suggestions_count?: number;
    notes_count?: number;
  };
}

interface AICareAssistantProps {
  participant?: {
    id: number;
    disability_type: string;
    support_category: string;
    risk_level: string;
    age?: number;
    cultural_considerations?: string;
    goals?: any[];
    plan_type?: string;
    recentNotes?: string[];
    name?: string;
  };
  carePlanData?: any;
  onSuggestionApply?: (suggestion: AISuggestion) => void;
}

export const AICareAssistant: React.FC<AICareAssistantProps> = ({
  participant,
  carePlanData,
  onSuggestionApply
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [currentTab, setCurrentTab] = useState<'suggestions' | 'ai-tools' | 'history'>('ai-tools');
  
  // AI Tools state
  const [carePlanMd, setCarePlanMd] = useState<string>('');
  const [riskData, setRiskData] = useState<any>(null);
  const [noteMd, setNoteMd] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('support_session');
  const [sessionDuration, setSessionDuration] = useState<string>('');
  
  // History and feedback state
  const [suggestionHistory, setSuggestionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Enhanced state for better UX
  const [lastOperation, setLastOperation] = useState<string>('');
  const [operationResults, setOperationResults] = useState<Record<string, AIResponse>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const participantContext = participant ? {
    id: participant.id,
    age: participant.age,
    goals: participant.goals || [],
    plan_type: participant.plan_type,
    disability_type: participant.disability_type,
    support_category: participant.support_category,
    risk_level: participant.risk_level,
    cultural_considerations: participant.cultural_considerations,
  } : {};

  // Load suggestion history when component opens
  useEffect(() => {
    if (isOpen && participant && currentTab === 'history') {
      loadSuggestionHistory();
    }
  }, [isOpen, participant, currentTab]);

  const loadSuggestionHistory = async () => {
    if (!participant) return;
    
    setLoadingHistory(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/participants/${participant.id}/ai/suggestions/history?limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        setSuggestionHistory(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestion history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApiCall = async (
    operation: string,
    apiCall: () => Promise<AIResponse>,
    successCallback?: (result: AIResponse) => void
  ) => {
    setIsAnalyzing(true);
    setLastOperation(operation);
    setErrors(prev => ({ ...prev, [operation]: '' }));

    try {
      const result = await apiCall();
      setOperationResults(prev => ({ ...prev, [operation]: result }));
      
      if (successCallback) {
        successCallback(result);
      }
      
      // Auto-switch to results view if not already there
      if (currentTab === 'ai-tools' && result.data) {
        // Show results in current tab
      }
      
    } catch (error) {
      console.error(`${operation} failed:`, error);
      setErrors(prev => ({ ...prev, [operation]: error instanceof Error ? error.message : 'Operation failed' }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSuggestCarePlan = async () => {
    if (!participant) return;
    
    await handleApiCall(
      'care_plan',
      () => aiCarePlanSuggest(participant.id, participantContext, carePlanData),
      (result) => {
        setCarePlanMd(result.data?.markdown || result.data?.raw || '');
        if (result.data?.suggestions) {
          setSuggestions(result.data.suggestions);
        }
      }
    );
  };

  const onRiskAssess = async () => {
    if (!participant) return;
    
    await handleApiCall(
      'risk_assessment',
      () => {
        const recentNotes = (participant.recentNotes || []).slice(-5);
        return aiRiskAssess(participant.id, recentNotes);
      },
      (result) => {
        setRiskData(result.data || {});
      }
    );
  };

  const onClinicalNote = async (summary: string, type: string = sessionType, duration: string = sessionDuration) => {
    if (!participant || !summary.trim()) return;
    
    await handleApiCall(
      'clinical_note',
      () => aiClinicalNote(participant.id, summary, type, duration),
      (result) => {
        setNoteMd(result.data?.markdown || result.data?.raw || '');
      }
    );
  };

  const generateSuggestions = async () => {
    if (!participant) return;
    
    setIsAnalyzing(true);
    
    // Simulate intelligent suggestion generation based on participant data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSuggestions: AISuggestion[] = [];
    
    // Generate context-aware suggestions
    if (participant.disability_type === 'intellectual-disability') {
      mockSuggestions.push({
        id: '1',
        type: 'goal',
        title: 'Communication Skills Development',
        description: 'Focus on improving verbal and non-verbal communication skills through structured activities',
        reasoning: 'Evidence-based research shows targeted communication interventions significantly improve quality of life for individuals with intellectual disabilities',
        confidence: 'high',
        applicable: true,
        category: 'communication',
        implementation: 'Weekly sessions with speech pathologist, daily practice with support workers',
        priority: 'high',
        estimatedImpact: 'Improved social interactions and independence in 3-6 months'
      });
      
      mockSuggestions.push({
        id: '2',
        type: 'support',
        title: 'Visual Learning Aids Implementation',
        description: 'Incorporate visual schedules, picture cards, and step-by-step guides in support delivery',
        reasoning: 'Visual learning approaches are highly effective for individuals with intellectual disabilities, improving comprehension by up to 65%',
        confidence: 'high',
        applicable: true,
        category: 'learning_support',
        implementation: 'Create personalized visual aids, train support staff on usage',
        priority: 'medium',
        estimatedImpact: 'Better task completion and reduced anxiety'
      });
    }
    
    if (participant.support_category === 'capacity-building-support') {
      mockSuggestions.push({
        id: '3',
        type: 'goal',
        title: 'Independent Living Skills Enhancement',
        description: 'Develop comprehensive goals around cooking, cleaning, budgeting, and personal care',
        reasoning: 'Capacity building supports are most effective when focused on practical life skills that increase independence',
        confidence: 'high',
        applicable: true,
        category: 'independence',
        implementation: 'Weekly skill-building sessions, progress tracking tools',
        priority: 'high',
        estimatedImpact: 'Increased independence and confidence in daily living'
      });
    }
    
    if (participant.risk_level === 'high') {
      mockSuggestions.push({
        id: '4',
        type: 'risk',
        title: 'Enhanced Safety Monitoring Protocol',
        description: 'Implement daily check-ins, emergency response procedures, and environmental safety assessments',
        reasoning: 'High-risk participants require proactive monitoring to prevent incidents and ensure safety',
        confidence: 'high',
        applicable: true,
        category: 'safety',
        implementation: 'Daily safety checks, emergency contact protocols, staff safety training',
        priority: 'high',
        estimatedImpact: 'Reduced risk incidents and improved safety outcomes'
      });
    }

    // Age-specific suggestions
    if (participant.age && participant.age < 25) {
      mockSuggestions.push({
        id: '5',
        type: 'general',
        title: 'Youth Transition Planning',
        description: 'Focus on education, employment preparation, and social skill development',
        reasoning: 'Young adults with disabilities benefit from early transition planning for better long-term outcomes',
        confidence: 'high',
        applicable: true,
        category: 'transition',
        implementation: 'Career counseling, social skills groups, education support',
        priority: 'medium',
        estimatedImpact: 'Better transition to adult life and employment opportunities'
      });
    }
    
    // Always include person-centered approach
    mockSuggestions.push({
      id: '6',
      type: 'general',
      title: 'Person-Centered Approach Enhancement',
      description: 'Ensure all goals and supports reflect the participant\'s personal preferences, cultural background, and individual choices',
      reasoning: 'Person-centered care leads to 40% better engagement and improved outcomes across all disability types',
      confidence: 'high',
      applicable: true,
      category: 'person_centered',
      implementation: 'Regular preference assessments, choice-making opportunities, cultural sensitivity training',
      priority: 'medium',
      estimatedImpact: 'Higher satisfaction and better goal achievement'
    });
    
    setSuggestions(mockSuggestions);
    setIsAnalyzing(false);
  };

  const markSuggestionAsApplied = async (suggestionId: string) => {
    if (!participant) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/participants/${participant.id}/ai/suggestions/${suggestionId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applied_by: 'user' })
      });
      
      if (response.ok) {
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId ? { ...s, applicable: false } : s
        ));
      }
    } catch (error) {
      console.error('Failed to mark suggestion as applied:', error);
    }
  };

  const provideFeedback = async (suggestionId: string, feedbackType: 'helpful' | 'not_helpful') => {
    // Implementation for feedback system
    console.log(`Feedback: ${feedbackType} for suggestion ${suggestionId}`);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'goal': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'support': return <Users className="h-4 w-4 text-blue-600" />;
      case 'risk': return <Shield className="h-4 w-4 text-red-600" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(true);
            if (suggestions.length === 0 && currentTab === 'suggestions') {
              generateSuggestions();
            }
          }}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors relative"
        >
          <Brain className="h-6 w-6" />
          {/* Notification indicator if there are new insights */}
          {suggestions.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {suggestions.filter(s => s.applicable).length}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900">AI Care Assistant</h3>
            {participant && (
              <p className="text-xs text-gray-600">
                for {participant.name || `Participant ${participant.id}`}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('ai-tools')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'ai-tools'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          AI Tools
        </button>
        <button
          onClick={() => setCurrentTab('suggestions')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'suggestions'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Insights
          {suggestions.filter(s => s.applicable).length > 0 && (
            <span className="ml-1 bg-purple-100 text-purple-600 text-xs px-1 rounded">
              {suggestions.filter(s => s.applicable).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setCurrentTab('history')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'history'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Tools Tab */}
        {currentTab === 'ai-tools' && (
          <div className="p-4 space-y-4">
            {isAnalyzing && (
              <div className="text-center py-4">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-600">Processing {lastOperation}...</p>
              </div>
            )}

            {/* Care Plan Tool */}
            <div className="space-y-3">
              <button 
                onClick={onSuggestCarePlan} 
                disabled={isAnalyzing || !participant}
                className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                AI: Generate Care Plan
              </button>
              
              {errors.care_plan && (
                <div className="bg-red-50 text-red-700 p-2 rounded text-xs">
                  Error: {errors.care_plan}
                </div>
              )}
              
              {carePlanMd && (
                <div className="bg-gray-50 p-3 rounded text-xs max-h-40 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">Care Plan Suggestions:</span>
                    <span className="text-xs text-green-600">✓ Generated</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">{carePlanMd}</pre>
                </div>
              )}
            </div>

            {/* Risk Assessment Tool */}
            <div className="space-y-3">
              <button 
                onClick={onRiskAssess} 
                disabled={isAnalyzing || !participant}
                className="w-full bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Shield className="h-4 w-4" />
                AI: Risk Assessment
              </button>
              
              {errors.risk_assessment && (
                <div className="bg-red-50 text-red-700 p-2 rounded text-xs">
                  Error: {errors.risk_assessment}
                </div>
              )}
              
              {riskData && (
                <div className="bg-gray-50 p-3 rounded text-xs max-h-40 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">Risk Analysis:</span>
                    <span className="text-xs text-green-600">✓ Complete</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(riskData, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Clinical Notes Tool */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="text-xs p-1 border rounded"
                >
                  <option value="support_session">Support Session</option>
                  <option value="assessment">Assessment</option>
                  <option value="review">Review</option>
                  <option value="incident">Incident</option>
                  <option value="medical">Medical</option>
                </select>
                <input 
                  type="text"
                  placeholder="Duration (e.g., 2 hours)"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  className="text-xs p-1 border rounded"
                />
              </div>
              
              <textarea 
                placeholder="Describe the interaction/session in detail..." 
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                rows={3}
              />
              
              <button
                onClick={() => onClinicalNote(noteInput)}
                disabled={isAnalyzing || !participant || !noteInput.trim()}
                className="w-full bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                AI: Generate SOAP Note
              </button>
              
              {errors.clinical_note && (
                <div className="bg-red-50 text-red-700 p-2 rounded text-xs">
                  Error: {errors.clinical_note}
                </div>
              )}
              
              {noteMd && (
                <div className="bg-gray-50 p-3 rounded text-xs max-h-40 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">SOAP Note:</span>
                    <span className="text-xs text-green-600">✓ Generated</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">{noteMd}</pre>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    setCarePlanMd('');
                    setRiskData(null);
                    setNoteMd('');
                    setNoteInput('');
                    setErrors({});
                  }}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Clear Results
                </button>
                <button 
                  onClick={loadSuggestionHistory}
                  className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                >
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions Tab */}
        {currentTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            {isAnalyzing ? (
              <div className="text-center py-8">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-600">Analyzing participant data...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">AI Insights</h4>
                  <button
                    onClick={generateSuggestions}
                    className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200"
                  >
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Refresh
                  </button>
                </div>
                
                {suggestions.filter(s => s.applicable).map((suggestion) => (
                  <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(suggestion.type)}
                        <h4 className="font-medium text-sm text-gray-900">{suggestion.title}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        {suggestion.priority && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                          {suggestion.confidence}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    
                    {suggestion.estimatedImpact && (
                      <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
                        <span className="font-medium text-blue-800">Expected Impact: </span>
                        <span className="text-blue-700">{suggestion.estimatedImpact}</span>
                      </div>
                    )}
                    
                    <details className="mb-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View Details
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div className="text-xs">
                          <span className="font-medium text-gray-700">Why this suggestion: </span>
                          <span className="text-gray-600">{suggestion.reasoning}</span>
                        </div>
                        {suggestion.implementation && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">How to implement: </span>
                            <span className="text-gray-600">{suggestion.implementation}</span>
                          </div>
                        )}
                        {suggestion.category && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-700">Category: </span>
                            <span className="text-gray-600 capitalize">{suggestion.category.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                    </details>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {onSuggestionApply && (
                          <button
                            onClick={() => {
                              onSuggestionApply(suggestion);
                              markSuggestionAsApplied(suggestion.id);
                            }}
                            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                          >
                            Apply
                          </button>
                        )}
                        <button
                          onClick={() => markSuggestionAsApplied(suggestion.id)}
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200"
                        >
                          Mark as Applied
                        </button>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => provideFeedback(suggestion.id, 'helpful')}
                          className="text-gray-400 hover:text-green-600"
                          title="This suggestion is helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => provideFeedback(suggestion.id, 'not_helpful')}
                          className="text-gray-400 hover:text-red-600"
                          title="This suggestion is not helpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {suggestions.filter(s => !s.applicable).length > 0 && (
                  <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      View Applied Suggestions ({suggestions.filter(s => !s.applicable).length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {suggestions.filter(s => !s.applicable).map((suggestion) => (
                        <div key={suggestion.id} className="border border-gray-200 rounded-lg p-2 opacity-60">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-gray-700">{suggestion.title}</span>
                            <span className="text-xs text-green-600">Applied</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-4">No AI insights available</p>
                <button
                  onClick={generateSuggestions}
                  className="text-sm text-purple-600 hover:text-purple-700 bg-purple-100 px-3 py-2 rounded"
                >
                  Generate AI Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {currentTab === 'history' && (
          <div className="p-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-500">Loading history...</p>
              </div>
            ) : suggestionHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">AI Activity History</h4>
                  <button
                    onClick={loadSuggestionHistory}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Refresh
                  </button>
                </div>
                
                {suggestionHistory.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'care_plan' && <FileText className="h-4 w-4 text-blue-600" />}
                        {item.type === 'risk' && <Shield className="h-4 w-4 text-red-600" />}
                        {item.type === 'note' && <MessageCircle className="h-4 w-4 text-green-600" />}
                        <span className="text-sm font-medium capitalize">
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.applied && (
                          <CheckCircle className="h-4 w-4 text-green-600" title="Applied" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(item.confidence)}`}>
                          {item.confidence}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                    </p>
                    
                    {item.payload && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          View Content
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded max-h-32 overflow-y-auto">
                          {typeof item.payload === 'string' ? (
                            <pre className="whitespace-pre-wrap">{item.payload}</pre>
                          ) : (
                            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No AI activity history</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            AI suggestions are recommendations only
          </p>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-xs text-gray-600">Powered by IBM Watsonx</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICareAssistant;