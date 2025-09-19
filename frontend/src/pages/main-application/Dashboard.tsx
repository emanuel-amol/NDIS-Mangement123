// frontend/src/pages/main-application/Dashboard.tsx - UPDATED with Documents Link
import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your NDIS Management dashboard</p>
          
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">P</span>
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
                      <span className="text-white text-sm font-medium">D</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Documents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        35
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
                      <span className="text-white text-sm font-medium">R</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending Referrals
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        0
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link 
                to="/participants" 
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">👥</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Manage Participants</h3>
                </div>
                <p className="text-sm text-gray-600">View and manage all participants in the system, update profiles, and track care plans</p>
              </Link>
              
              <Link 
                to="/documents" 
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">📄</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Document Management</h3>
                </div>
                <p className="text-sm text-gray-600">Upload, organize, and manage participant documents with automatic expiry tracking</p>
              </Link>
              
              <Link 
                to="/referrals" 
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">📋</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Review Referrals</h3>
                </div>
                <p className="text-sm text-gray-600">Review submitted referrals and convert them to participants</p>
              </Link>
              
              <Link 
                to="/referral" 
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📝</span>
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Submit Referral</h3>
                </div>
                <p className="text-sm text-gray-600">Add new participant referrals to the system for review and processing</p>
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Modules</h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/participants" className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-medium text-gray-900">Participants</div>
                  <div className="text-sm text-gray-500">CRM & Lifecycle</div>
                </Link>
                
                <Link to="/documents" className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-medium text-gray-900">Documents</div>
                  <div className="text-sm text-gray-500">Upload & Manage</div>
                </Link>
                
                <Link to="/referrals" className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium text-gray-900">Referrals</div>
                  <div className="text-sm text-gray-500">Review & Convert</div>
                </Link>
                
                <div className="text-center p-4 rounded-lg opacity-50">
                  <div className="text-2xl mb-2">👷</div>
                  <div className="font-medium text-gray-900">HR Management</div>
                  <div className="text-sm text-gray-500">Staff & Workers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Alerts Section */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Document Alerts</h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-3">⚠️</div>
                    <div>
                      <h3 className="font-medium text-red-800">Expired Documents</h3>
                      <p className="text-sm text-red-600">3 documents need renewal</p>
                    </div>
                  </div>
                  <Link 
                    to="/documents" 
                    className="mt-3 inline-block text-sm text-red-700 hover:text-red-900 underline"
                  >
                    Review expired documents →
                  </Link>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-yellow-600 mr-3">⏰</div>
                    <div>
                      <h3 className="font-medium text-yellow-800">Expiring Soon</h3>
                      <p className="text-sm text-yellow-600">3 documents expire in 30 days</p>
                    </div>
                  </div>
                  <Link 
                    to="/documents" 
                    className="mt-3 inline-block text-sm text-yellow-700 hover:text-yellow-900 underline"
                  >
                    Review expiring documents →
                  </Link>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-green-600 mr-3">✅</div>
                    <div>
                      <h3 className="font-medium text-green-800">Recent Uploads</h3>
                      <p className="text-sm text-green-600">5 documents uploaded this week</p>
                    </div>
                  </div>
                  <Link 
                    to="/documents" 
                    className="mt-3 inline-block text-sm text-green-700 hover:text-green-900 underline"
                  >
                    View recent uploads →
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

export default Dashboard;