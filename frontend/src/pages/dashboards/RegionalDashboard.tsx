// frontend/src/pages/dashboards/RegionalDashboard.tsx
import React from 'react';
import { Home, HeartHandshake, Users, AlertCircle } from 'lucide-react';

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

const RegionalDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Regional Manager Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Home} label="SIL Homes" value="15" />
        <StatCard icon={HeartHandshake} label="Participants" value="87" color="green" />
        <StatCard icon={Users} label="Staff in Region" value="45" color="blue" />
        <StatCard icon={AlertCircle} label="Open Issues" value="3" color="red" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Regional Coverage Map</h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Map visualization would appear here</p>
        </div>
      </div>
    </div>
  );
};

export default RegionalDashboard;