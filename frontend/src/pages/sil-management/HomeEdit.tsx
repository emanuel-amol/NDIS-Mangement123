// frontend/src/pages/sil-management/HomeEdit.tsx
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const HomeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Mock existing data - replace with actual API call
  const [formData, setFormData] = useState({
    // Basic Property Information
    name: '',
    address: '',
    state: '',
    postcode: '',
    propertyType: '',
    sdaType: '',
    
    // Property Details
    rooms: '',
    bathrooms: '',
    kitchens: '',
    parkingSpaces: '',
    
    // Shared Spaces
    sharedSpaces: '',
    
    // Property Features
    frontYard: false,
    backyard: false,
    swimmingPool: false,
    
    // Management
    assignedManager: '',
    status: '',
    
    // Additional Information
    description: ''
  });

  const [loading, setLoading] = useState(true);

  // Load existing home data
  useEffect(() => {
    // Mock data loading - replace with actual API call
    const mockHomeData = {
      name: 'Sunshine Villa',
      address: '123 Main Street',
      state: 'Victoria',
      postcode: '3000',
      propertyType: 'House',
      sdaType: 'Fully Accessible',
      rooms: '4',
      bathrooms: '2',
      kitchens: '1',
      parkingSpaces: '2',
      sharedSpaces: 'Living Room, Dining Area, Study Room',
      frontYard: true,
      backyard: true,
      swimmingPool: false,
      assignedManager: 'Sarah Johnson',
      status: 'Available',
      description: 'Beautiful accessible home in a quiet neighborhood with easy access to public transport and shopping centers.'
    };

    setFormData(mockHomeData);
    setLoading(false);
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Updating home:', formData);
    // Navigate back to the home profile page
    navigate(`/sil/homes/${id}`);
  };

  const states = [
    'Australian Capital Territory',
    'New South Wales',
    'Northern Territory', 
    'Queensland',
    'South Australia',
    'Tasmania',
    'Victoria',
    'Western Australia'
  ];

  const propertyTypes = ['Apartment', 'Duplex', 'House', 'Unit'];
  const sdaTypes = ['Fully Accessible', 'High Physical Support', 'Improved Livability', 'Robust Construction'];
  const statusOptions = ['Available', 'Not Available', 'Maintenance'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading home details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link to="/sil" className="hover:text-blue-600">SIL Management</Link>
              <span>&gt;</span>
              <Link to="/sil/homes" className="hover:text-blue-600">Homes</Link>
              <span>&gt;</span>
              <Link to={`/sil/homes/${id}`} className="hover:text-blue-600">{formData.name}</Link>
              <span>&gt;</span>
              <span className="text-gray-900">Edit</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Edit SIL Home</h1>
            <p className="mt-2 text-gray-600">Update property information and details</p>
          </div>

          {/* Form */}
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Basic Property Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      id="address"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <select
                      id="state"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                    >
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      id="postcode"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.postcode}
                      onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <select
                      id="propertyType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.propertyType}
                      onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
                    >
                      <option value="">Select Type</option>
                      {propertyTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sdaType" className="block text-sm font-medium text-gray-700 mb-1">
                      SDA Type *
                    </label>
                    <select
                      id="sdaType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.sdaType}
                      onChange={(e) => setFormData({...formData, sdaType: e.target.value})}
                    >
                      <option value="">Select SDA Type</option>
                      {sdaTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label htmlFor="rooms" className="block text-sm font-medium text-gray-700 mb-1">
                      Rooms *
                    </label>
                    <input
                      type="number"
                      id="rooms"
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.rooms}
                      onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms *
                    </label>
                    <input
                      type="number"
                      id="bathrooms"
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="kitchens" className="block text-sm font-medium text-gray-700 mb-1">
                      Kitchens
                    </label>
                    <input
                      type="number"
                      id="kitchens"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.kitchens}
                      onChange={(e) => setFormData({...formData, kitchens: e.target.value})}
                    />
                  </div>

                  <div>
                    <label htmlFor="parkingSpaces" className="block text-sm font-medium text-gray-700 mb-1">
                      Parking Spaces
                    </label>
                    <input
                      type="number"
                      id="parkingSpaces"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.parkingSpaces}
                      onChange={(e) => setFormData({...formData, parkingSpaces: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="sharedSpaces" className="block text-sm font-medium text-gray-700 mb-1">
                    Shared Spaces
                  </label>
                  <input
                    type="text"
                    id="sharedSpaces"
                    placeholder="e.g., Living Room, Dining Area, Study Room"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.sharedSpaces}
                    onChange={(e) => setFormData({...formData, sharedSpaces: e.target.value})}
                  />
                </div>
              </div>

              {/* Property Features */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Property Features</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={formData.frontYard}
                      onChange={(e) => setFormData({...formData, frontYard: e.target.checked})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Front Yard</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={formData.backyard}
                      onChange={(e) => setFormData({...formData, backyard: e.target.checked})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Backyard</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={formData.swimmingPool}
                      onChange={(e) => setFormData({...formData, swimmingPool: e.target.checked})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Swimming Pool</span>
                  </label>
                </div>
              </div>

              {/* Management */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="assignedManager" className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Manager
                    </label>
                    <select
                      id="assignedManager"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.assignedManager}
                      onChange={(e) => setFormData({...formData, assignedManager: e.target.value})}
                    >
                      <option value="">Select Manager</option>
                      <option value="Sarah Johnson">Sarah Johnson</option>
                      <option value="Michael Chen">Michael Chen</option>
                      <option value="Emma Davis">Emma Davis</option>
                      <option value="David Wilson">David Wilson</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the property, accessibility features, nearby amenities, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  to={`/sil/homes/${id}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Update Home
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeEdit;