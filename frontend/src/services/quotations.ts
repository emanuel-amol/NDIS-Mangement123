// Adjust base URL/env var name to your project
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1";

export type QuotationItem = {
  id: number;
  service_code: string;
  label: string;
  unit: string;
  quantity: number;
  rate: number;
  line_total: number;
  meta?: Record<string, any>;
};

export type Quotation = {
  id: number;
  participant_id: number;
  care_plan_id?: number | null;
  quote_number: string;
  version: number;
  status: "draft" | "final";
  currency: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  pricing_snapshot?: Record<string, any>;
  care_plan_snapshot?: Record<string, any>;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at: string;
  updated_at: string;
  items: QuotationItem[];
};

export async function generateFromCarePlan(participantId: number): Promise<Quotation> {
  const res = await fetch(`${API_BASE}/quotations/participants/${participantId}/generate-from-care-plan`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || "Failed to generate quotation");
  }
  return res.json();
}

export async function listQuotations(participantId: number): Promise<Quotation[]> {
  const res = await fetch(`${API_BASE}/quotations/participants/${participantId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to list quotations");
  return res.json();
}

export async function finaliseQuotation(quotationId: number): Promise<Quotation> {
  const res = await fetch(`${API_BASE}/quotations/${quotationId}/finalise`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) throw new Error("Failed to finalise quotation");
  return res.json();
}
