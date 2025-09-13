import React, { useMemo } from "react";
import {
  Users, UserPlus, ClipboardList, AlertTriangle,
  FileText, Calendar, Settings, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Mocked org-wide metrics — swap with API later
  const kpis = useMemo(() => ([
    { label: "Participants", value: 24, icon: Users, accent: "border-blue-500 bg-blue-50 text-blue-700" },
    { label: "Staff", value: 8, icon: UserPlus, accent: "border-emerald-500 bg-emerald-50 text-emerald-700" },
    { label: "Pending Referrals", value: 3, icon: ClipboardList, accent: "border-amber-500 bg-amber-50 text-amber-700" },
    { label: "Critical Alerts", value: 1, icon: AlertTriangle, accent: "border-rose-500 bg-rose-50 text-rose-700" },
  ]), []);

  const quickLinks = [
    { label: "Participants", icon: Users, onClick: () => navigate("/admin/participants") },
    { label: "Referrals", icon: ClipboardList, onClick: () => navigate("/provider") }, // reuse provider list
    { label: "Documents", icon: FileText, onClick: () => navigate("/admin/documents") },
    { label: "Roster", icon: Calendar, onClick: () => navigate("/admin/roster") },
    { label: "Settings", icon: Settings, onClick: () => navigate("/admin/settings") },
  ];

  const recent = [
    { id: "ACT-1042", title: "Care plan updated – Alex Johnson", when: "2h ago" },
    { id: "ACT-1041", title: "New referral submitted – Sam Lee", when: "4h ago" },
    { id: "ACT-1040", title: "Service Agreement signed – Mia Patel", when: "Yesterday" },
  ];

  const approvals = [
    { id: "REF-0007", title: "Referral – Jordan Reed", type: "Referral", ago: "30m" },
    { id: "DOC-0192", title: "Document – Risk Assessment (A. Khan)", type: "Document", ago: "1h" },
  ];

  const alerts = [
    { id: "AL-0003", severity: "High", text: "Medication schedule overdue – P. Brown" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Org-wide overview and quick actions.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`bg-white rounded-xl shadow p-5 border-l-4 ${accent.split(" ")[0]}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${accent.split(" ").slice(1).join(" ")}`}>
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-500">{label}</div>
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Approvals + Recent */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending approvals */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <p className="text-xs text-gray-500">Actions requiring admin review</p>
            </div>
            <ul className="divide-y">
              {approvals.map((a) => (
                <li key={a.id} className="p-5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{a.title}</div>
                    <div className="text-xs text-gray-500">{a.type} • {a.ago} ago</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">View</button>
                    <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:opacity-90">Approve</button>
                    <button className="px-3 py-1.5 text-sm rounded bg-rose-600 text-white hover:opacity-90">Reject</button>
                  </div>
                </li>
              ))}
              {approvals.length === 0 && (
                <li className="p-6 text-sm text-gray-500">Nothing pending.</li>
              )}
            </ul>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="p-5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-500">{r.when}</div>
                  </div>
                  <button className="inline-flex items-center text-sm text-blue-600 hover:underline">
                    Open <ArrowRight className="ml-1" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Quick links + Alerts */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {quickLinks.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
                    <Icon size={18} /> {label}
                  </span>
                  <ArrowRight size={18} className="text-gray-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
            </div>
            <ul className="p-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <AlertTriangle className="text-rose-600 mt-0.5" size={18} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{a.text}</div>
                    <div className="text-xs text-gray-500">Severity: {a.severity}</div>
                  </div>
                </li>
              ))}
              {alerts.length === 0 && (
                <li className="text-sm text-gray-500">No alerts 🎉</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
