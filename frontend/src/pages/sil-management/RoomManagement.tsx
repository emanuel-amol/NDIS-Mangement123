// frontend/src/pages/sil-management/RoomManagement.tsx
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

interface Room {
  id: number;
  name: string;
  bedType: string;
  bedHeight: string;
  sofas: number;
  cupboard: boolean;
  tv: boolean;
  tables: number;
  doorWidth: string;
  rentAmount: number;
  rentFrequency: string;
  enSuite: boolean;
  participant: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  status: 'Available' | 'Occupied' | 'Maintenance';
  description: string;
  images: string[];
}

const RoomManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Mock data - replace with actual API call
  const homeData = {
    name: 'Sunshine Villa',
    address: '123 Main Street, VIC 3000'
  };

  const rooms: Room[] = [
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
      moveOutDate: null,
      status: 'Occupied',
      description: 'Comfortable single room with garden view',
      images: ['room1-1.jpg', 'room1-2.jpg']
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
      moveOutDate: null,
      status: 'Available',
      description: 'Spacious room with private en-suite bathroom',
      images: ['room2-1.jpg']
    },
    {
      id: 3,
      name: 'Room 3',
      bedType: 'Single',
      bedHeight: 'Low',
      sofas: 1,
      cupboard: true,
      tv: true,
      tables: 2,
      doorWidth: '100cm',
      rentAmount: 375,
      rentFrequency: 'Weekly',
      enSuite: false,
      participant: 'Jane Smith',
      moveInDate: '2023-12-01',
      moveOutDate: null,
      status: 'Occupied',
      description: 'Accessible room with wide doorway and low bed',
      images: ['room3-1.jpg', 'room3-2.jpg', 'room3-3.jpg']
    },
    {
      id: 4,
      name: 'Room 4',
      bedType: 'Single',
      bedHeight: 'Standard',
      sofas: 0,
      cupboard: false,
      tv: false,
      tables: 1,
      doorWidth: '80cm',
      rentAmount: 325,
      rentFrequency: 'Weekly',
      enSuite: false,
      participant: null,
      moveInDate: null,
      moveOutDate: null,
      status: 'Maintenance',
      description: 'Room currently under renovation',
      images: []
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Occupied':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const availableRooms = rooms.filter(room => room.status === 'Available').length;
  const occupiedRooms = rooms.filter(room => room.status === 'Occupied').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'Maintenance').length;

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
              <Link to={`/sil/homes/${id}`} className="hover:text-blue-600">{homeData.name}</Link>
              <span>&gt;</span>
              <span className="text-gray-900">Room Management</span>
            </nav>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
                <p className="mt-2 text-gray-600">{homeData.name} - {homeData.address}</p>
              </div>
              
              <button
                onClick={() => setShowAddRoom(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add New Room
              </button>
            </div>
          </div>

          {/* Room Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🏠</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Rooms</dt>
                      <dd className="text-lg font-medium text-gray-900">{rooms.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                      <dd className="text-lg font-medium text-gray-900">{availableRooms}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Occupied</dt>
                      <dd className="text-lg font-medium text-gray-900">{occupiedRooms}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Maintenance</dt>
                      <dd className="text-lg font-medium text-gray-900">{maintenanceRooms}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      <p className="text-sm text-gray-600">{room.bedType} bed, {room.doorWidth} door</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                      {room.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">Bed Height:</span>
                      <span className="font-medium">{room.bedHeight}</span>
                      <span className="text-gray-600">Sofas:</span>
                      <span className="font-medium">{room.sofas}</span>
                      <span className="text-gray-600">Tables:</span>
                      <span className="font-medium">{room.tables}</span>
                      <span className="text-gray-600">Cupboard:</span>
                      <span className="font-medium">{room.cupboard ? 'Yes' : 'No'}</span>
                      <span className="text-gray-600">TV:</span>
                      <span className="font-medium">{room.tv ? 'Yes' : 'No'}</span>
                      <span className="text-gray-600">En-suite:</span>
                      <span className="font-medium">{room.enSuite ? 'Yes' : 'No'}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rent:</span>
                        <span className="font-medium text-green-600">${room.rentAmount}/{room.rentFrequency}</span>
                      </div>
                    </div>
                  </div>

                  {room.participant && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Current Resident</p>
                        <p className="text-blue-700">{room.participant}</p>
                        <p className="text-blue-600">Move-in: {room.moveInDate}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-4">{room.description}</p>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Room Detail Modal */}
          {selectedRoom && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{selectedRoom.name} Details</h3>
                  <button
                    onClick={() => setSelectedRoom(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRoom.status)}`}>
                      {selectedRoom.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Room Features</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bed Type:</span>
                          <span>{selectedRoom.bedType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bed Height:</span>
                          <span>{selectedRoom.bedHeight}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Door Width:</span>
                          <span>{selectedRoom.doorWidth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sofas:</span>
                          <span>{selectedRoom.sofas}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tables:</span>
                          <span>{selectedRoom.tables}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cupboard:</span>
                          <span>{selectedRoom.cupboard ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">TV:</span>
                          <span>{selectedRoom.tv ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">En-suite:</span>
                          <span>{selectedRoom.enSuite ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Rental Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rent Amount:</span>
                          <span className="font-medium text-green-600">${selectedRoom.rentAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          <span>{selectedRoom.rentFrequency}</span>
                        </div>
                      </div>

                      {selectedRoom.participant && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Current Resident</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span>{selectedRoom.participant}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Move-in Date:</span>
                              <span>{selectedRoom.moveInDate}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedRoom.description}</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Edit Room
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Room Modal */}
          {showAddRoom && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add New Room</h3>
                  <button
                    onClick={() => setShowAddRoom(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Room 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select bed type</option>
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Queen">Queen</option>
                        <option value="King">King</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bed Height</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select bed height</option>
                        <option value="Low">Low</option>
                        <option value="Standard">Standard</option>
                        <option value="High">High</option>
                        <option value="Adjustable">Adjustable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Door Width</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 80cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Sofas</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Tables</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="350"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rent Frequency</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="Weekly">Weekly</option>
                        <option value="Fortnightly">Fortnightly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Room has cupboard</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Room has TV</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Has en-suite bathroom</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the room features, accessibility, views, etc."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add Room
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomManagement;