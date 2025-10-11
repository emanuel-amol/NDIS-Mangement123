// frontend/src/pages/dashboards/ProviderDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function ProviderDashboard() {
  const [stats, setStats] = useState({
    prospective: 0,
    plansReady: 0,
    quotationsAwaiting: 0,
    documentsMissing: 0,
  });
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      prospective: 12,
      plansReady: 5,
      quotationsAwaiting: 3,
      documentsMissing: 8,
    });
    setParticipants([
      { id: 1, name: "John Smith", stage: "Care Plan", lastUpdate: "2025-10-10", participantId: 101 },
      { id: 2, name: "Mary Johnson", stage: "Risk Assessment", lastUpdate: "2025-10-11", participantId: 102 },
      { id: 3, name: "Robert Brown", stage: "Quotation", lastUpdate: "2025-10-09", participantId: 103 },
    ]);
    setLoading(false);
  }, []);

  const columns = [
    { header: "Name", key: "name" },
    { header: "Stage", key: "stage" },
    { header: "Last Update", key: "lastUpdate" },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Link to={`/care/${row.participantId}`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            Care Plan
          </Link>
          <Link to={`/care/${row.participantId}/risk`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            Risk
          </Link>
          <Link to={`/quotations?participant=${row.participantId}`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            Quotation
          </Link>
          <Link to={`/documents?participant=${row.participantId}`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            Documents
          </Link>
        </div>
      ),
    },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Admin Dashboard"
        actions={
          <>
            <Link to="/care/new" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              New Care Plan
            </Link>
            <Link to="/quotations/new" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Generate Quotation
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Prospective Participants"
          value={stats.prospective}
          hint="In progress"
          to="/participants?status=prospective"
        />
        <StatCard title="Care Plans Ready" value={stats.plansReady} hint="Ready to finalize" />
        <StatCard title="Quotations Awaiting" value={stats.quotationsAwaiting} hint="Awaiting finalize" />
        <StatCard title="Documents Missing" value={stats.documentsMissing} hint="Signatures needed" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">My Open Participants</h2>
        <Table columns={columns} data={participants} emptyMessage="No open participants" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recently Finalised</h2>
        <p className="text-sm text-gray-500">No recently finalized items</p>
      </div>
    </div>
  );
}