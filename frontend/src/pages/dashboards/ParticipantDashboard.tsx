// frontend/src/pages/dashboards/ParticipantDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import { auth, withAuth } from "../../services/auth";
import { dashboardAPI, ParticipantDashboardResponse } from "../../services/dashboard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface DocumentRow {
  id: number;
  name: string;
  status: string | null;
  createdAt: string | null;
}

interface AppointmentRow {
  id: number;
  date: string;
  time: string;
  serviceType: string;
  status: string;
}

export default function ParticipantDashboard() {
  const [participantName, setParticipantName] = useState<string>("");
  const [stats, setStats] = useState({
    onboardingStatus: "Loading...",
    signedDocuments: 0,
    upcomingAppointments: 0,
    outstandingActions: 0,
  });
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadParticipantDashboard = async () => {
      try {
        const token = auth.token();
        if (!token) {
          throw new Error("You must be logged in to view this dashboard.");
        }

        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: withAuth(),
        });

        if (!meResponse.ok) {
          throw new Error("Unable to load profile. Please log in again.");
        }

        const me = await meResponse.json();
        const participantId = me.participant_id || me.profile_data?.participant_id;
        if (!participantId) {
          throw new Error("No participant profile is linked to this account.");
        }

        const dashboardData: ParticipantDashboardResponse = await dashboardAPI.getParticipantDashboard(participantId);
        if (!mounted) return;

        setParticipantName(dashboardData.participant.name);
        setStats(dashboardData.stats);
        setDocuments(
          dashboardData.documents.map((doc) => ({
            id: doc.id,
            name: doc.name,
            status: doc.status,
            createdAt: doc.created_at,
          }))
        );
        setAppointments(
          dashboardData.appointments.map((appt) => ({
            id: appt.id,
            date: appt.date,
            time: appt.time,
            serviceType: appt.serviceType,
            status: appt.status,
          }))
        );
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load participant dashboard data";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadParticipantDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const documentColumns = [
    { header: "Document Name", key: "name" },
    { header: "Status", key: "status" },
    { header: "Uploaded", key: "createdAt" },
    {
      header: "Actions",
      key: "actions",
      render: (_: unknown, row: DocumentRow) => (
        <div className="flex gap-2">
          <Link to={`/my-documents/${row.id}`} className="text-indigo-600 hover:text-indigo-900 text-xs">
            View
          </Link>
          {row.status?.toLowerCase().includes("pending") && (
            <button className="text-emerald-600 hover:text-emerald-900 text-xs">Sign</button>
          )}
        </div>
      ),
    },
  ];

  const appointmentColumns = [
    { header: "Date", key: "date" },
    { header: "Time", key: "time" },
    { header: "Service", key: "serviceType" },
    { header: "Status", key: "status" },
  ];

  if (loading) {
    return <div className="p-6">Loading participant dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={participantName ? `${participantName}'s Dashboard` : "Participant Dashboard"}
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

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

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
