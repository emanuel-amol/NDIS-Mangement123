// frontend/src/services/invoicing.ts
import { BillableService, Invoice, InvoiceGenerationRequest } from '../types/invoice';
import { withAuth } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface FinanceStats {
  ready_to_invoice: number;
  awaiting_xero_sync: number;
  total_outstanding: number;
  total_outstanding_display: string;
  avg_days_to_payment: number;
  average_payment_days?: number;
  total_invoices?: number;
  total_overdue?: number;
  total_paid_this_month?: number;
}

export interface BillableServicesFilters {
  start_date?: string;
  end_date?: string;
  participant_id?: number;
  status?: string;
  unbilled_only?: boolean;
}

/**
 * Fetch billable services from completed appointments
 */
export const fetchBillableServices = async (filters: BillableServicesFilters = {}): Promise<BillableService[]> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (filters.start_date) {
      queryParams.append('start_date', filters.start_date);
    }

    if (filters.end_date) {
      queryParams.append('end_date', filters.end_date);
    }

    if (filters.participant_id) {
      queryParams.append('participant_id', filters.participant_id.toString());
    }

    // Default to completed services only
    queryParams.append('status', filters.status || 'completed');

    // Default to unbilled services only
    queryParams.append('unbilled_only', (filters.unbilled_only !== false).toString());

    const response = await fetch(`${API_BASE_URL}/invoicing/billable-services?${queryParams.toString()}`, {
      headers: withAuth()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch billable services: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching billable services:', error);
    throw error;
  }
};

/**
 * Transform billable service to invoice item format
 */
export const transformBillableServiceToInvoiceItem = (service: BillableService) => {
  return {
    id: service.id,
    appointment_id: service.appointment_id,
    service_type: service.service_type,
    date: service.date,
    start_time: service.start_time,
    end_time: service.end_time,
    hours: service.hours,
    hourly_rate: service.hourly_rate,
    total_amount: service.total_amount,
    support_worker_name: service.support_worker_name,
    notes: service.notes
  };
};

/**
 * Generate invoice from selected billable services
 */
export const generateInvoice = async (invoiceData: InvoiceGenerationRequest): Promise<{ invoice_number: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/invoicing/generate`, {
      method: 'POST',
      headers: withAuth(),
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate invoice: ${response.statusText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
};

/**
 * Filter services by billing period
 */
export const filterServicesByBillingPeriod = (
  services: BillableService[],
  startDate: string,
  endDate: string
): BillableService[] => {
  return services.filter(service => {
    const serviceDate = new Date(service.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    return serviceDate >= start && serviceDate <= end;
  });
};

/**
 * Group services by participant
 */
export const groupServicesByParticipant = (services: BillableService[]): Record<string, BillableService[]> => {
  return services.reduce((groups, service) => {
    const key = service.participant_id.toString();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(service);
    return groups;
  }, {} as Record<string, BillableService[]>);
};

/**
 * Calculate totals for services
 */
export const calculateServiceTotals = (services: BillableService[]) => {
  const subtotal = services.reduce((sum, service) => sum + service.total_amount, 0);
  return {
    subtotal,
    serviceCount: services.length,
    totalHours: services.reduce((sum, service) => sum + service.hours, 0)
  };
};

/**
 * Get services for a specific participant
 */
export const getParticipantServices = async (
  participantId: number,
  filters: Omit<BillableServicesFilters, 'participant_id'> = {}
): Promise<BillableService[]> => {
  return fetchBillableServices({
    ...filters,
    participant_id: participantId
  });
};

/**
 * Check if service has been invoiced
 */
export const isServiceInvoiced = (service: BillableService): boolean => {
  return !!service.invoice_id;
};

/**
 * Get uninvoiced services only
 */
export const getUninvoicedServices = (services: BillableService[]): BillableService[] => {
  return services.filter(service => !isServiceInvoiced(service));
};

export const fetchFinanceStats = async (): Promise<FinanceStats> => {
  const response = await fetch(`${API_BASE_URL}/invoicing/stats`, {
    headers: withAuth(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to load finance stats');
  }

  return response.json();
};

export const fetchInvoicesByStatus = async (status: string | null): Promise<Invoice[]> => {
  const url = new URL(`${API_BASE_URL}/invoices`);
  if (status) {
    url.searchParams.set('status_filter', status);
  }

  const response = await fetch(url.toString(), {
    headers: withAuth(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to load invoices');
  }

  return response.json();
};
