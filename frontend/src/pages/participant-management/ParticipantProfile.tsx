// frontend/src/pages/participant-management/ParticipantProfile.tsx - ENHANCED WITH FINISH ONBOARDING (NO MOCK DATA)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Edit, 
  FileText, 
  Heart, 
  Shield, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Award,
  Target
} from 'lucide-react';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string;
  email_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  disability_type: string;
  ndis_number?: string;
  plan_type: string;
  support_category: string;
  plan_start_date: string;
  plan_review_date: string;
  status: string;
  risk_level: string;
  onboarding_completed: boolean;
  care_plan_completed: boolean;
  created_at: string;
  rep_first_name?: string;
  rep_last_name?: string;
  rep_relationship?: string;
  client_goals?: string;
  support_goals?: string;
  current_supports?: string;
  accessibility_needs?: string;
  cultural_considerations?: string;
}

interface WorkflowStatus {
  care_plan_completed: boolean;
  risk_assessment_completed: boolean;
  ai_review_completed: boolean;
  quotation_generated: boolean;
  ready_for_onboarding: boolean;
  care_plan_id?: number;
  risk_assessment_id?: number;
  workflow_notes?: string;
  manager_comments?: string;
}

export default function ParticipantProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    if (id) {
      fetchParticipant();
      fetchWorkflowStatus();
    }
  }, [id]);

  const fetchParticipant = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setParticipant(data);
      } else if (response.status === 404) {
        setError('Participant not found');
      } else {
        setError('Failed to load participant information');
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      setError('Network error loading participant');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowStatus = async () => {
    if (!id) return;
    
    try {
      setWorkflowLoading(true);
      const response = await fetch(`${API_BASE_URL}/care/participants/${id}/prospective-workflow`);
      
      if (response.ok) {
        const data = await response.json();
        setWorkflowStatus({
          care_plan_completed: data.care_plan_completed || false,
          risk_assessment_completed: data.risk_assessment_completed || false,
          ai_review_completed: data.ai_review_completed || false,
          quotation_generated: data.quotation_generated || false,
          ready_for_onboarding: data.ready_for_onboarding || false,
          care_plan_id: data.care_plan_id,
          risk_assessment_id: data.risk_assessment_id,
          workflow_notes: data.workflow_notes,
          manager_comments: data.manager_comments
        });
      } else {
        console.log('No workflow status found for participant');
      }
    } catch (error) {
      console.error('Error fetching workflow status:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'prospective':
        return 'bg-yellow-100 text-yellow-800';
      case 'onboarded':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to determine if we should show the "Finish onboarding" button
  const shouldShowFinishOnboarding = () => {
    return participant?.status === 'prospective' && 
           workflowStatus?.care_plan_completed && 
           workflowStatus?.risk_assessment_completed;
  };

  // Function to determine readiness status
  const getOnboardingReadiness = () => {
    if (!workflowStatus) return { ready: false, message: 'Workflow status loading...', color: 'bg-gray-100 text-gray-600' };
    
    if (workflowStatus.ready_for_onboarding) {
      return { ready: true, message: 'Ready for onboarding!', color: 'bg-green-100 text-green-800' };
    }
    
    if (!workflowStatus.care_plan_completed) {
      return { ready: false, message: 'Care plan required', color: 'bg-orange-100 text-orange-800' };
    }
    
    if (!workflowStatus.risk_assessment_completed) {
      return { ready: false, message: 'Risk assessment required', color: 'bg-orange-100 text-orange-800' };
    }
    
    return { ready: false, message: 'In progress...', color: 'bg-yellow-100 text-yellow-800' };
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

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Participant Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            The requested participant could not be found or there was an error loading their information.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/participants')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Participants
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;
  const fullAddress = [
    participant.street_address,
    participant.city,
    participant.state,
    participant.postcode
  ].filter(Boolean).join(', ');

  const readinessStatus = getOnboardingReadiness();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/participants')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
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
                    {participant.ndis_number || 'NDIS Number Pending'} • Member since {formatDate(participant.created_at)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(participant.status)}`}>
                {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
              </span>
              
              {/* Show Finish Onboarding when prospective and ready */}
              {shouldShowFinishOnboarding() && (
                <button
                  onClick={() => navigate(`/care/signoff/${participant.id}`)}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium shadow-sm transition-colors"
                >
                  <Award className="mr-2 h-4 w-4" />
                  Finish Onboarding
                </button>
              )}
              
              <button
                onClick={() => navigate(`/participants/${participant.id}/edit`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Edit size={16} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Status Banner - Show for prospective participants */}
        {participant.status === 'prospective' && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Onboarding Progress</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Complete the care planning workflow to onboard this participant
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${readinessStatus.color}`}>
                  {readinessStatus.message}
                </span>
                {workflowLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
            
            {/* Workflow Progress */}
            {workflowStatus && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border-2 ${workflowStatus.care_plan_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Heart className={`h-5 w-5 mr-2 ${workflowStatus.care_plan_completed ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">Care Plan</span>
                    </div>
                    {workflowStatus.care_plan_completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {workflowStatus.care_plan_completed ? 'Completed' : 'Pending'}
                  </p>
                </div>

                <div className={`p-3 rounded-lg border-2 ${workflowStatus.risk_assessment_completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className={`h-5 w-5 mr-2 ${workflowStatus.risk_assessment_completed ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm">Risk Assessment</span>
                    </div>
                    {workflowStatus.risk_assessment_completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {workflowStatus.risk_assessment_completed ? 'Completed' : 'Pending'}
                  </p>
                </div>

                <div className={`p-3 rounded-lg border-2 ${workflowStatus.ai_review_completed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Sparkles className={`h-5 w-5 mr-2 ${workflowStatus.ai_review_completed ? 'text-green-600' : 'text-yellow-600'}`} />
                      <span className="font-medium text-sm">AI Review</span>
                    </div>
                    {workflowStatus.ai_review_completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {workflowStatus.ai_review_completed ? 'Completed' : 'Optional'}
                  </p>
                </div>

                <div className={`p-3 rounded-lg border-2 ${workflowStatus.quotation_generated ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className={`h-5 w-5 mr-2 ${workflowStatus.quotation_generated ? 'text-green-600' : 'text-blue-600'}`} />
                      <span className="font-medium text-sm">Quotation</span>
                    </div>
                    {workflowStatus.quotation_generated ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {workflowStatus.quotation_generated ? 'Generated' : 'Pending'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/care/setup/${participant.id}`)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Heart className="mr-2 h-4 w-4" />
                Care Setup
              </button>
              
              {shouldShowFinishOnboarding() && (
                <button
                  onClick={() => navigate(`/care/signoff/${participant.id}`)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Award className="mr-2 h-4 w-4" />
                  Finish Onboarding
                </button>
              )}
              
              <button
                onClick={() => navigate(`/participants/${participant.id}/documents`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-gray-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">{participantName}</p>
                    <p className="text-sm text-gray-600">Date of Birth: {formatDate(participant.date_of_birth)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="text-gray-400" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">{participant.phone_number}</p>
                    <p className="text-sm text-gray-600">Primary Contact</p>
                  </div>
                </div>
                
                {participant.email_address && (
                  <div className="flex items-center gap-3">
                    <Mail className="text-gray-400" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">{participant.email_address}</p>
                      <p className="text-sm text-gray-600">Email Address</p>
                    </div>
                  </div>
                )}
                
                {fullAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 mt-1" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">{fullAddress}</p>
                      <p className="text-sm text-gray-600">Home Address</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NDIS Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">NDIS Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">NDIS Number:</span>
                  <span className="font-medium">{participant.ndis_number || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan Type:</span>
                  <span className="font-medium">{participant.plan_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Support Category:</span>
                  <span className="font-medium">{participant.support_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Disability Type:</span>
                  <span className="font-medium">{participant.disability_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan Period:</span>
                  <span className="font-medium">
                    {formatDate(participant.plan_start_date)} - {formatDate(participant.plan_review_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Risk Level:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(participant.risk_level)}`}>
                    {participant.risk_level.charAt(0).toUpperCase() + participant.risk_level.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Representative Information */}
            {(participant.rep_first_name || participant.rep_last_name) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Representative</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{participant.rep_first_name} {participant.rep_last_name}</span>
                  </div>
                  {participant.rep_relationship && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Relationship:</span>
                      <span className="font-medium">{participant.rep_relationship}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions and Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <button
                  onClick={() => navigate(`/participants/${participant.id}/edit`)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <Edit className="text-blue-600" size={20} />
                  <div>
                    <h4 className="font-medium">Edit Profile</h4>
                    <p className="text-sm text-gray-600">Update participant information</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate(`/participants/${participant.id}/documents`)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <FileText className="text-green-600" size={20} />
                  <div>
                    <h4 className="font-medium">Manage Documents</h4>
                    <p className="text-sm text-gray-600">View and upload documents</p>
                  </div>
                </button>

                {/* Document Generation Action */}
                <button
                  onClick={() => navigate(`/participants/${participant.id}/generate-documents`)}
                  className="flex items-center gap-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 text-left transition-colors relative"
                >
                  <Sparkles className="text-blue-600" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-800">Generate Documents</h4>
                    <p className="text-sm text-blue-600">Create official NDIS documents</p>
                  </div>
                  <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    NEW
                  </div>
                </button>

                {/* Scheduling Setup Action - only show for onboarded participants */}
                {participant.status === 'onboarded' && (
                  <button
                    onClick={() => navigate(`/participants/${participant.id}/scheduling-setup`)}
                    className="flex items-center gap-3 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 text-left transition-colors relative"
                  >
                    <Users className="text-orange-600" size={20} />
                    <div>
                      <h4 className="font-medium text-orange-800">Setup Scheduling</h4>
                      <p className="text-sm text-orange-600">Assign support workers and generate schedule</p>
                    </div>
                    <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                      REQUIRED
                    </div>
                  </button>
                )}

                {/* Show different scheduling actions for active participants */}
                {participant.status === 'active' && (
                  <button
                    onClick={() => navigate('/scheduling/calendar')}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <Calendar className="text-blue-600" size={20} />
                    <div>
                      <h4 className="font-medium">View Schedule</h4>
                      <p className="text-sm text-gray-600">Access appointment calendar</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => navigate(`/care/setup/${participant.id}`)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <Heart className="text-pink-600" size={20} />
                  <div>
                    <h4 className="font-medium">Care Planning</h4>
                    <p className="text-sm text-gray-600">Manage care plans and assessments</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate(`/care/risk-assessment/${participant.id}`)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <Shield className="text-yellow-600" size={20} />
                  <div>
                    <h4 className="font-medium">Risk Assessment</h4>
                    <p className="text-sm text-gray-600">Review safety considerations</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {participant.onboarding_completed ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <Clock className="text-yellow-600" size={24} />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">Onboarding</h4>
                  <p className="text-sm text-gray-600">
                    {participant.onboarding_completed ? 'Completed' : 'In Progress'}
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {participant.care_plan_completed ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <AlertCircle className="text-yellow-600" size={24} />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">Care Plan</h4>
                  <p className="text-sm text-gray-600">
                    {participant.care_plan_completed ? 'Completed' : 'Required'}
                  </p>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {participant.status === 'active' ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : participant.status === 'onboarded' ? (
                      <Clock className="text-blue-600" size={24} />
                    ) : (
                      <Calendar className="text-gray-400" size={24} />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">Scheduling</h4>
                  <p className="text-sm text-gray-600">
                    {participant.status === 'active' ? 'Active' : 
                     participant.status === 'onboarded' ? 'Setup Required' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Goals and Support Information */}
            {(participant.client_goals || participant.support_goals || participant.current_supports) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals and Support</h3>
                <div className="space-y-4">
                  
                  {participant.client_goals && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Client Goals</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{participant.client_goals}</p>
                    </div>
                  )}
                  
                  {participant.support_goals && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Support Goals</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{participant.support_goals}</p>
                    </div>
                  )}
                  
                  {participant.current_supports && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Current Supports</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{participant.current_supports}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Considerations */}
            {(participant.accessibility_needs || participant.cultural_considerations) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Considerations</h3>
                <div className="space-y-4">
                  
                  {participant.accessibility_needs && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Accessibility Needs</h4>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                        {participant.accessibility_needs}
                      </p>
                    </div>
                  )}
                  
                  {participant.cultural_considerations && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Cultural Considerations</h4>
                      <p className="text-gray-700 bg-green-50 p-3 rounded border-l-4 border-green-200">
                        {participant.cultural_considerations}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}