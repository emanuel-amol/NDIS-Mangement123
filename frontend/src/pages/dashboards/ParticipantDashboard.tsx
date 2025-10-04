// frontend/src/pages/dashboards/ParticipantDashboard.tsx
import React from 'react';
import { Calendar, Users, FileText } from 'lucide-react';

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

const ParticipantDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Calendar} label="Next Appointment" value="Today 2PM" color="blue" />
        <StatCard icon={Users} label="Support Workers" value="3" color="green" />
        <StatCard icon={FileText} label="Active Goals" value="5" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Personal Care Session</p>
              <p className="text-sm text-gray-600">Today, 2:00 PM with John Worker</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Community Access</p>
              <p className="text-sm text-gray-600">Tomorrow, 10:00 AM with Jane Smith</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">My Profile</h3>
          <div className="space-y-2">
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left">View My Plans & Goals</button>
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left">My Documents</button>
            <button className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit Feedback</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;