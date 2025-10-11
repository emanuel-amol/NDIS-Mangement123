// frontend/src/pages/dashboards/ProviderDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import { dashboardAPI, ProviderParticipantRow, ProviderSummary } from "../../services/dashboard";

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");

interface ParticipantRow {
  participantId: number;
  name: string;
  stage: string;
  careStatus: string;
  riskStatus: string;
  quotationStatus: string;
  documentsStatus: string;
  missingDocsCount: number;
  lastUpdated: string;
}

export default function ProviderDashboard() {
  const [summary, setSummary] = useState<ProviderSummary>({
    prospective: 0,
    plans_ready: 0,
    quotes_awaiting: 0,
    documents_missing: 0,
    ready_to_onboard: 0,
  });
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProviderData = async () => {
      try {
        const [summaryData, participantData] = await Promise.all([
          dashboardAPI.getProviderSummary(),
          dashboardAPI.getProviderParticipants(),
        ]);

        if (!mounted) return;

        setSummary(summaryData);
        setParticipants(
          participantData.map((row: ProviderParticipantRow) => ({
            participantId: row.participantId,
            name: row.name,
            stage: row.stage,
            careStatus: row.careStatus,
            riskStatus: row.riskStatus,
            quotationStatus: row.quotationStatus,
            documentsStatus: row.documentsStatus,
            missingDocsCount: row.missingDocsCount,
            lastUpdated: formatDateTime(row.lastUpdated),
          }))
        );
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load provider dashboard data";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProviderData();
    return () => {
      mounted = false;
    };
  }, []);

  const columns = [
    { header: "Name", key: "name" },
    { header: "Stage", key: "stage" },
    { header: "Care Plan", key: "careStatus" },
    { header: "Risk", key: "riskStatus" },
    { header: "Quotation", key: "quotationStatus" },
    { header: "Missing Docs", key: "missingDocsCount" },
    { header: "Last Updated", key: "lastUpdated" },
    {
      header: "Actions",
      key: "actions",
      render: (_: unknown, row: ParticipantRow) => (
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

  if (loading) {
    return <div className="p-6">Loading provider dashboard...</div>;
  }

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

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Prospective Participants"
          value={summary.prospective}
          hint="Currently in onboarding"
          to="/participants?status=prospective"
        />
        <StatCard title="Care Plans Ready" value={summary.plans_ready} hint="Care & risk complete" />
        <StatCard title="Quotations Awaiting" value={summary.quotes_awaiting} hint="Needs quotation" />
        <StatCard title="Documents Missing" value={summary.documents_missing} hint="Required documents outstanding" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">My Open Participants</h2>
          <span className="text-xs text-gray-500">Ready to onboard: {summary.ready_to_onboard}</span>
        </div>
        <Table columns={columns} data={participants} emptyMessage="No open participants" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recently Finalised</h2>
        <p className="text-sm text-gray-500">No recently finalized items</p>
      </div>
    </div>
  );
}
