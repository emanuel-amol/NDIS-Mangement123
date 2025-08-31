// src/components/common/Layout.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavLink } from 'react-router-dom'; // ✅ add this

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  // optional: active/inactive styling helper to keep your current look
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} 
     group flex items-center px-2 py-2 text-sm font-medium rounded-md`;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900">NDIS Manager</h1>
            </div>
            
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {/* ⬇️ replace anchors with NavLink */}
                <NavLink to="/" end className={linkClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/participants" className={linkClass}>
                  Participants
                </NavLink>
                <NavLink to="/documents" className={linkClass}>
                  Documents
                </NavLink>
                <NavLink to="/sil-homes" className={linkClass}>
                  SIL Homes
                </NavLink>
              </nav>
              
              {/* User menu at bottom */}
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex-shrink-0 w-full group block">
                  <div className="flex items-center">
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {user?.name}
                      </p>
                      <button 
                        onClick={logout}
                        className="flex items-center text-xs font-medium text-gray-500 group-hover:text-gray-700"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between sm:px-6 lg:px-8">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <input
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                    placeholder="Search participants, documents..."
                    type="search"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
