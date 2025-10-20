import React, { useState, useEffect } from "react";
import { ChevronDown, Settings, HelpCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserData {
  id: number;
  username: string;
  email: string;
}

type Role = 'admin' | 'hrm_admin' | 'user';

const navItems = [
  "Home",
  "My Profile",
  "Alerts",
  "Participants",
  "HRM",
  "Rostering",
  "Forms Managements",
  "Vehicle Management",
  "Home Management",
  "User Management",
  "Incidents",
  "Invoicing",
  "Reporting",
  "Complaints",
  "Feedback",
];

const NavigationBar: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [role, setRole] = useState<Role>('user');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/v1/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
  if (data.role === 'admin' || data.role === 'hrm_admin') setRole(data.role);
  else setRole('user');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleNavigation = (item: string) => {
    switch (item) {
      case 'Home':
        navigate('/');
        break;
      case 'My Profile':
        navigate('/profile');
        break;
      case 'HRM':
        // HRM landing page
        navigate('/admin/hrm');
        break;
      case 'User Management':
        window.location.href = '/admin/users';
        break;
      case 'Participants':
        window.location.href = '/admin/candidates';
        break;
      default:
        console.log(`Navigation to ${item} not implemented yet`);
    }
  };

  return (
    <div className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col py-4 px-2">
      {/* Profile */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-600 text-xl">
          <User className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {userData?.email || 'Loading...'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
      <hr className="my-2 border-gray-100" />

      {/* Navigation Items */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems
            .filter((item) => {
              // My Profile is visible to all authenticated users
              if (item === 'My Profile') return true;

              // HRM page requires hrm_admin or admin
              if (item === 'HRM') return role === 'admin' || role === 'hrm_admin';

              // Participants is visible to all signed-in users
              if (item === 'Participants') return true;

              // Full admin only areas
              const adminOnly = new Set(['User Management', 'Reporting', 'Invoicing']);
              if (adminOnly.has(item)) return role === 'admin';

              return true;
            })
            .map((item) => (
              <li key={item}>
                <button
                  onClick={() => handleNavigation(item)}
                  className="w-full text-left px-2 py-1 text-gray-700 hover:bg-[#0F2E66] hover:text-white rounded text-sm transition-colors duration-150"
                >
                  {item}
                </button>
              </li>
            ))}
        </ul>
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto flex flex-col gap-2 px-2 pb-2">
        <button className="flex items-center gap-2 text-gray-600 text-sm py-1 hover:bg-[#0F2E66] hover:text-white rounded px-2 transition-colors duration-150">
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button className="flex items-center gap-2 text-gray-600 text-sm py-1 hover:bg-[#0F2E66] hover:text-white rounded px-2 transition-colors duration-150">
          <HelpCircle className="w-4 h-4" />
          Help
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;
