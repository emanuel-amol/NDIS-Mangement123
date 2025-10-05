// frontend/src/pages/care-workflow/CareSetup.tsx - FIXED VERSION - RISK ASSESSMENT OPTIONAL
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Heart, 
  Shield, 
  Brain, 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  User, 
  ArrowLeft,
  Home,
  Award,
  Calendar,
  AlertTriangle
} from "lucide-react";

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  referral: string | null;
};

export default function CareSetup() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [p, setP] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionStatus, setCompletionStatus] = useState({
    carePlan: false,
    carePlanFinalised: false,  // NEW: Track if care plan is finalised
    riskAssessment: false,
    aiReview: false
  });

  useEffect(() => {
    loadParticipantData();
  }, [participantId]);

  const loadParticipantData = async () => {
    try {
      setLoading(true);
      
      // Fetch real participant data from API
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      if (!participantId) {
        throw new Error('No participant ID provided');
      }

      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch participant: ${response.status}`);
      }
      
      const participantData = await response.json();
      
      // Transform API response to match our component interface
      const participant: Participant = {
        id: participantData.id.toString(),
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        status: participantData.status || 'validated',
        referral: participantData.support_category || 'General Support'
      };
      
      setP(participant);

      // UPDATED: Fetch onboarding requirements to get accurate status
      try {
        const requirementsResponse = await fetch(`${API_BASE_URL}/care/participants/${participantId}/onboarding-requirements`);
        if (requirementsResponse.ok) {
          const requirements = await requirementsResponse.json();
          
          setCompletionStatus({
            carePlan: requirements.requirements.care_plan.exists,
            carePlanFinalised: requirements.requirements.care_plan.finalised,
            riskAssessment: requirements.requirements.risk_assessment.exists,
            aiReview: false // This would come from AI review status
          });
        } else {
          // Fallback to participant flags
          setCompletionStatus({
            carePlan: participantData.care_plan_completed || false,
            carePlanFinalised: false, // We don't know from participant data
            riskAssessment: false, // This would come from a separate risk assessment check
            aiReview: false // This would come from AI review status
          });
        }
      } catch (error) {
        console.error('Error fetching onboarding requirements:', error);
        // Fallback to participant flags
        setCompletionStatus({
          carePlan: participantData.care_plan_completed || false,
          carePlanFinalised: false,
          riskAssessment: false,
          aiReview: false
        });
      }

    } catch (error) {
      console.error('Error loading participant data:', error);
      // Fallback to mock data if API fails
      const fallbackParticipant: Participant = {
        id: participantId!,
        first_name: 'Unknown',
        last_name: 'Participant',
        status: 'validated',
        referral: 'General Support'
      };
      setP(fallbackParticipant);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading participant data...</p>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Participant Not Found</h2>
          <p className="text-gray-600 mb-6">The requested participant could not be found or accessed.</p>
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

  const steps = [
    {
      id: 'care-plan',
      title: 'Care Plan',
      description: 'Develop comprehensive care strategies, goals, and support services',
      icon: Heart,
      color: 'pink',
      to: `/care/plan/${p.id}/edit`,
      status: completionStatus.carePlan ? 'completed' : 'pending',
      details: 'Create detailed care objectives, support requirements, and monitoring schedules',
      required: true  // NEW: Mark as required
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Identify potential risks and develop mitigation strategies (Optional)',  // UPDATED: Show as optional
      icon: Shield,
      color: 'red',
      to: `/care/risk-assessment/${p.id}/edit`,
      status: completionStatus.riskAssessment ? 'completed' : 'available',  // UPDATED: Default to available instead of pending
      details: 'Assess safety concerns, environmental risks, and emergency procedures',
      required: false  // NEW: Mark as optional
    },
    {
      id: 'ai-assist',
      title: 'AI Insights',
      description: 'Get AI-powered recommendations and best practice suggestions',
      icon: Brain,
      color: 'purple',
      to: `/care/ai/${p.id}`,
      status: completionStatus.aiReview ? 'completed' : 'available',
      details: 'Review AI analysis of care needs and recommended interventions',
      required: false  // NEW: Mark as optional
    }
  ];

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'hover') => {
    const colorMap = {
      pink: {
        bg: 'bg-pink-50',
        text: 'text-pink-600',
        border: 'border-pink-200',
        hover: 'hover:bg-pink-100'
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-200',
        hover: 'hover:bg-red-100'
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100'
      }
    };
    return colorMap[color as keyof typeof colorMap]?.[variant] || '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <ArrowRight className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, required: boolean = true) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Complete
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {required ? 'Available' : 'Optional'}
          </span>
        );
    }
  };

  // UPDATED: Calculate progress based on required steps only
  const requiredSteps = steps.filter(step => step.required);
  const completedRequiredSteps = requiredSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedRequiredSteps / requiredSteps.length) * 100;

  // UPDATED: Check if ready for sign-off (only care plan required and finalised)
  const readyForSignOff = completionStatus.carePlan && completionStatus.carePlanFinalised;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Profile
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Care Setup</h1>
                <p className="text-sm text-gray-600">Configure care plans and assessments</p>
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
        {/* Participant Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{p.first_name} {p.last_name}</h2>
                <p className="text-sm text-gray-600">Participant ID: {p.id}</p>
                <div className="flex items-center mt-2 space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    p.status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {p.status}
                  </span>
                  <span className="text-sm text-gray-600">Service: {p.referral}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Started: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>Priority: Standard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
            <span className="text-sm text-gray-600">
              {completedRequiredSteps} of {requiredSteps.length} required steps completed
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Participant validated</span>
            <span>Ready for service delivery</span>
          </div>
          
          {/* UPDATED: Success message based on care plan finalisation */}
          {readyForSignOff && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  Care Plan completed and finalised! Ready for onboarding.
                  {completionStatus.riskAssessment && " Risk Assessment also completed."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Care Setup Steps */}
        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Care Setup Steps</h2>
            <p className="text-gray-600 mb-6">
              Complete the required Care Plan step to establish comprehensive care for this participant. 
              Additional steps are optional but recommended.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.id}
                  to={step.to}
                  className={`relative group block p-6 bg-white rounded-lg border-2 ${getColorClasses(step.color, 'border')} ${getColorClasses(step.color, 'hover')} transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex-shrink-0 w-12 h-12 ${getColorClasses(step.color, 'bg')} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${getColorClasses(step.color, 'text')}`} />
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(step.status, step.required)}
                      {getStatusIcon(step.status)}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                    {step.title}
                    {step.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {step.description}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    {step.details}
                  </p>
                  
                  <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-500">
                    {step.status === 'completed' ? 'Review & Edit' : step.status === 'pending' ? 'Start Now' : 'Explore'}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>

                  {step.status === 'completed' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/care/signoff/${p.id}`}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                readyForSignOff
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (!readyForSignOff) {
                  e.preventDefault();
                  // UPDATED: New error message - only Care Plan required
                  if (!completionStatus.carePlan) {
                    alert('Care Plan must be completed before proceeding to sign-off.');
                  } else if (!completionStatus.carePlanFinalised) {
                    alert('Care Plan must be finalised before proceeding to sign-off.');
                  }
                }
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Proceed to Sign-off
            </Link>
            
            <button 
              onClick={() => alert('Export functionality would generate a comprehensive PDF summary')}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <User className="mr-2 h-4 w-4" />
              Export Summary
            </button>
            
            <button 
              onClick={() => navigate(`/care/plan/${p.id}/edit`)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Heart className="mr-2 h-4 w-4" />
              Quick Start Care Plan
            </button>
          </div>
        </div>

        {/* Next Steps Guidance */}
        {!readyForSignOff && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Next Steps</h4>
                <div className="text-sm text-yellow-700 mt-1">
                  {/* UPDATED: New guidance messages */}
                  {!completionStatus.carePlan ? (
                    <p>Complete the Care Plan to define comprehensive care objectives and support services. This is the only required step for onboarding.</p>
                  ) : !completionStatus.carePlanFinalised ? (
                    <p>Finalise the Care Plan to proceed with onboarding. Risk Assessment and AI Insights are optional but recommended.</p>
                  ) : (
                    <p>All required steps completed! Consider adding Risk Assessment or AI Insights for enhanced care planning.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UPDATED: Add required steps legend */}
        <div className="text-center text-sm text-gray-500 mt-4">
          <span className="text-red-500">*</span> Required for onboarding • 
          Other steps are optional but recommended for comprehensive care
        </div>
      </div>
    </div>
  );
}