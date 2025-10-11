// frontend/src/pages/dashboards/ParticipantDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function ParticipantDashboard() {
  const [stats, setStats] = useState({
    onboardingStatus: "In Progress",
    signedDocuments: 0,
    upcomingAppointments: 0,
    outstandingActions: 0,
  });
  const [documents, setDocuments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      onboardingStatus: "Review Stage",
      signedDocuments: 3,
      upcomingAppointments: 2,
      outstandingActions: 1,
    });
    setDocuments([
      { id: 1, name: "Care Plan Agreement", status: "Pending Signature" },
      { id: 2, name: "Privacy Consent", status: "Signed" },
      { id: 3, name: "Service Agreement", status: "Pending Signature" },
    ]);
    setAppointments([
      { date: "2025-10-15", time: "10:00 AM", type: "Initial Assessment" },
      { date: "2025-10-20", time: "2:00 PM", type: "Follow-up Visit" },
    ]);
    setLoading(false);
  }, []);

  const documentColumns = [
    { header: "Document Name", key: "name" },
    { header: "Status", key: "status" },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Link to={`/my-documents/${row.id}`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            View
          </Link>
          {row.status === "Pending Signature" && (
            <button className="text-emerald-600 hover:text-emerald-900 text-xs">Sign</button>
          )}
        </div>
      ),
    },
  ];

  const appointmentColumns = [
    { header: "Date", key: "date" },
    { header: "Time", key: "time" },
    { header: "Type", key: "type" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participant Dashboard"
        actions={
          <>
            <Link to="/my-documents" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Review & Sign Documents
            </Link>
            <Link to="/my-appointments" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              View Appointments
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Onboarding Status" value={stats.onboardingStatus} />
        <StatCard title="Signed Documents" value={stats.signedDocuments} />
        <StatCard title="Upcoming Appointments" value={stats.upcomingAppointments} />
        <StatCard title="Outstanding Actions" value={stats.outstandingActions} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">My Documents</h2>
        <Table columns={documentColumns} data={documents} emptyMessage="No documents available" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Appointments</h2>
        <Table columns={appointmentColumns} data={appointments} emptyMessage="No upcoming appointments" />
      </div>
    </div>
  );
}