// frontend/src/pages/care-workflow/CareSignOff.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Heart,
  Shield,
  DollarSign,
  ArrowLeft,
  Home,
  Clock,
  XCircle,
  Edit,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  participant_id?: string;
  status: string;
}

interface WorkflowStatus {
  id: number;
  participant_id: number;
  care_plan_completed: boolean;
  risk_assessment_completed: boolean;
  documents_generated: boolean;
  quotation_generated: boolean;
  ready_for_onboarding: boolean;
  care_plan_completed_date?: string;
  risk_assessment_completed_date?: string;
  documents_generated_date?: string;
  quotation_generated_date?: string;
  workflow_notes?: string;
  manager_comments?: string;
}

interface OnboardingRequirements {
  requirements: {
    care_plan: {
      required: boolean;
      exists: boolean;
      finalised: boolean;
    };
    risk_assessment: {
      required: boolean;
      exists: boolean;
    };
  };
  can_onboard: boolean;
  blocking_issues: string[];
}

interface CarePlan {
  id: number;
  plan_name?: string;
  summary?: string;
  short_goals?: any;
  is_finalised?: boolean;
  created_at: string;
}

interface RiskAssessment {
  id: number;
  overall_risk_rating?: string;
  risks?: any;
  created_at: string;
}

interface ApprovalDecision {
  manager_name: string;
  manager_title: string;
  approval_comments: string;
  scheduled_start_date: string;
  checklist: {
    care_plan_accurate: boolean;
    consents_attached: boolean;
    quotation_correct: boolean;
    participant_suitable: boolean;
  };
}

