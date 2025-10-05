// frontend/src/pages/dashboards/ProviderDashboard.tsx
import React from 'react';
import { Users, HeartHandshake, Calendar, Home, Car, Briefcase, AlertCircle } from 'lucide-react';

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

const ProviderDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Service Provider Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Staff" value="145" />
        <StatCard icon={HeartHandshake} label="Total Participants" value="287" color="green" />
        <StatCard icon={Calendar} label="Active Shifts" value="52" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Module Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <HeartHandshake className="w-5 h-5 text-blue-600 mb-2" />
              <p className="font-medium">Participants (CRM)</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <Briefcase className="w-5 h-5 text-green-600 mb-2" />
              <p className="font-medium">HRM</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <Home className="w-5 h-5 text-purple-600 mb-2" />
              <p className="font-medium">SIL Management</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <Car className="w-5 h-5 text-orange-600 mb-2" />
              <p className="font-medium">Vehicle Management</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Subscription & Alerts</h3>
          <div className="space-y-3">
            <AlertItem title="Subscription Expiring" message="Plan expires in 15 days" time="Today" type="urgent" />
            <AlertItem title="Usage Limit Warning" message="85% of participant limit reached" time="2 hours ago" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;