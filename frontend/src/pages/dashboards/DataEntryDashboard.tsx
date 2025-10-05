// frontend/src/pages/dashboards/DataEntryDashboard.tsx
import React from 'react';
import { FileText, ClipboardList, UserCheck } from 'lucide-react';

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

const DataEntryDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Entry Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Pending Documents" value="34" color="orange" />
        <StatCard icon={ClipboardList} label="Case Notes Due" value="12" color="red" />
        <StatCard icon={UserCheck} label="Completed Today" value="28" color="green" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Work Queue</h3>
        <div className="space-y-3">
          <div className="p-3 border rounded-lg">
            <p className="font-medium">Upload participant documents - Sarah Smith</p>
            <p className="text-sm text-gray-600">Priority: High • Due: Today</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-medium">Enter case notes - John Doe</p>
            <p className="text-sm text-gray-600">Priority: Medium • Due: Tomorrow</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-medium">Update SIL documentation - Home A</p>
            <p className="text-sm text-gray-600">Priority: Low • Due: This week</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataEntryDashboard;