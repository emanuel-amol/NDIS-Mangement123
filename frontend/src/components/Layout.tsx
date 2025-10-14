// frontend/src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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

type NavSection = {
  title: string;
  items: { label: string; to: string; count?: number; icon?: string }[];
};

const providerNav: NavSection[] = [
  {
    title: "Work",
    items: [
      { label: "Dashboard", to: "/dashboard/provider", icon: "home" },
      { label: "Referrals", to: "/referrals", icon: "inbox" },
      { label: "Participants", to: "/participants", icon: "users" },
      { label: "In Progress", to: "/drafts", icon: "edit" },
      { label: "Pending Approval", to: "/waiting", icon: "clock" },
    ],
  },
  {
    title: "Planning",
    items: [
      { label: "Care Plans", to: "/care", icon: "clipboard" },
      { label: "Risk Management", to: "/risk", icon: "shield" },
      { label: "Documents", to: "/service-docs", icon: "file" },
      { label: "Quotes", to: "/quotations", icon: "currency" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Team", to: "/assign-workers", icon: "users" },
      { label: "Schedule", to: "/scheduling", icon: "calendar" },
      { label: "Appointments", to: "/appointments", icon: "calendar-check" },
      { label: "Notes", to: "/notes", icon: "note" },
      { label: "Incidents", to: "/incidents", icon: "alert" },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Invoices", to: "/invoices", icon: "receipt" },
      { label: "Timesheets", to: "/timesheets", icon: "time" },
      { label: "Homes", to: "/sil-homes", icon: "building" },
    ],
  },
];

const navByRole: Record<string, NavSection[]> = {
  PROVIDER_ADMIN: providerNav,
  SERVICE_MANAGER: [
    {
      title: "Management",
      items: [
        { label: "Dashboard", to: "/dashboard/manager", icon: "home" },
        { label: "Approvals", to: "/manager/reviews", icon: "check-circle" },
        { label: "Onboarding", to: "/onboarding", icon: "user-add" },
        { label: "Roster", to: "/roster", icon: "calendar" },
        { label: "Finance", to: "/finance", icon: "currency" },
      ],
    },
  ],
  SUPPORT_WORKER: [
    {
      title: "My Work",
      items: [
        { label: "Dashboard", to: "/dashboard/worker", icon: "home" },
        { label: "My Shifts", to: "/shifts", icon: "calendar" },
        { label: "My Participants", to: "/my-participants", icon: "users" },
        { label: "Tasks", to: "/tasks", icon: "check" },
      ],
    },
  ],
};

const pageTitles: Record<string, string> = {
  "/dashboard/provider": "Dashboard",
  "/referrals": "Referrals",
  "/participants": "Participants",
  "/drafts": "In Progress",
  "/waiting": "Pending Approval",
  "/care": "Care Plans",
  "/risk": "Risk Management",
  "/service-docs": "Documents",
  "/quotations": "Quotes",
  "/assign-workers": "Team Management",
  "/scheduling": "Schedule",
  "/appointments": "Appointments",
  "/notes": "Notes",
  "/incidents": "Incidents",
  "/invoices": "Invoices",
  "/timesheets": "Timesheets",
  "/sil-homes": "Homes",
};

// Simple icon component (using SVG paths)
const Icon = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const icons: Record<string, string> = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    inbox: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    file: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    currency: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    "calendar-check": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    receipt: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    time: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    "check-circle": "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    "user-add": "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    check: "M5 13l4 4L19 7",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 18L18 6M6 6l12 12",
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[name] || icons.home} />
    </svg>
  );
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
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <span>{section.title}</span>
        <svg
          className={cls("w-4 h-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="space-y-1 mt-1">
          {section.items.map((item) => (
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
                {item.icon && <Icon name={item.icon} className="w-4 h-4" />}
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
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
    // User is already loaded from AuthContext, no need to fetch again
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
      {/* Sidebar - Fixed, ~280px, can be toggled */}
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

        {/* Navigation with collapsible sections */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {sections.map((section) => (
            <NavSection key={section.title} section={section} />
          ))}
        </nav>

        {/* Footer - Help & Support */}
        <div className="p-4 border-t bg-gray-50">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors flex items-center gap-2">
            <Icon name="alert" className="w-4 h-4" />
            Help & Support
          </button>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area - Offset by sidebar width when open */}
      <div
        className={cls(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          sidebarOpen ? "lg:ml-72" : "ml-0"
        )}
      >
        {/* Top Bar - Sticky, 64px */}
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6 sticky top-0 z-40 shadow-sm">
          {/* Left: Hamburger + Breadcrumbs */}
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name={sidebarOpen ? "close" : "menu"} className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.to} className="flex items-center gap-2">
                  {index > 0 && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
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
            {/* Global Search - Hidden on small screens */}
            <div className="hidden lg:block relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                placeholder="Search..."
                className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Search Icon for Mobile */}
            <button className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Icon name="alert" className="w-5 h-5" />
            </button>

            {/* Notifications Bell */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
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
                <svg className="hidden lg:block w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t py-2">
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
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