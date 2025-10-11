// frontend/src/pages/dashboards/ProviderDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Types
interface DashboardSummary {
  referrals_to_review: number;
  your_drafts: number;
  waiting_on_manager: number;
  pending_signatures: number;
  documents_expiring_30d: number;
  roster_drafts: number;
}

interface DraftItem {
  id: number;
  type: "Care Plan" | "Risk Assessment" | "Document" | "Quotation";
  participantId: number;
  participantName: string;
  updatedAt: string;
}

interface WaitingItem {
  id: number;
  bundleType: string;
  participantId: number;
  participantName: string;
  submittedAt: string;
  contents: string;
}

interface Alert {
  id: number;
  type: "expiry" | "rejection" | "signature";
  label: string;
  dueDate?: string;
  participantName: string;
  severity: "low" | "medium" | "high";
}

interface CalendarItem {
  id: number;
  type: "appointment" | "shift";
  title: string;
  time: string;
  participantName?: string;
}

interface ActivityItem {
  id: number;
  who: string;
  what: string;
  when: string;
  participantName: string;
}

// API calls (stub - implement actual API calls)
const dashboardAPI = {
  getSummary: async (): Promise<DashboardSummary> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch summary");
    return response.json();
  },
  
  getDrafts: async (): Promise<DraftItem[]> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/drafts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch drafts");
    return response.json();
  },
  
  getWaitingItems: async (): Promise<WaitingItem[]> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/waiting`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch waiting items");
    return response.json();
  },
  
  getAlerts: async (): Promise<Alert[]> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch alerts");
    return response.json();
  },
  
  getThisWeek: async (): Promise<CalendarItem[]> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/week`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch calendar");
    return response.json();
  },
  
  getActivity: async (): Promise<ActivityItem[]> => {
    // TODO: Replace with actual API call
    const token = localStorage.getItem("token");
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/dashboard/provider/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch activity");
    return response.json();
  },
};

// Components
const SummaryTile = ({ 
  title, 
  value, 
  hint, 
  to, 
  loading 
}: { 
  title: string; 
  value: number; 
  hint: string; 
  to: string; 
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 block group"
    >
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
        {value}
      </div>
      <div className="text-xs text-gray-500">{hint}</div>
    </Link>
  );
};

const AlertCard = ({ alert }: { alert: Alert }) => {
  const severityColors = {
    high: "border-rose-200 bg-rose-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-gray-200 bg-gray-50",
  };

  const severityDots = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-gray-400",
  };

  return (
    <div className={`border rounded-lg p-3 ${severityColors[alert.severity]}`}>
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 ${severityDots[alert.severity]}`}></span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{alert.label}</div>
          <div className="text-xs text-gray-600 mt-0.5">{alert.participantName}</div>
          {alert.dueDate && (
            <div className="text-xs text-gray-500 mt-1">Due: {new Date(alert.dueDate).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<DashboardSummary>({
    referrals_to_review: 0,
    your_drafts: 0,
    waiting_on_manager: 0,
    pending_signatures: 0,
    documents_expiring_30d: 0,
    roster_drafts: 0,
  });
  
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [waitingItems, setWaitingItems] = useState<WaitingItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [thisWeek, setThisWeek] = useState<CalendarItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const [summaryData, draftsData, waitingData, alertsData, weekData, activityData] = await Promise.all([
          dashboardAPI.getSummary().catch(() => summary),
          dashboardAPI.getDrafts().catch(() => []),
          dashboardAPI.getWaitingItems().catch(() => []),
          dashboardAPI.getAlerts().catch(() => []),
          dashboardAPI.getThisWeek().catch(() => []),
          dashboardAPI.getActivity().catch(() => []),
        ]);

        if (!mounted) return;

        setSummary(summaryData);
        setDrafts(draftsData);
        setWaitingItems(waitingData);
        setAlerts(alertsData);
        setThisWeek(weekData);
        setActivity(activityData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
        <div className="font-medium text-rose-900">Failed to load dashboard</div>
        <div className="text-sm text-rose-700 mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Summary Tiles */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryTile
          title="Referrals to Review"
          value={summary.referrals_to_review}
          hint="New referrals awaiting validation"
          to="/referrals?status=new"
          loading={loading}
        />
        <SummaryTile
          title="Your Drafts"
          value={summary.your_drafts}
          hint="Incomplete plans and documents"
          to="/drafts"
          loading={loading}
        />
        <SummaryTile
          title="Waiting on Manager"
          value={summary.waiting_on_manager}
          hint="Submitted for approval"
          to="/waiting"
          loading={loading}
        />
        <SummaryTile
          title="Pending Signatures"
          value={summary.pending_signatures}
          hint="Documents awaiting signature"
          to="/service-docs?status=pending"
          loading={loading}
        />
        <SummaryTile
          title="Expiring Soon"
          value={summary.documents_expiring_30d}
          hint="Documents expiring in 30 days"
          to="/service-docs?expiring=30"
          loading={loading}
        />
        <SummaryTile
          title="Roster Drafts"
          value={summary.roster_drafts}
          hint="Unpublished roster changes"
          to="/scheduling?status=draft"
          loading={loading}
        />
      </div>

      {/* Row 2: Drafts Table & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Your Drafts Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Drafts</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4 items-center">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">📝</div>
                <div className="text-sm text-gray-500">No drafts yet</div>
                <div className="text-xs text-gray-400 mt-1">Start a new care plan or document to see it here</div>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-500 w-28 flex-shrink-0">
                        {draft.type}
                      </span>
                      <span className="text-sm text-gray-900 truncate flex-1">
                        {draft.participantName}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatRelativeTime(draft.updatedAt)}
                      </span>
                    </div>
                    <Link
                      to={`/drafts/${draft.id}`}
                      className="ml-4 text-sm text-indigo-600 hover:text-indigo-900 font-medium flex-shrink-0"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">✓</div>
                <div className="text-sm text-gray-500">No alerts</div>
                <div className="text-xs text-gray-400 mt-1">All caught up!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Waiting on Manager & This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Waiting on Manager */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Waiting on Manager</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4 items-center">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : waitingItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">⏳</div>
                <div className="text-sm text-gray-500">Nothing waiting on approval</div>
                <div className="text-xs text-gray-400 mt-1">Submit completed work for manager review</div>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-500 w-32 flex-shrink-0">
                        {item.bundleType}
                      </span>
                      <span className="text-sm text-gray-900 truncate flex-1">
                        {item.participantName}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatRelativeTime(item.submittedAt)}
                      </span>
                    </div>
                    <Link
                      to={`/waiting/${item.id}`}
                      className="ml-4 text-sm text-indigo-600 hover:text-indigo-900 font-medium flex-shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: This Week Calendar */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-14 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : thisWeek.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">📅</div>
                <div className="text-sm text-gray-500">No upcoming items</div>
                <div className="text-xs text-gray-400 mt-1">Your week looks clear</div>
              </div>
            ) : (
              <div className="space-y-2">
                {thisWeek.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${
                        item.type === "appointment" ? "bg-blue-500" : "bg-green-500"
                      }`}></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.time}</div>
                        {item.participantName && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.participantName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-5xl mb-2">📋</div>
              <div className="text-sm text-gray-500">No recent activity</div>
              <div className="text-xs text-gray-400 mt-1">Updates will appear here</div>
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {item.who[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{item.who}</span> {item.what}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.participantName} · {formatRelativeTime(item.when)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}