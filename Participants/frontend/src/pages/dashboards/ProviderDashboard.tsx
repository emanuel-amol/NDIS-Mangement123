// frontend/src/pages/dashboards/ProviderDashboard.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardAPI, DashboardSummary, DraftItem, WaitingItem, Alert, CalendarItem, ActivityItem } from "../../services/dashboard";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const DISPLAY_LIMITS = {
  drafts: 5,
  waiting: 5,
  alerts: 5,
  thisWeek: 5,
  activity: 8,
};

// ═══════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
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

  // ─────────────────────────────────────────────────────────────
  // LOAD DASHBOARD DATA
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("📊 Loading dashboard data...");

        const [summaryData, draftsData, waitingData, alertsData, weekData, activityData] = await Promise.allSettled([
          dashboardAPI.getSummary(),
          dashboardAPI.getDrafts(),
          dashboardAPI.getWaitingItems(),
          dashboardAPI.getAlerts(),
          dashboardAPI.getThisWeek(),
          dashboardAPI.getActivity(),
        ]);

        if (!mounted) return;

        // Handle summary
        if (summaryData.status === "fulfilled") {
          setSummary(summaryData.value);
          console.log("✅ Summary loaded:", summaryData.value);
        } else {
          console.warn("⚠️ Summary failed:", summaryData.reason);
        }

        // Handle drafts
        if (draftsData.status === "fulfilled") {
          setDrafts(draftsData.value);
          console.log("✅ Drafts loaded:", draftsData.value.length, "items");
        } else {
          console.warn("⚠️ Drafts failed:", draftsData.reason);
        }

        // Handle waiting items
        if (waitingData.status === "fulfilled") {
          setWaitingItems(waitingData.value);
          console.log("✅ Waiting items loaded:", waitingData.value.length, "items");
        } else {
          console.warn("⚠️ Waiting items failed:", waitingData.reason);
        }

        // Handle alerts
        if (alertsData.status === "fulfilled") {
          setAlerts(alertsData.value);
          console.log("✅ Alerts loaded:", alertsData.value.length, "items");
        } else {
          console.warn("⚠️ Alerts failed:", alertsData.reason);
        }

        // Handle this week
        if (weekData.status === "fulfilled") {
          setThisWeek(weekData.value);
          console.log("✅ This week loaded:", weekData.value.length, "items");
        } else {
          console.warn("⚠️ This week failed:", weekData.reason);
        }

        // Handle activity
        if (activityData.status === "fulfilled") {
          setActivity(activityData.value);
          console.log("✅ Activity loaded:", activityData.value.length, "items");
        } else {
          console.warn("⚠️ Activity failed:", activityData.reason);
        }

        console.log("✨ Dashboard loaded successfully");
      } catch (err) {
        if (!mounted) return;
        const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(errorMessage);
        console.error("❌ Dashboard error:", errorMessage);
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
  }, [refreshKey]);

  // ─────────────────────────────────────────────────────────────
  // REFRESH HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    console.log("🔄 Refreshing dashboard...");
    setRefreshKey(prev => prev + 1);
  };

  // ─────────────────────────────────────────────────────────────
  // COMPUTED DATA (LIMITED)
  // ─────────────────────────────────────────────────────────────
  const displayDrafts = drafts.slice(0, DISPLAY_LIMITS.drafts);
  const displayWaiting = waitingItems.slice(0, DISPLAY_LIMITS.waiting);
  const displayAlerts = alerts.slice(0, DISPLAY_LIMITS.alerts);
  const displayThisWeek = thisWeek.slice(0, DISPLAY_LIMITS.thisWeek);
  const displayActivity = activity.slice(0, DISPLAY_LIMITS.activity);

  const hasMoreDrafts = drafts.length > DISPLAY_LIMITS.drafts;
  const hasMoreWaiting = waitingItems.length > DISPLAY_LIMITS.waiting;
  const hasMoreAlerts = alerts.length > DISPLAY_LIMITS.alerts;
  const hasMoreThisWeek = thisWeek.length > DISPLAY_LIMITS.thisWeek;
  const hasMoreActivity = activity.length > DISPLAY_LIMITS.activity;

  // ─────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="font-medium text-rose-900">Failed to load dashboard</div>
          <div className="text-sm text-rose-700 mt-1">{error}</div>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER DASHBOARD
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your organization</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

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

      {/* Row 2: Drafts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drafts */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Drafts</h2>
            {drafts.length > 0 && (
              <span className="text-sm text-gray-500">
                {drafts.length} total
              </span>
            )}
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
            ) : displayDrafts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">📝</div>
                <div className="text-sm text-gray-500">No drafts yet</div>
                <div className="text-xs text-gray-400 mt-1">Start a new care plan or document to see it here</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {displayDrafts.map((draft) => (
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
                {hasMoreDrafts && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/drafts"
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View all {drafts.length} drafts →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
            {alerts.length > 0 && (
              <span className="text-sm text-gray-500">
                {alerts.length} total
              </span>
            )}
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
            ) : displayAlerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">✓</div>
                <div className="text-sm text-gray-500">No alerts</div>
                <div className="text-xs text-gray-400 mt-1">All caught up!</div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
                {hasMoreAlerts && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/alerts"
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View all {alerts.length} alerts →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Waiting & This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting on Manager */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Waiting on Manager</h2>
            {waitingItems.length > 0 && (
              <span className="text-sm text-gray-500">
                {waitingItems.length} total
              </span>
            )}
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
            ) : displayWaiting.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">⏳</div>
                <div className="text-sm text-gray-500">Nothing waiting on approval</div>
                <div className="text-xs text-gray-400 mt-1">Submit completed work for manager review</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {displayWaiting.map((item) => (
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
                {hasMoreWaiting && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/waiting"
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View all {waitingItems.length} items →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
            {thisWeek.length > 0 && (
              <span className="text-sm text-gray-500">
                {thisWeek.length} total
              </span>
            )}
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
            ) : displayThisWeek.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-2">📅</div>
                <div className="text-sm text-gray-500">No upcoming items</div>
                <div className="text-xs text-gray-400 mt-1">Your week looks clear</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {displayThisWeek.map((item) => (
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
                {hasMoreThisWeek && (
                  <div className="mt-4 text-center">
                    <Link
                      to="/scheduling"
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View all {thisWeek.length} items →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          {activity.length > 0 && (
            <span className="text-sm text-gray-500">
              {activity.length} total
            </span>
          )}
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
          ) : displayActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-5xl mb-2">📋</div>
              <div className="text-sm text-gray-500">No recent activity</div>
              <div className="text-xs text-gray-400 mt-1">Updates will appear here</div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {displayActivity.map((item) => (
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
              {hasMoreActivity && (
                <div className="mt-4 text-center">
                  <Link
                    to="/activity"
                    className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    View all {activity.length} activities →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}