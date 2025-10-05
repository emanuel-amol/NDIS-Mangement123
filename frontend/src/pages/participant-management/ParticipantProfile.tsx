import React, { useState, useEffect } from 'react';
import { 
  User, 
  ArrowLeft,
  Heart,
  Shield,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Lock,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  MessageSquare,
  Users,
  ChevronRight,
  Award,
  Check,
  Sparkles
} from 'lucide-react';

export default function ProspectiveParticipantPage() {
  const [participant, setParticipant] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState("");

  // Get participant ID from URL - adjust based on your routing
  const participantId = window.location.pathname.split('/').pop();
  const API_BASE_URL = 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchParticipant();
    fetchWorkflowStatus();
    fetchAttachments();
    fetchTimeline();
  }, [participantId]);

  const fetchParticipant = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipant(data);
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`);
      if (response.ok) {
        const data = await response.json();
        console.log('FULL WORKFLOW STATUS:', JSON.stringify(data, null, 2));
        setWorkflowStatus(data);
      }
    } catch (error) {
      console.error('Error fetching workflow status:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchTimeline = async () => {
    // Implement timeline fetch if you have an endpoint
    // For now using empty array
    setTimeline([]);
  };

  const calculateProgress = () => {
    if (!workflowStatus) return { completed: 0, total: 4, percentage: 0 };
    let completed = 0;
    // Count all 4 required steps
    if (workflowStatus.care_plan_completed) completed++;
    if (workflowStatus.risk_assessment_completed) completed++;
    if (workflowStatus.quotation_generated) completed++;
    if (workflowStatus.documents_generated) completed++;
    return { completed, total: 4, percentage: (completed / 4) * 100 };
  };

  const progress = calculateProgress();
  const allStepsComplete = progress.completed === progress.total;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleNavigate = (path) => {
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participant profile...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Participant Not Found</h2>
          <button onClick={() => handleNavigate('/participants')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Back to Participants
          </button>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => handleNavigate('/participants')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                <ArrowLeft size={16} />
                Back to Participants
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{participantName}</h1>
                  <p className="text-sm text-gray-600">
                    {participant.ndis_number || 'NDIS Pending'} • Member since {formatDate(participant.created_at)}
                  </p>
                </div>
              </div>
            </div>
            
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Prospective
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ONBOARDING HUB */}
            <div className="bg-white rounded-lg shadow border">
              <div className="bg-blue-600 px-6 py-5 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Award className="h-6 w-6" />
                      Onboarding Hub
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Complete all steps to convert to active participant
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{progress.completed}/4</div>
                    <div className="text-blue-100 text-sm">Complete</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(progress.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress.percentage}%` }}></div>
                </div>
              </div>

              {/* Steps */}
              <div className="p-6 space-y-4">
                
                {/* Step 1: Care Plan (Always available) */}
                <div className={`border-2 rounded-lg p-4 ${workflowStatus?.care_plan_completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workflowStatus?.care_plan_completed ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {workflowStatus?.care_plan_completed ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">1</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          Care Plan
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {workflowStatus?.care_plan_completed ? 'Care plan completed and finalised' : 'Create comprehensive care plan'}
                        </p>
                        {workflowStatus?.care_plan_completed && (
                          <div className="mt-2 flex gap-2">
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleNavigate(`/care/setup/${participant.id}`)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.care_plan_completed ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.care_plan_completed ? 'Edit' : 'Start'}
                    </button>
                  </div>
                </div>

                {/* Step 2: Risk Assessment (Always available - parallel with Care Plan) */}
                <div className={`border-2 rounded-lg p-4 ${workflowStatus?.risk_assessment_completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workflowStatus?.risk_assessment_completed ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {workflowStatus?.risk_assessment_completed ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">2</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          Risk Assessment
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">Conduct comprehensive risk assessment</p>
                      </div>
                    </div>
                    <button onClick={() => handleNavigate(`/care/risk-assessment/${participant.id}`)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.risk_assessment_completed ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.risk_assessment_completed ? 'Edit' : 'Start'}
                    </button>
                  </div>
                </div>

                {/* Step 3: Quotation (Requires both Care Plan AND Risk Assessment) */}
                <div className={`border-2 rounded-lg p-4 ${!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) ? 'opacity-50 bg-gray-50' : workflowStatus?.quotation_generated ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) ? 'bg-gray-300' : workflowStatus?.quotation_generated ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) ? <Lock className="h-4 w-4 text-white" /> : workflowStatus?.quotation_generated ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">3</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Quotation
                          {!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              Requires Care Plan & Risk Assessment
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">Create and send service quotation</p>
                      </div>
                    </div>
                    <button 
                      disabled={!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed)} 
                      onClick={() => {
                        if (workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) {
                          handleNavigate(`/quotations/participants/${participant.id}`);
                        }
                      }} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!(workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : workflowStatus?.quotation_generated ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.quotation_generated ? 'Manage' : 'Create'}
                    </button>
                  </div>
                </div>

                {/* Step 4: Service Documents (Required - unlocks after Care Plan) */}
                <div className={`border-2 rounded-lg p-4 ${!workflowStatus?.care_plan_completed ? 'opacity-50 bg-gray-50' : workflowStatus?.documents_generated ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!workflowStatus?.care_plan_completed ? 'bg-gray-300' : workflowStatus?.documents_generated ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {!workflowStatus?.care_plan_completed ? <Lock className="h-4 w-4 text-white" /> : workflowStatus?.documents_generated ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">4</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-500" />
                          Service Documents
                          {!workflowStatus?.care_plan_completed && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              Requires Care Plan
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">Generate NDIS service documents from care data</p>
                        {workflowStatus?.documents_generated && (
                          <div className="mt-2 flex gap-2">
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      disabled={!workflowStatus?.care_plan_completed}
                      onClick={() => {
                        if (workflowStatus?.care_plan_completed) {
                          handleNavigate(`/participants/${participant.id}/generate-documents`);
                        }
                      }} 
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!workflowStatus?.care_plan_completed ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : workflowStatus?.documents_generated ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.documents_generated ? 'Edit' : 'Generate'}
                    </button>
                  </div>
                </div>

                {/* Conversion */}
                {allStepsComplete && (
                  <div className="border-2 border-green-500 rounded-lg p-5 bg-green-50 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-green-600" />
                        <div>
                          <h3 className="font-bold text-green-900">Ready for Conversion</h3>
                          <p className="text-sm text-green-700">All required steps complete</p>
                        </div>
                      </div>
                      <button onClick={() => handleNavigate(`/care/signoff/${participant.id}`)} className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
                        Convert to Participant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-600">Full Name</p>
                    <p className="font-medium text-sm">{participantName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-600">Date of Birth</p>
                    <p className="font-medium text-sm">{formatDate(participant.date_of_birth)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="font-medium text-sm">{participant.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="text-gray-400 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="font-medium text-sm">{participant.email_address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NDIS Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">NDIS Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-600">NDIS Number</p><p className="font-medium text-sm">{participant.ndis_number || 'Pending'}</p></div>
                <div><p className="text-xs text-gray-600">Plan Type</p><p className="font-medium text-sm">{participant.plan_type}</p></div>
                <div><p className="text-xs text-gray-600">Support Category</p><p className="font-medium text-sm">{participant.support_category}</p></div>
                <div><p className="text-xs text-gray-600">Disability Type</p><p className="font-medium text-sm">{participant.disability_type}</p></div>
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({attachments.length})
                </h3>
                <div className="space-y-2">
                  {attachments.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{file.title}</span>
                      </div>
                      <button className="text-xs text-blue-600">View</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail */}
          <div className="space-y-6">
            {/* Alerts */}
            {(!workflowStatus?.care_plan_completed || !workflowStatus?.risk_assessment_completed || !workflowStatus?.quotation_generated || !workflowStatus?.documents_generated) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 text-sm mb-1">Action Required</h4>
                    <ul className="text-xs text-yellow-800 space-y-0.5">
                      {!workflowStatus?.care_plan_completed && <li>• Complete care plan</li>}
                      {!workflowStatus?.risk_assessment_completed && <li>• Complete risk assessment</li>}
                      {!workflowStatus?.quotation_generated && <li>• Create quotation</li>}
                      {!workflowStatus?.documents_generated && <li>• Generate service documents</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Success message if ready */}
            {allStepsComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900 text-sm mb-1">Ready for Onboarding</h4>
                    <p className="text-xs text-green-800">All required steps are complete. You can now convert this participant to active status.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Staff */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Assigned Staff
              </h3>
              <div className="text-center py-4">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">Assigned after conversion</p>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                Notes
              </h3>
              <textarea value={activeNote} onChange={(e) => setActiveNote(e.target.value)} placeholder="Internal notes..." className="w-full px-2 py-1.5 border rounded text-sm" rows={3} />
              <button className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow z-20">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Progress: <strong>{progress.completed} of {progress.total}</strong> complete
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border text-gray-700 rounded text-sm">Save Draft</button>
              {allStepsComplete ? (
                <button onClick={() => handleNavigate(`/care/signoff/${participant.id}`)} className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-semibold">
                  Convert to Participant
                </button>
              ) : (
                <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold">Continue</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}