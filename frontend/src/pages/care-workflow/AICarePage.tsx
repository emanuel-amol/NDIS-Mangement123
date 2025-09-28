// frontend/src/pages/care-workflow/AICarePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Brain, Lightbulb, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';
import { AICareAssistant } from '../../components/AICareAssistant';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  disability_type: string;
  support_category: string;
  risk_level: string;
  age?: number;
  cultural_considerations?: string;
  goals?: any[];
  plan_type?: string;
  recentNotes?: string[];
}

export default function AICarePage() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipantData();
  }, [participantId]);

  const fetchParticipantData = async () => {
    if (!participantId) return;

    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      
      if (response.ok) {
        const data = await response.json();
        setParticipant({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          disability_type: data.disability_type || 'unknown',
          support_category: data.support_category || 'general-support',
          risk_level: data.risk_level || 'medium',
          age: data.age,
          cultural_considerations: data.cultural_considerations,
          goals: data.goals || [],
          plan_type: data.plan_type,
          recentNotes: data.recent_notes || []
        });
      } else {
        setError('Failed to fetch participant data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching participant:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-gray-600 mb-6">{error || 'Participant not found'}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/care/setup/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Care Setup
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Care Insights</h1>
                <p className="text-sm text-gray-600">
                  AI-powered recommendations for {participant.first_name} {participant.last_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <Home size={16} />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Participant Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {participant.first_name} {participant.last_name}
              </h2>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Disability Type:</span> {participant.disability_type}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Support Category:</span> {participant.support_category}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Risk Level:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    participant.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                    participant.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {participant.risk_level}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Care Plan Suggestions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Care Plan Insights</h3>
                <p className="text-sm text-gray-600">AI-generated care recommendations</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Get intelligent suggestions for care goals, support strategies, and best practices tailored to this participant's needs.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Evidence-based recommendations
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Personalized to disability type
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                NDIS compliance aligned
              </div>
            </div>
          </div>

          {/* Risk Assessment Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Risk Analysis</h3>
                <p className="text-sm text-gray-600">Intelligent risk identification</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              AI analysis of potential risks based on participant profile, environment, and support needs with mitigation strategies.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Proactive risk identification
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mitigation strategies
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Safety protocol suggestions
              </div>
            </div>
          </div>

          {/* Documentation Assistant */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Documentation Help</h3>
                <p className="text-sm text-gray-600">SOAP notes and progress reports</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Generate professional SOAP notes and progress documentation with AI assistance for consistent, comprehensive reporting.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                SOAP note generation
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Progress summaries
              </div>
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Professional formatting
              </div>
            </div>
          </div>
        </div>

        {/* AI Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">AI Assistance Disclaimer</h4>
              <p className="text-sm text-yellow-700 mt-1">
                AI-generated suggestions are recommendations only and should always be reviewed by qualified professionals. 
                Use your clinical judgment and adhere to organizational policies when implementing any AI suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to get AI insights?</h3>
          <p className="text-gray-600 mb-6">
            Click the AI Assistant button in the bottom right corner to start getting personalized recommendations.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate(`/care/plan/${participantId}/edit`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Review Care Plan
            </button>
            <button
              onClick={() => navigate(`/care/setup/${participantId}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Care Setup
            </button>
          </div>
        </div>
      </div>

      {/* AI Care Assistant Component */}
      <AICareAssistant
        participant={participant}
        onSuggestionApply={(suggestion) => {
          console.log('Applied suggestion:', suggestion);
          // Handle suggestion application
        }}
      />
    </div>
  );
}