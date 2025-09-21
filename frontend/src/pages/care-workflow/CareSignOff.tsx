// frontend/src/pages/care-workflow/CareSignOff.tsx - FIXED VERSION - RISK ASSESSMENT OPTIONAL
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar, 
  Heart,
  Shield,
  Brain,
  ArrowLeft,
  Home,
  Download,
  Send,
  Clock
} from "lucide-react";

interface WorkflowStatus {
  id: number;
  participant_id: number;
  care_plan_completed: boolean;
  risk_assessment_completed: boolean;
  ai_review_completed: boolean;
  quotation_generated: boolean;
  ready_for_onboarding: boolean;
  care_plan_id?: number;
  risk_assessment_id?: number;
  workflow_notes?: string;
  manager_comments?: string;
  created_at: string;
  updated_at?: string;
  participant_name: string;
  participant_status: string;
}

interface OnboardingRequirements {
  participant_id: number;
  participant_status: string;
  requirements: {
    care_plan: {
      required: boolean;
      exists: boolean;
      finalised: boolean;
      status: string;
      care_plan_id?: number;
    };
    risk_assessment: {
      required: boolean;
      exists: boolean;
      status: string;
      risk_assessment_id?: number;
    };
  };
  can_onboard: boolean;
  blocking_issues: string[];
  ready_for_onboarding: boolean;
}

interface SignOffData {
  manager_approval: boolean;
  manager_name: string;
  manager_title: string;
  approval_comments: string;
  final_review_notes: string;
  participant_informed: boolean;
  family_informed: boolean;
  scheduled_start_date: string;
}

