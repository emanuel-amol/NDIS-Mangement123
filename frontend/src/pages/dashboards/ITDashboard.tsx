// frontend/src/pages/dashboards/ITDashboard.tsx
import React from 'react';
import { AlertCircle, Settings, Users, BarChart3 } from 'lucide-react';

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

const ITDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">IT Support Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={AlertCircle} label="System Alerts" value="8" color="red" />
        <StatCard icon={Settings} label="Active Integrations" value="5" color="green" />
        <StatCard icon={Users} label="Active Users" value="342" color="blue" />
        <StatCard icon={BarChart3} label="System Health" value="98%" color="green" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>Xero Integration</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>Salesforce Sync</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span>Email Service</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Warning</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITDashboard;