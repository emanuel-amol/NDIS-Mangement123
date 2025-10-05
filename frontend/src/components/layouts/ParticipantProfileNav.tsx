// frontend/src/components/layouts/MainNav.tsx
import { useState } from 'react';
import { 
  Home, Users, FileText, Calendar, DollarSign, 
  Settings, Bell, Search, Menu, X, ChevronDown,
  LayoutDashboard, ClipboardList, Briefcase, UserCircle
} from 'lucide-react';

export default function MainNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Participants', href: '/participants', icon: Users },
    { name: 'Care Workflows', href: '/care', icon: ClipboardList },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Scheduling', href: '/scheduling', icon: Calendar },
    { name: 'Quotations', href: '/quotations', icon: DollarSign },
    { name: 'Staff', href: '/staff', icon: Briefcase },
  ];

  const currentPath = window.location.pathname;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Primary Nav */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <a href="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-xl font-bold text-gray-900">CareSync</span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath.startsWith(item.href);
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Right Side - Search, Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Search size={16} />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">⌘K</kbd>
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Bell size={20} />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCircle size={20} className="text-blue-600" />
                </div>
                <ChevronDown size={16} className="hidden md:block" />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                      <p className="text-xs text-gray-500">Service Manager</p>
                    </div>
                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Your Profile
                    </a>
                    <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Settings
                    </a>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  {item.name}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}