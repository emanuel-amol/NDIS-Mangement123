// frontend/src/pages/participant-management/ParticipantProfile.tsx - COMPLETE FILE
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, ArrowLeft, Heart, Shield, FileText, DollarSign, CheckCircle,
  AlertCircle, Calendar, Phone, Mail, Edit, MessageSquare, Users, Award,
  Plus, Clock, Target, Book, Syringe, Settings, Wallet, Printer,
  ClipboardList, Bell, TrendingUp, MapPin, Link2, Search, Activity,
  History, GitBranch, Sparkles, Loader2, Copy
} from 'lucide-react';
import DocumentsTab from '../../components/participant/DocumentsTab';
import SupportPlanSection from '../../components/SupportPlanSection';
import ParticipantAppointmentsTab from '../../components/participant/ParticipantAppointmentsTab';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { getOnboardingPack, sendOnboardingPack, OnboardingPackResponse } from '../../services/onboarding';

// AUTH HELPER FUNCTION
const withAuth = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function ParticipantProfile() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [recentDocuments, setRecentDocuments] = useState([]);

  // VERSIONING STATE
  const [carePlanVersions, setCarePlanVersions] = useState([]);
  const [riskVersions, setRiskVersions] = useState([]);
  const [canCreateRevision, setCanCreateRevision] = useState({
    carePlan: true,
    riskAssessment: true
  });
  const [showVersionHistory, setShowVersionHistory] = useState({
    carePlan: false,
    riskAssessment: false
  });
  const [staleDocuments, setStaleDocuments] = useState([]);
  const [showRevisionModal, setShowRevisionModal] = useState({
    isOpen: false,
    type: null,
    note: ''
  });

  // ONBOARDING PACK STATE
  const [onboardingPack, setOnboardingPack] = useState<OnboardingPackResponse | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [sendingPack, setSendingPack] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRole, setSignerRole] = useState<'participant' | 'guardian'>('participant');
  const [publicUrl, setPublicUrl] = useState('');

  const { user } = useAuth();
  const userRole = (user?.role || user?.user_metadata?.role || 'SUPPORT_WORKER').toUpperCase();
  const isServiceManager = userRole === 'SERVICE_MANAGER';
  const canSubmitForReview = ['PROVIDER_ADMIN', 'SERVICE_MANAGER'].includes(userRole);

  const participantId = window.location.pathname.split('/').pop();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadData();
  }, [participantId]);

  // Load onboarding pack for prospective participants
  useEffect(() => {
    if (participantId && participant?.status === 'prospective') {
      loadOnboardingPack();
    }
  }, [participantId, participant?.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantRes, workflowRes, carePlanRes, riskRes, documentsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`, {
          headers: withAuth()
        }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`, {
          headers: withAuth()
        }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, {
          headers: withAuth()
        }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`, {
          headers: withAuth()
        }),
        fetch(`${API_BASE_URL}/participants/${participantId}/documents`, {
          headers: withAuth()
        })
      ]);

      if (participantRes.status === 'fulfilled' && participantRes.value.ok) {
        const pData = await participantRes.value.json();
        setParticipant(pData);
        
        if (pData.status !== 'prospective') {
          await loadVersioningData();
        }
      }
      if (workflowRes.status === 'fulfilled' && workflowRes.value.ok) {
        setWorkflowStatus(await workflowRes.value.json());
      }
      if (carePlanRes.status === 'fulfilled' && carePlanRes.value.ok) {
        setCarePlan(await carePlanRes.value.json());
      }
      if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
        setRiskAssessment(await riskRes.value.json());
      }
      if (documentsRes.status === 'fulfilled' && documentsRes.value.ok) {
        const docs = await documentsRes.value.json();
        const sortedDocs = docs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        setRecentDocuments(sortedDocs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersioningData = async () => {
    try {
      const [cpVersionsRes, raVersionsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan/versions`, {
          headers: withAuth()
        }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions`, {
          headers: withAuth()
        })
      ]);

      if (cpVersionsRes.status === 'fulfilled' && cpVersionsRes.value.ok) {
        const versions = await cpVersionsRes.value.json();
        setCarePlanVersions(versions);
        const hasDraft = versions.some(v => v.status === 'draft');
        setCanCreateRevision(prev => ({ ...prev, carePlan: !hasDraft }));
      }

      if (raVersionsRes.status === 'fulfilled' && raVersionsRes.value.ok) {
        const versions = await raVersionsRes.value.json();
        setRiskVersions(versions);
        const hasDraft = versions.some(v => v.status === 'draft');
        setCanCreateRevision(prev => ({ ...prev, riskAssessment: !hasDraft }));
      }
    } catch (error) {
      console.error('Error loading versioning data:', error);
    }
  };

  // Load onboarding pack
  const loadOnboardingPack = async () => {
    if (!participantId) return;
    
    setLoadingPack(true);
    try {
      const pack = await getOnboardingPack(parseInt(participantId));
      setOnboardingPack(pack);
      
      // Pre-fill signer info if available
      if (participant) {
        setSignerName(`${participant.first_name} ${participant.last_name}`);
        setSignerEmail(participant.email_address || '');
      }
    } catch (error) {
      console.error('Failed to load onboarding pack:', error);
    } finally {
      setLoadingPack(false);
    }
  };

  // Send onboarding pack
  const handleSendPack = async () => {
    if (!participantId || !signerName || !signerEmail) {
      alert('Please fill in all signer details');
      return;
    }
    
    setSendingPack(true);
    try {
      const result = await sendOnboardingPack(parseInt(participantId), {
        signer_name: signerName,
        signer_email: signerEmail,
        signer_role: signerRole,
      });
      
      setPublicUrl(result.public_url);
      alert(`Onboarding pack sent! ${result.document_count} documents included.`);
      setShowSendModal(false);
      
      // Reload pack to show updated status
      await loadOnboardingPack();
    } catch (error: any) {
      alert(error.message || 'Failed to send onboarding pack');
    } finally {
      setSendingPack(false);
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
      const endpoint = type === 'care_plan' 
        ? `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions`
        : `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: withAuth(),
        body: JSON.stringify({ 
          base_version_id: 'current',
          revision_note: note.trim() 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setShowRevisionModal({ isOpen: false, type: null, note: '' });
        
        const editPath = type === 'care_plan'
          ? `/care/plan/${participantId}/versions/${result.version_id}/edit`
          : `/care/risk-assessment/${participantId}/versions/${result.version_id}/edit`;
        
        navigate(editPath);
      } else {
        const errorData = await response.json();
        alert(`Failed to create revision: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      alert('Error creating revision: ' + error.message);
    }
  };

  const handleDiscardDraft = async (type, versionId) => {
    if (!confirm('Are you sure you want to discard this draft? This cannot be undone.')) {
      return;
    }

    try {
      const endpoint = type === 'care_plan'
        ? `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`
        : `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: withAuth()
      });

      if (response.ok) {
        alert('Draft discarded successfully');
        await loadVersioningData();
      } else {
        const errorData = await response.json();
        alert(`Failed to discard draft: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error discarding draft:', error);
      alert('Error discarding draft: ' + error.message);
    }
  };

  const calculateProgress = () => {
    if (!workflowStatus) return { completed: 0, total: 4, percentage: 0 };
    let completed = 0;
    if (workflowStatus.care_plan_completed) completed++;
    if (workflowStatus.risk_assessment_completed) completed++;
    if (workflowStatus.documents_generated) completed++;
    if (workflowStatus.quotation_generated) completed++;
    return { completed, total: 4, percentage: (completed / 4) * 100 };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const normalizeCase = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const extractGoals = () => {
    const goals = [];
    if (carePlan?.short_goals && Array.isArray(carePlan.short_goals)) {
      carePlan.short_goals.forEach(goal => {
        const text = typeof goal === 'string' ? goal : (goal?.goal || goal?.description || goal?.text);
        if (text && typeof text === 'string') {
          goals.push({
            text,
            target: typeof goal === 'object' ? (goal?.timeframe || '6 months') : '6 months',
            status: typeof goal === 'object' ? (goal?.status || 'In progress') : 'In progress'
          });
        }
      });
    }
    if (carePlan?.long_goals && Array.isArray(carePlan.long_goals) && goals.length < 3) {
      carePlan.long_goals.slice(0, 3 - goals.length).forEach(goal => {
        const text = typeof goal === 'string' ? goal : (goal?.goal || goal?.description || goal?.text);
        if (text && typeof text === 'string') {
          goals.push({
            text,
            target: typeof goal === 'object' ? (goal?.timeframe || '12 months') : '12 months',
            status: typeof goal === 'object' ? (goal?.status || 'Pending') : 'Pending'
          });
        }
      });
    }
    return goals.length > 0 ? goals : [
      { text: 'Improve social skills through community activities', target: '6 months', status: 'In progress' },
      { text: 'Increase independence in daily living tasks', target: '9 months', status: 'In progress' },
      { text: 'Develop vocational skills for employment', target: '12 months', status: 'Pending' }
    ];
  };

  const extractPreferences = () => {
    const rawLikes = carePlan?.participant_preferences?.likes || [];
    const rawDislikes = carePlan?.participant_preferences?.dislikes || [];
    
    const likes = Array.isArray(rawLikes) 
      ? rawLikes.map(item => typeof item === 'string' ? item : (item?.name || item?.value)).filter(item => item && typeof item === 'string')
      : [];
    const dislikes = Array.isArray(rawDislikes)
      ? rawDislikes.map(item => typeof item === 'string' ? item : (item?.name || item?.value)).filter(item => item && typeof item === 'string')
      : [];
    
    return {
      likes: likes.length > 0 ? likes : ['Swimming', 'Music therapy', 'Art classes'],
      dislikes: dislikes.length > 0 ? dislikes : ['Loud noises', 'Crowded spaces', 'Sudden changes']
    };
  };

  const getStepStatus = (completed) => {
    if (completed) return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
  };

  const goals = extractGoals();
  const { likes, dislikes } = extractPreferences();
  const progress = calculateProgress();
  const isProspective = participant?.status === 'prospective';
  const canConvert = progress.completed === 4;
  const workflowApproved = workflowStatus?.manager_review_status === 'approved';
  const canConvertNow = canConvert && isServiceManager && workflowApproved;
  let convertBlockedMessage: string | null = null;
  if (!isServiceManager) {
    convertBlockedMessage = 'Only service managers can convert participants.';
  } else if (!workflowApproved) {
    convertBlockedMessage = 'Manager approval required before conversion.';
  } else if (!canConvert) {
    convertBlockedMessage = 'Complete all steps to enable conversion';
  }

  const recentActivity = [
    { type: 'note', text: 'Case note added: Initial assessment completed', time: '2 hours ago', user: 'Sarah Johnson' },
    { type: 'document', text: 'Service Agreement generated and sent', time: '1 day ago', user: 'System' },
    { type: 'appointment', text: 'Initial consultation scheduled for Jan 20', time: '2 days ago', user: 'Sarah Johnson' }
  ];

  const onboardingSteps = [
    {
      id: 'care_plan',
      title: 'Care Plan',
      icon: Heart,
      iconColor: 'text-red-500',
      completed: workflowStatus?.care_plan_completed,
      description: 'Create comprehensive care plan',
      action: 'Edit',
      link: `/care/setup/${participantId}`
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      icon: Shield,
      iconColor: 'text-blue-500',
      completed: workflowStatus?.risk_assessment_completed,
      description: 'Conduct comprehensive risk assessment',
      action: 'Edit',
      link: `/care/setup/${participantId}`
    },
    {
      id: 'documents',
      title: 'Service Documents',
      icon: FileText,
      iconColor: 'text-purple-500',
      completed: onboardingPack?.completed_signatures > 0,
      description: 'Generate NDIS service documents',
      action: 'Generate',
      link: `/participants/${participantId}/generate-documents`
    },
    {
      id: 'quotation',
      title: 'Quotation',
      icon: DollarSign,
      iconColor: 'text-green-600',
      completed: workflowStatus?.quotation_generated,
      description: 'Create and send service quotation',
      action: 'Manage',
      link: `/quotations/participants/${participantId}`
    }
  ];

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

  if (!participant) return null;

  const participantName = `${normalizeCase(participant.first_name)} ${participant.middle_name ? participant.middle_name + ' ' : ''}${normalizeCase(participant.last_name)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/participants')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft size={16} />
              Back to Participants
            </button>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-7 w-7 text-blue-600" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-900">{participantName}</h1>
                <p className="text-xs text-gray-500">
                  ID: {participant.id} • {participant.ndis_number || 'NDIS Pending'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isProspective ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isProspective ? 'Prospective' : 'Onboarded'}
              </span>
              
              {isProspective ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/participants/${participantId}/edit`)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Edit size={14} className="inline mr-1" />
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => navigate(`/participants/${participantId}/documents`)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FileText size={14} className="inline mr-1" />
                    Documents
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => alert('Add case note functionality')}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={14} className="inline mr-1" />
                    Case Note
                  </button>
                  <button 
                    onClick={() => navigate(`/scheduling/appointment/new?participant_id=${participantId}`)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Calendar size={14} className="inline mr-1" />
                    New Appointment
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Printer size={14} className="inline mr-1" />
                    Print
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">
            Validated by {participant.validated_by || 'System User'} on {formatDate(participant.created_at)}
          </p>
        </div>
      </div>

      {!isProspective && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'case-notes', label: 'Case Notes', icon: MessageSquare },
                { id: 'appointments', label: 'Appointments', icon: Calendar },
                { id: 'medications', label: 'Medications', icon: Book },
                { id: 'funding', label: 'Funding', icon: Wallet },
                { id: 'preferences', label: 'Preferences', icon: Heart },
                { id: 'vaccinations', label: 'Vaccinations', icon: Syringe },
                { id: 'relationships', label: 'Relationships', icon: Users },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* PROSPECTIVE PARTICIPANT VIEW */}
        {isProspective && (
          <div className="space-y-6">
            {/* Onboarding Workflow Steps */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Onboarding Workflow</h2>
                    <p className="text-sm text-gray-600">Complete all steps to proceed</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg text-center ${
                  canConvert ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="text-xs text-gray-600 mb-1">Status</div>
                  <div className={`font-bold ${canConvert ? 'text-green-700' : 'text-yellow-700'}`}>
                    {canConvert ? 'Ready' : 'In Progress'}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {onboardingSteps.map((step) => {
                    const Icon = step.icon;
                    const status = getStepStatus(step.completed);
                    return (
                      <div key={step.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <Icon className={`h-5 w-5 ${step.iconColor}`} />
                          <span className={`text-xs px-2 py-0.5 rounded ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-gray-900 mb-1">{step.title}</h3>
                        <p className="text-xs text-gray-600 mb-3">{step.description}</p>
                        <button 
                          onClick={() => {
                            if (step.link.startsWith('#')) {
                              setActiveTab(step.link.substring(1));
                            } else {
                              navigate(step.link);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {step.action}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-medium text-gray-700">{progress.completed}/{progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Document Pack Hub */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    Onboarding Document Pack
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Track document status and send for signature
                  </p>
                </div>
                
                {/* Button container with both buttons */}
                <div className="flex gap-2">
                  {/* Send for Signature button - shows when not all complete */}
                  {onboardingPack && !onboardingPack.all_required_complete && (
                    <button
                      onClick={() => setShowSendModal(true)}
                      disabled={onboardingPack.missing_count > 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Mail size={16} />
                      Send for Signature
                    </button>
                  )}
                  
                  {/* Submit to Manager button - shows when all documents are complete */}
                  {onboardingPack?.all_required_complete && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `${API_BASE_URL}/care/participants/${participantId}/submit-for-manager-review`,
                            {
                              method: 'POST',
                              headers: withAuth()
                            }
                          );
                          
                          if (response.ok) {
                            alert('✅ Submitted to manager for review!');
                            await loadData(); // Reload to show new status
                          } else {
                            const error = await response.json();
                            alert('❌ Failed: ' + (error.detail || 'Unknown error'));
                          }
                        } catch (error) {
                          alert('❌ Error: ' + error.message);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle size={16} />
                      Submit to Manager
                    </button>
                  )}
                </div>
              </div>

              {loadingPack ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : onboardingPack ? (
                <div className="space-y-4">
                  {/* Progress Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">{onboardingPack.missing_count}</div>
                      <div className="text-sm text-red-700">Missing</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-600">{onboardingPack.pending_signature_count}</div>
                      <div className="text-sm text-yellow-700">Pending Signature</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">{onboardingPack.signed_count}</div>
                      <div className="text-sm text-green-700">Signed</div>
                    </div>
                  </div>

                  {/* Document Checklist */}
                  <div className="space-y-2">
                    {onboardingPack.items.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.status === 'signed'
                            ? 'bg-green-50 border-green-200'
                            : item.status === 'pending_signature'
                            ? 'bg-yellow-50 border-yellow-200'
                            : item.status === 'MISSING'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.status === 'signed' && <CheckCircle className="text-green-600" size={20} />}
                          {item.status === 'pending_signature' && <Clock className="text-yellow-600" size={20} />}
                          {item.status === 'MISSING' && <AlertCircle className="text-red-600" size={20} />}
                          {item.status === 'ready' && <div className="w-5 h-5 rounded-full border-2 border-gray-400" />}
                          
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-gray-600">{item.category}</div>
                          </div>
                        </div>
                        
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          item.status === 'signed'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'pending_signature'
                            ? 'bg-yellow-100 text-yellow-700'
                            : item.status === 'MISSING'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status === 'MISSING' ? 'Generate First' : item.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Public URL if available */}
                  {publicUrl && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-medium text-blue-900">Signing Link</div>
                          <div className="text-xs text-blue-700 mt-1 font-mono break-all">{publicUrl}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(publicUrl)}
                          className="p-2 hover:bg-blue-100 rounded flex-shrink-0"
                        >
                          <Copy size={16} className="text-blue-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load onboarding pack
                </div>
              )}
            </div>

            {/* Basic Information & NDIS Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="text-gray-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      <p className="font-medium text-sm">{participant.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-gray-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="font-medium text-sm">{participant.email_address || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs text-gray-600">Date of Birth</p>
                      <p className="font-medium text-sm">{formatDate(participant.date_of_birth)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">NDIS Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">NDIS Number</p>
                    <p className="font-medium text-sm">{participant.ndis_number || 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Plan Type</p>
                    <p className="font-medium text-sm">{participant.plan_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Support Category</p>
                    <p className="font-medium text-sm">{participant.support_category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Disability Type</p>
                    <p className="font-medium text-sm">{participant.disability_type || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Uploads</h3>
              <div className="space-y-2">
                {recentDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded yet</p>
                    <button 
                      onClick={() => navigate(`/participants/${participantId}/documents`)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Upload Documents →
                    </button>
                  </div>
                ) : (
                  recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {doc.title || doc.original_filename || doc.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.category || 'General'} • {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/participants/${participantId}/documents/${doc.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <DocumentsTab 
            participantId={participantId} 
            participantName={participantName}
          />
        )}

        {/* APPOINTMENTS TAB */}
        {!isProspective && activeTab === 'appointments' && (
          <ParticipantAppointmentsTab
            participantId={parseInt(participantId)}
            participantName={participantName}
          />
        )}

        {/* OTHER TABS */}
        {!isProspective && activeTab !== 'overview' && activeTab !== 'documents' && activeTab !== 'appointments' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Content for {
              [
                { id: 'case-notes', label: 'Case Notes' },
                { id: 'medications', label: 'Medications' },
                { id: 'funding', label: 'Funding' },
                { id: 'preferences', label: 'Preferences' },
                { id: 'vaccinations', label: 'Vaccinations' },
                { id: 'relationships', label: 'Relationships' },
                { id: 'settings', label: 'Settings' }
              ].find(t => t.id === activeTab)?.label} tab</p>
          </div>
        )}

        {/* OVERVIEW TAB - ONBOARDED */}
        {!isProspective && activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                {/* Quick Snapshot */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Quick Snapshot
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600 font-medium">Next Appointment</p>
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="font-semibold text-gray-900">Tomorrow 10:00 AM</p>
                      <p className="text-xs text-gray-600 mt-1">with Sarah Johnson</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600 font-medium">Assigned Team</p>
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold text-green-700">SJ</div>
                        <span className="text-sm font-medium">Sarah Johnson</span>
                      </div>
                      <p className="text-xs text-gray-600">Service Manager</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600 font-medium">Open Alerts</p>
                        <Bell className="h-4 w-4 text-yellow-600" />
                      </div>
                      <p className="font-semibold text-gray-900">2 Items</p>
                      <p className="text-xs text-gray-600 mt-1">1 incident, 1 expiring doc</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-600 font-medium">Funding Balance</p>
                        <Wallet className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="font-semibold text-gray-900">$45,230</p>
                      <p className="text-xs text-gray-600 mt-1">Plan ends Mar 2026</p>
                    </div>
                  </div>
                </div>

                {/* Care Plan Summary WITH VERSIONING */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                      Care Plan Summary
                      {carePlan && (
                        <span className="text-sm text-gray-500 font-normal">
                          (v{carePlan.version_number || '1.0'})
                        </span>
                      )}
                    </h3>
                    <button 
                      onClick={() => setShowVersionHistory(prev => ({ ...prev, carePlan: !prev.carePlan }))}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <History size={14} />
                      {showVersionHistory.carePlan ? 'Hide' : 'View'} History
                    </button>
                  </div>

                  {showVersionHistory.carePlan && carePlanVersions.length > 0 && (
                    <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Care Plan Versions</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {carePlanVersions.map(version => (
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
                              {version.status === 'draft' && (
                                <>
                                  <button 
                                    onClick={() => navigate(`/care/plan/${participantId}/versions/${version.id}/edit`)}
                                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDiscardDraft('care_plan', version.id)}
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

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Top Goals</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span>Improve social skills through community activities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
                          <span>Increase independence in daily living tasks</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Risk Highlights
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Epilepsy - requires medication monitoring</li>
                        <li>• Wandering risk - supervision required</li>
                      </ul>
                    </div>

                    {isServiceManager && (
                      <div className="flex gap-2 pt-3 border-t">
                        <button 
                          onClick={createCarePlanRevision}
                          disabled={!canCreateRevision.carePlan}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            canCreateRevision.carePlan
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={14} className="inline mr-1" />
                          Create Care Plan Revision
                        </button>
                        <button 
                          onClick={() => navigate(`/care/plan/${participantId}`)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          View Current
                        </button>
                      </div>
                    )}
                    {!canCreateRevision.carePlan && (
                      <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        A draft revision exists. Complete or discard it before creating a new one.
                      </p>
                    )}
                  </div>
                </div>

                {/* Risk Assessment WITH VERSIONING */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-600" />
                      Risk Assessment
                      {riskAssessment && (
                        <span className="text-sm text-gray-500 font-normal">
                          (v{riskAssessment.version_number || '1.0'})
                        </span>
                      )}
                    </h3>
                    <button 
                      onClick={() => setShowVersionHistory(prev => ({ ...prev, riskAssessment: !prev.riskAssessment }))}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <History size={14} />
                      {showVersionHistory.riskAssessment ? 'Hide' : 'View'} History
                    </button>
                  </div>

                  {showVersionHistory.riskAssessment && riskVersions.length > 0 && (
                    <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Risk Assessment Versions</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {riskVersions.map(version => (
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
                              {version.status === 'draft' && (
                                <>
                                  <button 
                                    onClick={() => navigate(`/care/risk-assessment/${participantId}/versions/${version.id}/edit`)}
                                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDiscardDraft('risk_assessment', version.id)}
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

                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      {riskAssessment ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Overall Rating:</span>
                            <span className={`font-medium px-2 py-0.5 rounded ${
                              riskAssessment.overall_risk_rating === 'high' ? 'bg-red-200 text-red-900' :
                              riskAssessment.overall_risk_rating === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                              'bg-green-200 text-green-900'
                            }`}>
                              {riskAssessment.overall_risk_rating}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Next Review:</span>
                            <span className="font-medium">{formatDate(riskAssessment.review_date)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No risk assessment available</p>
                      )}
                    </div>

                    {isServiceManager && (
                      <div className="flex gap-2 pt-3 border-t">
                        <button 
                          onClick={createRiskAssessmentRevision}
                          disabled={!canCreateRevision.riskAssessment}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            canCreateRevision.riskAssessment
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={14} className="inline mr-1" />
                          Create Risk Assessment Revision
                        </button>
                        <button 
                          onClick={() => navigate(`/care/risk-assessment/${participantId}`)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          View Current
                        </button>
                      </div>
                    )}
                    {!canCreateRevision.riskAssessment && (
                      <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        A draft revision exists. Complete or discard it before creating a new one.
                      </p>
                    )}
                  </div>
                </div>

                {/* Service Documents Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Service Documents
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Official NDIS Documents</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {workflowStatus?.documents_generated 
                              ? 'Service agreement and documents generated' 
                              : 'No documents generated yet'}
                          </p>
                        </div>
                        {workflowStatus?.documents_generated && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>

                    {canSubmitForReview && (
                      <button 
                        onClick={async () => {
                          navigate(`/participants/${participantId}/generate-documents`);
                          setTimeout(async () => {
                            try {
                              await fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow/mark-documents-complete`, {
                                method: 'POST',
                                headers: withAuth()
                              });
                              await loadData();
                            } catch (error) {
                              console.error('Failed to mark documents complete:', error);
                            }
                          }, 2000);
                        }}
                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles size={18} />
                        Generate Service Documents
                      </button>
                    )}
                  </div>
                </div>

                {/* Basic Info & NDIS Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Phone className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs text-gray-600">Phone</p>
                          <p className="font-medium text-sm">{participant.phone_number}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium text-sm">{participant.email_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs text-gray-600">Date of Birth</p>
                          <p className="font-medium text-sm">{formatDate(participant.date_of_birth)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">NDIS Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600">NDIS Number</p>
                        <p className="font-medium text-sm">{participant.ndis_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Plan Type</p>
                        <p className="font-medium text-sm">{participant.plan_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Support Category</p>
                        <p className="font-medium text-sm">{participant.support_category}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {activity.type === 'note' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'document' && <FileText className="h-4 w-4 text-blue-600" />}
                          {activity.type === 'appointment' && <Calendar className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.text}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time} by {activity.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Goals & Preferences */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Goals
                    </h3>
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      <Plus size={14} className="inline" /> Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {goals.slice(0, 3).map((goal, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{goal.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            goal.status === 'In progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {goal.status}
                          </span>
                          <span className="text-xs text-gray-500">{goal.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Preferences
                    </h3>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Likes</p>
                      <button className="text-xs text-blue-600 hover:text-blue-700">
                        <Plus size={12} className="inline" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {likes.map((like, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                          {like}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Dislikes</p>
                      <button className="text-xs text-blue-600 hover:text-blue-700">
                        <Plus size={12} className="inline" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dislikes.map((dislike, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                          {dislike}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar for Prospective */}
      {isProspective && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Progress: <strong>{progress.completed} of {progress.total}</strong> complete
                </span>
                {convertBlockedMessage && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700">{convertBlockedMessage}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                  Save Draft
                </button>
                {canConvertNow && (
                  <button 
                    onClick={() => navigate(`/care/signoff/${participantId}`)}
                    className="px-6 py-2 rounded-lg text-sm font-semibold transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
                  >
                    <CheckCircle className="inline h-4 w-4 mr-2" />
                    Convert to Participant
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Pack Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Send Onboarding Pack for Signature</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Email
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signer Role
                </label>
                <select
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value as 'participant' | 'guardian')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="participant">Participant</option>
                  <option value="guardian">Guardian/Representative</option>
                </select>
              </div>
              
              {onboardingPack && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-700">
                    📦 <strong>{onboardingPack.items.length} documents</strong> will be included in this pack
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSendModal(false)}
                disabled={sendingPack}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPack}
                disabled={sendingPack || !signerName || !signerEmail}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingPack ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Send Pack
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                placeholder="e.g., Updated support hours based on new assessment, Added new goal for community participation..."
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