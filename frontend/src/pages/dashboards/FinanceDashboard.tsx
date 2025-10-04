// frontend/src/pages/dashboards/FinanceDashboard.tsx
import React from 'react';
import { FileText, Calculator, BarChart3, AlertCircle } from 'lucide-react';

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

const FinanceDashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Finance & Accounting Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Pending Invoices" value="23" color="orange" />
        <StatCard icon={Calculator} label="Total Outstanding" value="$45,230" color="red" />
        <StatCard icon={BarChart3} label="Revenue This Month" value="$128,400" color="green" />
        <StatCard icon={AlertCircle} label="Overdue" value="5" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Invoices</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">INV-2024-0342</p>
                <p className="text-sm text-gray-600">Sarah Smith</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$2,450</p>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">INV-2024-0341</p>
                <p className="text-sm text-gray-600">John Doe</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$1,850</p>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Paid</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 border-b">
              <span className="text-gray-600">Total Invoiced (MTD)</span>
              <span className="font-semibold">$128,400</span>
            </div>
            <div className="flex justify-between p-3 border-b">
              <span className="text-gray-600">Payments Received</span>
              <span className="font-semibold text-green-600">$83,170</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-600">Outstanding</span>
              <span className="font-semibold text-orange-600">$45,230</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;