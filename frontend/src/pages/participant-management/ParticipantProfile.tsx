// frontend/src/pages/participant-management/ParticipantProfile.tsx - COMPLETE FIXED FILE
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, ArrowLeft, Heart, Shield, FileText, DollarSign, CheckCircle,
  AlertCircle, Calendar, Phone, Mail, Edit, MessageSquare, Users, Award,
  Plus, Clock, Target, Book, Syringe, Settings, Wallet, Printer,
  ClipboardList, Bell, TrendingUp, MapPin, Link2, Search, Activity
} from 'lucide-react';
import DocumentsTab from '../../components/participant/DocumentsTab';
import SupportPlanSection from '../../components/SupportPlanSection';

export default function ParticipantProfile() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole] = useState('service_manager');

  const participantId = window.location.pathname.split('/').pop();
  const API_BASE_URL = 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadData();
  }, [participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantRes, workflowRes, carePlanRes, riskRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`)
      ]);

      if (participantRes.status === 'fulfilled' && participantRes.value.ok) {
        setParticipant(await participantRes.value.json());
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const progress = calculateProgress();
  const isProspective = participant?.status === 'prospective';
  const canConvert = progress.completed === 4;

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

  const goals = extractGoals();
  const { likes, dislikes } = extractPreferences();

  const recentUploads = [
    { name: 'NDIS Plan.pdf', date: '2025-01-15', type: 'NDIS Plan' },
    { name: 'Medical Report.pdf', date: '2025-01-14', type: 'Medical' },
    { name: 'ID Document.pdf', date: '2025-01-14', type: 'Identity' }
  ];

  const recentActivity = [
    { type: 'note', text: 'Case note added: Initial assessment completed', time: '2 hours ago', user: 'Sarah Johnson' },
    { type: 'document', text: 'Service Agreement generated and sent', time: '1 day ago', user: 'System' },
    { type: 'appointment', text: 'Initial consultation scheduled for Jan 20', time: '2 days ago', user: 'Sarah Johnson' }
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

  const getStepStatus = (completed) => {
    if (completed) return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
  };

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
      link: `/care/risk-assessment/${participantId}`
    },
    {
      id: 'documents',
      title: 'Service Documents',
      icon: FileText,
      iconColor: 'text-purple-500',
      completed: workflowStatus?.documents_generated,
      description: 'Generate NDIS service documents',
      action: 'Manage',
      link: '#documents'
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
                    onClick={() => alert('Schedule appointment')}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Calendar size={14} className="inline mr-1" />
                    New Appointment
                  </button>
                  <button 
                    onClick={() => alert('View medication plan')}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Syringe size={14} className="inline mr-1" />
                    View Medication Plan
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Printer size={14} className="inline mr-1" />
                    Print Support Plan
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
        {isProspective && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Onboarding Hub</h2>
                    <p className="text-sm text-gray-600">Complete all steps to convert to active participant</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg text-center ${
                  canConvert ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="text-xs text-gray-600 mb-1">Status</div>
                  <div className={`font-bold ${canConvert ? 'text-green-700' : 'text-yellow-700'}`}>
                    {canConvert ? 'Ready' : 'Blocked'}
                  </div>
                  {!canConvert && (
                    <div className="text-xs text-gray-600 mt-1">
                      {!workflowStatus?.care_plan_completed && 'Care Plan required'}
                      {workflowStatus?.care_plan_completed && !workflowStatus?.risk_assessment_completed && 'Risk Assessment required'}
                      {workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed && !workflowStatus?.documents_generated && 'Documents required'}
                      {workflowStatus?.care_plan_completed && workflowStatus?.risk_assessment_completed && workflowStatus?.documents_generated && !workflowStatus?.quotation_generated && 'Quotation required'}
                    </div>
                  )}
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

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Uploads</h3>
              <div className="space-y-2">
                {recentUploads.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.type} • {formatDate(doc.date)}</p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-700">View</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsTab 
            participantId={participantId} 
            participantName={participantName}
          />
        )}

        {!isProspective && activeTab !== 'overview' && activeTab !== 'documents' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Content for {
              [
                { id: 'case-notes', label: 'Case Notes' },
                { id: 'appointments', label: 'Appointments' },
                { id: 'medications', label: 'Medications' },
                { id: 'funding', label: 'Funding' },
                { id: 'preferences', label: 'Preferences' },
                { id: 'vaccinations', label: 'Vaccinations' },
                { id: 'relationships', label: 'Relationships' },
                { id: 'settings', label: 'Settings' }
              ].find(t => t.id === activeTab)?.label} tab</p>
          </div>
        )}

        {!isProspective && activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
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
                      <button className="text-xs text-blue-600 hover:text-blue-700 mt-2">View calendar →</button>
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

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                      Support Plan Summary
                    </h3>
                    <button 
                      onClick={() => navigate(`/care/setup/${participantId}`)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View plan history →
                    </button>
                  </div>

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

                    {userRole === 'service_manager' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate(`/care/plan/${participantId}/edit`)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Create Care Plan Revision
                        </button>
                        <button 
                          onClick={() => navigate(`/care/risk-assessment/${participantId}/edit`)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                          Create Risk Assessment Revision
                        </button>
                      </div>
                    )}
                  </div>
                </div>

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

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Relationships</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Mary Singh</p>
                        <p className="text-xs text-gray-600">Primary Contact / Mother</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 border rounded-lg hover:bg-gray-50">
                          <Phone className="h-4 w-4 text-gray-600" />
                        </button>
                        <button className="p-2 border rounded-lg hover:bg-gray-50">
                          <Mail className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

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

      {isProspective && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Progress: <strong>{progress.completed} of {progress.total}</strong> complete
                </span>
                {!canConvert && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700">Complete all steps to enable conversion</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                  Save Draft
                </button>
                <button 
                  disabled={!canConvert}
                  onClick={() => {
                    if (canConvert) {
                      navigate(`/care/signoff/${participantId}`);
                    }
                  }}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                    canConvert 
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="inline h-4 w-4 mr-2" />
                  Convert to Participant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}