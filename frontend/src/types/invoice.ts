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
  xero_invoice_id?: string;
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
  processed_by?: string;
  xero_payment_id?: string;
  created_at?: string;
}

export interface InvoiceStats {
  total_invoices: number;
  total_outstanding: number;
  total_overdue: number;
  total_paid_this_month: number;
  average_payment_days: number;
}

export interface BillableService {
  id: string;
  appointment_id: number;
  participant_id: number;
  participant_name: string;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total_amount: number;
  support_worker_name: string;
  notes?: string;
  is_billable: boolean;
  invoice_id?: string;
  created_at: string;
}

export interface InvoiceGenerationRequest {
  participant_id?: number;
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_date: string;
  payment_method: string;
  service_ids: string[];
  include_gst: boolean;
  gst_rate: number;
  auto_send: boolean;
  notes?: string;
}

export interface XeroSyncStatus {
  connected: boolean;
  last_sync?: string;
  tenant_name?: string;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  error_message?: string;
}

export interface PaymentStats {
  total_received_this_month: number;
  total_outstanding: number;
  average_payment_days: number;
  overdue_amount: number;
  pending_payments: number;
}

// For payment tracking with invoice details
export interface PaymentWithInvoice extends Payment {
  invoice_number: string;
  participant_name: string;
  participant_id: number;
  invoice_total: number;
}