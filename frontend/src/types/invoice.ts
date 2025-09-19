// frontend/src/types/invoice.ts
export interface InvoiceItem {
  id: string;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total_amount: number;
  support_worker_name: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  participant_id: number;
  participant_name: string;
  participant_ndis_number?: string;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_method: 'ndis_direct' | 'plan_managed' | 'self_managed';
  items: InvoiceItem[];
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_outstanding: number;
  payment_date?: string;
  payment_reference?: string;
  xero_invoice_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  processed_by: string;
  xero_payment_id?: string;
}

export interface InvoiceStats {
  total_invoices: number;
  total_outstanding: number;
  total_overdue: number;
  total_paid_this_month: number;
  average_payment_days: number;
}

export interface BillingSettings {
  invoice_prefix: string;
  invoice_due_days: number;
  gst_rate: number;
  payment_terms: string;
  bank_details: {
    account_name: string;
    bsb: string;
    account_number: string;
  };
  xero_integration_enabled: boolean;
  auto_send_invoices: boolean;
  late_payment_fee_enabled: boolean;
  late_payment_fee_amount: number;
}