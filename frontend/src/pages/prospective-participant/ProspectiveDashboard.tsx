// frontend/src/pages/onboarding-management-lifecycle/ProspectiveDashboard.tsx
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
  Search
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
  workflow: {
    care_plan_completed: boolean;
    risk_assessment_completed: boolean;
    ai_review_completed: boolean;
    quotation_generated: boolean;
    ready_for_onboarding: boolean;
  };
}

interface WorkflowStats {
  total_prospective: number;
  needs_care_plan: number;
  needs_risk_assessment: number;
  ready_for_onboarding: number;
  overdue_assessments: number;
}

const ProspectiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<ProspectiveParticipant[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    total_prospective: 0,
    needs_care_plan: 0,
    needs_risk_assessment: 0,
    ready_for_onboarding: 0,
    overdue_assessments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchProspectiveParticipants();
    fetchStats();
  }, [searchTerm, priorityFilter]);

  const fetchProspectiveParticipants = async () => {
    try {
      // Mock data for demo - in real app, fetch from API
      const mockParticipants: ProspectiveParticipant[] = [
        {
          id: 1,
          first_name: 'Jordan',
          last_name: 'Smith',
          phone_number: '0478 845 123',
          email_address: 'jordan.smith@email.com',
          created_at: '2025-01-15T10:30:00Z',
          disability_type: 'intellectual-disability',
          support_category: 'capacity-building-support',
          plan_start_date: '2025-02-01',
          risk_level: 'medium',
          workflow: {
            care_plan_completed: false,
            risk_assessment_completed: false,
            ai_review_completed: false,
            quotation_generated: false,
            ready_for_onboarding: false
          }
        },
        {
          id: 2,
          first_name: 'Amrita',
          last_name: 'Kumar',
          phone_number: '0421 567 890',
          email_address: 'amrita.kumar@email.com',
          created_at: '2025-01-12T14:20:00Z',
          disability_type: 'physical-disability',
          support_category: 'core-support',
          plan_start_date: '2025-01-25',
          risk_level: 'low',
          workflow: {
            care_plan_completed: true,
            risk_assessment_completed: false,
            ai_review_completed: false,
            quotation_generated: false,
            ready_for_onboarding: false
          }
        },
        {
          id: 3,
          first_name: 'Linh',
          last_name: 'Nguyen',
          phone_number: '0433 789 456',
          email_address: null,
          created_at: '2025-01-10T09:15:00Z',
          disability_type: 'sensory-disability',
          support_category: 'assistance-with-daily-living',
          plan_start_date: '2025-02-15',
          risk_level: 'high',
          workflow: {
            care_plan_completed: true,
            risk_assessment_completed: true,
            ai_review_completed: true,
            quotation_generated: false,
            ready_for_onboarding: false
          }
        }
      ];

      // Apply filters
      let filteredParticipants = mockParticipants;
      
      if (searchTerm) {
        filteredParticipants = filteredParticipants.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.phone_number.includes(searchTerm) ||
          (p.email_address && p.email_address.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      if (priorityFilter !== 'all') {
        filteredParticipants = filteredParticipants.filter(p => {
          switch (priorityFilter) {
            case 'needs_care_plan':
              return !p.workflow.care_plan_completed;
            case 'needs_risk_assessment':
              return p.workflow.care_plan_completed && !p.workflow.risk_assessment_completed;
            case 'ready_for_onboarding':
              return p.workflow.care_plan_completed && p.workflow.risk_assessment_completed;
            case 'high_risk':
              return p.risk_level === 'high';
            default:
              return true;
          }
        });
      }

      setParticipants(filteredParticipants);
    } catch (error) {
      console.error('Error fetching prospective participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock stats - in real app, fetch from API
      setStats({
        total_prospective: 3,
        needs_care_plan: 1,
        needs_risk_assessment: 1,
        ready_for_onboarding: 1,
        overdue_assessments: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getWorkflowProgress = (workflow: ProspectiveParticipant['workflow']) => {
    const completed = Object.values(workflow).filter(Boolean).length;
    const total = Object.keys(workflow).length;
    return Math.round((completed / total) * 100);
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
        action: 'Proceed to Onboarding',
        color: 'bg-green-600 hover:bg-green-700',
        icon: CheckCircle,
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Prospective Participants</h1>
          <p className="text-gray-600">Manage care setup and onboarding workflow</p>
        </div>
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
              placeholder="Search by name, phone, or email..."
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
              <option value="needs_care_plan">Need Care Plan</option>
              <option value="needs_risk_assessment">Need Risk Assessment</option>
              <option value="ready_for_onboarding">Ready for Onboarding</option>
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
                
                <button
                  onClick={() => navigate(nextAction.route)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-colors ${nextAction.color}`}
                >
                  <Icon size={16} />
                  {nextAction.action}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {participants.length === 0 && !loading && (
        <div className="text-center py-12">
          <Clock className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No prospective participants found</h3>
          <p className="text-gray-400">
            {searchTerm || priorityFilter !== 'all' 
              ? 'Try adjusting your search criteria' 
              : 'All participants have been onboarded or are in other stages'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProspectiveDashboard;