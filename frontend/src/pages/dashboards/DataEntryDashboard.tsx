// frontend/src/pages/dashboards/DataEntryDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function DataEntryDashboard() {
  const [stats, setStats] = useState({
    batchesUploaded: 0,
    docsPendingValidation: 0,
    failedImports: 0,
    avgProcessingTime: "0s",
  });
  const [pendingValidation, setPendingValidation] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      batchesUploaded: 23,
      docsPendingValidation: 47,
      failedImports: 3,
      avgProcessingTime: "45s",
    });
    setPendingValidation([
      { id: 1, doc: "Care_Plan_2025_Oct.pdf", participant: "Emma Watson", type: "Care Plan" },
      { id: 2, doc: "Service_Agreement_Oct.pdf", participant: "David Lee", type: "Service Agreement" },
    ]);
    setRecentUploads([
      { batch: "Batch_Oct_12_AM", size: "24 files", status: "Completed", time: "09:45" },
      { batch: "Batch_Oct_11_PM", size: "18 files", status: "Completed", time: "16:30" },
    ]);
    setLoading(false);
  }, []);

  const validationColumns = [
    { header: "Document", key: "doc" },
    { header: "Participant", key: "participant" },
    { header: "Type", key: "type" },
    {
      header: "Action",
      key: "action",
      render: () => (
        <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs">
          Validate
        </button>
      ),
    },
  ];

  const uploadColumns = [
    { header: "Batch", key: "batch" },
    { header: "Size", key: "size" },
    {
      header: "Status",
      key: "status",
      render: (value: string) => (
        <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-800">
          {value}
        </span>
      ),
    },
    { header: "Time", key: "time" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Entry Dashboard"
        actions={
          <>
            <Link to="/bulk-upload" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Upload Batch
            </Link>
            <Link to="/documents/pending" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Validate Pending
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Batches Uploaded" value={stats.batchesUploaded} />
        <StatCard title="Docs Pending Validation" value={stats.docsPendingValidation} />
        <StatCard title="Failed Imports" value={stats.failedImports} />
        <StatCard title="Avg Processing Time" value={stats.avgProcessingTime} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pending Validation</h2>
        <Table columns={validationColumns} data={pendingValidation} emptyMessage="No documents pending validation" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Uploads</h2>
        <Table columns={uploadColumns} data={recentUploads} emptyMessage="No recent uploads" />
      </div>
    </div>
  );
}