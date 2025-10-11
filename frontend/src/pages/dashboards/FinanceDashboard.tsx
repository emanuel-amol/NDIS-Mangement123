// frontend/src/pages/dashboards/FinanceDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import { fetchFinanceStats, fetchInvoicesByStatus } from "../../services/invoicing";
import { Invoice } from "../../types/invoice";

const currencyFormatter = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

interface ReadyInvoiceRow {
  id: string;
  invoiceNumber: string;
  participant: string;
  period: string;
  amount: string;
}

interface ReceivableRow {
  bucket: string;
  amount: string;
  count: number;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`;
};

const buildAgedBuckets = (invoices: Invoice[]): ReceivableRow[] => {
  const buckets: Record<string, { amount: number; count: number }> = {
    "0-30 days": { amount: 0, count: 0 },
    "31-60 days": { amount: 0, count: 0 },
    "61-90 days": { amount: 0, count: 0 },
    "90+ days": { amount: 0, count: 0 },
  };
  const today = new Date();

  invoices.forEach((invoice) => {
    const reference = invoice.due_date || invoice.issue_date;
    if (!reference) return;
    const dueDate = new Date(reference);
    const diffDays = Math.max(0, Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    let bucketKey: keyof typeof buckets;
    if (diffDays <= 30) bucketKey = "0-30 days";
    else if (diffDays <= 60) bucketKey = "31-60 days";
    else if (diffDays <= 90) bucketKey = "61-90 days";
    else bucketKey = "90+ days";

    buckets[bucketKey].amount += invoice.amount_outstanding || 0;
    buckets[bucketKey].count += 1;
  });

  return Object.entries(buckets)
    .filter(([, value]) => value.count > 0)
    .map(([bucket, value]) => ({
      bucket,
      amount: currencyFormatter.format(value.amount),
      count: value.count,
    }));
};

export default function FinanceDashboard() {
  const [stats, setStats] = useState({
    invoicesToGenerate: 0,
    awaitingXeroSync: 0,
    outstandingReceivables: "$0.00",
    avgDaysToPayment: 0,
  });
  const [readyToInvoice, setReadyToInvoice] = useState<ReadyInvoiceRow[]>([]);
  const [agedReceivables, setAgedReceivables] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadFinanceData = async () => {
      try {
        const [statsData, draftInvoices, sentInvoices, overdueInvoices] = await Promise.all([
          fetchFinanceStats(),
          fetchInvoicesByStatus("draft"),
          fetchInvoicesByStatus("sent"),
          fetchInvoicesByStatus("overdue"),
        ]);

        if (!mounted) return;

        setStats({
          invoicesToGenerate: statsData.ready_to_invoice,
          awaitingXeroSync: statsData.awaiting_xero_sync,
          outstandingReceivables:
            statsData.total_outstanding_display ||
            currencyFormatter.format(statsData.total_outstanding ?? 0),
          avgDaysToPayment: statsData.avg_days_to_payment ?? statsData.average_payment_days ?? 0,
        });

        setReadyToInvoice(
          draftInvoices.map((invoice: Invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            participant: invoice.participant_name,
            period: formatPeriod(invoice.billing_period_start, invoice.billing_period_end),
            amount: currencyFormatter.format(invoice.total_amount),
          }))
        );

        const agedRows = buildAgedBuckets([...sentInvoices, ...overdueInvoices]);
        setAgedReceivables(agedRows);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load finance dashboard data";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadFinanceData();
    return () => {
      mounted = false;
    };
  }, []);

  const invoiceColumns = useMemo(
    () => [
      { header: "Invoice", key: "invoiceNumber" },
      { header: "Participant", key: "participant" },
      { header: "Service Period", key: "period" },
      { header: "Amount", key: "amount" },
      {
        header: "Action",
        key: "action",
        render: (_: unknown, row: ReadyInvoiceRow) => (
          <Link
            to={`/invoices/${row.id}`}
            className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs"
          >
            Review
          </Link>
        ),
      },
    ],
    []
  );

  const receivablesColumns = [
    { header: "Age Bucket", key: "bucket" },
    { header: "Amount", key: "amount" },
    { header: "Count", key: "count" },
  ];

  if (loading) {
    return <div className="p-6">Loading finance dashboard...</div>;
  }

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

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

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
