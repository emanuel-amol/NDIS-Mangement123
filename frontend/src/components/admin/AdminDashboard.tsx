// frontend/src/components/admin/AdminDashboard.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UsersIcon, 
  UserGroupIcon, 
  DocumentDuplicateIcon, 
  CircleStackIcon as DatabaseIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../services/api';

interface SystemStatus {
  system_health: string;
  database_status: string;
  users: {
    total: number;
    active: number;
    admins: number;
  };
  participants: {
    total: number;
    active: number;
  };
  referrals: {
    total: number;
    pending: number;
  };
  dynamic_data: {
    total: number;
    active: number;
    types: string[];
  };
  version: string;
  uptime: string;
}

const AdminDashboard: React.FC = () => {
  const { data: systemStatus, isLoading, error } = useQuery<SystemStatus>({
    queryKey: ['admin', 'system-status'],
    queryFn: adminAPI.getSystemStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-32">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading system status
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Users',
      value: systemStatus?.users.total || 0,
      subtext: `${systemStatus?.users.active || 0} active`,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Participants',
      value: systemStatus?.participants.total || 0,
      subtext: `${systemStatus?.participants.active || 0} active`,
      icon: UserGroupIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Referrals',
      value: systemStatus?.referrals.total || 0,
      subtext: `${systemStatus?.referrals.pending || 0} pending`,
      icon: DocumentDuplicateIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Data Types',
      value: systemStatus?.dynamic_data.types.length || 0,
      subtext: `${systemStatus?.dynamic_data.active || 0} active entries`,
      icon: DatabaseIcon,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your NDIS Management System
        </p>
      </div>

      {/* System Health Status */}
      <div className="mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">System Health</h2>
              <p className="text-sm text-gray-600">Current system status and version</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {systemStatus?.system_health === 'healthy' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                )}
                <span className={`text-sm font-medium ${
                  systemStatus?.system_health === 'healthy' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {systemStatus?.system_health === 'healthy' ? 'Healthy' : 'Issues Detected'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Version {systemStatus?.version}
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Database</div>
              <div className={`text-lg font-semibold ${
                systemStatus?.database_status === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemStatus?.database_status === 'connected' ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Admin Users</div>
              <div className="text-lg font-semibold text-gray-900">
                {systemStatus?.users.admins || 0}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Uptime</div>
              <div className="text-lg font-semibold text-gray-900">
                {systemStatus?.uptime || 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {stat.subtext}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Data Types Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Dynamic Data Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {systemStatus?.dynamic_data.types.map((type) => (
            <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-sm font-medium text-gray-700 capitalize">
                {type.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
        {(!systemStatus?.dynamic_data.types || systemStatus.dynamic_data.types.length === 0) && (
          <div className="text-center py-4 text-gray-500">
            No dynamic data types found. Consider adding some data types to get started.
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <UsersIcon className="h-4 w-4 mr-2" />
            Add New User
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Manage Data Types
          </button>
          <button className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
            <CogIcon className="h-4 w-4 mr-2" />
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;