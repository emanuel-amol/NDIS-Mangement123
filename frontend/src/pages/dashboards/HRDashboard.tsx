// frontend/src/pages/dashboards/HRDashboard.tsx
import React from 'react';
import { Users, UserCheck, ClipboardList, AlertCircle } from 'lucide-react';

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

const HRDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">HR Management Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Employees" value="145" />
        <StatCard icon={UserCheck} label="Interviews This Week" value="8" color="green" />
        <StatCard icon={ClipboardList} label="Open Positions" value="5" color="orange" />
        <StatCard icon={AlertCircle} label="Pending Tickets" value="12" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recruitment Pipeline</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Applied</span>
              <span className="font-semibold">24</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Interview</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span>Offer</span>
              <span className="font-semibold">3</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Training</h3>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">NDIS Compliance Training</p>
              <p className="text-sm text-gray-600">Friday, 10:00 AM - 15 attendees</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">First Aid Certification</p>
              <p className="text-sm text-gray-600">Next Monday, 9:00 AM - 20 attendees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;