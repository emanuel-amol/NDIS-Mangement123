// frontend/src/pages/dashboards/FinanceDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";

export default function FinanceDashboard() {
  const [stats, setStats] = useState({
    invoicesToGenerate: 0,
    awaitingXeroSync: 0,
    outstandingReceivables: "$0",
    avgDaysToPayment: 0,
  });
  const [readyToInvoice, setReadyToInvoice] = useState([]);
  const [agedReceivables, setAgedReceivables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      invoicesToGenerate: 18,
      awaitingXeroSync: 5,
      outstandingReceivables: "$45,230",
      avgDaysToPayment: 21,
    });
    setReadyToInvoice([
      { id: 1, participant: "Michael Chen", servicePeriod: "Sept 2025", amount: "$2,450" },
      { id: 2, participant: "Lisa Martinez", servicePeriod: "Sept 2025", amount: "$3,120" },
    ]);
    setAgedReceivables([
      { bucket: "0-30 days", amount: "$12,500", count: 8 },
      { bucket: "31-60 days", amount: "$18,230", count: 12 },
      { bucket: "61-90 days", amount: "$14,500", count: 7 },
    ]);
    setLoading(false);
  }, []);

  const invoiceColumns = [
    { header: "Participant", key: "participant" },
    { header: "Service Period", key: "servicePeriod" },
    { header: "Amount", key: "amount" },
    {
      header: "Action",
      key: "action",
      render: () => (
        <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs">
          Generate
        </button>
      ),
    },
  ];

  const receivablesColumns = [
    { header: "Age Bucket", key: "bucket" },
    { header: "Amount", key: "amount" },
    { header: "Count", key: "count" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Dashboard"
        actions={
          <>
            <Link to="/invoices/generate" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              Generate Invoices
            </Link>
            <Link to="/xero" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
              Sync with Xero
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Invoices to Generate" value={stats.invoicesToGenerate} />
        <StatCard title="Awaiting Xero Sync" value={stats.awaitingXeroSync} />
        <StatCard title="Outstanding Receivables" value={stats.outstandingReceivables} />
        <StatCard title="Avg Days to Payment" value={stats.avgDaysToPayment} />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ready to Invoice</h2>
        <Table columns={invoiceColumns} data={readyToInvoice} emptyMessage="No invoices ready" />
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Aged Receivables</h2>
        <Table columns={receivablesColumns} data={agedReceivables} emptyMessage="No outstanding receivables" />
      </div>
    </div>
  );
}