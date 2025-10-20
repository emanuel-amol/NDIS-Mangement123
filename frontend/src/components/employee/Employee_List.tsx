import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavigationBar from "../navigation/NavigationBar";

const tableHeaders = [
  "NAME",
  "ROLE",
  "EMAIL ADDRESS",
  "STATUS",
  "PHONE NUMBER",
  "ACTION",
];

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
  roles?: string[];
  status_options?: string[];
};

const EmployeeList: React.FC = () => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<WorkerUserOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const resp = await fetch(`/api/v1/admin/workers?${params.toString()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(`Unable to fetch workers (${resp.status})`);
      const data: WorkerListResponse = await resp.json();
      setRows(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="flex min-h-screen bg-white">
      <NavigationBar />
      <div className="flex-1 bg-[#f7f8fa] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            All Workers
          </h2>
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded border p-2 text-sm"
          />
          <button onClick={load} className="px-3 py-2 bg-gray-800 text-white rounded text-sm">Search</button>
          <button onClick={() => { setQ(""); setTimeout(load, 0); }} className="px-3 py-2 border rounded text-sm">Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg">
        <div className="min-w-full">
          <div className="grid grid-cols-6 bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
            {tableHeaders.map((header) => (
              <div key={header} className="px-4 py-3">
                {header}
              </div>
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
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 text-sm">{displayName}</span>
                  </div>
                  <div className="text-sm text-gray-700">{candidate.job_title ?? '—'}</div>
                  <div className="text-sm text-gray-700">{user.email}</div>
                  <div className="text-sm text-gray-700">{candidate.status ?? '—'}</div>
                  <div className="text-sm text-gray-700">{candidate.mobile ?? '—'}</div>
                  <div className="text-sm text-gray-700">
                    <span className="text-blue-500 hover:underline">View</span>
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
};

export default EmployeeList;
