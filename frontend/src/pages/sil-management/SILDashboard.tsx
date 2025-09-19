// frontend/src/pages/sil-management/SILDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const SILDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIL Management</h1>
              <p className="mt-2 text-gray-600">Manage Supported Independent Living homes and properties</p>
            </div>
            <Link
              to="/sil/homes/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add New Home
            </Link>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Homes</dt>
                      <dd className="text-lg font-medium text-gray-900">7</dd>
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
                      <span className="text-white text-sm font-medium">🛏️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Available Rooms</dt>
                      <dd className="text-lg font-medium text-gray-900">12</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Current Residents</dt>
                      <dd className="text-lg font-medium text-gray-900">18</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🔧</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Maintenance</dt>
                      <dd className="text-lg font-medium text-gray-900">3</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                to="/sil/homes"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">🏠</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">View All Homes</h3>
                </div>
                <p className="text-sm text-gray-600">Browse and manage all SIL properties</p>
              </Link>

              <Link
                to="/sil/homes/new"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">➕</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Add New Home</h3>
                </div>
                <p className="text-sm text-gray-600">Register a new SIL property</p>
              </Link>

              <Link
                to="/sil/maintenance"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">🔧</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Maintenance</h3>
                </div>
                <p className="text-sm text-gray-600">Track maintenance requests and history</p>
              </Link>

              <Link
                to="/sil/reports"
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📊</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Reports</h3>
                </div>
                <p className="text-sm text-gray-600">Generate property and occupancy reports</p>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Homes */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Homes</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Sunshine Villa</p>
                      <p className="text-sm text-gray-500">123 Main St, Melbourne VIC 3000</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Garden House</p>
                      <p className="text-sm text-gray-500">456 Oak Ave, Sydney NSW 2000</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Partial
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Coastal Retreat</p>
                      <p className="text-sm text-gray-500">789 Beach Rd, Perth WA 6000</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Full
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    to="/sil/homes"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all homes →
                  </Link>
                </div>
              </div>
            </div>

            {/* Maintenance Alerts */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Maintenance Alerts</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Plumbing Issue</p>
                      <p className="text-sm text-gray-500">Sunshine Villa - Kitchen sink leak</p>
                      <p className="text-xs text-gray-400">Due: Today</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">HVAC Service</p>
                      <p className="text-sm text-gray-500">Garden House - Quarterly maintenance</p>
                      <p className="text-xs text-gray-400">Due: This week</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Garden Maintenance</p>
                      <p className="text-sm text-gray-500">Coastal Retreat - Lawn care</p>
                      <p className="text-xs text-gray-400">Due: Next week</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    to="/sil/maintenance"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all maintenance →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SILDashboard;