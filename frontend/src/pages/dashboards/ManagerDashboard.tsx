// frontend/src/pages/dashboards/ManagerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  Calendar, 
  FileText, 
  AlertCircle, 
  UserPlus, 
  Clock,
  Users,
  CheckCircle,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Target,
  Shield,
  Brain,
  Award
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  onClick?: () => void;
  badge?: string;
  trend?: string;
}

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  status: string;
  created_at: string;
  disability_type: string;
  urgency_level: string;
  referred_for: string;
  referrer_first_name: string;
  referrer_last_name: string;
}

interface ProspectiveParticipant {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  workflow: {
    care_plan_completed: boolean;
    risk_assessment_completed: boolean;
    ai_review_completed: boolean;
    quotation_generated: boolean;
    ready_for_onboarding: boolean;
  };
  created_at: string;
  disability_type: string;
  risk_level: string;
}

interface WorkflowStats {
  total_prospective: number;
  needs_care_plan: number;
  needs_risk_assessment: number;
  ready_for_signoff: number;
  ready_for_onboarding: number;
  onboarded_awaiting_scheduling: number;
  active_participants: number;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  color = "blue", 
  onClick,
  badge,
  trend 
}) => (
  <div 
    className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <span className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend}
            </span>
          )}
        </div>
        {badge && (
          <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [prospectiveParticipants, setProspectiveParticipants] = useState<ProspectiveParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats>({
    total_prospective: 0,
    needs_care_plan: 0,
    needs_risk_assessment: 0,
    ready_for_signoff: 0,
    ready_for_onboarding: 0,
    onboarded_awaiting_scheduling: 0,
    active_participants: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch referrals
      const referralsResponse = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (referralsResponse.ok) {
        const referralsData = await referralsResponse.json();
        const pendingReferrals = referralsData.filter((ref: Referral) => 
          ref.status === 'submitted' || ref.status === 'pending'
        );
        setReferrals(pendingReferrals);
      }

      // Fetch all participants for workflow stats
      const participantsResponse = await fetch(`${API_BASE_URL}/participants`);
      if (participantsResponse.ok) {
        const allParticipants = await participantsResponse.json();
        
        // Filter prospective participants
        const prospective = allParticipants.filter((p: any) => 
          p.status === 'prospective' || p.status === 'validated' || !p.onboarding_completed
        );

        // Fetch workflow status for prospective participants
        const prospectiveWithWorkflow = await Promise.all(
          prospective.map(async (participant: any) => {
            try {
              const workflowResponse = await fetch(
                `${API_BASE_URL}/care/participants/${participant.id}/prospective-workflow`
              );
              
              let workflow = {
                care_plan_completed: participant.care_plan_completed || false,
                risk_assessment_completed: false,
                ai_review_completed: false,
                quotation_generated: false,
                ready_for_onboarding: false
              };

              if (workflowResponse.ok) {
                const workflowData = await workflowResponse.json();
                workflow = {
                  care_plan_completed: workflowData.care_plan_completed || false,
                  risk_assessment_completed: workflowData.risk_assessment_completed || false,
                  ai_review_completed: workflowData.ai_review_completed || false,
                  quotation_generated: workflowData.quotation_generated || false,
                  ready_for_onboarding: workflowData.ready_for_onboarding || false
                };
              }

              return {
                id: participant.id,
                first_name: participant.first_name,
                last_name: participant.last_name,
                status: participant.status,
                workflow,
                created_at: participant.created_at,
                disability_type: participant.disability_type || 'not-specified',
                risk_level: participant.risk_level || 'medium'
              };
            } catch (error) {
              console.error(`Error processing participant ${participant.id}:`, error);
              return null;
            }
          })
        );

        const validProspective = prospectiveWithWorkflow.filter(p => p !== null);
        setProspectiveParticipants(validProspective);

        // Calculate workflow statistics
        const stats = {
          total_prospective: validProspective.length,
          needs_care_plan: validProspective.filter(p => !p.workflow.care_plan_completed).length,
          needs_risk_assessment: validProspective.filter(p => 
            p.workflow.care_plan_completed && !p.workflow.risk_assessment_completed
          ).length,
          ready_for_signoff: validProspective.filter(p => 
            p.workflow.care_plan_completed && p.workflow.risk_assessment_completed && !p.workflow.ready_for_onboarding
          ).length,
          ready_for_onboarding: validProspective.filter(p => p.workflow.ready_for_onboarding).length,
          onboarded_awaiting_scheduling: allParticipants.filter((p: any) => 
            p.status === 'onboarded' && p.onboarding_completed
          ).length,
          active_participants: allParticipants.filter((p: any) => p.status === 'active').length
        };

        setWorkflowStats(stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
      return { label: 'Create Care Plan', route: `/care/setup/${participant.id}`, color: 'pink' };
    }
    if (!workflow.risk_assessment_completed) {
      return { label: 'Risk Assessment', route: `/care/setup/${participant.id}`, color: 'red' };
    }
    if (workflow.care_plan_completed && workflow.risk_assessment_completed && !workflow.ready_for_onboarding) {
      return { label: 'Ready for Sign-off', route: `/care/signoff/${participant.id}`, color: 'green' };
    }
    if (workflow.ready_for_onboarding) {
      return { label: 'Complete Onboarding', route: `/care/signoff/${participant.id}`, color: 'teal' };
    }
    return { label: 'Continue Setup', route: `/care/setup/${participant.id}`, color: 'blue' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Manager Dashboard</h2>
          <p className="text-gray-600">Complete workflow management from referral to active service</p>
        </div>
        <button
          onClick={() => navigate('/referral')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          New Referral
        </button>
      </div>

      {/* Workflow Stage Stats - Primary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={FileText} 
          label="Pending Referrals" 
          value={referrals.length}
          color="blue"
          onClick={() => navigate('/referrals')}
          badge={referrals.filter(r => r.urgency_level === 'urgent').length > 0 ? 
            `${referrals.filter(r => r.urgency_level === 'urgent').length} urgent` : undefined}
        />
        
        <StatCard 
          icon={Clock} 
          label="Prospective Participants" 
          value={workflowStats.total_prospective}
          color="yellow"
          onClick={() => navigate('/prospective')}
          trend={workflowStats.total_prospective > 0 ? `${workflowStats.needs_care_plan} need care plan` : undefined}
        />
        
        <StatCard 
          icon={CheckCircle} 
          label="Ready for Sign-off" 
          value={workflowStats.ready_for_signoff}
          color="green"
          onClick={() => navigate('/prospective')}
        />
        
        <StatCard 
          icon={Award} 
          label="Ready for Onboarding" 
          value={workflowStats.ready_for_onboarding}
          color="teal"
          onClick={() => navigate('/prospective')}
        />
      </div>

      {/* Service Delivery Stats - Secondary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={Users} 
          label="Onboarded (Awaiting Scheduling)" 
          value={workflowStats.onboarded_awaiting_scheduling}
          color="indigo"
          onClick={() => navigate('/participants')}
          badge={workflowStats.onboarded_awaiting_scheduling > 0 ? 'Action required' : undefined}
        />
        
        <StatCard 
          icon={HeartHandshake} 
          label="Active Participants" 
          value={workflowStats.active_participants}
          color="green"
          onClick={() => navigate('/participants')}
        />
        
        <StatCard 
          icon={Calendar} 
          label="Scheduled Today" 
          value={0}
          color="purple"
          onClick={() => navigate('/scheduling')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Referrals - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Recent Referrals</h3>
              <p className="text-sm text-gray-500">Submitted referrals awaiting review</p>
            </div>
            <button
              onClick={() => navigate('/referrals')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending referrals</p>
              <p className="text-sm text-gray-400 mt-1">New referrals will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.slice(0, 4).map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/referrals')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {referral.first_name} {referral.last_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(referral.urgency_level)}`}>
                        {referral.urgency_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-600">
                        {referral.disability_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(referral.created_at)}
                      </p>
                    </div>
                  </div>
                  <button 
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/referrals');
                    }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Workflow Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/referrals')}
              className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Review Referrals
              </span>
              {referrals.length > 0 && (
                <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {referrals.length}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => navigate('/prospective')}
              className="w-full p-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Prospective Workflow
              </span>
              {workflowStats.total_prospective > 0 && (
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                  {workflowStats.total_prospective}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => navigate('/participants')}
              className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              All Participants
            </button>
            
            <button 
              onClick={() => navigate('/scheduling')}
              className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              View Schedule
            </button>
            
            <button 
              onClick={() => navigate('/quotations')}
              className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Quotations
            </button>
          </div>
        </div>
      </div>

      {/* Prospective Participants Requiring Action */}
      {prospectiveParticipants.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Prospective Participants</h3>
              <p className="text-sm text-gray-500">Participants in onboarding workflow</p>
            </div>
            <button
              onClick={() => navigate('/prospective')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Dashboard →
            </button>
          </div>
          
          <div className="space-y-3">
            {prospectiveParticipants.slice(0, 5).map((participant) => {
              const progress = getWorkflowProgress(participant.workflow);
              const nextAction = getNextAction(participant);
              
              return (
                <div 
                  key={participant.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {participant.first_name} {participant.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {participant.disability_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{progress}% Complete</p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {participant.workflow.care_plan_completed ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-gray-400" />
                        )}
                        Care Plan
                      </span>
                      <span className="flex items-center gap-1">
                        {participant.workflow.risk_assessment_completed ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-gray-400" />
                        )}
                        Risk
                      </span>
                      <span className="flex items-center gap-1">
                        {participant.workflow.quotation_generated ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-gray-400" />
                        )}
                        Quote
                      </span>
                    </div>
                    
                    <button
                      onClick={() => navigate(nextAction.route)}
                      className={`px-3 py-1 bg-${nextAction.color}-600 text-white text-sm rounded hover:bg-${nextAction.color}-700 flex items-center gap-1`}
                    >
                      {nextAction.label}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {(referrals.some(r => r.urgency_level === 'urgent') || workflowStats.ready_for_onboarding > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900">Action Required</h4>
              <div className="text-sm text-orange-800 mt-1 space-y-1">
                {referrals.some(r => r.urgency_level === 'urgent') && (
                  <p>• {referrals.filter(r => r.urgency_level === 'urgent').length} urgent referral(s) need immediate review</p>
                )}
                {workflowStats.ready_for_onboarding > 0 && (
                  <p>• {workflowStats.ready_for_onboarding} participant(s) ready to complete onboarding</p>
                )}
                {workflowStats.onboarded_awaiting_scheduling > 0 && (
                  <p>• {workflowStats.onboarded_awaiting_scheduling} onboarded participant(s) awaiting scheduling setup</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {referrals.some(r => r.urgency_level === 'urgent') && (
                  <button
                    onClick={() => navigate('/referrals')}
                    className="text-sm font-medium text-orange-700 hover:text-orange-800 underline"
                  >
                    Review Urgent Referrals →
                  </button>
                )}
                {workflowStats.ready_for_onboarding > 0 && (
                  <button
                    onClick={() => navigate('/prospective')}
                    className="text-sm font-medium text-orange-700 hover:text-orange-800 underline"
                  >
                    Complete Onboarding →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Progress Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{workflowStats.needs_care_plan}</div>
            <div className="text-sm text-gray-600 mt-1">Need Care Plan</div>
            <Heart className="w-4 h-4 text-pink-600 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{workflowStats.needs_risk_assessment}</div>
            <div className="text-sm text-gray-600 mt-1">Need Risk Assessment</div>
            <Shield className="w-4 h-4 text-red-600 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{workflowStats.ready_for_signoff}</div>
            <div className="text-sm text-gray-600 mt-1">Ready for Sign-off</div>
            <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">{workflowStats.ready_for_onboarding}</div>
            <div className="text-sm text-gray-600 mt-1">Ready for Onboarding</div>
            <Award className="w-4 h-4 text-teal-600 mx-auto mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;