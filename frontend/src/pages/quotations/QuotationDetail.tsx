// frontend/src/pages/quotations/QuotationDetail.tsx
import React, { useEffect, useState } from "react";
import type { Quotation, QuotationItem } from "../../services/quotations";
import { fetchQuotation } from "../../services/quotations";

type Props = { quotationId: number };

export default function QuotationDetail({ quotationId }: Props) {
  const [q, setQ] = useState<Quotation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = await fetchQuotation(quotationId);
        if (ok) setQ(data);
      } catch (e: any) {
        if (ok) setErr(e.message || "Failed to load quotation");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [quotationId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!q) return null;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{q.title}</h1>
          <p className="text-sm text-gray-500">
            Quotation #{q.id} · Status: {q.status}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Subtotal</div>
          <div className="text-lg font-semibold">${Number(q.subtotal).toFixed(2)}</div>
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-bold">${Number(q.total).toFixed(2)}</div>
        </div>
      </header>

      <section className="bg-white rounded-xl shadow border">
        <div className="px-4 py-3 border-b text-sm font-medium">Service Items</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left w-40">Service Code</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right w-24">Quantity</th>
                <th className="px-4 py-2 text-left w-24">Unit</th>
                <th className="px-4 py-2 text-right w-24">Rate</th>
                <th className="px-4 py-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.items?.map((it: QuotationItem) => (
                <tr key={it.id || `${it.service_code}-${it.description}`}>
                  <td className="px-4 py-2 font-mono">{it.service_code}</td>
                  <td className="px-4 py-2">
                    <div>{it.description}</div>
                    {it.meta?.support_type && (
                      <div className="mt-1 text-xs text-gray-500">
                        {[
                          it.meta.support_type,
                          it.meta.frequency,
                          it.meta.duration,
                          it.meta.location,
                          it.meta.staff_ratio,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{Number(it.quantity).toFixed(2)}</td>
                  <td className="px-4 py-2">{it.unit}</td>
                  <td className="px-4 py-2 text-right">${Number(it.rate).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    ${Number(it.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
