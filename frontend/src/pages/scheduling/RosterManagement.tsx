// frontend/src/pages/scheduling/RosterManagement.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Filter, Calendar } from 'lucide-react';
import SupportWorkerRoster from '../../components/scheduling/SupportWorkerRoster'; // Changed to default import

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
  availability_pattern: any;
}

interface RosterEntry {
  id: number;
  support_worker_id: number;
  date: string;
  shifts: any[];
  total_hours: number;
  overtime_hours: number;
}

// Updated interface to match what SupportWorkerRoster expects
interface SimpleRosterEntry {
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

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function RosterManagement() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [supportWorkers, setSupportWorkers] = useState<SupportWorker[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
  const [simpleRosterEntries, setSimpleRosterEntries] = useState<SimpleRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRosterData();
  }, [selectedDate]);

  const loadRosterData = async () => {
    try {
      // Mock support workers data
      setSupportWorkers([
        {
          id: 1,
          name: 'Sarah Wilson',
          email: 'sarah.wilson@example.com',
          phone: '0412 345 678',
          role: 'Senior Support Worker',
          status: 'active',
          hourly_rate: 35.00,
          max_hours_per_week: 38,
          skills: ['Personal Care', 'Community Access'],
          availability_pattern: {}
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
          skills: ['Domestic Assistance', 'Transport'],
          availability_pattern: {}
        },
        {
          id: 3,
          name: 'Emma Thompson',
          email: 'emma.thompson@example.com',
          phone: '0434 567 890',
          role: 'Support Worker',
          status: 'on_leave',
          hourly_rate: 32.00,
          max_hours_per_week: 35,
          skills: ['Social Participation', 'Skill Development'],
          availability_pattern: {}
        }
      ]);

      // Mock roster entries
      const mockRosterEntries: RosterEntry[] = [
        {
          id: 1,
          support_worker_id: 1,
          date: selectedDate,
          shifts: [
            {
              id: 1,
              start_time: '09:00',
              end_time: '13:00',
              participant_id: 1,
              participant_name: 'Jordan Smith',
              service_type: 'Personal Care',
              location: 'Home Visit',
              status: 'confirmed',
              break_time: 30
            },
            {
              id: 2,
              start_time: '14:00',
              end_time: '17:00',
              participant_id: 2,
              participant_name: 'Amrita Kumar',
              service_type: 'Community Access',
              location: 'Shopping Centre',
              status: 'confirmed'
            }
          ],
          total_hours: 6.5,
          overtime_hours: 0
        },
        {
          id: 2,
          support_worker_id: 2,
          date: selectedDate,
          shifts: [
            {
              id: 3,
              start_time: '10:00',
              end_time: '14:00',
              participant_id: 3,
              participant_name: 'Linh Nguyen',
              service_type: 'Domestic Assistance',
              location: 'Home Visit',
              status: 'scheduled'
            }
          ],
          total_hours: 4,
          overtime_hours: 0
        }
      ];
      
      setRosterEntries(mockRosterEntries);

      // Convert complex roster entries to simple format for SupportWorkerRoster component
      const convertedEntries: SimpleRosterEntry[] = mockRosterEntries.flatMap(entry => 
        entry.shifts.map((shift: any, index: number) => ({
          id: shift.id,
          support_worker_id: entry.support_worker_id,
          support_worker_name: supportWorkers.find(w => w.id === entry.support_worker_id)?.name || 'Unknown Worker',
          participant_id: shift.participant_id,
          participant_name: shift.participant_name,
          service_type: shift.service_type,
          date: entry.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          hours: calculateHours(shift.start_time, shift.end_time),
          hourly_rate: supportWorkers.find(w => w.id === entry.support_worker_id)?.hourly_rate || 30,
          status: shift.status,
          notes: `${shift.service_type} session`,
          location: shift.location
        }))
      );

      setSimpleRosterEntries(convertedEntries);
    } catch (error) {
      console.error('Error loading roster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return (endMinutes - startMinutes) / 60;
  };

  const handleUpdateRoster = async (rosterId: number, updates: Partial<RosterEntry>) => {
    try {
      console.log('Updating roster:', rosterId, updates);
      // API call would go here
      setRosterEntries(prev => 
        prev.map(entry => 
          entry.id === rosterId ? { ...entry, ...updates } : entry
        )
      );
    } catch (error) {
      console.error('Error updating roster:', error);
    }
  };

  const handleAddShift = async (workerId: number, date: string, shift: any) => {
    try {
      console.log('Adding shift:', { workerId, date, shift });
      // API call would go here
      
      // Mock implementation
      const newShift = { ...shift, id: Date.now() };
      setRosterEntries(prev => {
        const existingEntry = prev.find(e => e.support_worker_id === workerId && e.date === date);
        if (existingEntry) {
          return prev.map(entry => 
            entry.id === existingEntry.id
              ? { ...entry, shifts: [...entry.shifts, newShift] }
              : entry
          );
        } else {
          return [...prev, {
            id: Date.now(),
            support_worker_id: workerId,
            date,
            shifts: [newShift],
            total_hours: 4, // Calculate based on shift
            overtime_hours: 0
          }];
        }
      });
    } catch (error) {
      console.error('Error adding shift:', error);
    }
  };

  const handleRemoveShift = async (shiftId: number) => {
    try {
      console.log('Removing shift:', shiftId);
      // API call would go here
      
      setRosterEntries(prev => 
        prev.map(entry => ({
          ...entry,
          shifts: entry.shifts.filter((shift: any) => shift.id !== shiftId)
        }))
      );
    } catch (error) {
      console.error('Error removing shift:', error);
    }
  };

  const handleRosterUpdate = (updatedRoster: SimpleRosterEntry[]) => {
    setSimpleRosterEntries(updatedRoster);
    console.log('Roster updated:', updatedRoster);
  };

  const exportRoster = () => {
    // Generate CSV or PDF export
    console.log('Exporting roster for:', selectedDate);
    alert('Roster export functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportRoster}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Export
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload size={16} />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SupportWorkerRoster
          selectedDate={selectedDate}
          onRosterUpdate={handleRosterUpdate}
        />
      </div>
    </div>
  );
}