import { useEffect, useState } from "react";
import NavigationBar from "../components/navigation/NavigationBar";
import { Link } from "react-router-dom";

type User = { id: number; username: string; email: string };
type Candidate = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  status?: string | null;
  mobile?: string | null;
};
type WorkerUserOut = { user: User; candidate: Candidate };
type WorkerListResponse = {
  results: WorkerUserOut[];
  roles: string[];
  status_options: string[];
};

const API_URL = "/api/v1/admin/workers";

export default function WorkersPage() {
  const [rows, setRows] = useState<WorkerUserOut[]>([]);
  const [q, setQ] = useState<string>("");
  const [role, setRole] = useState<string>("");
  // default to showing only Hired workers
  const [status, setStatus] = useState<string>("Hired");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(window.location.origin + API_URL);
      if (query && String(query).trim() !== "") url.searchParams.set('q', String(query).trim());
      if (role) url.searchParams.set('role', role);
      if (status) url.searchParams.set('status', status);
      if (dateFrom) url.searchParams.set('date_from', dateFrom);
      if (dateTo) url.searchParams.set('date_to', dateTo);
      // ensure we only request workers; backend buckets workers via WORKER_STATUSES but we also filter client-side to 'Hired' as safety
      const resp = await fetch(url.toString(), { credentials: "include" });
      if (!resp.ok) throw new Error(`Unable to fetch workers (${resp.status})`);
      const data: WorkerListResponse = await resp.json();
      // update options if provided by the API
      if (data.roles && data.roles.length) setRoles(data.roles);
      if (data.status_options && data.status_options.length) setStatusOptions(data.status_options);
      // filter to only show hired workers for this page (additional safety)
      const hired = (data.results || []).filter(({ candidate }) => ((candidate.status || '').toLowerCase() === 'hired'));
      setRows(hired);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load with current defaults (status=Hired)
    load(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const archiveUser = async (userId: number) => {
    if (!confirm("Archive this user?")) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/archive`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error(`Archive failed (${resp.status})`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Archive failed");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationBar />
      <div className="flex-1 overflow-auto bg-[#f7f8fa] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">All Workers</h2>
            <nav className="text-xs text-gray-500 flex items-center gap-1">
              <span>Dashboard</span>
              <span className="mx-1">›</span>
              <span className="text-gray-600">All Workers</span>
            </nav>
          </div>
          <Link to="/admin/users/new">
            <button className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-200 text-sm font-medium">
              + Add Employee
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Role (Worker)</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded border p-2">
                <option value="">All</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Application Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded border p-2">
                <option value="">All</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Applied From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Applied To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Keywords</label>
              <div className="flex gap-2 mt-1">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone..." className="w-full rounded border p-2" />
                <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => load(q)}>Apply</button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => { setRole(''); setStatus('Hired'); setDateFrom(''); setDateTo(''); setQ(''); load(''); }} className="px-3 py-1 border rounded">Reset</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg">
          <div className="min-w-full">
            <div className="grid grid-cols-6 bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
              {['NAME','ROLE','EMAIL ADDRESS','STATUS','PHONE NUMBER','ACTION'].map((header) => (
                <div key={header} className="px-4 py-3">{header}</div>
              ))}
            </div>

            {loading ? (
              <div className="px-4 py-6 text-gray-500">Loading…</div>
            ) : error ? (
              <div className="px-4 py-6 text-red-600">{error}</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-gray-500">No workers found.</div>
            ) : (
              rows.map(({ user, candidate }) => {
                const displayName = (((candidate.first_name || '') + ' ' + (candidate.last_name || '')).trim()) || (user.username || (user.email ? user.email.split('@')[0] : 'User'));
                return (
                  <Link
                    key={user.id}
                    to={`/portal/profile/admin/${user.id}`}
                    className="grid grid-cols-6 items-center px-4 py-4 even:bg-white odd:bg-[#f7f8fa] hover:bg-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">{displayName.charAt(0).toUpperCase()}</div>
                      <span className="text-gray-700 text-sm">{displayName}</span>
                    </div>
                    <div className="text-sm text-gray-700">{candidate.job_title ?? '—'}</div>
                    <div className="text-sm text-gray-700">{user.email}</div>
                    <div className="text-sm text-gray-700">{candidate.status ?? '—'}</div>
                    <div className="text-sm text-gray-700">{candidate.mobile ?? '—'}</div>
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded text-sm font-medium">View</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-red-600 border border-red-200 rounded bg-white hover:bg-red-50 text-sm font-medium"
                        onClick={(e) => { e.preventDefault(); archiveUser(user.id); }}
                      >
                        Archive
                      </button>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
