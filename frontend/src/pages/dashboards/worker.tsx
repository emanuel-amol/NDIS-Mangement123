import React from "react";
import { Calendar, ClipboardList, MapPin, FileText, CheckCircle2 } from "lucide-react";

export default function WorkerDashboard() {
  const today = [
    { id: "SH-1001", time: "09:00–11:00", participant: "Alex Johnson", location: "Home Visit - St Kilda", tasks: 3 },
    { id: "SH-1002", time: "13:00–15:00", participant: "Mia Patel", location: "Community Access - Southbank", tasks: 2 },
  ];

  const tasks = [
    { id: "T-301", text: "Complete case note for Alex J.", done: false },
    { id: "T-302", text: "Upload consent form (M. Patel)", done: true },
    { id: "T-303", text: "Confirm transport for 3pm", done: false },
  ];

  const quickDocs = [
    { id: "QD-1", name: "Shift Guide", href: "#" },
    { id: "QD-2", name: "Incident Report", href: "#" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Support Worker</h1>
        <p className="text-sm text-gray-600">Today’s roster, tasks, and quick docs.</p>
      </header>

      {/* Today’s shifts */}
      <section className="bg-white rounded-xl shadow">
        <div className="p-5 border-b flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          <h2 className="text-lg font-semibold">Today’s Shifts</h2>
        </div>
        <ul className="divide-y">
          {today.map(s => (
            <li key={s.id} className="p-5 grid sm:grid-cols-4 gap-2">
              <div className="font-medium">{s.time}</div>
              <div className="text-gray-800">{s.participant}</div>
              <div className="text-gray-600 inline-flex items-center gap-1">
                <MapPin size={16}/> {s.location}
              </div>
              <div className="text-gray-600">{s.tasks} tasks</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <section className="bg-white rounded-xl shadow lg:col-span-2">
          <div className="p-5 border-b flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">My Tasks</h2>
          </div>
          <ul className="p-4 space-y-3">
            {tasks.map(t => (
              <li key={t.id} className="flex items-center gap-3">
                <input type="checkbox" defaultChecked={t.done} className="h-4 w-4" />
                <span className={t.done ? "line-through text-gray-400" : "text-gray-800"}>{t.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Quick docs */}
        <section className="bg-white rounded-xl shadow">
          <div className="p-5 border-b flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold">Quick Documents</h2>
          </div>
          <div className="p-4 space-y-3">
            {quickDocs.map(d => (
              <a key={d.id} href={d.href} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-800">{d.name}</span>
                <CheckCircle2 size={18} className="text-gray-400" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
