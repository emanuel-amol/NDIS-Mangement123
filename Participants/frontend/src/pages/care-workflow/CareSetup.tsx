// frontend/src/pages/care-workflow/CareSetup.tsx - FIXED
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  AlertTriangle,
  Plus,
  History,
  GitBranch
} from "lucide-react";
import api from "../../lib/api";

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
    carePlanFinalised: false,
    riskAssessment: false,
    aiReview: false
  });

  // VERSIONING STATE
  const [carePlanVersions, setCarePlanVersions] = useState<any[]>([]);
  const [riskVersions, setRiskVersions] = useState<any[]>([]);
  const [canCreateRevision, setCanCreateRevision] = useState({
    carePlan: true,
    riskAssessment: true
  });
  const [showVersionHistory, setShowVersionHistory] = useState({
    carePlan: false,
    riskAssessment: false
  });
  const [showRevisionModal, setShowRevisionModal] = useState({
    isOpen: false,
    type: null as 'care_plan' | 'risk_assessment' | null,
    note: ''
  });

  useEffect(() => {
    loadParticipantData();
  }, [participantId]);

  const loadParticipantData = async () => {
    try {
      setLoading(true);
      
      if (!participantId) {
        throw new Error('No participant ID provided');
      }

      const participantData = await api.participants.get(Number(participantId));
      
      const participant: Participant = {
        id: participantData.id.toString(),
        first_name: participantData.first_name,
        last_name: participantData.last_name,
        status: participantData.status || 'validated',
        referral: participantData.support_category || 'General Support'
      };
      
      setP(participant);

      // Load completion status
      try {
        const requirements = await api.carePlans.get(Number(participantId));
        
        setCompletionStatus({
          carePlan: requirements.requirements?.care_plan?.exists || false,
          carePlanFinalised: requirements.requirements?.care_plan?.finalised || false,
          riskAssessment: requirements.requirements?.risk_assessment?.exists || false,
          aiReview: false
        });
      } catch (error) {
        console.error('Error fetching onboarding requirements:', error);
      }

      // Load versioning data
      console.log('🚀 Loading versioning data for participant:', participantId);
      await loadVersioningData();

    } catch (error) {
      console.error('Error loading participant data:', error);
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

  const loadVersioningData = async () => {
    console.log('🔍 Loading versioning data for participant:', participantId);
    
    try {
      const [cpVersionsRes, raVersionsRes] = await Promise.allSettled([
        api.carePlans.versions(Number(participantId)),
        api.riskAssessments.versions(Number(participantId))
      ]);

      console.log('📦 Care Plan versions response:', cpVersionsRes);
      console.log('📦 Risk Assessment versions response:', raVersionsRes);

      if (cpVersionsRes.status === 'fulfilled') {
        const versions = cpVersionsRes.value;
        console.log('✅ Care Plan versions loaded:', versions);
        setCarePlanVersions(versions);
        const hasDraft = versions.some((v: any) => v.status === 'draft');
        setCanCreateRevision(prev => ({ ...prev, carePlan: !hasDraft }));
      } else {
        console.log('❌ Care Plan versions failed:', cpVersionsRes.reason);
      }

      if (raVersionsRes.status === 'fulfilled') {
        const versions = raVersionsRes.value;
        console.log('✅ Risk Assessment versions loaded:', versions);
        setRiskVersions(versions);
        const hasDraft = versions.some((v: any) => v.status === 'draft');
        setCanCreateRevision(prev => ({ ...prev, riskAssessment: !hasDraft }));
      } else {
        console.log('❌ Risk Assessment versions failed:', raVersionsRes.reason);
      }
    } catch (error) {
      console.error('💥 Error loading versioning data:', error);
    }
  };

  const createCarePlanRevision = async () => {
    if (!canCreateRevision.carePlan) {
      alert('A draft revision already exists. Please complete or discard it first.');
      return;
    }
    
    setShowRevisionModal({ isOpen: true, type: 'care_plan', note: '' });
  };

  const createRiskAssessmentRevision = async () => {
    if (!canCreateRevision.riskAssessment) {
      alert('A draft revision already exists. Please complete or discard it first.');
      return;
    }
    
    setShowRevisionModal({ isOpen: true, type: 'risk_assessment', note: '' });
  };

  const handleRevisionSubmit = async () => {
    const { type, note } = showRevisionModal;
    
    if (!note.trim()) {
      alert('Please enter a revision note');
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const endpoint = type === 'care_plan' 
        ? `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions`
        : `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions`;

      console.log('📤 Creating revision at:', endpoint);

      // Get auth token for custom endpoint
      const token = await import('../../lib/auth-provider').then(m => m.authProvider.getToken());
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          base_version_id: 'current',
          revision_note: note.trim() 
        })
      });
      
      console.log('📥 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Revision created:', result);
        setShowRevisionModal({ isOpen: false, type: null, note: '' });
        
        const editPath = type === 'care_plan'
          ? `/care/plan/${participantId}/versions/${result.version_id}/edit`
          : `/care/risk-assessment/${participantId}/versions/${result.version_id}/edit`;
        
        navigate(editPath);
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          alert(`Failed to create revision: ${errorData.detail || 'Unknown error'}`);
        } catch {
          alert(`Failed to create revision: ${errorText}`);
        }
      }
    } catch (error: any) {
      console.error('💥 Error creating revision:', error);
      alert('Error creating revision: ' + error.message);
    }
  };

  const handleDiscardDraft = async (type: 'care_plan' | 'risk_assessment', versionId: string) => {
    if (!confirm('Are you sure you want to discard this draft? This cannot be undone.')) {
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const endpoint = type === 'care_plan'
        ? `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`
        : `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`;

      // Get auth token for custom endpoint
      const token = await import('../../lib/auth-provider').then(m => m.authProvider.getToken());

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        alert('Draft discarded successfully');
        await loadVersioningData();
      } else {
        const errorData = await response.json();
        alert(`Failed to discard draft: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error discarding draft:', error);
      alert('Error discarding draft: ' + error.message);
    }
  };

  const handleFinalizePlan = async () => {
    if (!confirm('Finalize this care plan? This will lock it and allow quotation generation.')) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      
      // Get auth token
      const token = await import('../../lib/auth-provider').then(m => m.authProvider.getToken());
      
      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan/finalise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        alert('Care Plan finalized successfully!');
        await loadParticipantData();
      } else {
        const error = await response.json();
        alert('Failed: ' + (error.detail || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
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
      viewTo: `/care/plan/${p.id}`,
      editTo: `/care/plan/${p.id}/edit`,
      status: completionStatus.carePlan ? 'completed' : 'pending',
      details: 'Create detailed care objectives, support requirements, and monitoring schedules',
      required: true,
      versions: carePlanVersions,
      canCreateRevision: canCreateRevision.carePlan,
      showHistory: showVersionHistory.carePlan,
      onToggleHistory: () => setShowVersionHistory(prev => ({ ...prev, carePlan: !prev.carePlan })),
      onCreateRevision: createCarePlanRevision,
      revisionType: 'care_plan' as const
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Identify potential risks and develop mitigation strategies',
      icon: Shield,
      color: 'red',
      viewTo: `/care/risk-assessment/${p.id}`,
      editTo: `/care/risk-assessment/${p.id}/edit`,
      status: completionStatus.riskAssessment ? 'completed' : 'pending',
      details: 'Assess safety concerns, environmental risks, and emergency procedures',
      required: true,
      versions: riskVersions,
      canCreateRevision: canCreateRevision.riskAssessment,
      showHistory: showVersionHistory.riskAssessment,
      onToggleHistory: () => setShowVersionHistory(prev => ({ ...prev, riskAssessment: !prev.riskAssessment })),
      onCreateRevision: createRiskAssessmentRevision,
      revisionType: 'risk_assessment' as const
    },
    {
      id: 'ai-assist',
      title: 'AI Insights',
      description: 'Get AI-powered recommendations and best practice suggestions',
      icon: Brain,
      color: 'purple',
      viewTo: `/care/ai/${p.id}`,
      editTo: `/care/ai/${p.id}`,
      status: completionStatus.aiReview ? 'completed' : 'available',
      details: 'Review AI analysis of care needs and recommended interventions',
      required: false
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

  const requiredSteps = steps.filter(step => step.required);
  const completedRequiredSteps = requiredSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedRequiredSteps / requiredSteps.length) * 100;

  const readyForSignOff = completionStatus.carePlan && completionStatus.carePlanFinalised && completionStatus.riskAssessment;

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
          
          {readyForSignOff && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  All required steps completed! Care Plan and Risk Assessment are finalised and ready for onboarding.
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
              Complete both the Care Plan and Risk Assessment to establish comprehensive care for this participant. 
              AI Insights are optional but recommended.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step) => {
              const Icon = step.icon;
              const hasVersioning = step.versions !== undefined;
              
              return (
                <div
                  key={step.id}
                  className={`bg-white rounded-lg border-2 ${getColorClasses(step.color, 'border')} shadow-sm`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 ${getColorClasses(step.color, 'bg')} rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${getColorClasses(step.color, 'text')}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {step.title}
                            {step.required && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {step.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {step.details}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(step.status, step.required)}
                        {getStatusIcon(step.status)}
                      </div>
                    </div>

                    {/* VERSION HISTORY DROPDOWN */}
                    {hasVersioning && step.showHistory && step.versions && step.versions.length > 0 && (
                      <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">{step.title} Versions</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {step.versions.map((version: any) => (
                            <div key={version.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-2">
                                <GitBranch size={14} className="text-gray-400" />
                                <span className="text-sm font-medium">v{version.version_number}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  version.status === 'current' ? 'bg-green-100 text-green-800' :
                                  version.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {version.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{formatDate(version.created_at)}</span>
                                {version.status === 'draft' && step.revisionType && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        const editPath = step.revisionType === 'care_plan'
                                          ? `/care/plan/${participantId}/versions/${version.id}/edit`
                                          : `/care/risk-assessment/${participantId}/versions/${version.id}/edit`;
                                        navigate(editPath);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDiscardDraft(step.revisionType!, version.id)}
                                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                                    >
                                      Discard
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3">
                      {step.status === 'completed' ? (
                        <>
                          <button
                            onClick={() => navigate(step.viewTo)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${getColorClasses(step.color, 'bg')} ${getColorClasses(step.color, 'text')} ${getColorClasses(step.color, 'hover')}`}
                          >
                            👁️ View Current
                          </button>
                          <button
                            onClick={() => navigate(step.editTo)}
                            className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                          >
                            ✏️ Edit
                          </button>
                          
                          {/* FINALIZE BUTTON - Only for Care Plan when completed but not finalized */}
                          {step.id === 'care-plan' && step.status === 'completed' && !completionStatus.carePlanFinalised && (
                            <button
                              onClick={handleFinalizePlan}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              ✓ Finalize
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => navigate(step.editTo)}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            step.status === 'pending'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : `${getColorClasses(step.color, 'bg')} ${getColorClasses(step.color, 'text')} ${getColorClasses(step.color, 'hover')}`
                          }`}
                        >
                          {step.status === 'pending' ? 'Start Now' : 'Explore'}
                          <ArrowRight className="inline ml-2 h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Version History Button - Show when completed */}
                      {hasVersioning && step.status === 'completed' && (
                        <button 
                          onClick={step.onToggleHistory}
                          className="px-4 py-2 text-sm rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          <History size={16} className="inline mr-1" />
                          {step.showHistory ? 'Hide' : 'View'} Versions ({step.versions?.length || 0})
                        </button>
                      )}
                      
                      {/* New Revision Button */}
                      {hasVersioning && step.status === 'completed' && step.onCreateRevision && (
                        <button
                          onClick={step.onCreateRevision}
                          disabled={!step.canCreateRevision}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            step.canCreateRevision
                              ? `${getColorClasses(step.color, 'bg')} ${getColorClasses(step.color, 'text')} ${getColorClasses(step.color, 'hover')}`
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={16} className="inline mr-1" />
                          New Revision
                        </button>
                      )}
                    </div>

                    {hasVersioning && !step.canCreateRevision && (
                      <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mt-2">
                        A draft revision exists. Complete or discard it before creating a new one.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Action - Proceed to Sign-off */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to Complete?</h3>
              <p className="text-sm text-gray-600">
                {readyForSignOff 
                  ? 'All required steps are complete. Proceed to sign-off and finalize onboarding.' 
                  : 'Complete all required steps (Care Plan and Risk Assessment) to proceed with sign-off.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/participants/${participantId}`)}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <User className="mr-2 h-4 w-4" />
                View Profile
              </button>
              <button
                onClick={() => {
                  if (!readyForSignOff) {
                    if (!completionStatus.carePlan) {
                      alert('Care Plan must be completed before proceeding to sign-off.');
                    } else if (!completionStatus.carePlanFinalised) {
                      alert('Care Plan must be finalised before proceeding to sign-off.');
                    } else if (!completionStatus.riskAssessment) {
                      alert('Risk Assessment must be completed before proceeding to sign-off.');
                    }
                  } else {
                    navigate(`/care/signoff/${p.id}`);
                  }
                }}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                  readyForSignOff
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Proceed to Sign-off
              </button>
            </div>
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
                  {!completionStatus.carePlan ? (
                    <p>Complete the Care Plan to define comprehensive care objectives and support services.</p>
                  ) : !completionStatus.carePlanFinalised ? (
                    <p>Finalise the Care Plan before proceeding. Risk Assessment is also required.</p>
                  ) : !completionStatus.riskAssessment ? (
                    <p>Complete the Risk Assessment to identify and mitigate potential safety concerns.</p>
                  ) : (
                    <p>All required steps completed! Review and proceed to sign-off.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REVISION NOTE MODAL */}
      {showRevisionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Create {showRevisionModal.type === 'care_plan' ? 'Care Plan' : 'Risk Assessment'} Revision
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Enter a brief note describing the reason for this revision
              </p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revision Note *
              </label>
              <textarea
                value={showRevisionModal.note}
                onChange={(e) => setShowRevisionModal(prev => ({ ...prev, note: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Updated support hours based on new assessment..."
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                This note will help track why changes were made
              </p>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowRevisionModal({ isOpen: false, type: null, note: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRevisionSubmit}
                disabled={!showRevisionModal.note.trim()}
                className={`px-4 py-2 rounded-lg font-medium ${
                  showRevisionModal.note.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}