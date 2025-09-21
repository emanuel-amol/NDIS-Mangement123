// frontend/src/services/quotations.ts
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (process as any).env?.VITE_API_BASE_URL ||
  "http://localhost:8000/api/v1";

export type QuotationItem = {
  id?: number;
  service_code: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  meta?: Record<string, any>;
};

export type Quotation = {
  id: number;
  participant_id: number;
  title: string;
  status: string;
  subtotal: number;
  total: number;
  items: QuotationItem[];
};

export async function fetchQuotation(id: number): Promise<Quotation> {
  const res = await fetch(`${API_BASE}/quotations/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateFromCarePlan(participantId: number): Promise<Quotation> {
  const res = await fetch(
    `${API_BASE}/quotations/participants/${participantId}/generate-from-care-plan`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createFromSupports(
  participantId: number,
  supports: any[]
): Promise<Quotation> {
  const res = await fetch(
    `${API_BASE}/quotations/participants/${participantId}/generate-from-supports`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supports }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
