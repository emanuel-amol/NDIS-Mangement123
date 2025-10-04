// frontend/src/pages/dashboards/ManagerDashboard.tsx
import React from 'react';
import { HeartHandshake, Calendar, FileText, AlertCircle } from 'lucide-react';

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

const ManagerDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Service Manager Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={HeartHandshake} label="My Participants" value="42" />
        <StatCard icon={Calendar} label="Appointments Today" value="8" color="green" />
        <StatCard icon={FileText} label="Pending Case Notes" value="5" color="orange" />
        <StatCard icon={AlertCircle} label="Incidents" value="2" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Sarah Smith - Personal Care</p>
                <p className="text-sm text-gray-600">9:00 AM - 10:30 AM</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Confirmed</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">John Doe - Community Access</p>
                <p className="text-sm text-gray-600">2:00 PM - 4:00 PM</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Scheduled</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Case Note</button>
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50">Schedule Appointment</button>
            <button className="w-full p-3 border rounded-lg hover:bg-gray-50">View Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;