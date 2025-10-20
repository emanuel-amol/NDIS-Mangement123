// frontend/src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Inbox,
  Users,
  Edit,
  Clock,
  Calendar,
  CalendarCheck,
  FileText,
  Receipt,
  Building2,
  CheckCircle,
  UserPlus,
  DollarSign,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Settings,
  UserCircle,
  LogOut,
  HelpCircle
} from 'lucide-react';

type Me = { id: number; email: string; first_name: string; last_name: string; role: string };

const cls = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ");
const initialName = (me?: Me) =>
  me ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() : "";

const rolePill = (role?: string) => {
  const r = (role || "").toUpperCase();
  const color = r === "SERVICE_MANAGER" ? "bg-indigo-100 text-indigo-700"
              : r === "PROVIDER_ADMIN"  ? "bg-emerald-100 text-emerald-700"
              : r === "SUPPORT_WORKER"  ? "bg-sky-100 text-sky-700"
              : r === "HR"              ? "bg-amber-100 text-amber-800"
              : r === "FINANCE"         ? "bg-rose-100 text-rose-700"
              : r === "IT"              ? "bg-slate-200 text-slate-800"
              : r === "DATA_ENTRY"      ? "bg-fuchsia-100 text-fuchsia-700"
              : r === "PARTICIPANT"     ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-700";
  return <span className={cls("px-2 py-0.5 rounded text-xs font-medium", color)}>{r || "UNKNOWN"}</span>;
};

type NavItem = { 
  label: string; 
  to: string; 
  count?: number; 
  icon: React.ElementType;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const providerNav: NavSection[] = [
  {
    title: "Work",
    items: [
      { label: "Dashboard", to: "/dashboard/provider", icon: Home },
      { label: "Referrals", to: "/referrals", icon: Inbox },
      { label: "Participants", to: "/participants", icon: Users },
      { label: "In Progress", to: "/in-progress", icon: Edit },
      { label: "Pending Approval", to: "/pending-approval", icon: Clock },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Team", to: "/admin/users/list", icon: Users },
      { label: "Schedule", to: "/scheduling", icon: Calendar },
      { label: "Appointments", to: "/scheduling/calendar", icon: CalendarCheck },
      { label: "Notes", to: "/participants", icon: FileText },
      { label: "Incidents", to: "/participants", icon: HelpCircle },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Invoices", to: "/invoicing", icon: Receipt },
      { label: "Timesheets", to: "/scheduling/roster", icon: Clock },
      { label: "Homes", to: "/sil/homes", icon: Building2 },
    ],
  },
];

const navByRole: Record<string, NavSection[]> = {
  PROVIDER_ADMIN: providerNav,
  SERVICE_MANAGER: [
    {
      title: "Management",
      items: [
        { label: "Dashboard", to: "/dashboard/manager", icon: Home },
        { label: "Approvals", to: "/pending-approval", icon: CheckCircle },
        { label: "Participants", to: "/participants", icon: UserPlus },
        { label: "Roster", to: "/scheduling/roster", icon: Calendar },
        { label: "Finance", to: "/invoicing", icon: DollarSign },
      ],
    },
  ],
  SUPPORT_WORKER: [
    {
      title: "My Work",
      items: [
        { label: "Dashboard", to: "/dashboard/worker", icon: Home },
        { label: "My Shifts", to: "/scheduling/calendar", icon: Calendar },
        { label: "My Participants", to: "/participants", icon: Users },
        { label: "Tasks", to: "/scheduling", icon: CheckCircle },
      ],
    },
  ],
};

const pageTitles: Record<string, string> = {
  "/dashboard/provider": "Dashboard",
  "/dashboard/manager": "Manager Dashboard",
  "/dashboard/worker": "Worker Dashboard",
  "/referrals": "Referrals",
  "/participants": "Participants",
  "/in-progress": "In Progress",
  "/pending-approval": "Pending Approval",
  "/admin/users/list": "Team Management",
  "/scheduling": "Schedule",
  "/scheduling/calendar": "Calendar",
  "/scheduling/roster": "Roster Management",
  "/invoicing": "Invoices",
  "/sil/homes": "SIL Homes",
};

// Breadcrumb generator
const getBreadcrumbs = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ label: "Home", to: "/" }];
  
  let currentPath = "";
  parts.forEach((part) => {
    currentPath += `/${part}`;
    const title = pageTitles[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
    breadcrumbs.push({ label: title, to: currentPath });
  });
  
  return breadcrumbs;
};

// Collapsible Section Component
const NavSection = ({ section }: { section: NavSection }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <span>{section.title}</span>
        <ChevronDown 
          size={16} 
          className={cls("transition-transform", isOpen ? "rotate-0" : "-rotate-90")} 
        />
      </button>
      
      {isOpen && (
        <div className="space-y-1 mt-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cls(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const me = user as Me | null;
  const role = (me?.role || 'USER').toUpperCase();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const sections = navByRole[role] || [];
  const pageTitle = pageTitles[location.pathname] || "NDIS Management";
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cls(
          "w-72 bg-white border-r flex flex-col fixed h-full shadow-sm transition-transform duration-300 ease-in-out z-30",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                NDIS Management
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {sections.map((section) => (
            <NavSection key={section.title} section={section} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors flex items-center gap-2">
            <HelpCircle size={16} />
            Help & Support
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div
        className={cls(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          sidebarOpen ? "lg:ml-72" : "ml-0"
        )}
      >
        {/* Top Bar */}
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6 sticky top-0 z-40 shadow-sm">
          {/* Left: Hamburger + Breadcrumbs */}
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.to} className="flex items-center gap-2">
                  {index > 0 && <ChevronDown size={16} className="text-gray-400 rotate-[-90deg]" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-gray-900">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.to} className="text-gray-500 hover:text-gray-700 transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: Just show page title */}
            <h1 className="md:hidden font-semibold text-gray-900">{pageTitle}</h1>
          </div>

          {/* Right: Search, Notifications, Avatar */}
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="hidden lg:block relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search..."
                className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Search Icon for Mobile */}
            <button className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Search size={20} />
            </button>

            {/* Notifications Bell */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center text-sm font-medium shadow-sm">
                  {(initialName(me) || me?.email || "U")[0].toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-sm font-medium text-gray-700">
                    {initialName(me) || "User"}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px]">
                    {role.replace("_", " ")}
                  </div>
                </div>
                <ChevronDown size={16} className="hidden lg:block text-gray-400" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="px-4 py-4 border-b bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center text-lg font-medium shadow-sm">
                          {(initialName(me) || me?.email || "U")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {initialName(me) || "User"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{me?.email}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Role:</span>
                        {rolePill(role)}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <UserCircle size={16} />
                        My Profile
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <Settings size={16} />
                        Settings
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t py-2">
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}