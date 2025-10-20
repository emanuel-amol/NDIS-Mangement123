// frontend/src/pages/scheduling/ParticipantToSchedulingWorkflow.tsx - FULLY DYNAMIC WITH BACKEND
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { SupportWorkerAssignment } from '../../components/scheduling/SupportWorkerAssignment';
import { ScheduleGeneration } from '../../components/scheduling/ScheduleGeneration';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number?: string;
  email_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  disability_type: string;
  support_category: string;
  status: string;
  plan_start_date: string;
  plan_review_date: string;
  risk_level: string;
  client_goals?: string;
  accessibility_needs?: string;
  cultural_considerations?: string;
  current_supports?: string;
}

interface Assignment {
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
  estimated_cost_per_hour: number;
  compatibility_score: number;
}

interface GeneratedSchedule {
  id: string;
  participant_id: number;
  support_worker_id: number;
  support_worker_name: string;
  date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  status: 'draft' | 'confirmed';
  notes?: string;
  recurring_pattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    end_date?: string;
  };
}

type WorkflowStep = 'review' | 'assignment' | 'schedule' | 'complete';

export default function ParticipantToSchedulingWorkflow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('review');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[]>([]);

  // Query for participant data
  const { 
    data: participant, 
    isLoading: participantLoading, 
    error: participantError,
    refetch: refetchParticipant 
  } = useQuery<Participant>({
    queryKey: ['participant', id],
    queryFn: async () => {
      if (!id) throw new Error('No participant ID provided');
      
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Participant not found');
        }
        throw new Error(`Failed to fetch participant: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!id,
    retry: 2
  });

  // Query for workflow status
  const { 
    data: workflowStatus,
    isLoading: workflowLoading 
  } = useQuery({
    queryKey: ['workflow-status', id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        const response = await fetch(`${API_BASE_URL}/care/participants/${id}/prospective-workflow`);
        if (response.ok) {
          return response.json();
        }
        return null;
      } catch (error) {
        console.warn('Workflow status not available:', error);
        return null;
      }
    },
    enabled: !!id && !!participant,
    retry: 1
  });

  // Mutation for updating participant status
  const updateParticipantStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!id) throw new Error('No participant ID');
      
      const response = await fetch(`${API_BASE_URL}/participants/${id}/status?status=${encodeURIComponent(status)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_API_KEY,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant', id] });
      toast.success('Participant status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating participant status:', error);
      toast.error('Failed to update participant status');
    }
  });

  // Check if participant is ready for scheduling
  const isParticipantReady = () => {
    if (!participant) return false;
    
    // Must be onboarded or active
    const readyStatuses = new Set(['onboarded', 'active']);
    if (!readyStatuses.has((participant.status || '').toLowerCase())) {
      return false;
    }
    
    // Must have basic required information
    if (!participant.disability_type || !participant.support_category) {
      return false;
    }
    
    return true;
  };

  // Generate participant needs for assignment
  const getParticipantNeeds = () => {
    if (!participant) return null;
    
    // Map disability type to required skills
    const getRequiredSkills = (disabilityType: string): string[] => {
      const skillMap: Record<string, string[]> = {
        'intellectual-disability': ['Personal Care', 'Skill Development', 'Community Access', 'Behavior Support'],
        'physical-disability': ['Personal Care', 'Domestic Assistance', 'Mobility Support', 'Equipment Assistance'],
        'sensory-disability': ['Communication Support', 'Orientation Mobility', 'Assistive Technology'],
        'psychosocial-disability': ['Mental Health Support', 'Social Participation', 'Skill Development'],
        'autism': ['Behavior Support', 'Communication Support', 'Social Skills', 'Sensory Support'],
        'multiple-disabilities': ['Personal Care', 'Skill Development', 'Community Access', 'Specialized Support']
      };
      
      const normalizedType = disabilityType.toLowerCase().replace(/\s+/g, '-');
      return skillMap[normalizedType] || ['Personal Care', 'Community Access'];
    };

    return {
      disability_type: participant.disability_type,
      support_category: participant.support_category,
      required_skills: getRequiredSkills(participant.disability_type),
      location: [participant.city, participant.state].filter(Boolean).join(', ') || 'Location not specified',
      preferred_times: ['09:00-17:00'], // Default business hours
      risk_level: participant.risk_level
    };
  };

  // Generate participant preferences for scheduling
  const getParticipantPreferences = () => {
    if (!participant) return null;
    
    return {
      preferred_times: ['morning', 'afternoon'],
      preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      location: [participant.street_address, participant.city, participant.state, participant.postcode]
        .filter(Boolean).join(', ') || 'Home Visit',
      special_requirements: [
        participant.accessibility_needs,
        participant.cultural_considerations
      ].filter(Boolean)
    };
  };

  const handleAssignmentComplete = async (newAssignments: Assignment[]) => {
    try {
      // Save assignments to backend
      if (id) {
        const response = await fetch(`${API_BASE_URL}/participants/${id}/support-worker-assignments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_API_KEY
          },
          body: JSON.stringify({
            assignments: newAssignments,
            participant_needs: getParticipantNeeds()
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save assignments');
        }
      }
      
      setAssignments(newAssignments);
      setCurrentStep('schedule');
      toast.success('Support worker assignments saved successfully');
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save support worker assignments');
    }
  };

  const handleScheduleGenerated = async (schedule: GeneratedSchedule[]) => {
    try {
      // Save schedule to backend and update participant status
      if (id) {
        const response = await fetch(`${API_BASE_URL}/participants/${id}/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_API_KEY,
          },
          body: JSON.stringify({
            schedule,
            assignments
          }),
        });

        if (!response.ok && response.status !== 404) {
          throw new Error('Failed to save schedule');
        }

        await updateParticipantStatusMutation.mutateAsync('active');
      }
      
      setGeneratedSchedule(schedule);
      setCurrentStep('complete');
      toast.success('Schedule generated and participant activated successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save generated schedule');
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step) {
      case 'review': return User;
      case 'assignment': return Users;
      case 'schedule': return Calendar;
      case 'complete': return CheckCircle;
    }
  };

  const getStepStatus = (step: WorkflowStep) => {
    const stepIndex = ['review', 'assignment', 'schedule', 'complete'].indexOf(step);
    const currentIndex = ['review', 'assignment', 'schedule', 'complete'].indexOf(currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  // Loading state
  if (participantLoading || workflowLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participant information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (participantError || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {participantError?.message || 'Participant Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            Unable to load participant information for scheduling workflow.
          </p>
          <div className="space-x-3">
            <button 
              onClick={() => refetchParticipant()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </button>
            <button 
              onClick={() => navigate('/participants')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Participants
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if participant is ready for scheduling
  if (!isParticipantReady()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Participant Not Ready for Scheduling
          </h2>
          <p className="text-gray-600 mb-4">
            {participant.first_name} {participant.last_name} must be onboarded before scheduling can begin.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-yellow-800 mb-2">Current Status:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Status: {participant.status}</li>
              <li>• Disability Type: {participant.disability_type || 'Not specified'}</li>
              <li>• Support Category: {participant.support_category || 'Not specified'}</li>
            </ul>
          </div>
          <div className="space-x-3">
            <button 
              onClick={() => navigate(`/participants/${participant.id}`)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Participant Profile
            </button>
            <button 
              onClick={() => navigate('/participants')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Participants
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;
  const participantNeeds = getParticipantNeeds()!;
  const participantPreferences = getParticipantPreferences()!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participant.id}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Profile
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Scheduling Setup for {participantName}
                </h1>
                <p className="text-sm text-gray-600">
                  Complete support worker assignment and schedule generation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {(['review', 'assignment', 'schedule', 'complete'] as WorkflowStep[]).map((step, index) => {
              const Icon = getStepIcon(step);
              const status = getStepStatus(step);
              const isLast = index === 3;
              
              return (
                <div key={step} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 
                      ${status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                        status === 'current' ? 'bg-blue-600 border-blue-600 text-white' :
                        'bg-gray-100 border-gray-300 text-gray-400'}
                    `}>
                      <Icon size={20} />
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        status === 'current' ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {step === 'review' ? 'Review Participant' :
                         step === 'assignment' ? 'Assign Support Workers' :
                         step === 'schedule' ? 'Generate Schedule' :
                         'Complete Setup'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {step === 'review' ? 'Confirm participant details' :
                         step === 'assignment' ? 'Select and assign workers' :
                         step === 'schedule' ? 'Create appointment schedule' :
                         'Activate scheduling'}
                      </p>
                    </div>
                  </div>
                  
                  {!isLast && (
                    <ArrowRight className={`mx-6 ${
                      status === 'completed' ? 'text-green-600' : 'text-gray-300'
                    }`} size={20} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'review' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Review Participant Information
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Participant Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="text-blue-600" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">{participantName}</p>
                      <p className="text-sm text-gray-600">Status: {participant.status}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Disability Type</label>
                      <p className="text-sm text-gray-900 mt-1">{participant.disability_type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Support Category</label>
                      <p className="text-sm text-gray-900 mt-1">{participant.support_category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Risk Level</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">{participant.risk_level}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Plan Start Date</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(participant.plan_start_date).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                  </div>
                  
                  {participant.client_goals && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Client Goals</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">{participant.client_goals}</p>
                    </div>
                  )}

                  {participant.phone_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contact Information</label>
                      <div className="text-sm text-gray-900 mt-1 space-y-1">
                        <div>Phone: {participant.phone_number}</div>
                        {participant.email_address && <div>Email: {participant.email_address}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Required Support Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Requirements</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1">{participantNeeds.location}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Required Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {participantNeeds.required_skills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {participant.accessibility_needs && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Accessibility Needs</label>
                      <p className="text-sm text-gray-900 mt-1 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                        {participant.accessibility_needs}
                      </p>
                    </div>
                  )}
                  
                  {participant.cultural_considerations && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cultural Considerations</label>
                      <p className="text-sm text-gray-900 mt-1 bg-green-50 p-3 rounded border-l-4 border-green-400">
                        {participant.cultural_considerations}
                      </p>
                    </div>
                  )}

                  {participant.current_supports && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Current Supports</label>
                      <p className="text-sm text-gray-900 mt-1 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        {participant.current_supports}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate(`/participants/${participant.id}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Profile
              </button>
              <button
                onClick={() => setCurrentStep('assignment')}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Proceed to Assignment
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'assignment' && (
          <SupportWorkerAssignment
            participantId={participant.id}
            participantName={participantName}
            participantNeeds={participantNeeds}
            onAssignmentComplete={handleAssignmentComplete}
            onCancel={() => setCurrentStep('review')}
          />
        )}

        {currentStep === 'schedule' && (
          <ScheduleGeneration
            participantId={participant.id}
            participantName={participantName}
            assignments={assignments}
            participantPreferences={participantPreferences}
            onScheduleGenerated={handleScheduleGenerated}
            onCancel={() => setCurrentStep('assignment')}
          />
        )}

        {currentStep === 'complete' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Scheduling Setup Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                {participantName} has been successfully set up with support workers and a schedule.
                The participant status has been updated to 'active'.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-green-900 mb-2">Summary</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <div>• {assignments.length} support worker{assignments.length !== 1 ? 's' : ''} assigned</div>
                  <div>• {generatedSchedule.length} appointment{generatedSchedule.length !== 1 ? 's' : ''} scheduled</div>
                  <div>• Participant status: Active</div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate(`/participants/${participant.id}`)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Participant Profile
                </button>
                <button
                  onClick={() => navigate('/scheduling')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Scheduling Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}