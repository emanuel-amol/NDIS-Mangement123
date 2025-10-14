// frontend/src/pages/scheduling/RosterManagement.tsx - Fully Dynamic with Backend
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Filter, 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  listRosters,
  createRoster,
  updateRoster,
  deleteRoster,
  getParticipants,
  getSupportWorkers,
  formatTime,
  formatDate,
  calculateDuration,
  formatDuration,
  type Roster,
  type RosterCreate,
  type Participant,
  type SupportWorker,
  type RosterStatus
} from '../../services/scheduling';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface RosterEntry extends Roster {
  participant_name?: string;
  support_worker_name?: string;
  duration_hours: number;
}

interface RosterFormData {
  worker_id: number;
  participant_id: number;
  support_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  notes: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function RosterManagement() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoster, setEditingRoster] = useState<RosterEntry | null>(null);
  const [filters, setFilters] = useState({
    worker_id: '',
    participant_id: '',
    status: '' as RosterStatus | ''
  });
  const userRole = ((user?.role || user?.user_metadata?.role || '') || 'SUPPORT_WORKER').toUpperCase();
  const canManageRoster = ['HR', 'SERVICE_MANAGER'].includes(userRole);

  // Calculate week range for roster display
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Query for rosters
  const { 
    data: rosters = [], 
    isLoading: rostersLoading, 
    error: rostersError,
    refetch: refetchRosters 
  } = useQuery<Roster[]>({
    queryKey: ['rosters', selectedDate, filters],
    queryFn: () => {
      const params: any = {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      };
      
      if (filters.worker_id) params.worker_id = parseInt(filters.worker_id);
      if (filters.participant_id) params.participant_id = parseInt(filters.participant_id);
      if (filters.status) params.status = filters.status;
      
      return listRosters(params);
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 1 * 60 * 1000 // Consider stale after 1 minute
  });

  // Query for participants and support workers
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ['participants'],
    queryFn: getParticipants,
    staleTime: 10 * 60 * 1000
  });

  const { data: supportWorkers = [] } = useQuery<SupportWorker[]>({
    queryKey: ['support-workers'],
    queryFn: getSupportWorkers,
    staleTime: 10 * 60 * 1000
  });

  // Create enhanced roster entries with names and duration
  const rosterEntries: RosterEntry[] = rosters.map(roster => {
    const supportWorker = supportWorkers.find(w => w.id === roster.worker_id);
    const participant = roster.participants?.[0] ? 
      participants.find(p => p.id === roster.participants[0].participant_id) : null;
    
    return {
      ...roster,
      support_worker_name: supportWorker?.name || 'Unknown Worker',
      participant_name: participant ? `${participant.first_name} ${participant.last_name}` : 'Unknown Participant',
      duration_hours: calculateDuration(roster.start_time, roster.end_time)
    };
  });

  // Mutations
  const createRosterMutation = useMutation({
    mutationFn: (data: RosterCreate) => createRoster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      toast.success('Roster entry created successfully');
      setShowCreateForm(false);
    },
    onError: (error) => {
      console.error('Error creating roster:', error);
      toast.error('Failed to create roster entry');
    }
  });

  const updateRosterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RosterCreate> }) => 
      updateRoster(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      toast.success('Roster entry updated successfully');
      setEditingRoster(null);
    },
    onError: (error) => {
      console.error('Error updating roster:', error);
      toast.error('Failed to update roster entry');
    }
  });

  const deleteRosterMutation = useMutation({
    mutationFn: (id: number) => deleteRoster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      toast.success('Roster entry deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting roster:', error);
      toast.error('Failed to delete roster entry');
    }
  });

  // Form handling
  const [formData, setFormData] = useState<RosterFormData>({
    worker_id: 0,
    participant_id: 0,
    support_date: selectedDate,
    start_time: '09:00',
    end_time: '17:00',
    service_type: 'Personal Care',
    notes: '',
    is_recurring: false
  });

  const handleCreateRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRoster) return;
    
    if (!formData.worker_id || !formData.participant_id) {
      toast.error('Please select both support worker and participant');
      return;
    }

    const rosterData: RosterCreate = {
      worker_id: formData.worker_id,
      support_date: formData.support_date,
      start_time: formData.start_time + ':00',
      end_time: formData.end_time + ':00',
      eligibility: formData.service_type,
      notes: formData.notes,
      status: 'checked',
      is_group_support: false,
      participants: [{ participant_id: formData.participant_id }],
      tasks: [{ title: `${formData.service_type} session`, is_done: false }]
    };

    // Add recurrence if specified
    if (formData.is_recurring && formData.recurrence_pattern && formData.recurrence_end) {
      rosterData.recurrences = [{
        pattern_type: 'weekly',
        interval: 1,
        by_weekdays: [new Date(formData.support_date).getDay()],
        start_date: formData.support_date,
        end_date: formData.recurrence_end
      }];
    }

    try {
      await createRosterMutation.mutateAsync(rosterData);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleUpdateRoster = async (roster: RosterEntry, updates: Partial<RosterCreate>) => {
    if (!canManageRoster) return;
    try {
      await updateRosterMutation.mutateAsync({ id: roster.id, data: updates });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeleteRoster = async (rosterId: number) => {
    if (!canManageRoster) return;
    if (confirm('Are you sure you want to delete this roster entry?')) {
      try {
        await deleteRosterMutation.mutateAsync(rosterId);
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  const handleStatusUpdate = async (roster: RosterEntry, newStatus: RosterStatus) => {
    if (!canManageRoster) return;
    await handleUpdateRoster(roster, { status: newStatus });
  };

  const exportRoster = () => {
    const csvData = rosterEntries.map(entry => ({
      Date: entry.support_date,
      'Start Time': formatTime(entry.start_time),
      'End Time': formatTime(entry.end_time),
      Duration: formatDuration(entry.duration_hours),
      'Support Worker': entry.support_worker_name,
      Participant: entry.participant_name,
      'Service Type': entry.eligibility || 'General Support',
      Status: entry.status,
      Notes: entry.notes || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Roster exported successfully');
  };

  const getStatusColor = (status: RosterStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'checked': return 'bg-yellow-100 text-yellow-800';
      case 'notified': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: RosterStatus) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-600" />;
      case 'checked': return <Clock size={16} className="text-yellow-600" />;
      case 'notified': return <CheckCircle size={16} className="text-blue-600" />;
      case 'cancelled': return <AlertTriangle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  // Group roster entries by date
  const rostersByDate = rosterEntries.reduce((acc, entry) => {
    const date = entry.support_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  // Generate week days
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    weekDays.push(day.toISOString().split('T')[0]);
  }

  // Loading state
  if (rostersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roster data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (rostersError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-medium text-red-800">Error Loading Roster</h3>
          </div>
          <p className="text-red-700 mt-2">{rostersError.message}</p>
          <button
            onClick={() => refetchRosters()}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/scheduling')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Scheduling
              </button>
              <div className="border-l border-gray-300 h-6 mx-4"></div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <h1 className="text-xl font-semibold text-gray-900">Roster Management</h1>
              </div>
              <div className="ml-4 text-sm text-gray-500">
                {rosterEntries.length} entries for week of {formatDate(weekStart.toISOString())}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetchRosters()}
                disabled={rostersLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={rostersLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              
              <button
                onClick={exportRoster}
                disabled={rosterEntries.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
              
              {canManageRoster && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Add Roster Entry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selection and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Week of:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-4 ml-auto">
              <select
                value={filters.worker_id}
                onChange={(e) => setFilters({...filters, worker_id: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Support Workers</option>
                {supportWorkers.map(worker => (
                  <option key={worker.id} value={worker.id.toString()}>
                    {worker.name}
                  </option>
                ))}
              </select>
              
              <select
                value={filters.participant_id}
                onChange={(e) => setFilters({...filters, participant_id: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Participants</option>
                {participants.map(participant => (
                  <option key={participant.id} value={participant.id.toString()}>
                    {participant.first_name} {participant.last_name}
                  </option>
                ))}
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as RosterStatus})}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="checked">Checked</option>
                <option value="confirmed">Confirmed</option>
                <option value="notified">Notified</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Weekly Roster Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 gap-0">
            {weekDays.map((date, index) => {
              const dayName = new Date(date).toLocaleDateString('en-AU', { weekday: 'short' });
              const dayNumber = new Date(date).getDate();
              const isToday = date === new Date().toISOString().split('T')[0];
              const dayRosters = rostersByDate[date] || [];
              
              return (
                <div key={date} className="border-r border-gray-200 last:border-r-0">
                  {/* Day Header */}
                  <div className={`p-3 text-center border-b border-gray-200 ${
                    isToday ? 'bg-blue-100 text-blue-900' : 'bg-gray-50 text-gray-700'
                  }`}>
                    <div className="font-medium">{dayName}</div>
                    <div className="text-lg">{dayNumber}</div>
                  </div>
                  
                  {/* Day Roster Entries */}
                  <div className="p-2 min-h-[400px] space-y-2">
                    {dayRosters.map(roster => (
                      <div
                        key={roster.id}
                        className="border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setEditingRoster(roster)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(roster.status)}`}>
                            {roster.status}
                          </span>
                          <div className="text-xs text-gray-500">
                            {formatDuration(roster.duration_hours)}
                          </div>
                        </div>
                        
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {formatTime(roster.start_time)} - {formatTime(roster.end_time)}
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-1">
                          <div className="truncate">{roster.participant_name}</div>
                          <div className="truncate">{roster.support_worker_name}</div>
                        </div>
                        
                        <div className="text-xs text-gray-500 truncate">
                          {roster.eligibility || 'General Support'}
                        </div>
                        
                        {roster.notes && (
                          <div className="text-xs text-gray-400 mt-1 truncate" title={roster.notes}>
                            {roster.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayRosters.length === 0 && (
                      <div className="text-center text-gray-400 text-sm mt-8">
                        No roster entries
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="text-blue-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{rosterEntries.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rosterEntries.filter(r => r.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Clock className="text-yellow-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(rosterEntries.reduce((sum, r) => sum + r.duration_hours, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <User className="text-purple-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Active Workers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(rosterEntries.map(r => r.worker_id)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Roster Form Modal */}
      {canManageRoster && showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Roster Entry</h3>
            
            <form onSubmit={handleCreateRoster} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Worker</label>
                <select
                  required
                  value={formData.worker_id}
                  onChange={(e) => setFormData({...formData, worker_id: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Select Support Worker</option>
                  {supportWorkers.filter(w => w.status === 'active').map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                <select
                  required
                  value={formData.participant_id}
                  onChange={(e) => setFormData({...formData, participant_id: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Select Participant</option>
                  {participants.map(participant => (
                    <option key={participant.id} value={participant.id}>
                      {participant.first_name} {participant.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.support_date}
                  onChange={(e) => setFormData({...formData, support_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Personal Care">Personal Care</option>
                  <option value="Community Access">Community Access</option>
                  <option value="Domestic Assistance">Domestic Assistance</option>
                  <option value="Social Participation">Social Participation</option>
                  <option value="Skill Development">Skill Development</option>
                  <option value="Transport">Transport</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
                  Make this a recurring appointment
                </label>
              </div>

              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until</label>
                  <input
                    type="date"
                    value={formData.recurrence_end}
                    onChange={(e) => setFormData({...formData, recurrence_end: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRosterMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createRosterMutation.isPending ? 'Creating...' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Roster Modal */}
      {editingRoster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Roster Entry</h3>
              <button
                onClick={() => setEditingRoster(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Date:</strong> {formatDate(editingRoster.support_date)}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Time:</strong> {formatTime(editingRoster.start_time)} - {formatTime(editingRoster.end_time)}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Participant:</strong> {editingRoster.participant_name}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Support Worker:</strong> {editingRoster.support_worker_name}
                </div>
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['checked', 'confirmed', 'notified', 'cancelled'] as RosterStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(editingRoster, status)}
                      disabled={updateRosterMutation.isPending}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 ${
                        editingRoster.status === status
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        {getStatusIcon(status)}
                        <span className="capitalize">{status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={editingRoster.eligibility || 'Personal Care'}
                  onChange={(e) => handleUpdateRoster(editingRoster, { eligibility: e.target.value })}
                  disabled={updateRosterMutation.isPending}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="Personal Care">Personal Care</option>
                  <option value="Community Access">Community Access</option>
                  <option value="Domestic Assistance">Domestic Assistance</option>
                  <option value="Social Participation">Social Participation</option>
                  <option value="Skill Development">Skill Development</option>
                  <option value="Transport">Transport</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingRoster.notes || ''}
                  onChange={(e) => {
                    // Update local state immediately for better UX
                    setEditingRoster({...editingRoster, notes: e.target.value});
                  }}
                  onBlur={(e) => {
                    if (canManageRoster) {
                      handleUpdateRoster(editingRoster, { notes: e.target.value });
                    }
                  }}
                  disabled={!canManageRoster || updateRosterMutation.isPending}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Add notes about this roster entry..."
                />
              </div>

              {/* Tasks */}
              {editingRoster.tasks && editingRoster.tasks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tasks</label>
                  <div className="space-y-2">
                    {editingRoster.tasks.map((task, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={task.is_done || false}
                          onChange={(e) => {
                            if (!canManageRoster) return;
                            const updatedTasks = [...(editingRoster.tasks || [])];
                            updatedTasks[index] = { ...task, is_done: e.target.checked };
                            handleUpdateRoster(editingRoster, { tasks: updatedTasks });
                          }}
                          disabled={!canManageRoster || updateRosterMutation.isPending}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className={`text-sm ${task.is_done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {canManageRoster && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button
                    onClick={() => navigate(`/scheduling/appointment/${editingRoster.id}/edit`)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Edit Full Details
                  </button>
                  
                  <button
                    onClick={() => navigate(`/participants/${editingRoster.participants?.[0]?.participant_id}`)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Participant Profile
                  </button>

                  <button
                    onClick={() => handleDeleteRoster(editingRoster.id)}
                    disabled={deleteRosterMutation.isPending}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteRosterMutation.isPending ? (
                      'Deleting...'
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Entry
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Worker Notes */}
              {editingRoster.worker_notes && editingRoster.worker_notes.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Worker Notes</label>
                  <div className="space-y-2">
                    {editingRoster.worker_notes.map((note, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {note.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurrence Info */}
              {editingRoster.recurrences && editingRoster.recurrences.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
                  {editingRoster.recurrences.map((recurrence, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      <div>Pattern: {recurrence.pattern_type}</div>
                      <div>Interval: Every {recurrence.interval} {recurrence.pattern_type === 'weekly' ? 'week(s)' : 'day(s)'}</div>
                      <div>From: {formatDate(recurrence.start_date)} to {formatDate(recurrence.end_date)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
                {editingRoster.created_at && (
                  <div>Created: {new Date(editingRoster.created_at).toLocaleString('en-AU')}</div>
                )}
                {editingRoster.updated_at && (
                  <div>Updated: {new Date(editingRoster.updated_at).toLocaleString('en-AU')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