export default function CareSignOff() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [requirements, setRequirements] = useState<OnboardingRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signOffData, setSignOffData] = useState<SignOffData>({
    manager_approval: false,
    manager_name: '',
    manager_title: '',
    approval_comments: '',
    final_review_notes: '',
    participant_informed: false,
    family_informed: false,
    scheduled_start_date: ''
  });

  useEffect(() => {
    if (participantId) {
      fetchWorkflowData();
    }
  }, [participantId]);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      // Fetch workflow status
      const workflowResponse = await fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`);
      
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        setWorkflow(workflowData);
      } else {
        console.error('Failed to fetch workflow status');
      }

      // UPDATED: Fetch onboarding requirements to get accurate validation rules
      const requirementsResponse = await fetch(`${API_BASE_URL}/care/participants/${participantId}/onboarding-requirements`);
      
      if (requirementsResponse.ok) {
        const requirementsData = await requirementsResponse.json();
        setRequirements(requirementsData);
      } else {
        console.error('Failed to fetch onboarding requirements');
      }

    } catch (error) {
      console.error('Error fetching workflow data:', error);
      alert('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const convertToOnboarded = async () => {
    // UPDATED: Use requirements-based validation instead of hardcoded logic
    if (!canProceedToOnboarding()) {
      if (requirements && requirements.blocking_issues.length > 0) {
        alert(`Cannot proceed to onboarding: ${requirements.blocking_issues.join(', ')}`);
      } else {
        alert('Requirements not met for onboarding');
      }
      return;
    }

    if (!signOffData.manager_approval) {
      alert('Manager approval is required to proceed');
      return;
    }

    if (!signOffData.manager_name.trim()) {
      alert('Manager name is required');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      // Convert participant to onboarded status
      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/convert-to-onboarded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_data: signOffData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Participant successfully onboarded!');
        
        // Navigate to participant profile or dashboard
        navigate(`/participants/${participantId}`);
      } else {
        const errorData = await response.json();
        alert(`Failed to complete onboarding: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error converting to onboarded:', error);
      alert('Network error occurred during onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  // UPDATED: Use backend requirements instead of frontend logic
  const canProceedToOnboarding = () => {
    return requirements ? requirements.can_onboard : false;
  };

  // UPDATED: Calculate completion based on required vs optional steps
  const getCompletionPercentage = () => {
    if (!workflow || !requirements) return 0;
    
    let totalSteps = 0;
    let completedSteps = 0;

    // Care Plan (required)
    if (requirements.requirements.care_plan.required) {
      totalSteps++;
      if (workflow.care_plan_completed) completedSteps++;
    }

    // Risk Assessment (check if required)
    if (requirements.requirements.risk_assessment.required) {
      totalSteps++;
      if (workflow.risk_assessment_completed) completedSteps++;
    }

    // Optional steps (AI Review, Quotation) - count towards progress but don't affect requirements
    totalSteps += 2; // AI Review and Quotation
    if (workflow.ai_review_completed) completedSteps++;
    if (workflow.quotation_generated) completedSteps++;
    
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  };

  const handleInputChange = (field: keyof SignOffData, value: string | boolean) => {
    setSignOffData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workflow status...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow Not Found</h2>
          <p className="text-gray-600 mb-6">Could not find workflow status for this participant.</p>
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

  const completionPercentage = getCompletionPercentage();
  const canOnboard = canProceedToOnboarding();

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
                <h1 className="text-xl font-semibold text-gray-900">Care Plan Sign-Off</h1>
                <p className="text-sm text-gray-600">Final review and approval for {workflow.participant_name}</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Completion Status</h2>
            <span className="text-sm text-gray-600">{completionPercentage}% Complete</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Care Plan - Required */}
            <div className={`p-4 rounded-lg border-2 ${workflow.care_plan_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center">
                <Heart className={`h-5 w-5 mr-2 ${workflow.care_plan_completed ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium">
                  Care Plan
                  {requirements?.requirements.care_plan.required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {workflow.care_plan_completed && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {workflow.care_plan_completed ? 'Completed' : 'Required'}
              </p>
            </div>

            {/* Risk Assessment - Now shows as optional */}
            <div className={`p-4 rounded-lg border-2 ${
              workflow.risk_assessment_completed 
                ? 'bg-green-50 border-green-200' 
                : requirements?.requirements.risk_assessment.required 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center">
                <Shield className={`h-5 w-5 mr-2 ${
                  workflow.risk_assessment_completed 
                    ? 'text-green-600' 
                    : requirements?.requirements.risk_assessment.required 
                      ? 'text-gray-400' 
                      : 'text-blue-600'
                }`} />
                <span className="font-medium">
                  Risk Assessment
                  {requirements?.requirements.risk_assessment.required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {workflow.risk_assessment_completed && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {workflow.risk_assessment_completed 
                  ? 'Completed' 
                  : requirements?.requirements.risk_assessment.required 
                    ? 'Required' 
                    : 'Optional'
                }
              </p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${workflow.ai_review_completed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center">
                <Brain className={`h-5 w-5 mr-2 ${workflow.ai_review_completed ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className="font-medium">AI Review</span>
                {workflow.ai_review_completed && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {workflow.ai_review_completed ? 'Completed' : 'Optional'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${workflow.quotation_generated ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center">
                <FileText className={`h-5 w-5 mr-2 ${workflow.quotation_generated ? 'text-green-600' : 'text-blue-600'}`} />
                <span className="font-medium">Quotation</span>
                {workflow.quotation_generated && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {workflow.quotation_generated ? 'Generated' : 'Ready to Generate'}
              </p>
            </div>
          </div>
        </div>

        {/* UPDATED: Requirements Check based on backend validation */}
        {!canOnboard && requirements && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Requirements Not Met</h3>
                <div className="text-sm text-yellow-700 mt-1">
                  {requirements.blocking_issues.length > 0 ? (
                    <>
                      <p>The following items must be completed before proceeding to onboarding:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {requirements.blocking_issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>Please ensure all required steps are completed.</p>
                  )}
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate(`/care/setup/${participantId}`)}
                    className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
                  >
                    Return to Care Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manager Approval Section */}
        {canOnboard && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Manager Approval & Sign-Off</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signOffData.manager_name}
                    onChange={(e) => handleInputChange('manager_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter manager's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Title
                  </label>
                  <input
                    type="text"
                    value={signOffData.manager_title}
                    onChange={(e) => handleInputChange('manager_title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter job title/position"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Service Start Date
                </label>
                <input
                  type="date"
                  value={signOffData.scheduled_start_date}
                  onChange={(e) => handleInputChange('scheduled_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Comments
                </label>
                <textarea
                  value={signOffData.approval_comments}
                  onChange={(e) => handleInputChange('approval_comments', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any comments about the approval..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Review Notes
                </label>
                <textarea
                  value={signOffData.final_review_notes}
                  onChange={(e) => handleInputChange('final_review_notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any final notes about the care plan, risks, or service delivery considerations..."
                />
              </div>

              {/* Communication Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="participant_informed"
                    checked={signOffData.participant_informed}
                    onChange={(e) => handleInputChange('participant_informed', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="participant_informed" className="ml-2 block text-sm text-gray-700">
                    Participant has been informed about the care plan and service commencement
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="family_informed"
                    checked={signOffData.family_informed}
                    onChange={(e) => handleInputChange('family_informed', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="family_informed" className="ml-2 block text-sm text-gray-700">
                    Family/representatives have been informed (if applicable)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="manager_approval"
                    checked={signOffData.manager_approval}
                    onChange={(e) => handleInputChange('manager_approval', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="manager_approval" className="ml-2 block text-sm text-gray-700 font-medium">
                    <span className="text-red-500">*</span> I approve this care plan and authorize commencement of services
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/care/setup/${participantId}`)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Setup
            </button>
            
            <button
              onClick={() => alert('Export functionality would generate PDF summary')}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download size={16} />
              Export Summary
            </button>
          </div>
          
          <div className="flex gap-3">
            {!canOnboard ? (
              <div className="text-sm text-gray-500 italic">
                Complete required workflow steps to proceed
              </div>
            ) : (
              <button
                onClick={convertToOnboarded}
                disabled={submitting || !signOffData.manager_approval || !signOffData.manager_name.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Complete Onboarding
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Workflow Notes */}
        {workflow.workflow_notes && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Workflow Notes</h3>
            <p className="text-sm text-blue-700">{workflow.workflow_notes}</p>
          </div>
        )}

        {/* UPDATED: Add requirements legend */}
        <div className="text-center text-sm text-gray-500 mt-4">
          <span className="text-red-500">*</span> Required for onboarding • 
          Other steps are optional but recommended for comprehensive care
        </div>
      </div>
    </div>
  );
}