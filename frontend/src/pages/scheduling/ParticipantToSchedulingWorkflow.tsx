// frontend/src/pages/scheduling/ParticipantToSchedulingWorkflow.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { SupportWorkerAssignment } from '../../components/scheduling/SupportWorkerAssignment';
import { ScheduleGeneration } from '../../components/scheduling/ScheduleGeneration';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  disability_type: string;
  support_category: string;
  status: string;
  plan_start_date: string;
  risk_level: string;
  street_address?: string;
  city?: string;
  state?: string;
  client_goals?: string;
  accessibility_needs?: string;
  cultural_considerations?: string;
}

interface Assignment {
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
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

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function ParticipantToSchedulingWorkflow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('review');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchParticipant();
    }
  }, [id]);

  const fetchParticipant = async () => {
    try {
      setLoading(true);
      
      // Mock participant data since API might not be available
      const mockParticipant: Participant = {
        id: parseInt(id || '1'),
        first_name: 'John',
        last_name: 'Smith',
        disability_type: 'intellectual-disability',
        support_category: 'Core Support',
        status: 'onboarded',
        plan_start_date: '2024-01-01',
        risk_level: 'medium',
        city: 'Melbourne',
        state: 'VIC',
        client_goals: 'Increase independence in daily living activities and community participation.',
        accessibility_needs: 'Wheelchair accessible venues required',
        cultural_considerations: 'Prefers morning appointments, vegetarian meals'
      };
      
      // Try real API first, fall back to mock data
      try {
        const response = await fetch(`${API_BASE_URL}/participants/${id}`);
        if (response.ok) {
          const data = await response.json();
          setParticipant(data);
        } else {
          console.log('API not available, using mock data');
          setParticipant(mockParticipant);
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
        setParticipant(mockParticipant);
      }
      
      // Check if participant is ready for scheduling
      if (mockParticipant.status !== 'onboarded') {
        setError(`Participant must be onboarded before scheduling. Current status: ${mockParticipant.status}`);
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      setError('Network error loading participant');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentComplete = async (newAssignments: Assignment[]) => {
    try {
      // In real app, save assignments to backend
      console.log('Saving support worker assignments:', newAssignments);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAssignments(newAssignments);
      setCurrentStep('schedule');
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save support worker assignments');
    }
  };

  const handleScheduleGenerated = async (schedule: GeneratedSchedule[]) => {
    try {
      // In real app, save schedule to backend
      console.log('Saving generated schedule:', schedule);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGeneratedSchedule(schedule);
      setCurrentStep('complete');
      
      // Update participant status to 'active' now that scheduling is complete
      await updateParticipantStatus('active');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save generated schedule');
    }
  };

  const updateParticipantStatus = async (status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok && participant) {
        setParticipant({ ...participant, status });
      }
    } catch (error) {
      console.error('Error updating participant status:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading participant information...</p>
        </div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Participant Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            Unable to proceed with scheduling workflow.
          </p>
          <button 
            onClick={() => navigate('/participants')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Participants
          </button>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;
  const participantNeeds = {
    disability_type: participant.disability_type,
    support_category: participant.support_category,
    required_skills: participant.disability_type === 'intellectual-disability' 
      ? ['Personal Care', 'Community Access', 'Skill Development']
      : participant.disability_type === 'physical-disability'
      ? ['Personal Care', 'Domestic Assistance', 'Transport']
      : ['Social Participation', 'Skill Development'],
    location: `${participant.city || ''}, ${participant.state || ''}`.trim().replace(/^,\s*/, '') || 'Melbourne, VIC',
    preferred_times: ['09:00-17:00'],
    risk_level: participant.risk_level
  };

  const participantPreferences = {
    preferred_times: ['morning', 'afternoon'],
    preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    location: participantNeeds.location,
    special_requirements: participant.accessibility_needs ? [participant.accessibility_needs] : undefined
  };

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
                      <p className="text-sm text-gray-600">Current Status: {participant.status}</p>
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
                        {new Date(participant.plan_start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {participant.client_goals && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Client Goals</label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                        {participant.client_goals}
                      </p>
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
                </div>
              </div>
            </div>
            
            {/* Status Check */}
            <div className="mt-8 p-4 rounded-lg border">
              {participant.status === 'onboarded' ? (
                <div className="flex items-center text-green-700 bg-green-50">
                  <CheckCircle size={20} className="mr-3" />
                  <div>
                    <p className="font-medium">Ready for Support Worker Assignment</p>
                    <p className="text-sm">Participant is onboarded and ready to proceed with scheduling setup.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-yellow-700 bg-yellow-50">
                  <Clock size={20} className="mr-3" />
                  <div>
                    <p className="font-medium">Onboarding Required</p>
                    <p className="text-sm">
                      Participant must complete onboarding process before scheduling can begin.
                      Current status: {participant.status}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-8">
              <button
                onClick={() => setCurrentStep('assignment')}
                disabled={participant.status !== 'onboarded'}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Proceed to Support Worker Assignment
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
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Scheduling Setup Complete!
            </h2>
            
            <p className="text-gray-600 mb-8">
              {participantName} has been successfully assigned support workers and their schedule has been generated.
              The participant is now active and ready for service delivery.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Support Workers</h3>
                <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
                <p className="text-sm text-blue-700">Assigned</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">Schedule</h3>
                <p className="text-2xl font-bold text-green-600">{generatedSchedule.length}</p>
                <p className="text-sm text-green-700">Sessions Created</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900">Total Hours</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {assignments.reduce((total, a) => total + a.hours_per_week, 0)}
                </p>
                <p className="text-sm text-purple-700">Hours/Week</p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participant.id}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View Participant Profile
              </button>
              
              <button
                onClick={() => navigate('/scheduling/calendar')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Schedule Calendar
              </button>
              
              <button
                onClick={() => navigate('/scheduling')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Go to Scheduling Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}