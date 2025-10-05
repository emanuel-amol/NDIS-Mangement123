// frontend/src/pages/participant-management/ParticipantProfile.tsx - COMPLETE FILE
import { useState, useEffect } from 'react';
import {
  User, ArrowLeft, Heart, Shield, FileText, DollarSign, CheckCircle,
  Lock, AlertCircle, Calendar, Phone, Mail, Edit, Paperclip,
  MessageSquare, Users, Award, Plus, Eye, Download, Search,
  Filter, Clock, Activity, Target, ThumbsUp, ThumbsDown,
  Syringe, Link2, Settings, Book, Wallet, FileCheck
} from 'lucide-react';
import DocumentsTab from '../../components/participant/DocumentsTab';
import SupportPlanSection from '../../components/SupportPlanSection';

export default function ParticipantProfile() {
  const [participant, setParticipant] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeNote, setActiveNote] = useState('');
  const [userRole, setUserRole] = useState('service_manager'); // TODO: Get from auth context

  const participantId = window.location.pathname.split('/').pop();
  const API_BASE_URL = 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadData();
  }, [participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantRes, workflowRes, docsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`),
        fetch(`${API_BASE_URL}/participants/${participantId}/documents`)
      ]);

      if (participantRes.status === 'fulfilled' && participantRes.value.ok) {
        setParticipant(await participantRes.value.json());
      }
      if (workflowRes.status === 'fulfilled' && workflowRes.value.ok) {
        setWorkflowStatus(await workflowRes.value.json());
      }
      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        const data = await docsRes.value.json();
        setDocuments(Array.isArray(data) ? data : []);
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

  const tabs = [
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
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => handleNavigate('/participants')} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
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
                  <p className="text-xs text-gray-500">
                    ID: {participant.id} • {participant.ndis_number || 'NDIS Pending'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isProspective ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {isProspective ? 'Prospective' : 'Onboarded'}
              </span>
              
              {!isProspective && (
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus size={14} className="inline mr-1" />
                    Case Note
                  </button>
                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    New Appointment
                  </button>
                </div>
              )}
              
              {isProspective && (
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Edit size={14} className="inline mr-1" />
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => setActiveTab('documents')}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FileText size={14} className="inline mr-1" />
                    Documents
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {participant.created_at && (
            <p className="text-xs text-gray-500 mt-2">
              Validated by System User on {formatDate(participant.created_at)}
            </p>
          )}
        </div>
      </div>

      {/* Tabs - Only show for Onboarded */}
      {!isProspective && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map(tab => {
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
        {/* PROSPECTIVE: Onboarding Hub */}
        {isProspective && activeTab !== 'documents' && (
          <div className="space-y-6">
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

              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(progress.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress.percentage}%` }}></div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Care Plan */}
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
                          <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleNavigate(`/care/setup/${participant.id}`)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.care_plan_completed ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.care_plan_completed ? 'Edit' : 'Start'}
                    </button>
                  </div>
                </div>

                {/* Risk Assessment */}
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
                        {workflowStatus?.risk_assessment_completed && (
                          <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleNavigate(`/care/risk-assessment/${participant.id}`)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.risk_assessment_completed ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.risk_assessment_completed ? 'Edit' : 'Start'}
                    </button>
                  </div>
                </div>

                {/* Service Documents */}
                <div className={`border-2 rounded-lg p-4 ${workflowStatus?.documents_generated ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workflowStatus?.documents_generated ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {workflowStatus?.documents_generated ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">3</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-500" />
                          Service Documents
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {workflowStatus?.documents_generated ? 'Documents generated and ready' : 'Generate NDIS service documents'}
                        </p>
                        {workflowStatus?.documents_generated && (
                          <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Generated</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('documents')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.documents_generated ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.documents_generated ? 'Manage' : 'Generate'}
                    </button>
                  </div>
                </div>

                {/* Quotation */}
                <div className={`border-2 rounded-lg p-4 ${workflowStatus?.quotation_generated ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workflowStatus?.quotation_generated ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {workflowStatus?.quotation_generated ? <CheckCircle className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-sm">4</span>}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Quotation
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {workflowStatus?.quotation_generated ? 'Quotation prepared and sent' : 'Create and send service quotation'}
                        </p>
                        {workflowStatus?.quotation_generated && (
                          <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Prepared</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleNavigate(`/quotations/participants/${participant.id}`)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${workflowStatus?.quotation_generated ? 'border border-green-500 text-green-700' : 'bg-blue-600 text-white'}`}>
                      {workflowStatus?.quotation_generated ? 'Manage' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
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
                        <p className="font-medium text-sm">{participant.phone_number || 'N/A'}</p>
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

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">NDIS Information</h3>
                  <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-6">
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
        )}

        {/* DOCUMENTS TAB - Works for both Prospective and Onboarded */}
        {activeTab === 'documents' && (
          <DocumentsTab 
            participantId={participantId} 
            participantName={participantName}
          />
        )}

        {/* ONBOARDED: Overview Tab with Support Plan Section */}
        {!isProspective && activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Support Plan Section - VERSION MANAGEMENT */}
            <SupportPlanSection 
              participant={participant}
              userRole={userRole}
            />

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Snapshot</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Next Appointment</p>
                  <p className="font-semibold">Tomorrow 10:00 AM</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Assigned Manager</p>
                  <p className="font-semibold">John Smith</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Open Alerts</p>
                  <p className="font-semibold">2 Items</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Expiring Docs</p>
                  <p className="font-semibold">1 Document</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Goals & Preferences</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  <Plus size={16} className="inline" /> Add Goal
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium">Improve social skills through community activities</p>
                  <p className="text-xs text-gray-500 mt-1">Target: 6 months</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {!isProspective && activeTab !== 'overview' && activeTab !== 'documents' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Content for {tabs.find(t => t.id === activeTab)?.label} tab</p>
          </div>
        )}
      </div>

      {/* Sticky Footer - Only for Prospective */}
      {isProspective && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow z-20">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Progress: <strong>{progress.completed} of {progress.total}</strong> complete
              </span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border text-gray-700 rounded text-sm">Save Draft</button>
                <button 
                  onClick={() => canConvert && handleNavigate(`/care/signoff/${participant.id}`)}
                  disabled={!canConvert}
                  className={`px-4 py-1.5 rounded text-sm font-semibold ${
                    canConvert ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
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