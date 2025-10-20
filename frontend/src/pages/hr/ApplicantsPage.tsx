import { useEffect, useMemo, useState } from "react";
import NavigationBar from "../../components/navigation/NavigationBar";

type Applicant = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  status?: string | null;
  mobile?: string | null;
  applied_on?: string | null;
};

type ListResponse = {
  applicants: Applicant[];
  total?: number;
  roles?: string[];
  status_options?: string[];
};

// Get the correct backend URL based on user role
const getBackendUrl = () => {
  const userRole = localStorage.getItem('userRole');
  if (userRole === 'HR' || userRole === 'HRM_ADMIN') {
    return 'http://127.0.0.1:8001';
  }
  return 'http://127.0.0.1:8000';
};

const API_URL = `${getBackendUrl()}/api/v1/admin/applicants`;

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

const fetchApplicants = async (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") query.set(k, String(v));
  });
  
  // Get the token from localStorage
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const resp = await fetch(`${API_URL}?${query.toString()}`, { 
    credentials: "include",
    headers: headers
  });
  
  if (!resp.ok) throw new Error(`Unable to fetch applicants (${resp.status})`);
  return (await resp.json()) as ListResponse;
};

export default function ApplicantsPage() {
  const [role, setRole] = useState<string>("");
  // default to showing only "Applied" applicants
  const [status, setStatus] = useState<string>("Applied");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);

  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplicants({
        role: role || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        q: q || undefined,
        page,
        per_page: perPage,
      });

      setApplicants(data.applicants ?? []);
      setTotal(data.total ?? undefined);
      if (data.roles && data.roles.length) setRoles(data.roles);
      if (data.status_options && data.status_options.length) setStatusOptions(data.status_options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, dateFrom, dateTo, q, page]);

  const resetFilters = () => {
    setRole("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setQ("");
    setPage(1);
  };

  const handleMoveToWorkers = async (id: number) => {
    if (!confirm('Move this applicant to Workers?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { "X-Requested-With": "XMLHttpRequest" };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch(`${getBackendUrl()}/admin/applicants/${id}/convert`, {
        method: "POST",
        credentials: "include",
        headers: headers,
      });
      if (!resp.ok) throw new Error("Move failed");
      await load();
      alert("Moved to Workers.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  };

  const handleArchiveApplicant = async (id: number) => {
    if (!confirm('Archive this applicant?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch(`${getBackendUrl()}/api/v1/admin/applicants/${id}/archive`, {
        method: "POST",
        credentials: "include",
        headers: headers,
      });
      if (!resp.ok) throw new Error("Archive failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Archive failed");
    }
  };

  const totalPages = useMemo(() => (total ? Math.ceil(total / perPage) : undefined), [total, perPage]);

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationBar />
      <div className="flex-1 overflow-auto bg-[#f7f8fa] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">All Applicants</h2>
            <nav className="text-xs text-gray-500 flex items-center gap-1">
              <span>Dashboard</span>
              <span className="mx-1">›</span>
              <span className="text-gray-600">All Applicants</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/candidate-form"
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm font-medium"
            >
              Add Candidate
            </a>
            <button
              className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-200 text-sm font-medium"
              onClick={() => window.location.assign('/admin')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Role (Applicant)</label>
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
              <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => { setPage(1); load(); }}>Apply</button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={resetFilters} className="px-3 py-1 border rounded">Reset</button>
        </div>
      </div>

      {/* List styled like Workers page */}
      <div className="overflow-x-auto rounded-lg">
        <div className="min-w-full">
          <div className="grid grid-cols-7 bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
            {["NAME","ROLE","EMAIL ADDRESS","STATUS","PHONE NUMBER","APPLIED","ACTION"].map((header) => (
              <div key={header} className="px-4 py-3">{header}</div>
            ))}
          </div>

          {loading ? (
            <div className="px-4 py-6 text-gray-500">Loading…</div>
          ) : error ? (
            <div className="px-4 py-6 text-red-600">{error}</div>
          ) : applicants.length === 0 ? (
            <div className="px-4 py-6 text-gray-500">No applicants found.</div>
          ) : (
            // ensure we only render 'Applied' applicants client-side as a safety
            applicants
              .filter((c) => ((c.status || "").toLowerCase() === "applied"))
              .map((c) => {
              const displayName = ((c.first_name || "") + " " + (c.last_name || "")).trim() || (c.email ? c.email.split("@")[0] : "Applicant");
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-7 items-center px-4 py-4 even:bg-white odd:bg-[#f7f8fa] hover:bg-gray-200 cursor-pointer"
                  onClick={() => { window.location.assign(`/admin/applicants/${c.id}/profile`); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.location.assign(`/admin/applicants/${c.id}/profile`); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">{displayName.charAt(0).toUpperCase()}</div>
                    <span className="text-gray-700 text-sm">{displayName}</span>
                  </div>
                  <div className="text-sm text-gray-700">{c.job_title ?? "—"}</div>
                  <div className="text-sm text-gray-700">{c.email ?? ""}</div>
                  <div className="text-sm text-gray-700">{c.status ?? "Applied"}</div>
                  <div className="text-sm text-gray-700">{c.mobile ?? "—"}</div>
                  <div className="text-sm text-gray-700">{formatDate(c.applied_on)}</div>
                  <div className="text-sm text-gray-700 flex gap-2 justify-start items-center">
                    <button
                      className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded text-sm font-medium"
                      onClick={(e) => { e.stopPropagation(); handleMoveToWorkers(c.id); }}
                    >
                      Move to Worker
                    </button>
                    <button
                      className="px-3 py-1 text-red-600 border border-red-200 rounded bg-white hover:bg-red-50 text-sm font-medium"
                      onClick={(e) => { e.stopPropagation(); handleArchiveApplicant(c.id); }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-600">{total ? `${Math.min((page-1)*perPage + 1, total)}–${Math.min(page*perPage, total)} of ${total}` : ""}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
          <div className="px-3 py-1 border rounded">Page {page}{totalPages ? ` / ${totalPages}` : ""}</div>
          <button onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p+1) : p+1))} disabled={totalPages ? page >= totalPages : false} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
      </div>
    </div>
  );
}