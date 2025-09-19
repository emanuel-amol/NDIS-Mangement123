// frontend/src/components/scheduling/SupportWorkerAssignment.tsx
import React, { useState, useEffect } from 'react';
import { User, CheckCircle, X, Calendar, Clock, Award, MapPin, Phone } from 'lucide-react';

interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate: number;
  max_hours_per_week: number;
  skills: string[];
  availability_pattern: {
    [key: string]: { start: string; end: string; available: boolean }[];
  };
  current_participants: number;
  max_participants: number;
  rating: number;
  experience_years: number;
  location: string;
  certifications: string[];
}

interface SupportWorkerAssignmentProps {
  participantId: number;
  participantName: string;
  participantNeeds: {
    disability_type: string;
    support_category: string;
    required_skills: string[];
    location: string;
    preferred_times: string[];
    risk_level: string;
  };
  onAssignmentComplete: (assignments: Assignment[]) => void;
  onCancel: () => void;
}

interface Assignment {
  support_worker_id: number;
  support_worker_name: string;
  role: 'primary' | 'secondary' | 'backup';
  hours_per_week: number;
  services: string[];
  start_date: string;
}

const SupportWorkerAssignment: React.FC<SupportWorkerAssignmentProps> = ({
  participantId,
  participantName,
  participantNeeds,
  onAssignmentComplete,
  onCancel
}) => {
  const [availableWorkers, setAvailableWorkers] = useState<SupportWorker[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState<SupportWorker | null>(null);

  useEffect(() => {
    fetchAvailableWorkers();
  }, [participantId, participantNeeds]);

  const fetchAvailableWorkers = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real app, this would filter based on participant needs
      const mockWorkers: SupportWorker[] = [
        {
          id: 1,
          name: 'Sarah Wilson',
          email: 'sarah.wilson@example.com',
          phone: '0412 345 678',
          role: 'Senior Support Worker',
          status: 'active',
          hourly_rate: 35.00,
          max_hours_per_week: 38,
          skills: ['Personal Care', 'Community Access', 'Intellectual Disability Support'],
          availability_pattern: {
            monday: [{ start: '09:00', end: '17:00', available: true }],
            tuesday: [{ start: '09:00', end: '17:00', available: true }],
            wednesday: [{ start: '09:00', end: '17:00', available: true }],
            thursday: [{ start: '09:00', end: '17:00', available: true }],
            friday: [{ start: '09:00', end: '17:00', available: true }]
          },
          current_participants: 8,
          max_participants: 12,
          rating: 4.8,
          experience_years: 5,
          location: 'Melbourne CBD',
          certifications: ['First Aid', 'Medication Administration', 'Behavior Support']
        },
        {
          id: 2,
          name: 'Michael Chen',
          email: 'michael.chen@example.com',
          phone: '0423 456 789',
          role: 'Support Worker',
          status: 'active',
          hourly_rate: 30.00,
          max_hours_per_week: 40,
          skills: ['Domestic Assistance', 'Transport', 'Social Participation'],
          availability_pattern: {
            monday: [{ start: '08:00', end: '16:00', available: true }],
            tuesday: [{ start: '08:00', end: '16:00', available: true }],
            wednesday: [{ start: '08:00', end: '16:00', available: true }],
            thursday: [{ start: '08:00', end: '16:00', available: true }],
            friday: [{ start: '08:00', end: '16:00', available: true }]
          },
          current_participants: 6,
          max_participants: 10,
          rating: 4.6,
          experience_years: 3,
          location: 'Melbourne East',
          certifications: ['First Aid', 'Manual Handling']
        },
        {
          id: 3,
          name: 'Emma Thompson',
          email: 'emma.thompson@example.com',
          phone: '0434 567 890',
          role: 'Support Worker',
          status: 'active',
          hourly_rate: 32.00,
          max_hours_per_week: 35,
          skills: ['Social Participation', 'Skill Development', 'Mental Health Support'],
          availability_pattern: {
            tuesday: [{ start: '10:00', end: '18:00', available: true }],
            wednesday: [{ start: '10:00', end: '18:00', available: true }],
            thursday: [{ start: '10:00', end: '18:00', available: true }],
            friday: [{ start: '10:00', end: '18:00', available: true }],
            saturday: [{ start: '09:00', end: '15:00', available: true }]
          },
          current_participants: 4,
          max_participants: 8,
          rating: 4.9,
          experience_years: 4,
          location: 'Melbourne North',
          certifications: ['First Aid', 'Mental Health First Aid', 'Autism Spectrum Support']
        }
      ];

      // Filter workers based on participant needs
      const filteredWorkers = mockWorkers.filter(worker => {
        // Check if worker has required skills
        const hasRequiredSkills = participantNeeds.required_skills.some(skill => 
          worker.skills.some(workerSkill => 
            workerSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        
        // Check availability
        const hasAvailability = worker.current_participants < worker.max_participants;
        
        // Check status
        const isActive = worker.status === 'active';
        
        return hasRequiredSkills && hasAvailability && isActive;
      });

      setAvailableWorkers(filteredWorkers);
    } catch (error) {
      console.error('Error fetching support workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchScore = (worker: SupportWorker) => {
    let score = 0;
    
    // Skill match (40% weight)
    const skillMatches = participantNeeds.required_skills.filter(skill =>
      worker.skills.some(workerSkill => 
        workerSkill.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    score += (skillMatches / participantNeeds.required_skills.length) * 40;
    
    // Availability (20% weight)
    const availabilityScore = (1 - (worker.current_participants / worker.max_participants)) * 20;
    score += availabilityScore;
    
    // Rating (20% weight)
    score += (worker.rating / 5) * 20;
    
    // Experience (10% weight)
    score += Math.min(worker.experience_years / 5, 1) * 10;
    
    // Location proximity (10% weight) - simplified
    const locationMatch = worker.location.toLowerCase().includes(participantNeeds.location.toLowerCase()) ? 10 : 5;
    score += locationMatch;
    
    return Math.round(score);
  };

  const handleAssignWorker = (worker: SupportWorker) => {
    setShowAssignmentModal(worker);
  };

  const confirmAssignment = (worker: SupportWorker, assignmentDetails: Partial<Assignment>) => {
    const newAssignment: Assignment = {
      support_worker_id: worker.id,
      support_worker_name: worker.name,
      role: assignmentDetails.role || 'primary',
      hours_per_week: assignmentDetails.hours_per_week || 10,
      services: assignmentDetails.services || [],
      start_date: assignmentDetails.start_date || new Date().toISOString().split('T')[0]
    };
    
    setSelectedWorkers(prev => [...prev, newAssignment]);
    setShowAssignmentModal(null);
  };

  const removeAssignment = (workerId: number) => {
    setSelectedWorkers(prev => prev.filter(a => a.support_worker_id !== workerId));
  };

  const handleComplete = () => {
    if (selectedWorkers.length === 0) {
      alert('Please assign at least one support worker before proceeding.');
      return;
    }
    onAssignmentComplete(selectedWorkers);
  };

  const filteredWorkers = availableWorkers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Assign Support Workers to {participantName}
        </h2>
        <p className="text-gray-600">
          Select support workers based on participant needs and worker availability
        </p>
      </div>

      {/* Participant Needs Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Participant Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-blue-700">Disability Type:</span>
            <p className="font-medium text-blue-900">{participantNeeds.disability_type}</p>
          </div>
          <div>
            <span className="text-sm text-blue-700">Support Category:</span>
            <p className="font-medium text-blue-900">{participantNeeds.support_category}</p>
          </div>
          <div>
            <span className="text-sm text-blue-700">Location:</span>
            <p className="font-medium text-blue-900">{participantNeeds.location}</p>
          </div>
          <div>
            <span className="text-sm text-blue-700">Risk Level:</span>
            <p className="font-medium text-blue-900 capitalize">{participantNeeds.risk_level}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-sm text-blue-700">Required Skills:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {participantNeeds.required_skills.map(skill => (
              <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Workers */}
      {selectedWorkers.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3">Selected Support Workers ({selectedWorkers.length})</h3>
          <div className="space-y-2">
            {selectedWorkers.map(assignment => (
              <div key={assignment.support_worker_id} className="flex items-center justify-between bg-white p-3 rounded border">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="text-green-600" size={20} />
                  <div>
                    <p className="font-medium">{assignment.support_worker_name}</p>
                    <p className="text-sm text-gray-600">
                      {assignment.role} • {assignment.hours_per_week}hrs/week • Starts {new Date(assignment.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAssignment(assignment.support_worker_id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Available Workers */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold text-gray-900">
          Available Support Workers ({filteredWorkers.length})
        </h3>
        
        {filteredWorkers.map(worker => {
          const matchScore = getMatchScore(worker);
          const isSelected = selectedWorkers.some(a => a.support_worker_id === worker.id);
          
          return (
            <div key={worker.id} className={`bg-white rounded-lg shadow border p-6 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{worker.name}</h4>
                    <p className="text-sm text-gray-600">{worker.role}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-sm ${i < Math.floor(worker.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                            ★
                          </span>
                        ))}
                        <span className="text-sm text-gray-600 ml-1">({worker.rating})</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{worker.experience_years} years exp.</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      matchScore >= 80 ? 'bg-green-100 text-green-800' :
                      matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {matchScore}% match
                    </span>
                  </div>
                  
                  {isSelected ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="text-sm">Assigned</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAssignWorker(worker)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Assign Worker
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Contact & Availability</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Phone size={14} className="mr-2" />
                      {worker.phone}
                    </div>
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2" />
                      {worker.location}
                    </div>
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2" />
                      {worker.current_participants}/{worker.max_participants} participants
                    </div>
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {worker.max_hours_per_week}hrs/week max
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Skills</h5>
                  <div className="flex flex-wrap gap-1">
                    {worker.skills.map(skill => {
                      const isRequired = participantNeeds.required_skills.some(reqSkill =>
                        skill.toLowerCase().includes(reqSkill.toLowerCase())
                      );
                      return (
                        <span
                          key={skill}
                          className={`px-2 py-1 text-xs rounded-full ${
                            isRequired
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Certifications</h5>
                  <div className="space-y-1">
                    {worker.certifications.map(cert => (
                      <div key={cert} className="flex items-center text-sm text-gray-600">
                        <Award size={14} className="mr-2 text-blue-600" />
                        {cert}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          onClick={handleComplete}
          disabled={selectedWorkers.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Assignment ({selectedWorkers.length} workers)
        </button>
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <AssignmentModal
          worker={showAssignmentModal}
          participantNeeds={participantNeeds}
          onConfirm={(details) => confirmAssignment(showAssignmentModal, details)}
          onCancel={() => setShowAssignmentModal(null)}
        />
      )}
    </div>
  );
};

// Assignment Modal Component
interface AssignmentModalProps {
  worker: SupportWorker;
  participantNeeds: SupportWorkerAssignmentProps['participantNeeds'];
  onConfirm: (details: Partial<Assignment>) => void;
  onCancel: () => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  worker,
  participantNeeds,
  onConfirm,
  onCancel
}) => {
  const [assignmentDetails, setAssignmentDetails] = useState<Partial<Assignment>>({
    role: 'primary',
    hours_per_week: 10,
    services: [],
    start_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(assignmentDetails);
  };

  const serviceOptions = [
    'Personal Care',
    'Community Access',
    'Domestic Assistance',
    'Transport',
    'Social Participation',
    'Skill Development',
    'Behavior Support'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Assign {worker.name} to Participant
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={assignmentDetails.role}
              onChange={(e) => setAssignmentDetails({...assignmentDetails, role: e.target.value as 'primary' | 'secondary' | 'backup'})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="primary">Primary Support Worker</option>
              <option value="secondary">Secondary Support Worker</option>
              <option value="backup">Backup Support Worker</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours per Week</label>
            <input
              type="number"
              min="1"
              max={worker.max_hours_per_week}
              value={assignmentDetails.hours_per_week}
              onChange={(e) => setAssignmentDetails({...assignmentDetails, hours_per_week: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={assignmentDetails.start_date}
              onChange={(e) => setAssignmentDetails({...assignmentDetails, start_date: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Services to Provide</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {serviceOptions.map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={assignmentDetails.services?.includes(service)}
                    onChange={(e) => {
                      const services = assignmentDetails.services || [];
                      if (e.target.checked) {
                        setAssignmentDetails({...assignmentDetails, services: [...services, service]});
                      } else {
                        setAssignmentDetails({...assignmentDetails, services: services.filter(s => s !== service)});
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export as named export to match the import
export { SupportWorkerAssignment };