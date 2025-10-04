// frontend/src/components/layouts/ManagerLayout.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, FileText, UserPlus, ClipboardCheck, Shield, 
  FolderOpen, FileText as FileIcon, DollarSign, Target, 
  Heart, Pill, Syringe, UserCheck, BarChart3, Calendar 
} from 'lucide-react';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: 'Participants',
      icon: Users,
      items: [
        { name: 'List & Filters', href: '/participants', icon: Users },
        { name: 'Profile', href: '/participants/profile', icon: UserCheck },
      ]
    },
    {
      name: 'Referrals',
      icon: UserPlus,
      items: [
        { name: 'Inbox', href: '/referrals', icon: FileText },
        { name: 'Review/Validate', href: '/referrals/review', icon: ClipboardCheck },
        { name: 'Prospects', href: '/prospective', icon: UserPlus },
      ]
    },
    {
      name: 'Care Setup',
      icon: Shield,
      items: [
        { name: 'Care Plan', href: '/care/plan', icon: FileIcon },
        { name: 'Risk Assessment', href: '/care/risk-assessment', icon: Shield },
      ]
    },
    {
      name: 'Dynamic Service Documents',
      href: '/documents/services',
      icon: FolderOpen,
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FileIcon,
    },
    {
      name: 'Case Notes',
      href: '/case-notes',
      icon: FileText,
    },
    {
      name: 'Funding',
      href: '/funding',
      icon: DollarSign,
    },
    {
      name: 'Goals',
      href: '/goals',
      icon: Target,
    },
    {
      name: 'Preferences',
      href: '/preferences',
      icon: Heart,
      subtext: 'Likes/Dislikes/Disabilities'
    },
    {
      name: 'Medications',
      href: '/medications',
      icon: Pill,
    },
    {
      name: 'Vaccinations',
      href: '/vaccinations',
      icon: Syringe,
    },
    {
      name: 'Relationships',
      href: '/relationships',
      icon: UserCheck,
    },
    {
      name: 'Reports',
      href: '/reports/participant-ops',
      icon: BarChart3,
      subtext: 'Participant Ops'
    },
    {
      name: 'Calendar / Scheduling',
      href: '/scheduling',
      icon: Calendar,
    },
  ];

  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
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
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="text-white text-xl">&times;</span>
              </button>
            </div>
            <SidebarContent navigation={navigation} expandedItems={expandedItems} toggleExpanded={toggleExpanded} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} expandedItems={expandedItems} toggleExpanded={toggleExpanded} />
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
                  placeholder="Search participants..."
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
                <div className="text-base font-medium text-gray-800">Service Manager</div>
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

const SidebarContent: React.FC<{ 
  navigation: any[]; 
  expandedItems: string[];
  toggleExpanded: (name: string) => void;
}> = ({ navigation, expandedItems, toggleExpanded }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.items ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                    <span className="ml-auto">
                      {expandedItems.includes(item.name) ? '▼' : '▶'}
                    </span>
                  </button>
                  {expandedItems.includes(item.name) && (
                    <div className="ml-8 space-y-1">
                      {item.items.map((subItem: any) => (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                            location.pathname === subItem.href
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <subItem.icon className="mr-3 h-4 w-4" />
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
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <div className="flex-1">
                    <div>{item.name}</div>
                    {item.subtext && (
                      <div className="text-xs text-gray-500">{item.subtext}</div>
                    )}
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default ManagerLayout;