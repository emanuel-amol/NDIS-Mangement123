// frontend/src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { auth } from "../services/auth";
import { routeForRole } from "../utils/roleRoutes";

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

const navByRole: Record<string, { label: string; to: string }[]> = {
  PROVIDER_ADMIN: [
    { label: "Dashboard", to: "/dashboard/provider" },
    { label: "Participants", to: "/participants" },
    { label: "Care Plans", to: "/care" },
    { label: "Quotations", to: "/quotations" },
    { label: "Documents", to: "/documents" },
  ],
  SERVICE_MANAGER: [
    { label: "Dashboard", to: "/dashboard/manager" },
    { label: "Approvals", to: "/manager/reviews" },
    { label: "Onboarding", to: "/onboarding" },
    { label: "Rostering (view)", to: "/roster" },
    { label: "Finance (view)", to: "/finance" },
  ],
  SUPPORT_WORKER: [
    { label: "Dashboard", to: "/dashboard/worker" },
    { label: "My Shifts", to: "/shifts" },
    { label: "My Participants", to: "/my-participants" },
    { label: "Tasks", to: "/tasks" },
  ],
  PARTICIPANT: [
    { label: "Dashboard", to: "/dashboard/participant" },
    { label: "Documents", to: "/my-documents" },
    { label: "Appointments", to: "/my-appointments" },
  ],
  HR: [
    { label: "Dashboard", to: "/dashboard/hr" },
    { label: "Rostering", to: "/roster" },
    { label: "Workers", to: "/workers" },
  ],
  FINANCE: [
    { label: "Dashboard", to: "/dashboard/finance" },
    { label: "Invoices", to: "/invoices" },
    { label: "Xero Sync", to: "/xero" },
  ],
  IT: [
    { label: "Dashboard", to: "/dashboard/it" },
    { label: "System Status", to: "/system" },
    { label: "Logs", to: "/logs" },
  ],
  DATA_ENTRY: [
    { label: "Dashboard", to: "/dashboard/data" },
    { label: "Bulk Upload", to: "/bulk-upload" },
    { label: "Documents", to: "/documents" },
  ],
};

export default function Layout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const role = (me?.role || auth.role()).toUpperCase();

  useEffect(() => {
    // ensure we have fresh user info after refresh
    const token = auth.token();
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Me) => setMe(data))
      .catch(() => {
        auth.logout();
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  const items = navByRole[role] || [{ label: "Home", to: routeForRole(role) }];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="px-4 py-4 border-b">
          <Link to={routeForRole(role)} className="text-lg font-semibold">NDIS Management</Link>
        </div>
        <nav className="p-3 space-y-1">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                cls(
                  "block px-3 py-2 rounded text-sm",
                  isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                )
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with user name + role */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-gray-500">Welcome</span>
            <span className="font-medium">
              {initialName(me) || me?.email || "User"}
            </span>
            {rolePill(role)}
          </div>
          <div className="flex items-center gap-3">
            <input
              placeholder="Search…"
              className="w-56 border rounded px-3 py-1 text-sm focus:outline-none focus:ring"
            />
            <button onClick={logout} className="text-sm border px-3 py-1 rounded hover:bg-gray-100">Logout</button>
          </div>
        </header>

        {/* CRITICAL: This is where child routes render */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}