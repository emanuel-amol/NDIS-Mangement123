// src/components/AICareAssistant.tsx - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';

// Simple icon components to avoid dependency issues
const BrainIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const FileIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MessageIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ResizeIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 22H2V2h20v20zM4 20h16V4H4v16zm14-2v-2h2v2h-2zm-4 0v-2h2v2h-2zm4-4v-2h2v2h-2z"/>
  </svg>
);

interface AISuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  applicable: boolean;
  category?: string;
  priority?: string;
}

interface AICareAssistantProps {
  participant?: {
    id: number;
    disability_type: string;
    support_category: string;
    risk_level: string;
    age?: number;
    name?: string;
    recentNotes?: string[];
  };
  onSuggestionApply?: (suggestion: AISuggestion) => void;
}

export const AICareAssistant: React.FC<AICareAssistantProps> = ({
  participant,
  onSuggestionApply
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [currentTab, setCurrentTab] = useState<'tools' | 'suggestions' | 'history'>('tools');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('support_session');
  const [aiStatus, setAiStatus] = useState<any>(null);

  const [dimensions, setDimensions] = useState({ width: 500, height: 700 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (isOpen) {
      checkAIStatus();
    }
  }, [isOpen]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimensionsRef.current = { ...dimensions };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = startPosRef.current.x - e.clientX;
    const deltaY = e.clientY - startPosRef.current.y;

    const newWidth = Math.max(400, Math.min(800, startDimensionsRef.current.width + deltaX));
    const newHeight = Math.max(500, Math.min(900, startDimensionsRef.current.height + deltaY));

    setDimensions({ width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/status`);
      const data = await response.json();
      setAiStatus(data);
    } catch (err) {
      console.error('Failed to check AI status:', err);
    }
  };

  const callAIAPI = async (endpoint: string, body: any) => {
    if (!participant) throw new Error('No participant selected');

    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participant.id}/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'AI API call failed');
    }
  };

  const generateCarePlan = async () => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await callAIAPI('care-plan/suggest', {
        participantContext: {
          id: participant?.id,
          name: participant?.name,
          disability_type: participant?.disability_type,
          support_category: participant?.support_category,
          age: participant?.age
        }
      });

      // ✅ FIX: Check response.content instead of response.data
      if (response && response.content) {
        const content = response.content;
        setAiResponse(content);

        const suggestion: AISuggestion = {
          id: `ai_careplan_${response.suggestion_id}`,
          type: 'care_plan',
          title: 'AI-Generated Care Plan',
          description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          reasoning: 'Generated by IBM Watsonx AI based on participant profile and evidence-based practices',
          confidence: 'high',
          applicable: true,
          category: 'ai_generated',
          priority: 'high'
        };

        setSuggestions(prev => [suggestion, ...prev]);
        setCurrentTab('suggestions');
      } else {
        setError('AI generated no response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate care plan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRiskAssessment = async () => {
    setIsAnalyzing(true);
    setError('');

    try {
      const notes = participant?.recentNotes?.length
        ? participant.recentNotes.slice(-3)
        : ['No recent case notes available for analysis'];

      const response = await callAIAPI('risk/assess', { notes });

      // ✅ FIX: Check response.content instead of response.data
      if (response && response.content) {
        const content = response.content;
        setAiResponse(content);

        const suggestion: AISuggestion = {
          id: `ai_risk_${response.suggestion_id}`,
          type: 'risk_assessment',
          title: 'AI Risk Assessment',
          description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          reasoning: 'Risk assessment generated by IBM Watsonx AI based on case notes and participant history',
          confidence: 'high',
          applicable: true,
          category: 'ai_risk',
          priority: 'high'
        };

        setSuggestions(prev => [suggestion, ...prev]);
        setCurrentTab('suggestions');
      } else {
        setError('AI generated no response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate risk assessment');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateClinicalNote = async () => {
    if (!noteInput.trim()) {
      setError('Please enter interaction details');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const interactionSummary = `${sessionType.replace('_', ' ').toUpperCase()}: ${noteInput}`;

      const response = await callAIAPI('notes/clinical', { interactionSummary });

      // ✅ FIX: Check response.content instead of response.data
      if (response && response.content) {
        const content = response.content;
        setAiResponse(content);
        setNoteInput('');
      } else {
        setError('AI generated no response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate clinical note');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'care_plan': return <FileIcon />;
      case 'risk_assessment': return <ShieldIcon />;
      case 'clinical_note': return <MessageIcon />;
      default: return <BrainIcon />;
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors relative"
          title="AI Care Assistant"
        >
          <BrainIcon />
          {suggestions.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {suggestions.length}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={resizeRef}
      className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        minWidth: '400px',
        minHeight: '500px',
        maxWidth: '800px',
        maxHeight: '900px'
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <BrainIcon />
          <div>
            <h3 className="font-semibold text-gray-900">AI Care Assistant</h3>
            {participant && (
              <p className="text-xs text-gray-600">
                for {participant.name || `Participant ${participant.id}`}
              </p>
            )}
            {aiStatus && (
              <div className="flex items-center gap-1 mt-1">
                <div className={`h-2 w-2 rounded-full ${aiStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">
                  {aiStatus.available ? 'AI Ready' : 'AI Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
            {dimensions.width} × {dimensions.height}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('tools')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentTab === 'tools'
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
          Results
          {suggestions.length > 0 && (
            <span className="ml-1 bg-purple-100 text-purple-600 text-xs px-1 rounded">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {aiStatus && !aiStatus.available && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-800">
                AI service is not available. Check backend configuration.
              </span>
            </div>
          </div>
        )}

        {currentTab === 'tools' && (
          <div className="space-y-4">
            {isAnalyzing && (
              <div className="text-center py-4">
                <LoaderIcon />
                <p className="text-sm text-gray-600 mt-2">AI is processing...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={generateCarePlan}
                disabled={isAnalyzing || !participant || (aiStatus && !aiStatus.available)}
                className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileIcon />
                Generate AI Care Plan
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={generateRiskAssessment}
                disabled={isAnalyzing || !participant || (aiStatus && !aiStatus.available)}
                className="w-full bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldIcon />
                Generate AI Risk Assessment
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="text-sm p-2 border rounded"
                >
                  <option value="support_session">Support Session</option>
                  <option value="assessment">Assessment</option>
                  <option value="review">Review</option>
                  <option value="incident">Incident</option>
                  <option value="medical">Medical</option>
                </select>

                <textarea
                  placeholder="Describe the interaction/session in detail..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  rows={Math.max(3, Math.floor(dimensions.height / 200))}
                />
              </div>

              <button
                onClick={generateClinicalNote}
                disabled={isAnalyzing || !participant || !noteInput.trim() || (aiStatus && !aiStatus.available)}
                className="w-full bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <MessageIcon />
                Generate AI Clinical Note
              </button>
            </div>

            {aiResponse && (
              <div className="bg-gray-50 p-3 rounded">
                <h5 className="font-medium text-gray-700 mb-2">Latest AI Response:</h5>
                <div
                  className="text-sm text-gray-600 overflow-y-auto"
                  style={{ maxHeight: `${Math.max(160, dimensions.height * 0.3)}px` }}
                >
                  <pre className="whitespace-pre-wrap">{aiResponse}</pre>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setAiResponse('');
                    setError('');
                    setNoteInput('');
                  }}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Clear Results
                </button>
                <button
                  onClick={checkAIStatus}
                  className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Check AI Status
                </button>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'suggestions' && (
          <div className="space-y-4">
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">AI Generated Results</h4>

                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(suggestion.type)}
                        <h5 className="font-medium text-sm text-gray-900">{suggestion.title}</h5>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>

                    <details className="mb-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View AI Details
                      </summary>
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>AI Reasoning:</strong> {suggestion.reasoning}
                        {suggestion.category && (
                          <div className="mt-1">
                            <strong>Category:</strong> {suggestion.category}
                          </div>
                        )}
                      </div>
                    </details>

                    <div className="flex gap-2">
                      {onSuggestionApply && (
                        <button
                          onClick={() => onSuggestionApply(suggestion)}
                          className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                        >
                          Apply
                        </button>
                      )}
                      <button
                        onClick={() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BrainIcon />
                <p className="text-sm text-gray-500 mt-2">No AI results yet</p>
                <p className="text-xs text-gray-400">Use the AI Tools tab to generate suggestions</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg relative">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">AI suggestions are recommendations only</p>
          <span className="text-xs text-gray-600">
            {aiStatus?.available ? 'Powered by IBM Watsonx' : 'AI Offline'}
          </span>
        </div>

        <div
          className="absolute bottom-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-gray-300 transition-colors rounded-tl-lg flex items-center justify-center"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        >
          <ResizeIcon />
        </div>
      </div>
    </div>
  );
};

export default AICareAssistant;