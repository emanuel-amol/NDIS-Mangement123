// frontend/src/pages/dashboards/WorkerDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import { auth, withAuth } from "../../services/auth";
import { dashboardAPI, WorkerDashboardResponse } from "../../services/dashboard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface ShiftRow {
  id: number;
  time: string;
  participants: string;
  status: string;
  notes: string | null;
}

interface ParticipantRow {
  participantId: number;
  name: string;
  nextAppointment: string;
}

export default function WorkerDashboard() {
  const [stats, setStats] = useState({
    shiftsToday: 0,
    hoursThisWeek: 0,
    participantsAssigned: 0,
    openTasks: 0,
  });
  const [todayShifts, setTodayShifts] = useState<ShiftRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadWorkerDashboard = async () => {
      try {
        const token = auth.token();
        if (!token) {
          throw new Error("You must be logged in to view the support worker dashboard.");
        }

        const meResponse = await fetch(`${API_BASE}/auth/me`, { headers: withAuth() });
        if (!meResponse.ok) {
          throw new Error("Unable to load profile. Please log in again.");
        }
        const me = await meResponse.json();
        const workerId = me.id;

        const dashboardData: WorkerDashboardResponse = await dashboardAPI.getWorkerDashboard(workerId);
        if (!mounted) return;

        setStats(dashboardData.stats);
        setTodayShifts(
          dashboardData.todayShifts.map((shift) => ({
            id: shift.id,
            time: shift.time,
            participants: shift.participants,
            status: shift.status,
            notes: shift.notes,
          }))
        );
        setParticipants(
          dashboardData.participants.map((participant) => ({
            participantId: participant.participantId,
            name: participant.name,
            nextAppointment: new Date(participant.nextAppointment).toLocaleString(),
          }))
        );
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load worker dashboard data";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadWorkerDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const shiftColumns = [
    { header: "Time", key: "time" },
    { header: "Participants", key: "participants" },
    { header: "Status", key: "status" },
    {
      header: "Notes",
      key: "notes",
      render: (value: string | null) => value || "—",
    },
  ];

  const participantColumns = [
    { header: "Name", key: "name" },
    { header: "Next Appointment", key: "nextAppointment" },
  ];

  if (loading) {
    return <div className="p-6">Loading support worker dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Worker Dashboard"
        actions={
          <>
            <Link to="/shifts" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              View Today's Roster
            </Link>
            <Link to="/notes/new" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Log Progress Note
            </Link>
          </>
        }
      />

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Shifts Today" value={stats.shiftsToday} />
        <StatCard title="Hours This Week" value={stats.hoursThisWeek} />
        <StatCard title="Participants Assigned" value={stats.participantsAssigned} />
        <StatCard title="Open Tasks" value={stats.openTasks} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Today's Shifts</h2>
        <Table columns={shiftColumns} data={todayShifts} emptyMessage="No shifts today" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">My Participants</h2>
        <Table columns={participantColumns} data={participants} emptyMessage="No assigned participants" />
      </div>
    </div>
  );
}