export default function CareSignOff() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [requirements, setRequirements] = useState<OnboardingRequirements | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [decision, setDecision] = useState<ApprovalDecision>({
    manager_name: '',
    manager_title: '',
    approval_comments: '',
    scheduled_start_date: '',
    checklist: {
      care_plan_accurate: false,
      consents_attached: false,
      quotation_correct: false,
      participant_suitable: false
    }
  });

  useEffect(() => {
    if (participantId) {
      fetchAllData();
    }
  }, [participantId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const participantRes = await fetch(`${API_BASE_URL}/api/v1/participants/${participantId}`);
      if (participantRes.ok) setParticipant(await participantRes.json());

      const workflowRes = await fetch(`${API_BASE_URL}/api/v1/care/participants/${participantId}/prospective-workflow`);
      if (workflowRes.ok) setWorkflow(await workflowRes.json());

      const reqRes = await fetch(`${API_BASE_URL}/api/v1/care/participants/${participantId}/onboarding-requirements`);
      if (reqRes.ok) setRequirements(await reqRes.json());

      const cpRes = await fetch(`${API_BASE_URL}/api/v1/care/participants/${participantId}/care-plan`);
      if (cpRes.ok) setCarePlan(await cpRes.json());

      const raRes = await fetch(`${API_BASE_URL}/api/v1/care/participants/${participantId}/risk-assessment`);
      if (raRes.ok) setRiskAssessment(await raRes.json());

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!allChecklistComplete()) {
      alert('Please complete all checklist items before approving');
      return;
    }

    if (!decision.manager_name.trim()) {
      alert('Manager name is required');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/v1/care/participants/${participantId}/convert-to-onboarded`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_data: {
            manager_name: decision.manager_name,
            manager_title: decision.manager_title,
            approval_comments: decision.approval_comments,
            scheduled_start_date: decision.scheduled_start_date,
          }
        }),
      });

      if (response.ok) {
        alert('Participant successfully approved and onboarded!');
        navigate(`/participants/${participantId}`);
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const allChecklistComplete = () => {
    return Object.values(decision.checklist).every(v => v === true);
  };

  const autoChecksPass = () => {
    if (!workflow || !requirements) return false;
    return requirements.can_onboard && requirements.blocking_issues.length === 0;
  };

  const updateChecklist = (key: keyof ApprovalDecision['checklist'], value: boolean) => {
    setDecision(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: value }
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const parseArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [data];
      } catch {
        return [data];
      }
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
          <p className="mt-4 text-gray-600">Loading approval package...</p>
        </div>
      </div>
    );
  }

  if (!workflow || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Not Found</h2>
          <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canApprove = autoChecksPass() && allChecklistComplete();
  const shortGoals = parseArray(carePlan?.short_goals);
  const risks = parseArray(riskAssessment?.risks);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Care Package Approval</h1>
                <p className="text-sm text-gray-600">
                  {participant.first_name} {participant.last_name}
                  {participant.date_of_birth && ` • DOB: ${formatDate(participant.date_of_birth)}`}
                  {participant.participant_id && ` • ID: ${participant.participant_id}`}
                </p>
              </div>
            </div>
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
              <Home size={16} />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            workflow.ready_for_onboarding ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {workflow.ready_for_onboarding ? 'Ready for Approval' : 'Pending Prerequisites'}
          </span>
        </div>

        {/* Blocking Issues */}
        {!autoChecksPass() && requirements && requirements.blocking_issues.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Prerequisites Not Met</h3>
                <ul className="list-disc list-inside space-y-1 mt-1 text-sm text-red-700">
                  {requirements.blocking_issues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Auto Checks */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Automated Validation</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Care Plan Completed</span>
                  {workflow.care_plan_completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Care Plan Finalised</span>
                  {requirements?.requirements.care_plan.finalised ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Risk Assessment</span>
                  {workflow.risk_assessment_completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Documents Generated</span>
                  {workflow.documents_generated ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Quotation Prepared</span>
                  {workflow.quotation_generated ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">No Blocking Issues</span>
                  {requirements?.blocking_issues.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Care Plan */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Heart className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Care Plan</h3>
                </div>
                <div className="text-xs text-gray-500">{formatDate(carePlan?.created_at)}</div>
              </div>
              {carePlan ? (
                <>
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-600 mb-1">Overall Risk Level:</div>
                    {carePlan.is_finalised ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Finalised
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </div>
                  {shortGoals.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-600 mb-1">Key Goals:</div>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {shortGoals.slice(0, 2).map((goal, i) => (
                          <li key={i}>{typeof goal === 'string' ? goal : 'Goal identified'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link to={`/participants/${participantId}`} className="text-blue-600 hover:underline text-sm">
                    View Care Plan
                  </Link>
                </>
              ) : (
                <p className="text-sm text-gray-500">Care plan not available</p>
              )}
            </div>

            {/* Risk Assessment */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                </div>
                {riskAssessment && (
                  <div className="text-xs text-gray-500">{formatDate(riskAssessment.created_at)}</div>
                )}
              </div>
              {riskAssessment ? (
                <>
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-600 mb-1">Overall Risk Level:</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      riskAssessment.overall_risk_rating === 'high' ? 'bg-red-100 text-red-800' :
                      riskAssessment.overall_risk_rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {riskAssessment.overall_risk_rating?.toUpperCase() || 'NOT SET'}
                    </span>
                  </div>
                  {risks.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-600 mb-1">Key Risks:</div>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {risks.slice(0, 1).map((risk, i) => (
                          <li key={i}>Risk identified</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link to={`/participants/${participantId}`} className="text-blue-600 hover:underline text-sm">
                    View Risk Assessment
                  </Link>
                </>
              ) : (
                <p className="text-sm text-gray-500">Risk assessment not completed</p>
              )}
            </div>

            {/* Generated Documents */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Generated Documents</h3>
                </div>
                {workflow.documents_generated_date && (
                  <div className="text-xs text-gray-500">{formatDate(workflow.documents_generated_date)}</div>
                )}
              </div>
              {workflow.documents_generated ? (
                <div>
                  <p className="text-sm text-gray-600 mb-3">All generated documents are available for review</p>
                  <Link to={`/documents/participant/${participantId}`} className="text-blue-600 hover:underline text-sm">
                    View All Documents
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Documents not yet generated</p>
              )}
            </div>

            {/* Quotation */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Quotation</h3>
                </div>
              </div>
              {workflow.quotation_generated ? (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Quotation prepared and ready for review</p>
                  <Link to={`/quotations/${participantId}`} className="text-blue-600 hover:underline text-sm">
                    View Quotation
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Quotation not yet prepared</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Checklist */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Manager Checklist</h2>
              <div className="space-y-3">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decision.checklist.care_plan_accurate}
                    onChange={(e) => updateChecklist('care_plan_accurate', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Care Plan accurately reflects participant needs
                  </span>
                </label>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decision.checklist.consents_attached}
                    onChange={(e) => updateChecklist('consents_attached', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Required consents attached
                  </span>
                </label>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decision.checklist.quotation_correct}
                    onChange={(e) => updateChecklist('quotation_correct', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Quotation correct and aligned
                  </span>
                </label>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decision.checklist.participant_suitable}
                    onChange={(e) => updateChecklist('participant_suitable', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Participant suitable for onboarding
                  </span>
                </label>
              </div>
            </div>

            {/* Manager Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Approver Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                  <input
                    type="text"
                    value={decision.manager_name}
                    onChange={(e) => setDecision({...decision, manager_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={decision.manager_title}
                    onChange={(e) => setDecision({...decision, manager_title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={decision.scheduled_start_date}
                    onChange={(e) => setDecision({...decision, scheduled_start_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
              <textarea
                value={decision.approval_comments}
                onChange={(e) => setDecision({...decision, approval_comments: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Approval notes or reason for changes/rejection..."
              />
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
              <button
                onClick={handleApprove}
                disabled={!canApprove || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Clock size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle size={16} /> Approve & Convert to Onboarded</>
                )}
              </button>
              
              <button
                onClick={() => {
                  if (!decision.approval_comments.trim()) {
                    alert('Please add comments about the requested changes');
                    return;
                  }
                  alert('Changes requested');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50"
              >
                <Edit size={16} /> Request Changes
              </button>
              
              <button
                onClick={() => {
                  if (!decision.approval_comments.trim()) {
                    alert('Please provide reason for rejection');
                    return;
                  }
                  if (confirm('Reject this care package?')) {
                    alert('Rejected');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-500 text-red-700 rounded-lg hover:bg-red-50"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>

            {/* History */}
            {workflow.manager_comments && (
              <div className="bg-gray-50 rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Decision History</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{workflow.manager_comments}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}