// frontend/src/pages/prospective-participant/ProspectiveDashboard.tsx - ENHANCED WITH SIGN-OFF BUTTONS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Calendar, 
  ArrowRight,
  Heart,
  Shield,
  Brain,
  FileText,
  Phone,
  Mail,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  Users,
  Loader2,
  Award
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface ProspectiveParticipant {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  created_at: string;
  disability_type: string;
  support_category: string;
  plan_start_date: string;
  risk_level: string;
  ndis_number?: string;
  status: string;
  workflow: {
    care_plan_completed: boolean;
    risk_assessment_completed: boolean;
    ai_review_completed: boolean;
    quotation_generated: boolean;
    ready_for_onboarding: boolean;
    care_plan_id?: number;
    risk_assessment_id?: number;
    workflow_notes?: string;
    manager_comments?: string;
  };
}

interface WorkflowStats {
  total_prospective: number;
  needs_care_plan: number;
  needs_risk_assessment: number;
  ready_for_onboarding: number;
  overdue_assessments: number;
  ai_reviews_pending: number;
  average_completion_time: number;
}

const ProspectiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<ProspectiveParticipant[]>([]);
  const [allParticipants, setAllParticipants] = useState<ProspectiveParticipant[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    total_prospective: 0,
    needs_care_plan: 0,
    needs_risk_assessment: 0,
    ready_for_onboarding: 0,
    overdue_assessments: 0,
    ai_reviews_pending: 0,
    average_completion_time: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProspectiveParticipants();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, priorityFilter, allParticipants]);

  const fetchProspectiveParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all participants
      const participantsResponse = await fetch(`${API_BASE_URL}/participants`);
      if (!participantsResponse.ok) {
        throw new Error(`Failed to fetch participants: ${participantsResponse.statusText}`);
      }
      
      const allParticipantsData = await participantsResponse.json();
      
      // Filter for prospective participants
      const prospectiveParticipantsData = allParticipantsData.filter((p: any) => 
        p.status === 'prospective' || p.status === 'validated' || !p.onboarding_completed
      );

      if (prospectiveParticipantsData.length === 0) {
        // No prospective participants found
        setAllParticipants([]);
        setParticipants([]);
        calculateStats([]);
        return;
      }

      // Fetch workflow status for each prospective participant
      const participantsWithWorkflow = await Promise.all(
        prospectiveParticipantsData.map(async (participant: any) => {
          try {
            const workflowResponse = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/prospective-workflow`);
            
            let workflow = {
              care_plan_completed: participant.care_plan_completed || false,
              risk_assessment_completed: false,
              ai_review_completed: false,
              quotation_generated: false,
              ready_for_onboarding: false,
              care_plan_id: undefined,
              risk_assessment_id: undefined,
              workflow_notes: '',
              manager_comments: ''
            };

            if (workflowResponse.ok) {
              const workflowData = await workflowResponse.json();
              workflow = {
                care_plan_completed: workflowData.care_plan_completed || false,
                risk_assessment_completed: workflowData.risk_assessment_completed || false,
                ai_review_completed: workflowData.ai_review_completed || false,
                quotation_generated: workflowData.quotation_generated || false,
                ready_for_onboarding: workflowData.ready_for_onboarding || false,
                care_plan_id: workflowData.care_plan_id,
                risk_assessment_id: workflowData.risk_assessment_id,
                workflow_notes: workflowData.workflow_notes || '',
                manager_comments: workflowData.manager_comments || ''
              };
            } else {
              console.warn(`Could not fetch workflow for participant ${participant.id}: ${workflowResponse.status}`);
            }

            return {
              id: participant.id,
              first_name: participant.first_name,
              last_name: participant.last_name,
              phone_number: participant.phone_number,
              email_address: participant.email_address,
              created_at: participant.created_at,
              disability_type: participant.disability_type || 'not-specified',
              support_category: participant.support_category || 'general-support',
              plan_start_date: participant.plan_start_date || new Date().toISOString().split('T')[0],
              risk_level: participant.risk_level || 'medium',
              ndis_number: participant.ndis_number,
              status: participant.status,
              workflow
            };
          } catch (error) {
            console.error(`Error processing participant ${participant.id}:`, error);
            
            // Return participant with default workflow if there's an error
            return {
              id: participant.id,
              first_name: participant.first_name,
              last_name: participant.last_name,
              phone_number: participant.phone_number,
              email_address: participant.email_address,
              created_at: participant.created_at,
              disability_type: participant.disability_type || 'not-specified',
              support_category: participant.support_category || 'general-support',
              plan_start_date: participant.plan_start_date || new Date().toISOString().split('T')[0],
              risk_level: participant.risk_level || 'medium',
              ndis_number: participant.ndis_number,
              status: participant.status,
              workflow: {
                care_plan_completed: participant.care_plan_completed || false,
                risk_assessment_completed: false,
                ai_review_completed: false,
                quotation_generated: false,
                ready_for_onboarding: false
              }
            };
          }
        })
      );

      setAllParticipants(participantsWithWorkflow);
      calculateStats(participantsWithWorkflow);

    } catch (error) {
      console.error('Error fetching prospective participants:', error);
      setError(error instanceof Error ? error.message : 'Failed to load participants');
      setAllParticipants([]);
      setParticipants([]);
      calculateStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (participantList: ProspectiveParticipant[]) => {
    const total = participantList.length;
    const needsCarePlan = participantList.filter(p => !p.workflow.care_plan_completed).length;
    const needsRiskAssessment = participantList.filter(p => 
      p.workflow.care_plan_completed && !p.workflow.risk_assessment_completed
    ).length;
    const readyForOnboarding = participantList.filter(p => p.workflow.ready_for_onboarding).length;
    const aiReviewsPending = participantList.filter(p => 
      p.workflow.care_plan_completed && 
      p.workflow.risk_assessment_completed && 
      !p.workflow.ai_review_completed
    ).length;
    
    // Calculate overdue assessments (participants created more than 7 days ago without care plan)
    const overdue = participantList.filter(p => {
      const daysSinceCreated = Math.floor(
        (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceCreated > 7 && !p.workflow.care_plan_completed;
    }).length;

    // Calculate average completion time for completed workflows
    const completedWorkflows = participantList.filter(p => p.workflow.ready_for_onboarding);
    const averageCompletionTime = completedWorkflows.length > 0 
      ? completedWorkflows.reduce((acc, p) => {
          const days = Math.floor(
            (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          return acc + days;
        }, 0) / completedWorkflows.length
      : 0;

    setStats({
      total_prospective: total,
      needs_care_plan: needsCarePlan,
      needs_risk_assessment: needsRiskAssessment,
      ready_for_onboarding: readyForOnboarding,
      overdue_assessments: overdue,
      ai_reviews_pending: aiReviewsPending,
      average_completion_time: Math.round(averageCompletionTime * 10) / 10
    });
  };

  const applyFilters = () => {
    let filteredParticipants = allParticipants;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredParticipants = filteredParticipants.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchLower) ||
        p.phone_number.includes(searchTerm) ||
        (p.email_address && p.email_address.toLowerCase().includes(searchLower)) ||
        (p.ndis_number && p.ndis_number.toLowerCase().includes(searchLower))
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filteredParticipants = filteredParticipants.filter(p => {
        const daysSinceCreated = Math.floor(
          (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        switch (priorityFilter) {
          case 'needs_care_plan':
            return !p.workflow.care_plan_completed;
          case 'needs_risk_assessment':
            return p.workflow.care_plan_completed && !p.workflow.risk_assessment_completed;
          case 'ready_for_onboarding':
            return p.workflow.ready_for_onboarding;
          case 'high_risk':
            return p.risk_level === 'high';
          case 'overdue':
            return daysSinceCreated > 7 && !p.workflow.care_plan_completed;
          case 'ai_review':
            return p.workflow.care_plan_completed && p.workflow.risk_assessment_completed && !p.workflow.ai_review_completed;
          default:
            return true;
        }
      });
    }

    // Sort by priority (overdue first, then by days since created)
    filteredParticipants.sort((a, b) => {
      const aDays = Math.floor((new Date().getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const bDays = Math.floor((new Date().getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24));
      
      // Overdue participants first
      const aOverdue = aDays > 7 && !a.workflow.care_plan_completed;
      const bOverdue = bDays > 7 && !b.workflow.care_plan_completed;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Then by days since created (oldest first)
      return bDays - aDays;
    });

    setParticipants(filteredParticipants);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchProspectiveParticipants();
  };

  const getWorkflowProgress = (workflow: ProspectiveParticipant['workflow']) => {
    const steps = [
      workflow.care_plan_completed,
      workflow.risk_assessment_completed,
      workflow.ai_review_completed,
      workflow.quotation_generated
    ];
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  };

  const getNextAction = (participant: ProspectiveParticipant) => {
    const { workflow } = participant;
    
    if (!workflow.care_plan_completed) {
      return {
        action: 'Create Care Plan',
        color: 'bg-pink-600 hover:bg-pink-700',
        icon: Heart,
        route: `/care/setup/${participant.id}`
      };
    }
    
    if (!workflow.risk_assessment_completed) {
      return {
        action: 'Complete Risk Assessment',
        color: 'bg-red-600 hover:bg-red-700',
        icon: Shield,
        route: `/care/setup/${participant.id}`
      };
    }
    
    if (!workflow.ai_review_completed) {
      return {
        action: 'AI Review',
        color: 'bg-purple-600 hover:bg-purple-700',
        icon: Brain,
        route: `/care/setup/${participant.id}`
      };
    }
    
    if (workflow.care_plan_completed && workflow.risk_assessment_completed) {
      return {
        action: 'Sign-off',
        color: 'bg-green-600 hover:bg-green-700',
        icon: Award,
        route: `/care/signoff/${participant.id}`
      };
    }
    
    return {
      action: 'Continue Setup',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: ArrowRight,
      route: `/care/setup/${participant.id}`
    };
  };

  const getPriorityBadge = (participant: ProspectiveParticipant) => {
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(participant.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreated > 7 && !participant.workflow.care_plan_completed) {
      return { text: 'Overdue', color: 'bg-red-100 text-red-800', priority: 'high' };
    }
    
    if (participant.risk_level === 'high') {
      return { text: 'High Risk', color: 'bg-orange-100 text-orange-800', priority: 'high' };
    }
    
    if (daysSinceCreated > 3 && !participant.workflow.care_plan_completed) {
      return { text: 'Urgent', color: 'bg-yellow-100 text-yellow-800', priority: 'medium' };
    }
    
    return { text: 'Standard', color: 'bg-gray-100 text-gray-800', priority: 'low' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateRelative = (dateString: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(dateString);
  };

  // Function to check if participant is ready for sign-off
  const isReadyForSignOff = (workflow: ProspectiveParticipant['workflow']) => {
    return workflow.care_plan_completed && workflow.risk_assessment_completed;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refreshData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Prospective Participants</h1>
          <p className="text-gray-600">Manage care setup and onboarding workflow</p>
        </div>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Clock className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Prospective</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_prospective}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-pink-500">
          <div className="flex items-center">
            <Heart className="text-pink-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Need Care Plan</p>
              <p className="text-2xl font-bold text-gray-900">{stats.needs_care_plan}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <Shield className="text-red-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Need Risk Assessment</p>
              <p className="text-2xl font-bold text-gray-900">{stats.needs_risk_assessment}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Ready for Onboarding</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ready_for_onboarding}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center">
            <AlertTriangle className="text-orange-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue_assessments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, phone, email, or NDIS number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Participants</option>
              <option value="overdue">Overdue ({stats.overdue_assessments})</option>
              <option value="needs_care_plan">Need Care Plan ({stats.needs_care_plan})</option>
              <option value="needs_risk_assessment">Need Risk Assessment ({stats.needs_risk_assessment})</option>
              <option value="ai_review">Pending AI Review ({stats.ai_reviews_pending})</option>
              <option value="ready_for_onboarding">Ready for Onboarding ({stats.ready_for_onboarding})</option>
              <option value="high_risk">High Risk Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-6">
        {participants.map((participant) => {
          const nextAction = getNextAction(participant);
          const priority = getPriorityBadge(participant);
          const progress = getWorkflowProgress(participant.workflow);
          const Icon = nextAction.icon;
          
          return (
            <div key={participant.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {participant.first_name} {participant.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Added {formatDateRelative(participant.created_at)}
                      {participant.ndis_number && ` • NDIS: ${participant.ndis_number}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                    {priority.text}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{progress}% Complete</p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contact Information</h4>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone size={14} className="mr-2" />
                      {participant.phone_number}
                    </div>
                    {participant.email_address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail size={14} className="mr-2" />
                        {participant.email_address}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Care Details</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Disability: {participant.disability_type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      Category: {participant.support_category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2" />
                      Plan starts: {formatDate(participant.plan_start_date)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Workflow Status</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Care Plan</span>
                      {participant.workflow.care_plan_completed ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Clock size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Risk Assessment</span>
                      {participant.workflow.risk_assessment_completed ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Clock size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">AI Review</span>
                      {participant.workflow.ai_review_completed ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Clock size={16} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => navigate(`/participants/${participant.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Full Profile
                </button>
                
                <div className="flex items-center gap-3">
                  {/* Show Sign-off button for participants ready for onboarding */}
                  {isReadyForSignOff(participant.workflow) && (
                    <button
                      onClick={() => navigate(`/care/signoff/${participant.id}`)}
                      className="px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm font-medium transition-colors"
                    >
                      Sign-off
                    </button>
                  )}
                  
                  <button
                    onClick={() => navigate(nextAction.route)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-colors ${nextAction.color}`}
                  >
                    <Icon size={16} />
                    {nextAction.action}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {participants.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {allParticipants.length === 0 
              ? 'No prospective participants found' 
              : 'No participants match your search criteria'
            }
          </h3>
          <p className="text-gray-400">
            {allParticipants.length === 0 
              ? 'All participants have been onboarded or are in other stages'
              : 'Try adjusting your search criteria or filters'
            }
          </p>
          {allParticipants.length === 0 && (
            <button
              onClick={() => navigate('/referral')}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Users size={16} className="mr-2" />
              Submit New Referral
            </button>
          )}
        </div>
      )}

      {/* Performance Summary */}
      {stats.total_prospective > 0 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.average_completion_time > 0 ? `${stats.average_completion_time}` : '—'}
              </div>
              <div className="text-sm text-gray-600">
                Average completion time (days)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((stats.ready_for_onboarding / (stats.total_prospective || 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">
                Workflow completion rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((stats.overdue_assessments / (stats.total_prospective || 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">
                Overdue rate
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectiveDashboard;