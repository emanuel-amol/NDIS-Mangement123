// frontend/src/components/layouts/WorkerLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, FileText, Pill, FolderOpen, Calendar } from 'lucide-react';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

const WorkerLayout: React.FC<WorkerLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: 'My Participants',
      href: '/participants/assigned',
      icon: Users,
      subtext: 'Assigned list only'
    },
    {
      name: 'Case Notes',
      href: '/case-notes',
      icon: FileText,
      subtext: 'Add/view own assigned'
    },
    {
      name: 'Medications',
      href: '/medications',
      icon: Pill,
      subtext: 'Log administrations'
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FolderOpen,
      subtext: 'Read if manager-visible'
    },
    {
      name: 'Calendar / Shifts',
      href: '/scheduling/shifts',
      icon: Calendar,
      subtext: 'My assigned shifts'
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
            <div className="flex-1 flex">
              <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                <input
                  className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                  placeholder="Search my participants..."
                  type="search"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                  <span className="h-5 w-5 text-gray-400">🔍</span>
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500">
                <span className="text-xl">🔔</span>
              </button>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">Support Worker</div>
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
        <div className="flex items-center flex-shrink-0 px-4">
          <h2 className="text-lg font-semibold text-gray-900">Worker Portal</h2>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location.pathname === item.href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

        {/* Access notice */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
            <strong>Note:</strong> Access limited to assigned participants and permitted items.
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerLayout;