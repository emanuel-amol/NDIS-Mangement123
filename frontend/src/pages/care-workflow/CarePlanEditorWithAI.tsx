// frontend/src/pages/care-workflow/CarePlanEditorWithAI.tsx - WITH AI INTEGRATION
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Sparkles, FileText, Loader2 } from "lucide-react";
import { DynamicSelect } from "../../components/DynamicSelect";
import { InlineCitation } from "../../components/ai/CitationPopover";
import { aiCarePlanSuggest, aiGetDrafts, parseAICarePlan } from "../../services/ai";

type Support = { 
  type: string; 
  frequency: string; 
  duration?: string;
  location?: string;
  staffRatio?: string;
  notes?: string;
  citations?: number[];
};

type Goal = { 
  category: string;
  text: string; 
  timeframe: string;
  measurementMethod: string;
  targetOutcome: string;
  citations?: number[];
};

type CarePlan = {
  participant_id: string;
  plan_name?: string;
  summary?: string;
  short_goals: Goal[];
  long_goals: Goal[];
  supports: Support[];
  monitoring: { 
    progress_measures?: string; 
    review_cadence?: string;
  };
};

export default function CarePlanEditorWithAI() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [cp, setCp] = useState<CarePlan>({
    participant_id: participantId!,
    summary: "",
    short_goals: [{ category: "", text: "", timeframe: "3-6 months", measurementMethod: "", targetOutcome: "" }],
    long_goals: [{ category: "", text: "", timeframe: "6-12 months", measurementMethod: "", targetOutcome: "" }],
    supports: [{ type: "", frequency: "Weekly", duration: "1 hour", location: "Home", staffRatio: "1:1" }],
    monitoring: { progress_measures: "", review_cadence: "Monthly" },
  });
  
  const [aiDraftAvailable, setAiDraftAvailable] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [aiChunks, setAiChunks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [participantName, setParticipantName] = useState("Participant");

  useEffect(() => {
    const fetchData = async () => {
      if (!participantId) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
        
        // Fetch participant data
        const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
        if (response.ok) {
          const participantData = await response.json();
          setParticipantName(`${participantData.first_name} ${participantData.last_name}`);
          setCp(prev => ({ ...prev, plan_name: `Care Plan for ${participantData.first_name} ${participantData.last_name}` }));
        }
        
        // Check for existing AI draft
        try {
          const draftResponse = await aiGetDrafts(parseInt(participantId));
          if (draftResponse.careplan) {
            setAiDraftAvailable(true);
          }
        } catch (e) {
          console.log('No existing AI draft found');
        }
      } catch (error) {
        console.error('Error fetching participant data:', error);
      }
    };

    fetchData();
  }, [participantId]);

  const generateAIDraft = async () => {
    if (!participantId) return;
    
    setGeneratingAI(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      // First, generate the AI draft
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const draftData = await response.json();
        setAiChunks(draftData.source_ids?.map((id: number) => ({ id, text: '' })) || []);
        setAiDraftAvailable(true);
        alert('AI draft generated successfully! Click "Load AI Draft" to review.');
      } else {
        const error = await response.json();
        // Show more specific error message
        const errorMsg = error.detail || 'Unknown error';
        if (errorMsg.includes('No documents ingested')) {
          alert('Please upload documents first before generating AI draft.');
        } else {
          alert(`Failed to generate AI draft: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('Error generating AI draft:', error);
      alert('Network error while generating AI draft');
    } finally {
      setGeneratingAI(false);
    }
  };

  const loadAIDraft = async () => {
    if (!participantId) return;
    
    setLoadingDraft(true);
    try {
      const draftData = await aiGetDrafts(parseInt(participantId));
      
      if (draftData.careplan) {
        const { goals = [], supports = [] } = draftData.careplan;
        
        // Map AI goals to care plan structure
        const shortGoals = goals.slice(0, Math.ceil(goals.length / 2)).map((goalText: string, i: number) => ({
          category: "AI Generated",
          text: goalText,
          timeframe: "3-6 months",
          measurementMethod: "Progress review and documentation",
          targetOutcome: "Goal achievement as specified",
          citations: supports[i]?.citations || []
        }));
        
        const longGoals = goals.slice(Math.ceil(goals.length / 2)).map((goalText: string, i: number) => ({
          category: "AI Generated",
          text: goalText,
          timeframe: "6-12 months",
          measurementMethod: "Progress review and documentation",
          targetOutcome: "Goal achievement as specified",
          citations: supports[i]?.citations || []
        }));
        
        setCp(prev => ({
          ...prev,
          short_goals: shortGoals.length > 0 ? shortGoals : prev.short_goals,
          long_goals: longGoals.length > 0 ? longGoals : prev.long_goals,
          supports: supports.length > 0 ? supports : prev.supports,
          summary: prev.summary || "AI-generated care plan based on participant documents and profile"
        }));
        
        // Store chunks for citations
        if (draftData.source_ids) {
          setAiChunks(draftData.source_ids.map((id: number) => ({ id, text: `AI Source ${id}` })));
        }
      }
    } catch (error) {
      console.error('Error loading AI draft:', error);
      alert('Failed to load AI draft');
    } finally {
      setLoadingDraft(false);
    }
  };

  const save = async () => {
    if (!cp.summary) {
      alert("Summary is required");
      return;
    }
    setSaving(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: cp.plan_name || `Care Plan for ${participantName}`,
          summary: cp.summary,
          short_goals: cp.short_goals,
          long_goals: cp.long_goals,
          supports: cp.supports,
          monitoring: cp.monitoring,
        }),
      });

      if (response.ok) {
        alert('Care plan saved successfully!');
        navigate(`/care/setup/${participantId}`);
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving care plan:', error);
      alert('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with AI Actions */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI-Powered Care Plan Editor</h1>
                <p className="text-sm text-gray-600">Creating care plan for {participantName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateAIDraft}
                disabled={generatingAI}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {generatingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generatingAI ? 'Generating...' : 'Generate AI Draft'}
              </button>
              
              {aiDraftAvailable && (
                <button
                  onClick={loadAIDraft}
                  disabled={loadingDraft}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingDraft ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Load AI Draft
                </button>
              )}
              
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Care Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Summary</h2>
            <textarea
              value={cp.summary ?? ""}
              onChange={e => setCp({ ...cp, summary: e.target.value })}
              placeholder="Provide a comprehensive summary..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Goals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Short-term Goals</h2>
            {cp.short_goals.map((goal, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                <textarea
                  value={goal.text}
                  onChange={e => {
                    const arr = [...cp.short_goals];
                    arr[i] = { ...goal, text: e.target.value };
                    setCp({ ...cp, short_goals: arr });
                  }}
                  placeholder="Enter goal..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {goal.citations && goal.citations.length > 0 && (
                  <div className="mt-2">
                    <InlineCitation citations={goal.citations} chunks={aiChunks} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Supports Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Supports & Services</h2>
            {cp.supports.map((support, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <DynamicSelect
                    dataType="service_types"
                    value={support.type}
                    onChange={value => {
                      const arr = [...cp.supports];
                      arr[i] = { ...support, type: value };
                      setCp({ ...cp, supports: arr });
                    }}
                    placeholder="Select support type"
                    includeOther={true}
                  />
                  <DynamicSelect
                    dataType="support_frequencies"
                    value={support.frequency}
                    onChange={value => {
                      const arr = [...cp.supports];
                      arr[i] = { ...support, frequency: value };
                      setCp({ ...cp, supports: arr });
                    }}
                    placeholder="Select frequency"
                  />
                </div>
                {support.citations && support.citations.length > 0 && (
                  <div className="mt-2">
                    <InlineCitation citations={support.citations} chunks={aiChunks} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}