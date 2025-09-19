// frontend/src/pages/sil-management/HomesList.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Home {
  id: string;
  name: string;
  address: string;
  state: string;
  postcode: string;
  propertyType: string;
  sdaType: string;
  rooms: number;
  bathrooms: number;
  availableRooms: number;
  status: 'Available' | 'Partial' | 'Full' | 'Maintenance';
  manager: string;
  lastUpdated: string;
}

const HomesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPropertyType, setFilterPropertyType] = useState('All');
  const [filterState, setFilterState] = useState('All');

  // Mock data - replace with actual API call
  const homes: Home[] = [
    {
      id: '1',
      name: 'Sunshine Villa',
      address: '123 Main Street',
      state: 'VIC',
      postcode: '3000',
      propertyType: 'House',
      sdaType: 'Fully Accessible',
      rooms: 4,
      bathrooms: 2,
      availableRooms: 2,
      status: 'Available',
      manager: 'Sarah Johnson',
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'Garden House',
      address: '456 Oak Avenue',
      state: 'NSW',
      postcode: '2000',
      propertyType: 'Duplex',
      sdaType: 'High Physical Support',
      rooms: 3,
      bathrooms: 2,
      availableRooms: 1,
      status: 'Partial',
      manager: 'Michael Chen',
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      name: 'Coastal Retreat',
      address: '789 Beach Road',
      state: 'WA',
      postcode: '6000',
      propertyType: 'Apartment',
      sdaType: 'Improved Livability',
      rooms: 2,
      bathrooms: 1,
      availableRooms: 0,
      status: 'Full',
      manager: 'Emma Davis',
      lastUpdated: '2024-01-13'
    },
    {
      id: '4',
      name: 'Riverside Manor',
      address: '321 River Street',
      state: 'QLD',
      postcode: '4000',
      propertyType: 'House',
      sdaType: 'Robust Construction',
      rooms: 5,
      bathrooms: 3,
      availableRooms: 0,
      status: 'Maintenance',
      manager: 'David Wilson',
      lastUpdated: '2024-01-12'
    }
  ];

  const filteredHomes = homes.filter(home => {
    const matchesSearch = home.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         home.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || home.status === filterStatus;
    const matchesPropertyType = filterPropertyType === 'All' || home.propertyType === filterPropertyType;
    const matchesState = filterState === 'All' || home.state === filterState;
    
    return matchesSearch && matchesStatus && matchesPropertyType && matchesState;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'Full':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIL Homes</h1>
              <p className="mt-2 text-gray-600">Manage all Supported Independent Living properties</p>
            </div>
            <Link
              to="/sil/homes/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add New Home
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search homes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Partial">Partial</option>
                  <option value="Full">Full</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  id="propertyType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterPropertyType}
                  onChange={(e) => setFilterPropertyType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Duplex">Duplex</option>
                  <option value="Unit">Unit</option>
                </select>
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  id="state"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                >
                  <option value="All">All States</option>
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('All');
                    setFilterPropertyType('All');
                    setFilterState('All');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredHomes.length} of {homes.length} homes
            </p>
          </div>

          {/* Homes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHomes.map((home) => (
              <div key={home.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{home.name}</h3>
                      <p className="text-sm text-gray-600">{home.address}</p>
                      <p className="text-sm text-gray-600">{home.state} {home.postcode}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(home.status)}`}>
                      {home.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Property Type:</span>
                      <span className="font-medium">{home.propertyType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SDA Type:</span>
                      <span className="font-medium">{home.sdaType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rooms:</span>
                      <span className="font-medium">{home.rooms} rooms, {home.bathrooms} bath</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available:</span>
                      <span className="font-medium">{home.availableRooms} of {home.rooms} rooms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Manager:</span>
                      <span className="font-medium">{home.manager}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      to={`/sil/homes/${home.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium text-center"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/sil/homes/${home.id}/edit`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium text-center"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredHomes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'All' || filterPropertyType !== 'All' || filterState !== 'All'
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first SIL home."}
              </p>
              <Link
                to="/sil/homes/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add New Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomesList;