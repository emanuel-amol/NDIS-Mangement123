// frontend/src/pages/dashboards/WorkerDashboard.tsx
import React from 'react';
import { Calendar, HeartHandshake, FileText } from 'lucide-react';

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

const WorkerDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Support Worker Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Calendar} label="Today's Shifts" value="3" />
        <StatCard icon={HeartHandshake} label="Assigned Participants" value="12" color="green" />
        <StatCard icon={FileText} label="Pending Notes" value="2" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">My Shifts Today</h3>
          <div className="space-y-3">
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium">Sarah Smith</p>
                <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">Active</span>
              </div>
              <p className="text-sm text-gray-600">8:00 AM - 12:00 PM</p>
              <p className="text-sm text-gray-600">Personal Care & Daily Living</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium">John Doe</p>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Upcoming</span>
              </div>
              <p className="text-sm text-gray-600">2:00 PM - 5:00 PM</p>
              <p className="text-sm text-gray-600">Community Access</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit Case Note</button>
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50">View Training</button>
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50">Check Schedule</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;