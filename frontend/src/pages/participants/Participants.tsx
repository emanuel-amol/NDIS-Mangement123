import React, { useState, useEffect } from 'react';
import { User, Search, Filter, Plus } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  ndisNumber: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  supportCategory: string;
  planStartDate: string;
  planEndDate: string;
}

const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockParticipants: Participant[] = [
      {
        id: 1,
        name: 'John Smith',
        ndisNumber: 'NDIS12345',
        email: 'john.smith@email.com',
        phone: '0412345678',
        status: 'active',
        supportCategory: 'Core Support',
        planStartDate: '2024-01-01',
        planEndDate: '2024-12-31'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        ndisNumber: 'NDIS23456',
        email: 'sarah.johnson@email.com',
        phone: '0423456789',
        status: 'active',
        supportCategory: 'Capacity Building',
        planStartDate: '2024-02-01',
        planEndDate: '2025-01-31'
      }
    ];
    setParticipants(mockParticipants);
  }, []);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.ndisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Participants</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={20} />
          Add Participant
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search participants by name or NDIS number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParticipants.map((participant) => (
          <div key={participant.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{participant.name}</h3>
                <p className="text-sm text-gray-500">{participant.ndisNumber}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email:</span>
                <span className="text-sm text-gray-800">{participant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Phone:</span>
                <span className="text-sm text-gray-800">{participant.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Support Category:</span>
                <span className="text-sm text-gray-800">{participant.supportCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  participant.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {participant.status}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Plan Period:</span>
              </div>
              <div className="text-sm text-gray-800">
                {participant.planStartDate} to {participant.planEndDate}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded hover:bg-blue-100">
                View Details
              </button>
              <button className="flex-1 bg-gray-50 text-gray-600 py-2 px-3 rounded hover:bg-gray-100">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredParticipants.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No participants found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first participant'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Participants;