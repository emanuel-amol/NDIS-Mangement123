import React from "react";
import { DollarSign, AlertTriangle, FileSpreadsheet, ArrowRight, TrendingUp } from "lucide-react";

export default function FinanceDashboard() {
  const kpis = [
    { label: "Invoices (This Week)", value: 18, accent: "bg-emerald-50 text-emerald-700" },
    { label: "Unpaid Invoices", value: 5, accent: "bg-amber-50 text-amber-700" },
    { label: "Variance Alerts", value: 2, accent: "bg-rose-50 text-rose-700" },
  ];

  const unpaid = [
    { id: "INV-1041", participant: "Alex Johnson", amount: "$420.00", due: "Due today" },
    { id: "INV-1039", participant: "Mia Patel", amount: "$280.00", due: "2 days overdue" },
    { id: "INV-1037", participant: "Sam Lee", amount: "$160.00", due: "5 days overdue" },
  ];

  const alerts = [
    { id: "VAR-22", text: "Plan vs actual exceeded by 15% – P. Brown (Core)", severity: "High" },
    { id: "VAR-19", text: "Approaching monthly limit – J. Smith (CB Daily Activities)", severity: "Med" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance / Billing</h1>
          <p className="text-sm text-gray-600">Invoices, variances, and quick exports.</p>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow p-5 border-l-4 border-emerald-500">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded ${k.accent}`}>
              <DollarSign size={16} /> {k.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unpaid invoices */}
        <section className="bg-white rounded-xl shadow lg:col-span-2">
          <div className="p-5 border-b flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Unpaid Invoices</h2>
          </div>
          <ul className="divide-y">
            {unpaid.map(i => (
              <li key={i.id} className="p-5 grid sm:grid-cols-4 gap-2">
                <div className="font-mono">{i.id}</div>
                <div className="text-gray-800">{i.participant}</div>
                <div className="text-gray-900 font-medium">{i.amount}</div>
                <div className="text-gray-600">{i.due}</div>
              </li>
            ))}
          </ul>
          <div className="p-4 border-t flex justify-end">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white hover:opacity-90">
              Export CSV <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Variance / limit alerts */}
        <section className="bg-white rounded-xl shadow">
          <div className="p-5 border-b flex items-center gap-2">
            <TrendingUp size={18} className="text-rose-600" />
            <h2 className="text-lg font-semibold">Plan Variance Alerts</h2>
          </div>
          <ul className="p-4 space-y-3">
            {alerts.map(a => (
              <li key={a.id} className="flex items-start gap-3">
                <AlertTriangle className="text-rose-600 mt-0.5" size={18} />
                <div>
                  <div className="text-sm font-medium text-gray-900">{a.text}</div>
                  <div className="text-xs text-gray-500">Severity: {a.severity}</div>
                </div>
              </li>
            ))}
            {alerts.length === 0 && <li className="text-sm text-gray-500">No alerts 🎉</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
