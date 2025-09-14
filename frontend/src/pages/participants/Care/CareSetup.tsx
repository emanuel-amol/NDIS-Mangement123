// frontend/src/pages/participants/Care/CareSetup.tsx - Enhanced Version
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
    riskAssessment: false,
    aiReview: false
  });

  useEffect(() => {
    loadParticipantData();
  }, [participantId]);

  const loadParticipantData = async () => {
    try {
      setLoading(true);
      
      // Mock participant data based on ID
      const getParticipantData = (): Participant => {
        if (participantId?.includes('1')) {
          return {
            id: participantId,
            first_name: 'Jordan',
            last_name: 'Smith',
            status: 'validated',
            referral: 'Occupational Therapy'
          };
        }
        if (participantId?.includes('2')) {
          return {
            id: participantId,
            first_name: 'Amrita',
            last_name: 'Kumar',
            status: 'validated',
            referral: 'Physiotherapy'
          };
        }
        if (participantId?.includes('3')) {
          return {
            id: participantId,
            first_name: 'Linh',
            last_name: 'Nguyen',
            status: 'validated',
            referral: 'Speech Pathology'
          };
        }
        return {
          id: participantId!,
          first_name: 'Sample',
          last_name: 'Participant',
          status: 'validated',
          referral: 'General Support'
        };
      };

      const participantData = getParticipantData();
      setP(participantData);

      // Mock completion status - in real app, this would come from API
      setCompletionStatus({
        carePlan: Math.random() > 0.5,
        riskAssessment: Math.random() > 0.5,
        aiReview: Math.random() > 0.7
      });

    } catch (error) {
      console.error('Error loading participant data:', error);
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
            onClick={() => navigate('/provider')}
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
      details: 'Create detailed care objectives, support requirements, and monitoring schedules'
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Identify potential risks and develop mitigation strategies',
      icon: Shield,
      color: 'red',
      to: `/care/risk/${p.id}/edit`,
      status: completionStatus.riskAssessment ? 'completed' : 'pending',
      details: 'Assess safety concerns, environmental risks, and emergency procedures'
    },
    {
      id: 'ai-assist',
      title: 'AI Insights',
      description: 'Get AI-powered recommendations and best practice suggestions',
      icon: Brain,
      color: 'purple',
      to: `/care/ai/${p.id}`,
      status: completionStatus.aiReview ? 'completed' : 'available',
      details: 'Review AI analysis of care needs and recommended interventions'
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

  const getStatusBadge = (status: string) => {
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
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Available
          </span>
        );
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/provider')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Care Setup</h1>
                <p className="text-sm text-gray-600">Configure care plans and assessments</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/provider')}
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
            <span className="text-sm text-gray-600">{completedSteps} of {totalSteps} completed</span>
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
          
          {progressPercentage === 100 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  All setup steps completed! Ready for sign-off.
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
              Complete these essential steps to establish comprehensive care for this participant.
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
                      {getStatusBadge(step.status)}
                      {getStatusIcon(step.status)}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                    {step.title}
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
                progressPercentage >= 66 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (progressPercentage < 66) {
                  e.preventDefault();
                  alert('Please complete at least the Care Plan and Risk Assessment before proceeding to sign-off.');
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
        {progressPercentage < 100 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Next Steps</h4>
                <div className="text-sm text-yellow-700 mt-1">
                  {!completionStatus.carePlan && !completionStatus.riskAssessment ? (
                    <p>Start by creating the Care Plan, then complete the Risk Assessment for a comprehensive care setup.</p>
                  ) : !completionStatus.carePlan ? (
                    <p>Complete the Care Plan to define comprehensive care objectives and support services.</p>
                  ) : !completionStatus.riskAssessment ? (
                    <p>Complete the Risk Assessment to identify and mitigate potential safety concerns.</p>
                  ) : (
                    <p>Consider using AI Insights for additional recommendations before proceeding to sign-off.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}