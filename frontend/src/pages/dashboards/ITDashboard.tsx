// frontend/src/pages/dashboards/ITDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function ITDashboard() {
  const [stats, setStats] = useState({
    apiHealth: "Healthy",
    backgroundJobs: 0,
    errorRate: "0.02%",
    storageUsed: "65%",
  });
  const [recentErrors, setRecentErrors] = useState([]);
  const [jobQueue, setJobQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      apiHealth: "Healthy",
      backgroundJobs: 42,
      errorRate: "0.02%",
      storageUsed: "65%",
    });
    setRecentErrors([
      { time: "2025-10-12 08:45", service: "Payment Gateway", message: "Connection timeout" },
      { time: "2025-10-12 07:30", service: "Document Service", message: "S3 upload failed" },
    ]);
    setJobQueue([
      { name: "Invoice Generation", state: "Running", duration: "2m 15s" },
      { name: "Daily Backup", state: "Queued", duration: "-" },
    ]);
    setLoading(false);
  }, []);

  const errorColumns = [
    { header: "Time", key: "time" },
    { header: "Service", key: "service" },
    { header: "Message", key: "message" },
  ];

  const jobColumns = [
    { header: "Job Name", key: "name" },
    {
      header: "State",
      key: "state",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs ${value === "Running" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
          {value}
        </span>
      ),
    },
    { header: "Duration", key: "duration" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="IT Dashboard"
        actions={
          <>
            <Link to="/logs" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Open Logs
            </Link>
            <Link to="/system" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              View System Status
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="API Health" value={stats.apiHealth} />
        <StatCard title="Background Jobs Today" value={stats.backgroundJobs} />
        <StatCard title="Error Rate" value={stats.errorRate} />
        <StatCard title="Storage Used" value={stats.storageUsed} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Errors</h2>
        <Table columns={errorColumns} data={recentErrors} emptyMessage="No recent errors" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Job Queue</h2>
        <Table columns={jobColumns} data={jobQueue} emptyMessage="No jobs in queue" />
      </div>
    </div>
  );
}