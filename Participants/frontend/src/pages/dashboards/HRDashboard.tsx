// frontend/src/pages/dashboards/HRDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function HRDashboard() {
  const [stats, setStats] = useState({
    shiftsToFill: 0,
    unassignedParticipants: 0,
    complianceExpiring: 0,
    overtimeRisk: 0,
  });
  const [shiftsToFill, setShiftsToFill] = useState([]);
  const [workerCompliance, setWorkerCompliance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      shiftsToFill: 15,
      unassignedParticipants: 3,
      complianceExpiring: 8,
      overtimeRisk: 2,
    });
    setShiftsToFill([
      { id: 1, shift: "Morning - 09:00", participant: "Sarah Lee", skillsNeeded: "First Aid, NDIS" },
      { id: 2, shift: "Afternoon - 14:00", participant: "Tom White", skillsNeeded: "Personal Care" },
    ]);
    setWorkerCompliance([
      { worker: "Jane Doe", requirement: "WWCC", expiry: "2025-11-15", status: "Expiring Soon" },
      { worker: "John Smith", requirement: "First Aid", expiry: "2025-10-30", status: "Urgent" },
    ]);
    setLoading(false);
  }, []);

  const shiftColumns = [
    { header: "Shift", key: "shift" },
    { header: "Participant", key: "participant" },
    { header: "Skills Needed", key: "skillsNeeded" },
    {
      header: "Action",
      key: "action",
      render: () => (
        <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs">
          Assign
        </button>
      ),
    },
  ];

  const complianceColumns = [
    { header: "Worker", key: "worker" },
    { header: "Requirement", key: "requirement" },
    { header: "Expiry", key: "expiry" },
    {
      header: "Status",
      key: "status",
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-xs ${value === "Urgent" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
          {value}
        </span>
      ),
    },
    {
      header: "Action",
      key: "action",
      render: () => (
        <button className="text-indigo-600 hover:text-indigo-900 text-xs">Notify</button>
      ),
    },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Dashboard"
        actions={
          <>
            <Link to="/roster" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Open Roster Board
            </Link>
            <Link to="/workers/assign" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Assign Worker
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Shifts to Fill" value={stats.shiftsToFill} />
        <StatCard title="Unassigned Participants" value={stats.unassignedParticipants} />
        <StatCard title="Compliance Expiring" value={stats.complianceExpiring} hint="Within 30 days" />
        <StatCard title="Overtime Risk" value={stats.overtimeRisk} hint="This week" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Shifts to Fill</h2>
        <Table columns={shiftColumns} data={shiftsToFill} emptyMessage="All shifts filled" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Worker Compliance</h2>
        <Table columns={complianceColumns} data={workerCompliance} emptyMessage="All compliance up to date" />
      </div>
    </div>
  );
}