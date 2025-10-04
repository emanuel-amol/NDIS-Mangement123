// frontend/src/components/Layout.tsx
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard,
  Bell,
  Users,
  UserCog,
  ClipboardList,
  FileText,
  Home,
  Calendar,
  DollarSign,
  BarChart3,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['participants']);
  const location = useLocation();

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigation = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Alerts',
      href: '/alerts',
      icon: Bell,
      current: location.pathname === '/alerts',
      badge: '3'
    },
    {
      name: 'Participants',
      icon: Users,
      current: location.pathname.startsWith('/participants'),
      expandable: true,
      section: 'participants',
      subItems: [
        { name: 'All Participants', href: '/participants' },
        { name: 'Add New', href: '/participants/new' },
        { name: 'Prospective', href: '/prospective' }
      ]
    },
    {
      name: 'HRM',
      icon: UserCog,
      current: location.pathname.startsWith('/hr'),
      expandable: true,
      section: 'hrm',
      subItems: [
        { name: 'Staff Directory', href: '/hr/staff' },
        { name: 'Recruitment', href: '/hr/recruitment' },
        { name: 'Training', href: '/hr/training' }
      ]
    },
    {
      name: 'Rostering',
      icon: Calendar,
      current: location.pathname.startsWith('/scheduling'),
      expandable: true,
      section: 'rostering',
      subItems: [
        { name: 'Calendar View', href: '/scheduling/calendar' },
        { name: 'Roster Management', href: '/scheduling/roster' },
        { name: 'New Appointment', href: '/scheduling/appointment/new' }
      ]
    },
    {
      name: 'Forms Managements',
      icon: ClipboardList,
      current: location.pathname.startsWith('/forms'),
      expandable: true,
      section: 'forms',
      subItems: [
        { name: 'HRM Forms', href: '/forms/hrm' },
        { name: 'ORM Forms', href: '/forms/orm' },
        { name: 'SIL Forms', href: '/forms/sil' }
      ]
    },
    {
      name: 'Vehicle Management',
      href: '/vehicles',
      icon: Home,
      current: location.pathname === '/vehicles'
    },
    {
      name: 'Home Management',
      icon: Home,
      current: location.pathname.startsWith('/sil'),
      expandable: true,
      section: 'home',
      subItems: [
        { name: 'Dashboard', href: '/sil' },
        { name: 'All Homes', href: '/sil/homes' },
        { name: 'Add New Home', href: '/sil/homes/new' },
        { name: 'Maintenance', href: '/sil/maintenance' }
      ]
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: UserCog,
      current: location.pathname.startsWith('/admin/users')
    },
    {
      name: 'Incidents',
      href: '/incidents',
      icon: Bell,
      current: location.pathname === '/incidents'
    },
    {
      name: 'Invoicing',
      icon: DollarSign,
      current: location.pathname.startsWith('/invoicing'),
      expandable: true,
      section: 'invoicing',
      subItems: [
        { name: 'Dashboard', href: '/invoicing' },
        { name: 'Generate Invoice', href: '/invoicing/generate' },
        { name: 'Payment Tracking', href: '/invoicing/payments' },
        { name: 'Xero Sync', href: '/invoicing/xero-sync' }
      ]
    },
    {
      name: 'Reporting',
      href: '/reports',
      icon: BarChart3,
      current: location.pathname === '/reports'
    },
    {
      name: 'Complaints',
      href: '/complaints',
      icon: MessageSquare,
      current: location.pathname === '/complaints'
    },
    {
      name: 'Feedback',
      href: '/feedback',
      icon: MessageSquare,
      current: location.pathname === '/feedback'
    }
  ];

  const bottomNavigation = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings'
    },
    {
      name: 'Help',
      href: '/help',
      icon: HelpCircle,
      current: location.pathname === '/help'
    }
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#1e293b]">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="text-white" size={24} />
              </button>
            </div>
            <SidebarContent 
              navigation={navigation} 
              bottomNavigation={bottomNavigation}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent 
            navigation={navigation} 
            bottomNavigation={bottomNavigation}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 px-6 flex justify-between items-center">
            {/* Search bar */}
            <div className="flex-1 flex max-w-2xl">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>

              {/* Messages */}
              <button className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg transition-colors">
                <MessageSquare size={20} />
              </button>

              {/* User menu */}
              <div className="relative flex items-center ml-3">
                <button className="flex items-center space-x-3 focus:outline-none group">
                  <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center ring-2 ring-transparent group-hover:ring-purple-200 transition-all">
                    <span className="text-white font-medium text-sm">AJ</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700">Admin John</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <ChevronDown className="text-gray-400" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

// Sidebar content component
const SidebarContent: React.FC<{ 
  navigation: any[]; 
  bottomNavigation: any[];
  expandedSections: string[];
  toggleSection: (section: string) => void;
}> = ({ navigation, bottomNavigation, expandedSections, toggleSection }) => {
  return (
    <div className="flex flex-col h-full bg-[#1e293b] border-r border-slate-700">
      {/* Logo/Brand */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-[#0f172a] border-b border-slate-700">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-white font-semibold text-base">admin01devel</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#475569 #1e293b'
      }}>
        <style>{`
          nav::-webkit-scrollbar {
            width: 8px;
          }
          nav::-webkit-scrollbar-track {
            background: #1e293b;
          }
          nav::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isExpanded = item.expandable && expandedSections.includes(item.section || '');
          
          return (
            <div key={item.name}>
              {item.expandable ? (
                <div>
                  <button
                    onClick={() => toggleSection(item.section || '')}
                    className={`w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                      item.current
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 flex-shrink-0 h-4 w-4" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-9 mt-1 space-y-0.5">
                      {item.subItems?.map((subItem: any) => (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className="group flex items-center px-3 py-2 text-sm font-normal text-slate-400 rounded-md hover:text-white hover:bg-slate-800/50 transition-all"
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
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                    item.current
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 flex-shrink-0 h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="flex-shrink-0 border-t border-slate-700 p-3 space-y-0.5">
        {bottomNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all ${
                item.current
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon className="mr-3 flex-shrink-0 h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Layout;