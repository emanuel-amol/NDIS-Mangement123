// frontend/src/pages/dashboards/AdminDashboard.tsx
import React from 'react';
import { Users, Building2, AlertCircle, BarChart3, FileText, Settings } from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color = "blue" }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`w-6 h-6 text-${color}-600`} />
      </div>
    </div>
  </div>
);

interface AlertItemProps {
  title: string;
  message: string;
  time: string;
  type?: 'info' | 'urgent';
}

const AlertItem: React.FC<AlertItemProps> = ({ title, message, time, type = "info" }) => (
  <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
    <AlertCircle className={`w-5 h-5 mt-0.5 ${type === 'urgent' ? 'text-red-500' : 'text-blue-500'}`} />
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-600">{message}</p>
      <p className="text-xs text-gray-400 mt-1">{time}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Platform Administrator Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value="1,247" />
        <StatCard icon={Building2} label="Service Providers" value="89" color="green" />
        <StatCard icon={AlertCircle} label="System Alerts" value="12" color="red" />
        <StatCard icon={BarChart3} label="Active Sessions" value="342" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Module Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <Users className="w-5 h-5 text-blue-600 mb-2" />
              <p className="font-medium">Users & Roles</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <FileText className="w-5 h-5 text-green-600 mb-2" />
              <p className="font-medium">CMS</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <Settings className="w-5 h-5 text-purple-600 mb-2" />
              <p className="font-medium">Pricing Plans</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <BarChart3 className="w-5 h-5 text-orange-600 mb-2" />
              <p className="font-medium">Admin Reporting</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            <AlertItem title="High CPU Usage" message="Server load at 85%" time="5 min ago" type="urgent" />
            <AlertItem title="New Provider" message="Registration pending approval" time="1 hour ago" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;