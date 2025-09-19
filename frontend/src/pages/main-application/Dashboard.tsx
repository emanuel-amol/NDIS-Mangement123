// frontend/src/pages/main-application/Dashboard.tsx - UPDATED to work with Layout
import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to your NDIS Management dashboard</p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">👥</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Participants
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    3
                  </dd>
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
                  <span className="text-white text-sm font-medium">🏠</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    SIL Homes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    7
                  </dd>
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
                  <span className="text-white text-sm font-medium">📋</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Referrals
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    2
                  </dd>
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
                  <span className="text-white text-sm font-medium">📄</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Documents
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    35
                  </dd>
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
            to="/participants/new" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">👤</span>
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Add Participant</h3>
            </div>
            <p className="text-sm text-gray-600">Register a new participant in the system</p>
          </Link>
          
          <Link 
            to="/sil/homes/new" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">🏠</span>
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Add SIL Home</h3>
            </div>
            <p className="text-sm text-gray-600">Register a new SIL property</p>
          </Link>
          
          <Link 
            to="/invoicing/generate" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold">💰</span>
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Generate Invoice</h3>
            </div>
            <p className="text-sm text-gray-600">Create invoices for services</p>
          </Link>
          
          <Link 
            to="/referral" 
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-semibold">📝</span>
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Submit Referral</h3>
            </div>
            <p className="text-sm text-gray-600">Add new participant referrals</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New participant added</p>
                  <p className="text-sm text-gray-500">Jane Smith was added to the system</p>
                  <p className="text-xs text-gray-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">SIL Home updated</p>
                  <p className="text-sm text-gray-500">Sunshine Villa room availability changed</p>
                  <p className="text-xs text-gray-400">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Invoice generated</p>
                  <p className="text-sm text-gray-500">Monthly invoice for John Doe</p>
                  <p className="text-xs text-gray-400">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-600 mr-3">⚠️</div>
                  <div>
                    <h4 className="font-medium text-red-800">Expired Documents</h4>
                    <p className="text-sm text-red-600">3 documents need renewal</p>
                  </div>
                </div>
                <Link 
                  to="/documents" 
                  className="mt-3 inline-block text-sm text-red-700 hover:text-red-900 underline"
                >
                  Review documents →
                </Link>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-yellow-600 mr-3">🔧</div>
                  <div>
                    <h4 className="font-medium text-yellow-800">Maintenance Due</h4>
                    <p className="text-sm text-yellow-600">2 homes need maintenance</p>
                  </div>
                </div>
                <Link 
                  to="/sil/maintenance" 
                  className="mt-3 inline-block text-sm text-yellow-700 hover:text-yellow-900 underline"
                >
                  View maintenance →
                </Link>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-blue-600 mr-3">📋</div>
                  <div>
                    <h4 className="font-medium text-blue-800">Pending Referrals</h4>
                    <p className="text-sm text-blue-600">2 referrals awaiting review</p>
                  </div>
                </div>
                <Link 
                  to="/referrals" 
                  className="mt-3 inline-block text-sm text-blue-700 hover:text-blue-900 underline"
                >
                  Review referrals →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;