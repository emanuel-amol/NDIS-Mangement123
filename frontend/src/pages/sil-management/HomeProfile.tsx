// frontend/src/pages/sil-management/HomeProfile.tsx
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const HomeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with actual API call
  const homeData = {
    id: '1',
    name: 'Sunshine Villa',
    address: '123 Main Street',
    state: 'VIC',
    postcode: '3000',
    propertyType: 'House',
    sdaType: 'Fully Accessible',
    rooms: 4,
    bathrooms: 2,
    kitchens: 1,
    parkingSpaces: 2,
    sharedSpaces: 'Living Room, Dining Area, Study Room',
    features: ['Front Yard', 'Backyard'],
    status: 'Available',
    manager: 'Sarah Johnson',
    description: 'Beautiful accessible home in a quiet neighborhood with easy access to public transport and shopping centers.',
    nearbyFacilities: [
      { type: 'Shopping Center', name: 'Melbourne Central', distance: '2.5km' },
      { type: 'Hospital', name: 'Royal Melbourne Hospital', distance: '3.2km' },
      { type: 'Bus Stop', name: 'Main St/Collins St', distance: '0.2km' },
      { type: 'Train Station', name: 'Melbourne Central', distance: '2.8km' }
    ],
    realEstate: {
      agency: 'Melbourne Property Group',
      contact: 'John Smith',
      phone: '(03) 9123 4567',
      email: 'john@melbprop.com.au'
    },
    rooms_details: [
      {
        id: 1,
        name: 'Room 1',
        bedType: 'Single',
        bedHeight: 'Standard',
        sofas: 1,
        cupboard: true,
        tv: true,
        tables: 1,
        doorWidth: '80cm',
        rentAmount: 350,
        rentFrequency: 'Weekly',
        enSuite: false,
        participant: 'John Doe',
        moveInDate: '2024-01-15',
        status: 'Occupied'
      },
      {
        id: 2,
        name: 'Room 2',
        bedType: 'Double',
        bedHeight: 'Adjustable',
        sofas: 0,
        cupboard: true,
        tv: false,
        tables: 1,
        doorWidth: '90cm',
        rentAmount: 400,
        rentFrequency: 'Weekly',
        enSuite: true,
        participant: null,
        moveInDate: null,
        status: 'Available'
      }
    ],
    clientHistory: [
      { name: 'John Doe', moveIn: '2024-01-15', moveOut: null, status: 'Current' },
      { name: 'Jane Smith', moveIn: '2023-06-01', moveOut: '2023-12-30', status: 'Former' },
      { name: 'Mike Johnson', moveIn: '2023-01-15', moveOut: '2023-05-20', status: 'Former' }
    ],
    maintenanceHistory: [
      {
        id: 1,
        date: '2024-01-10',
        description: 'HVAC System Maintenance',
        assignedTo: 'HVAC Specialists Pty Ltd',
        cost: 350,
        status: 'Completed'
      },
      {
        id: 2,
        date: '2024-01-05',
        description: 'Plumbing repair - Kitchen sink',
        assignedTo: 'Quick Fix Plumbing',
        cost: 180,
        status: 'Completed'
      }
    ]
  };

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'facilities', label: 'Nearby Facilities' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'clients', label: 'Client History' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link to="/sil" className="hover:text-blue-600">SIL Management</Link>
              <span>&gt;</span>
              <Link to="/sil/homes" className="hover:text-blue-600">Homes</Link>
              <span>&gt;</span>
              <span className="text-gray-900">{homeData.name}</span>
            </nav>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{homeData.name}</h1>
                <p className="mt-2 text-gray-600">{homeData.address}, {homeData.state} {homeData.postcode}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(homeData.status)}`}>
                    {homeData.status}
                  </span>
                  <span className="text-sm text-gray-600">Managed by {homeData.manager}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Link
                  to={`/sil/homes/${id}/edit`}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Edit Home
                </Link>
                <Link
                  to={`/sil/homes/${id}/documents`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Documents
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Property Details */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Property Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Property Type:</span>
                      <p className="font-medium">{homeData.propertyType}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">SDA Type:</span>
                      <p className="font-medium">{homeData.sdaType}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Rooms:</span>
                      <p className="font-medium">{homeData.rooms}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Bathrooms:</span>
                      <p className="font-medium">{homeData.bathrooms}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Kitchens:</span>
                      <p className="font-medium">{homeData.kitchens}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Parking Spaces:</span>
                      <p className="font-medium">{homeData.parkingSpaces}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Shared Spaces:</span>
                    <p className="font-medium">{homeData.sharedSpaces}</p>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Features:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {homeData.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {homeData.description && (
                    <div className="mt-4">
                      <span className="text-sm text-gray-600">Description:</span>
                      <p className="font-medium mt-1">{homeData.description}</p>
                    </div>
                  )}
                </div>

                {/* Real Estate Contact */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Real Estate Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Agency:</span>
                      <p className="font-medium">{homeData.realEstate.agency}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Contact Person:</span>
                      <p className="font-medium">{homeData.realEstate.contact}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Phone:</span>
                      <p className="font-medium">{homeData.realEstate.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email:</span>
                      <p className="font-medium">{homeData.realEstate.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Rooms:</span>
                      <span className="font-medium">{homeData.rooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Occupied:</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Available:</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Occupancy Rate:</span>
                      <span className="font-medium">50%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link
                      to={`/sil/homes/${id}/rooms`}
                      className="block w-full text-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Manage Rooms
                    </Link>
                    <Link
                      to={`/sil/homes/${id}/maintenance`}
                      className="block w-full text-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      View Maintenance
                    </Link>
                    <Link
                      to={`/sil/homes/${id}/documents`}
                      className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      View Documents
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Room Management</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Add Room
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {homeData.rooms_details.map((room) => (
                    <div key={room.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900">{room.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          room.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-gray-600">Bed Type:</span>
                          <span>{room.bedType}</span>
                          <span className="text-gray-600">Door Width:</span>
                          <span>{room.doorWidth}</span>
                          <span className="text-gray-600">Rent:</span>
                          <span>${room.rentAmount}/{room.rentFrequency}</span>
                          <span className="text-gray-600">En-suite:</span>
                          <span>{room.enSuite ? 'Yes' : 'No'}</span>
                        </div>
                        
                        {room.participant && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-gray-600">Current Resident:</span>
                            <p className="font-medium">{room.participant}</p>
                            <span className="text-gray-600">Move-in Date:</span>
                            <p className="text-sm">{room.moveInDate}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                          Edit
                        </button>
                        <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nearby Facilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeData.nearbyFacilities.map((facility, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{facility.name}</p>
                      <p className="text-sm text-gray-600">{facility.type}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{facility.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Maintenance History</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Add Maintenance Request
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {homeData.maintenanceHistory.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{item.description}</h4>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium">{item.date}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Assigned To:</span>
                          <p className="font-medium">{item.assignedTo}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost:</span>
                          <p className="font-medium">${item.cost}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Client History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Move In Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Move Out Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {homeData.clientHistory.map((client, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.moveIn}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.moveOut || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            client.status === 'Current' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeProfile;