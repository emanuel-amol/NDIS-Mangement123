// frontend/src/components/AICareAssistant.tsx
import React, { useState } from 'react';
import { Brain, MessageCircle, Lightbulb, AlertCircle, CheckCircle, X } from 'lucide-react';

interface AISuggestion {
  id: string;
  type: 'goal' | 'support' | 'risk' | 'general';
  title: string;
  description: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  applicable: boolean;
}

interface AICareAssistantProps {
  participantData?: {
    disability_type: string;
    support_category: string;
    risk_level: string;
    age?: number;
    cultural_considerations?: string;
  };
  carePlanData?: any;
  onSuggestionApply?: (suggestion: AISuggestion) => void;
}

export const AICareAssistant: React.FC<AICareAssistantProps> = ({
  participantData,
  carePlanData,
  onSuggestionApply
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [currentTab, setCurrentTab] = useState<'suggestions' | 'chat'>('suggestions');

  // Mock AI suggestions based on participant data
  const generateSuggestions = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSuggestions: AISuggestion[] = [];
    
    // Generate suggestions based on disability type
    if (participantData?.disability_type === 'intellectual-disability') {
      mockSuggestions.push({
        id: '1',
        type: 'goal',
        title: 'Communication Skills Development',
        description: 'Focus on improving verbal and non-verbal communication skills through structured activities',
        reasoning: 'Studies show that targeted communication interventions significantly improve quality of life for individuals with intellectual disabilities',
        confidence: 'high',
        applicable: true
      });
      
      mockSuggestions.push({
        id: '2',
        type: 'support',
        title: 'Visual Learning Aids',
        description: 'Incorporate visual schedules, picture cards, and step-by-step guides in support delivery',
        reasoning: 'Visual learning approaches are highly effective for individuals with intellectual disabilities',
        confidence: 'high',
        applicable: true
      });
    }
    
    // Generate suggestions based on support category
    if (participantData?.support_category === 'capacity-building-support') {
      mockSuggestions.push({
        id: '3',
        type: 'goal',
        title: 'Independent Living Skills',
        description: 'Develop goals around cooking, cleaning, budgeting, and personal care',
        reasoning: 'Capacity building supports are most effective when focused on practical life skills',
        confidence: 'high',
        applicable: true
      });
    }
    
    // Generate risk-based suggestions
    if (participantData?.risk_level === 'high') {
      mockSuggestions.push({
        id: '4',
        type: 'risk',
        title: 'Enhanced Monitoring Protocol',
        description: 'Implement daily check-ins and emergency response procedures',
        reasoning: 'High-risk participants require more frequent monitoring and clear emergency protocols',
        confidence: 'high',
        applicable: true
      });
    }
    
    // General suggestions
    mockSuggestions.push({
      id: '5',
      type: 'general',
      title: 'Person-Centered Approach',
      description: 'Ensure all goals and supports reflect the participant\'s personal preferences and choices',
      reasoning: 'Person-centered care leads to better engagement and outcomes',
      confidence: 'high',
      applicable: true
    });
    
    setSuggestions(mockSuggestions);
    setIsAnalyzing(false);
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
      case 'support': return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case 'risk': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(true);
            if (suggestions.length === 0) {
              generateSuggestions();
            }
          }}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Brain className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI Care Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('suggestions')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'suggestions'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'chat'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ask AI
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {currentTab === 'suggestions' && (
          <div className="space-y-4">
            {isAnalyzing ? (
              <div className="text-center py-8">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-600">Analyzing participant data...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(suggestion.type)}
                      <h4 className="font-medium text-sm text-gray-900">{suggestion.title}</h4>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                      {suggestion.confidence}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                  
                  <details className="mb-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Why this suggestion?
                    </summary>
                    <p className="text-xs text-gray-500 mt-1">{suggestion.reasoning}</p>
                  </details>
                  
                  {onSuggestionApply && (
                    <button
                      onClick={() => onSuggestionApply(suggestion)}
                      className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                    >
                      Apply Suggestion
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No suggestions available</p>
                <button
                  onClick={generateSuggestions}
                  className="text-sm text-purple-600 hover:text-purple-700 mt-2"
                >
                  Generate Suggestions
                </button>
              </div>
            )}
          </div>
        )}

        {currentTab === 'chat' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-4">AI Chat Assistant</p>
              <p className="text-xs text-gray-400">
                This feature would connect to IBM AskHR or similar AI service to provide interactive assistance
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          AI suggestions are recommendations only. Always use professional judgment.
        </p>
      </div>
    </div>
  );
};

// inside AICareAssistant.tsx
import { useState } from 'react';
import { aiCarePlanSuggest, aiRiskAssess, aiClinicalNote } from '@/services/ai';

export default function AICareAssistant({ participant }: { participant: any }) {
  const [loading, setLoading] = useState(false);
  const [carePlanMd, setCarePlanMd] = useState<string>('');
  const [riskJson, setRiskJson] = useState<any>(null);
  const [noteMd, setNoteMd] = useState<string>('');

  const participantContext = {
    id: participant?.id,
    age: participant?.age,
    goals: participant?.goals || [],
    plan_type: participant?.plan_type,
    disability_type: participant?.disability_type,
  };

  async function onSuggestCarePlan() {
    setLoading(true);
    try {
      const res = await aiCarePlanSuggest(participant.id, participantContext);
      setCarePlanMd(res?.data?.markdown || res?.data?.raw || '');
    } finally { setLoading(false); }
  }

  async function onRiskAssess() {
    setLoading(true);
    try {
      const recentNotes = (participant?.recentNotes || []).slice(-5); // adjust as needed
      const res = await aiRiskAssess(participant.id, recentNotes);
      setRiskJson(res?.data || {});
    } finally { setLoading(false); }
  }

  async function onClinicalNote(summary: string) {
    setLoading(true);
    try {
      const res = await aiClinicalNote(participant.id, summary);
      setNoteMd(res?.data?.markdown || res?.data?.raw || '');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <button onClick={onSuggestCarePlan} disabled={loading}>AI: Care Plan</button>
      {carePlanMd && <pre>{carePlanMd}</pre>}

      <button onClick={onRiskAssess} disabled={loading}>AI: Risk Assess</button>
      {riskJson && <pre>{JSON.stringify(riskJson, null, 2)}</pre>}

      {/* example note input */}
      <textarea placeholder="Interaction summary..." id="noteIn" />
      <button
        onClick={() => {
          const el = document.getElementById('noteIn') as HTMLTextAreaElement;
          onClinicalNote(el?.value || '');
        }}
        disabled={loading}
      >AI: Draft SOAP Note</button>
      {noteMd && <pre>{noteMd}</pre>}
    </div>
  );
}
