// frontend/src/components/admin/AdminLayout.tsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  CogIcon, 
  DatabaseIcon,
  ChartBarIcon,
  MenuIcon,
  XIcon,
  LogoutIcon
} from '@heroicons/react/24/outline';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Dynamic Data', href: '/admin/dynamic-data', icon: DatabaseIcon },
    { name: 'User Management', href: '/admin/users', icon: UsersIcon },
    { name: 'System Settings', href: '/admin/settings', icon: CogIcon },
    { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <MobileSidebar navigation={navigation} isActive={isActive} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              NDIS Management System - Admin
            </h1>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Administrator</span>
              <button className="text-gray-400 hover:text-gray-500">
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Sidebar component for desktop
const Sidebar: React.FC<{ navigation: any[]; isActive: (href: string) => boolean }> = ({ navigation, isActive }) => (
  <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
      </div>
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`${
              isActive(item.href)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
          >
            <item.icon
              className={`${
                isActive(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
              } mr-3 h-6 w-6 transition-colors duration-150`}
            />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
    
    <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
      <div className="text-xs text-gray-500">
        <div>NDIS Management System</div>
        <div>Version 1.0.0</div>
      </div>
    </div>
  </div>
);

// Mobile sidebar component
const MobileSidebar: React.FC<{ navigation: any[]; isActive: (href: string) => boolean }> = ({ navigation, isActive }) => (
  <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
      </div>
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`${
              isActive(item.href)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
          >
            <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  </div>
);

export default AdminLayout;