// frontend/src/components/scheduling/SupportWorkerRoster.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, MapPin, Award, Filter, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface RosterEntry {
  id: number;
  support_worker_id: number;
  support_worker_name: string;
  participant_id: number;
  participant_name: string;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  location: string;
}

interface SupportWorkerRosterProps {
  // Optional props for filtering or configuration
  selectedDate?: string;
  selectedWorkerId?: number;
  onRosterUpdate?: (roster: RosterEntry[]) => void;
}

const SupportWorkerRoster: React.FC<SupportWorkerRosterProps> = ({
  selectedDate,
  selectedWorkerId,
  onRosterUpdate
}) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [supportWorkers, setSupportWorkers] = useState<SupportWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'list'>('week');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState(selectedWorkerId || 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);

  useEffect(() => {
    fetchRosterData();
    fetchSupportWorkers();
  }, [currentDate, selectedWorkerFilter]);

  const fetchSupportWorkers = async () => {
    try {
      // Mock data - replace with actual API call
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

      setSupportWorkers(mockWorkers);
    } catch (error) {
      console.error('Error fetching support workers:', error);
    }
  };

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      
      // Mock roster data - replace with actual API call
      const mockRoster: RosterEntry[] = [
        {
          id: 1,
          support_worker_id: 1,
          support_worker_name: 'Sarah Wilson',
          participant_id: 101,
          participant_name: 'John Smith',
          service_type: 'Personal Care',
          date: currentDate,
          start_time: '09:00',
          end_time: '12:00',
          hours: 3,
          hourly_rate: 35.00,
          status: 'scheduled',
          notes: 'Regular morning support session',
          location: 'Participant Home'
        },
        {
          id: 2,
          support_worker_id: 1,
          support_worker_name: 'Sarah Wilson',
          participant_id: 102,
          participant_name: 'Jane Doe',
          service_type: 'Community Access',
          date: currentDate,
          start_time: '14:00',
          end_time: '17:00',
          hours: 3,
          hourly_rate: 35.00,
          status: 'confirmed',
          notes: 'Shopping and community activities',
          location: 'Community'
        },
        {
          id: 3,
          support_worker_id: 2,
          support_worker_name: 'Michael Chen',
          participant_id: 103,
          participant_name: 'Bob Johnson',
          service_type: 'Transport',
          date: currentDate,
          start_time: '10:00',
          end_time: '11:00',
          hours: 1,
          hourly_rate: 30.00,
          status: 'completed',
          notes: 'Medical appointment transport',
          location: 'Various'
        },
        {
          id: 4,
          support_worker_id: 3,
          support_worker_name: 'Emma Thompson',
          participant_id: 104,
          participant_name: 'Alice Brown',
          service_type: 'Skill Development',
          date: currentDate,
          start_time: '15:30',
          end_time: '17:30',
          hours: 2,
          hourly_rate: 32.00,
          status: 'in_progress',
          notes: 'Life skills training session',
          location: 'Participant Home'
        }
      ];

      // Filter by selected worker if specified
      const filteredRoster = selectedWorkerFilter 
        ? mockRoster.filter(entry => entry.support_worker_id === selectedWorkerFilter)
        : mockRoster;

      setRoster(filteredRoster);
      
      if (onRosterUpdate) {
        onRosterUpdate(filteredRoster);
      }
    } catch (error) {
      console.error('Error fetching roster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: RosterEntry['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (entryId: number, newStatus: RosterEntry['status']) => {
    try {
      setRoster(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, status: newStatus }
            : entry
        )
      );
      
      // In real app, make API call to update status
      console.log(`Updated entry ${entryId} status to ${newStatus}`);
    } catch (error) {
      console.error('Error updating roster entry status:', error);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (confirm('Are you sure you want to delete this roster entry?')) {
      try {
        setRoster(prev => prev.filter(entry => entry.id !== entryId));
        // In real app, make API call to delete entry
        console.log(`Deleted roster entry ${entryId}`);
      } catch (error) {
        console.error('Error deleting roster entry:', error);
      }
    }
  };

  const filteredRoster = roster.filter(entry => {
    const matchesSearch = 
      entry.support_worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTotalHours = () => {
    return filteredRoster.reduce((total, entry) => total + entry.hours, 0);
  };

  const getTotalCost = () => {
    return filteredRoster.reduce((total, entry) => total + (entry.hours * entry.hourly_rate), 0);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Worker Roster</h2>
          <p className="text-gray-600">
            Manage and view support worker schedules and assignments
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} className="mr-2" />
            Add Roster Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <User className="text-blue-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRoster.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="text-green-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalHours()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="text-purple-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Active Workers</p>
              <p className="text-2xl font-bold text-gray-900">{supportWorkers.filter(w => w.status === 'active').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Award className="text-yellow-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">${getTotalCost().toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Worker</label>
            <select
              value={selectedWorkerFilter}
              onChange={(e) => setSelectedWorkerFilter(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={0}>All Workers</option>
              {supportWorkers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Support Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoster.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.support_worker_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.participant_name}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.service_type}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.start_time} - {entry.end_time}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.hours}h
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={entry.status}
                      onChange={(e) => handleStatusChange(entry.id, e.target.value as RosterEntry['status'])}
                      className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getStatusColor(entry.status)}`}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(entry.hours * entry.hourly_rate).toFixed(2)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredRoster.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No roster entries found</h3>
            <p className="text-gray-500">Try adjusting your filters or add a new roster entry.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal would go here - simplified for this example */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Roster Entry</h3>
            <p className="text-gray-600 mb-4">
              Add new roster entry form would be implemented here.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportWorkerRoster;