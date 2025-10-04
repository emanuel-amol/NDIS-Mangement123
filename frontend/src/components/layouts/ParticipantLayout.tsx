// frontend/src/components/layouts/ParticipantLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, UserPlus, Calendar, FolderOpen, Target, MessageSquare } from 'lucide-react';

interface ParticipantLayoutProps {
  children: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: 'My Profile',
      href: '/profile',
      icon: User,
    },
    {
      name: 'Referrals',
      href: '/referrals/submit',
      icon: UserPlus,
      subtext: 'Submit/Status'
    },
    {
      name: 'Appointments / Calendar',
      href: '/calendar',
      icon: Calendar,
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FolderOpen,
      subtext: 'View allowed'
    },
    {
      name: 'Plans & Goals',
      href: '/plans-goals',
      icon: Target,
      subtext: 'Read only'
    },
    {
      name: 'Feedback/Complaints',
      href: '/feedback',
      icon: MessageSquare,
    },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="text-white text-xl">&times;</span>
              </button>
            </div>
            <SidebarContent navigation={navigation} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
          >
            <span className="text-xl">☰</span>
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">My Portal</h1>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500">
                <span className="text-xl">🔔</span>
              </button>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">Participant</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

const SidebarContent: React.FC<{ navigation: any[] }> = ({ navigation }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-gray-900">My Portal</h2>
            <p className="text-sm text-gray-500">Welcome back!</p>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-3 text-sm font-medium rounded-md ${
                location.pathname === item.href
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <div>{item.name}</div>
                {item.subtext && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.subtext}</div>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Help section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-xs text-gray-600 mb-3">
              Contact your support coordinator for assistance
            </p>
            <button className="w-full bg-blue-600 text-white text-sm py-2 px-4 rounded-md hover:bg-blue-700">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantLayout;