import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Users, 
  Search,
  Bell,
  MessageSquare,
  LogOut
} from 'lucide-react';
import NavigationBar from './navigation/NavigationBar';

interface DashboardStats {
  active_staff: number;
  active_participants: number;
  complaints: number;
  incidents: number;
}

interface UserData {
  id: number;
  username: string;
  email: string;
}

interface CandidateData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon }) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <span className={`text-sm font-medium ${getChangeColor()}`}>
          {change}
        </span>
      </div>
    </div>
  );
};

interface TableProps {
  title: string;
  headers: string[];
  data: string[][];
}

const DataTable: React.FC<TableProps> = ({ title, headers, data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface AlertItemProps {
  message: string;
  initial: string;
}

const AlertItem: React.FC<AlertItemProps> = ({ message, initial }) => {
  return (
    <div className="flex items-center space-x-3 py-2">
      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
        {initial}
      </div>
      <span className="text-sm text-gray-700">{message}</span>
    </div>
  );
};

interface FeedSectionProps {
  title: string;
  children: React.ReactNode;
}

const FeedSection: React.FC<FeedSectionProps> = ({ title, children }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    active_staff: 0,
    active_participants: 0,
    complaints: 0,
    incidents: 0
  });
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/v1/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
        setCandidateData(data.candidate);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: redirect anyway
      window.location.href = '/login';
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/v1/dashboard/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: 'Active Staffs',
      value: loading ? '...' : stats.active_staff.toString(),
      change: '+0%',
      changeType: 'neutral' as const,
      icon: <Users size={24} className="text-gray-600" />
    },
    {
      title: 'Active Participants',
      value: loading ? '...' : stats.active_participants.toString(),
      change: '-0%',
      changeType: 'neutral' as const,
      icon: <Users size={24} className="text-gray-600" />
    },
    {
      title: 'Complaints',
      value: loading ? '...' : stats.complaints.toString(),
      change: '+0%',
      changeType: 'neutral' as const,
      icon: <MessageSquare size={24} className="text-gray-600" />
    },
    {
      title: 'Incidents',
      value: loading ? '...' : stats.incidents.toString(),
      change: '+0%',
      changeType: 'positive' as const,
      icon: <AlertTriangle size={24} className="text-gray-600" />
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Use the NavigationBar component */}
      <NavigationBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              {/* Test link for profile pages */}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell size={20} />
              </button>
              
              {/* Profile and Logout */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Print Support Plan</span>
                <span className="text-sm text-gray-700">+ Case Notes</span>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {candidateData?.first_name?.charAt(0) || userData?.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {candidateData ? `${candidateData.first_name} ${candidateData.last_name}` : userData?.username || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsData.map((stat, index) => (
                <StatCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  change={stat.change}
                  changeType={stat.changeType}
                  icon={stat.icon}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column - Tables */}
              <div className="lg:col-span-3 space-y-6">
                {/* Compliance Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">HRMS COMPLIANCE</h3>
                    <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                      <span className="text-gray-500">No data available</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PARTICIPANTS COMPLIANCE</h3>
                    <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                      <span className="text-gray-500">No data available</span>
                    </div>
                  </div>
                </div>

                {/* Data Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DataTable
                    title="SCHEDULE SHIFT"
                    headers={['Worker Name', 'Participants Name', 'Start Time']}
                    data={[]}
                  />
                  
                  <DataTable
                    title="EXPIRING DOCS"
                    headers={['Worker Name', 'Participants Name', 'Start Time']}
                    data={[]}
                  />
                </div>
              </div>

              {/* Right Column - Alerts and Events */}
              <div className="space-y-6">
                {/* Alerts */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ALERTS</h3>
                  <div className="space-y-3">
                    <AlertItem message="Alert Message" initial="P" />
                    <AlertItem message="Alert Message" initial="P" />
                    <AlertItem message="Alert Message" initial="P" />
                  </div>
                </div>

                {/* Feeds and Events */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Feeds And Events</h3>
                  
                  <FeedSection title="BIRTHDAYS EVENTS">
                    <p className="text-sm text-gray-500">No upcoming birthdays</p>
                  </FeedSection>

                  <FeedSection title="WORK ANNIVERSARY">
                    <p className="text-sm text-gray-500">No work anniversaries</p>
                  </FeedSection>

                  <FeedSection title="PERFORMANCE REVIEWS">
                    <p className="text-sm text-gray-500">No pending reviews</p>
                  </FeedSection>

                  <FeedSection title="UPCOMING APPOINTMENTS">
                    <p className="text-sm text-gray-500">No upcoming appointments</p>
                  </FeedSection>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;