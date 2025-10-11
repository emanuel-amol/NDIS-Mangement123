// frontend/src/pages/dashboards/ManagerDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    awaitingSignoff: 0,
    approvedToday: 0,
    rejectedToday: 0,
    readyToConvert: 0,
  });
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [recentlyOnboarded, setRecentlyOnboarded] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      awaitingSignoff: 7,
      approvedToday: 3,
      rejectedToday: 1,
      readyToConvert: 4,
    });
    setApprovalQueue([
      { id: 1, participant: "Alice Williams", submittedBy: "John Doe", submittedAt: "2025-10-12 09:00", participantId: 201 },
      { id: 2, participant: "Bob Taylor", submittedBy: "Jane Smith", submittedAt: "2025-10-11 14:30", participantId: 202 },
    ]);
    setRecentlyOnboarded([
      { participant: "Charlie Davis", date: "2025-10-10", manager: "Manager A" },
      { participant: "Diana Miller", date: "2025-10-09", manager: "Manager B" },
    ]);
    setLoading(false);
  }, []);

  const queueColumns = [
    { header: "Participant", key: "participant" },
    { header: "Submitted By", key: "submittedBy" },
    { header: "Submitted At", key: "submittedAt" },
    {
      header: "Action",
      key: "action",
      render: (_: any, row: any) => (
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

  if (loading) return <div className="p-6">Loading...</div>;

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