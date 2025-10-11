// frontend/src/pages/dashboards/WorkerDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function WorkerDashboard() {
  const [stats, setStats] = useState({
    shiftsToday: 0,
    hoursThisWeek: 0,
    participantsAssigned: 0,
    openTasks: 0,
  });
  const [todayShifts, setTodayShifts] = useState([]);
  const [myParticipants, setMyParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      shiftsToday: 3,
      hoursThisWeek: 28,
      participantsAssigned: 12,
      openTasks: 5,
    });
    setTodayShifts([
      { id: 1, time: "09:00 - 12:00", participant: "Emma Wilson", location: "Home Visit", status: "Scheduled" },
      { id: 2, time: "14:00 - 17:00", participant: "James Brown", location: "Community Center", status: "Scheduled" },
    ]);
    setMyParticipants([
      { name: "Emma Wilson", nextAppointment: "Today 09:00" },
      { name: "James Brown", nextAppointment: "Today 14:00" },
      { name: "Olivia Davis", nextAppointment: "Tomorrow 10:00" },
    ]);
    setLoading(false);
  }, []);

  const shiftColumns = [
    { header: "Time", key: "time" },
    { header: "Participant", key: "participant" },
    { header: "Location", key: "location" },
    { header: "Status", key: "status" },
    {
      header: "Actions",
      key: "actions",
      render: () => (
        <div className="flex gap-2">
          <button className="text-indigo-600 hover:text-indigo-900 text-xs">Start</button>
          <button className="text-emerald-600 hover:text-emerald-900 text-xs">Complete</button>
        </div>
      ),
    },
  ];

  const participantColumns = [
    { header: "Name", key: "name" },
    { header: "Next Appointment", key: "nextAppointment" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

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
        <Table columns={participantColumns} data={myParticipants} emptyMessage="No assigned participants" />
      </div>
    </div>
  );
}