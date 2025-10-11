// frontend/src/components/Layout.tsx
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { auth } from '../services/auth';
import { routeForRole } from '../utils/roleRoutes';
import { hasRole } from '../utils/roleFlags';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentRole = (auth.role() || '').toUpperCase();
  const dashboardHref = routeForRole(currentRole);

  // Mock user data - replace with actual user context
  const user = {
    name: 'John Smith',
    role: 'Service Provider',
    organization: 'Code24'
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: dashboardHref,
      icon: '[D]',
      current: location.pathname.startsWith('/dashboard'),
      disabled: dashboardHref === '/unauthorized'
    },
    {
      name: 'Participants',
      href: '/participants',
      icon: '[P]',
      current: location.pathname.startsWith('/participants'),
      subItems: [
        { name: 'All Participants', href: '/participants' },
        { name: 'Add New', href: '/participants/new' },
        { name: 'Prospective', href: '/prospective' }
      ]
    },
    {
      name: 'SIL Management',
      href: '/sil',
      icon: '[SIL]',
      current: location.pathname.startsWith('/sil'),
      subItems: [
        { name: 'Dashboard', href: '/sil' },
        { name: 'All Homes', href: '/sil/homes' },
        { name: 'Add New Home', href: '/sil/homes/new' },
        { name: 'Maintenance', href: '/sil/maintenance' }
      ]
    },
    {
      name: 'HR Management',
      href: '/hr',
      icon: '[HR]',
      current: location.pathname.startsWith('/hr'),
      disabled: !hasRole('HR', 'SERVICE_MANAGER'),
      visible: hasRole('HR', 'SERVICE_MANAGER'),
      subItems: [
        { name: 'Staff Directory', href: '/hr/staff' },
        { name: 'Recruitment', href: '/hr/recruitment' },
        { name: 'Training', href: '/hr/training' }
      ]
    },
    {
      name: 'Scheduling',
      href: '/scheduling',
      icon: '[SCH]',
      current: location.pathname.startsWith('/scheduling'),
      visible: hasRole('HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER'),
      subItems: [
        { name: 'Calendar View', href: '/scheduling/calendar' },
        { name: 'Roster Management', href: '/scheduling/roster' },
        { name: 'New Appointment', href: '/scheduling/appointment/new' }
      ]
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: '[DOC]',
      current: location.pathname.startsWith('/documents')
    },
    {
      name: 'Invoicing',
      href: '/invoicing',
      icon: '[FIN]',
      current: location.pathname.startsWith('/invoicing'),
      visible: hasRole('FINANCE', 'SERVICE_MANAGER'),
      subItems: [
        { name: 'Dashboard', href: '/invoicing' },
        { name: 'Generate Invoice', href: '/invoicing/generate' },
        { name: 'Payment Tracking', href: '/invoicing/payments' },
        { name: 'Xero Sync', href: '/invoicing/xero-sync' }
      ]
    },
    {
      name: 'Referrals',
      href: '/referrals',
      icon: '[REF]',
      current: location.pathname.startsWith('/referrals')
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: '[RPT]',
      current: location.pathname.startsWith('/reports'),
      disabled: !hasRole('PROVIDER_ADMIN', 'SERVICE_MANAGER'),
      visible: hasRole('PROVIDER_ADMIN', 'SERVICE_MANAGER')
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: '[CFG]',
      current: location.pathname.startsWith('/settings'),
      disabled: !hasRole('PROVIDER_ADMIN'),
      visible: hasRole('PROVIDER_ADMIN')
    }
  ].filter((item) => item.visible !== false);

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
            {/* Mobile sidebar content */}
            <SidebarContent navigation={navigation} dashboardHref={dashboardHref} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} dashboardHref={dashboardHref} />
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
              {/* Search bar */}
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <input
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                    placeholder="Search participants, homes, documents..."
                    type="search"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <span className="h-5 w-5 text-gray-400">🔍</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* Notifications */}
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span className="text-xl">🔔</span>
              </button>

              {/* User menu */}
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

// Sidebar content component
const SidebarContent: React.FC<{ navigation: any[]; dashboardHref: string }> = ({ navigation, dashboardHref }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
      {/* Logo/Brand */}
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Link to={dashboardHref} className="text-lg font-semibold text-gray-900">
            NDIS Management
          </Link>
        </div>
        
        {/* Organization info */}
        <div className="mt-4 px-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Organization
          </div>
          <div className="mt-1 text-sm text-gray-900">Code24</div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-left ${
                      item.current
                        ? 'bg-gray-100 text-gray-900'
                        : item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    disabled={item.disabled}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                    <span className="ml-auto">
                      {expandedItems.includes(item.name) ? '▼' : '▶'}
                    </span>
                  </button>
                  {expandedItems.includes(item.name) && (
                    <div className="ml-8 space-y-1">
                      {item.subItems.map((subItem: any) => (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? 'bg-gray-100 text-gray-900'
                      : item.disabled
                      ? 'text-gray-400 cursor-not-allowed pointer-events-none'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* User profile section */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                John Smith
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                Service Provider
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;

