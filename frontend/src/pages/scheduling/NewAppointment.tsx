// frontend/src/pages/scheduling/NewAppointment.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '../../components/scheduling/AppointmentForm';

interface Participant {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface SupportWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  available: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function NewAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [supportWorkers, setSupportWorkers] = useState<SupportWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-populate form with URL params
  const prefilledData = {
    participant_id: searchParams.get('participant_id') ? parseInt(searchParams.get('participant_id')!) : 0,
    start_time: searchParams.get('start_time') || '',
    support_worker_id: searchParams.get('support_worker_id') ? parseInt(searchParams.get('support_worker_id')!) : 0
  };

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      // Load participants and support workers
      const [participantsRes, workersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/participants`),
        fetch(`${API_BASE_URL}/support-workers`)
      ]);

      if (participantsRes.ok) {
        const participantData = await participantsRes.json();
        setParticipants(participantData.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          phone: p.phone_number,
          address: `${p.city}, ${p.state}`
        })));
      }

      // Mock support workers if API not available
      if (!workersRes.ok) {
        setSupportWorkers([
          {
            id: 1,
            name: 'Sarah Wilson',
            email: 'sarah.wilson@example.com',
            phone: '0412 345 678',
            skills: ['Personal Care', 'Community Access'],
            available: true
          },
          {
            id: 2,
            name: 'Michael Chen',
            email: 'michael.chen@example.com',
            phone: '0423 456 789',
            skills: ['Domestic Assistance', 'Transport'],
            available: true
          },
          {
            id: 3,
            name: 'Emma Thompson',
            email: 'emma.thompson@example.com',
            phone: '0434 567 890',
            skills: ['Social Participation', 'Skill Development'],
            available: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (appointmentData: any) => {
    try {
      console.log('Creating appointment:', appointmentData);
      
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Appointment created successfully!');
        navigate(`/scheduling/appointment/${result.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/scheduling')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Scheduling
            </button>
            <div className="border-l border-gray-300 h-6 mx-4"></div>
            <h1 className="text-xl font-semibold text-gray-900">New Appointment</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppointmentForm
          appointment={prefilledData}
          participants={participants}
          supportWorkers={supportWorkers}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/scheduling')}
        />
      </div>
    </div>
  );
}
