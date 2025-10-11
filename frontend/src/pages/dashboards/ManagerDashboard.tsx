// frontend/src/pages/dashboards/ManagerDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import {
  dashboardAPI,
  ManagerQueueItem,
  ManagerStats,
  RecentlyOnboardedRow,
} from "../../services/dashboard";

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "—");

interface QueueRow {
  participant: string;
  status: string;
  updatedAt: string;
  participantId: number;
}

interface OnboardedRow {
  participant: string;
  date: string;
  manager: string;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<ManagerStats>({
    awaitingSignoff: 0,
    approvedToday: 0,
    rejectedToday: 0,
    readyToConvert: 0,
  });
  const [approvalQueue, setApprovalQueue] = useState<QueueRow[]>([]);
  const [recentlyOnboarded, setRecentlyOnboarded] = useState<OnboardedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      try {
        const [statsData, queueData, onboardedData] = await Promise.all([
          dashboardAPI.getManagerStats(),
          dashboardAPI.getManagerQueue(),
          dashboardAPI.getRecentlyOnboarded(),
        ]);

        if (!mounted) return;

        setStats(statsData);
        setApprovalQueue(
          queueData.map((item: ManagerQueueItem) => ({
            participant: item.participant_name || `Participant ${item.participant_id}`,
            status: item.manager_review_status ?? "pending",
            updatedAt: formatDateTime(item.updated_at),
            participantId: item.participant_id,
          }))
        );
        setRecentlyOnboarded(
          onboardedData.map((item: RecentlyOnboardedRow) => ({
            participant: item.participant,
            date: formatDate(item.date),
            manager: item.manager || "—",
          }))
        );
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
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

  const queueColumns = [
    { header: "Participant", key: "participant" },
    { header: "Status", key: "status" },
    { header: "Last Updated", key: "updatedAt" },
    {
      header: "Action",
      key: "action",
      render: (_: unknown, row: QueueRow) => (
        <Link
          to={`/manager/reviews/${row.participantId}`}
          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs"
        >
          Review
        </Link>
      ),
    },
  ];

  const onboardedColumns = [
    { header: "Participant", key: "participant" },
    { header: "Date", key: "date" },
    { header: "Manager", key: "manager" },
  ];

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Manager Dashboard"
        actions={
          <>
            <Link to="/manager/reviews" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Open Approval Queue
            </Link>
            <Link to="/onboarding" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Convert to Onboarded
            </Link>
          </>
        }
      />

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Awaiting Sign-off" value={stats.awaitingSignoff} hint="Pending review" />
        <StatCard title="Approved Today" value={stats.approvedToday} />
        <StatCard title="Rejected Today" value={stats.rejectedToday} />
        <StatCard title="Ready to Convert" value={stats.readyToConvert} hint="Approved items" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Approval Queue</h2>
        <Table columns={queueColumns} data={approvalQueue} emptyMessage="No items awaiting approval" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recently Onboarded</h2>
        <Table columns={onboardedColumns} data={recentlyOnboarded} emptyMessage="No recently onboarded participants" />
      </div>
    </div>
  );
}
