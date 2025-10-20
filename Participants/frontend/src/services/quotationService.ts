// frontend/src/services/quotationService.ts - Updated with NaN fixes
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export interface QuotationItem {
  id: number;
  service_code: string;
  label: string;
  unit: string;
  quantity: number;
  rate: number;
  line_total: number;
  meta?: Record<string, any>;
}

export interface Quotation {
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
}

export interface QuotationSummary {
  id: number;
  participant_id: number;
  quote_number: string;
  version: number;
  status: "draft" | "final";
  currency: string;
  grand_total: number;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at: string;
  updated_at: string;
  participant_name?: string;
  participant_ndis?: string;
  items_count: number;
}

export interface QuotationError {
  detail: string;
  code?: string;
}

class QuotationService {
  // 🔥 FIX: Safe number conversion utility
  private safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  }

  // 🔥 FIX: Sanitize quotation data to fix NaN values
  private sanitizeQuotation(quotation: any): Quotation {
    // Calculate correct totals from items if main totals are NaN
    const items = (quotation.items || []).map((item: any) => ({
      ...item,
      quantity: this.safeNumber(item.quantity),
      rate: this.safeNumber(item.rate),
      line_total: this.safeNumber(item.line_total) || (this.safeNumber(item.quantity) * this.safeNumber(item.rate))
    }));

    const calculatedSubtotal = items.reduce((sum: number, item: QuotationItem) => 
      sum + this.safeNumber(item.line_total), 0
    );
    
    const calculatedTax = calculatedSubtotal * 0.1; // 10% GST
    const calculatedGrandTotal = calculatedSubtotal + calculatedTax;

    return {
      ...quotation,
      subtotal: this.safeNumber(quotation.subtotal) || calculatedSubtotal,
      tax_total: this.safeNumber(quotation.tax_total) || calculatedTax,
      grand_total: this.safeNumber(quotation.grand_total) || calculatedGrandTotal,
      items
    };
  }

  // 🔥 FIX: Sanitize quotation summary data
  private sanitizeQuotationSummary(summary: any): QuotationSummary {
    return {
      ...summary,
      grand_total: this.safeNumber(summary.grand_total),
      items_count: this.safeNumber(summary.items_count) || (summary.items?.length || 0)
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData: QuotationError = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // If parsing error response fails, use the HTTP status text
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  /**
   * Generate a quotation from a participant's finalised care plan
   */
  async generateFromCarePlan(participantId: number): Promise<Quotation> {
    const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}/generate-from-care-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<any>(response);
    return this.sanitizeQuotation(data);
  }

  /**
   * Get all quotations for a specific participant
   */
  async getParticipantQuotations(participantId: number): Promise<Quotation[]> {
    const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<any[]>(response);
    return data.map(q => this.sanitizeQuotation(q));
  }

  /**
   * Get the latest quotation for a participant
   */
  async getLatestQuotation(participantId: number): Promise<Quotation> {
    const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}/latest`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<any>(response);
    return this.sanitizeQuotation(data);
  }

  /**
   * Get a specific quotation by ID
   */
  async getQuotation(quotationId: number): Promise<Quotation> {
    const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<any>(response);
    return this.sanitizeQuotation(data);
  }

  /**
   * Finalise a quotation (locks it from further changes)
   */
  async finaliseQuotation(quotationId: number): Promise<Quotation> {
    const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}/finalise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await this.handleResponse<any>(response);
    return this.sanitizeQuotation(data);
  }

  /**
   * Delete a draft quotation
   */
  async deleteQuotation(quotationId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this.handleResponse(response); // This will throw the error
    }
  }

  /**
   * Get all quotations across all participants (for admin/overview)
   */
  async getAllQuotations(): Promise<QuotationSummary[]> {
    try {
      const participantsResponse = await fetch(`${API_BASE_URL}/participants`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const participants = await this.handleResponse<any[]>(participantsResponse);
      
      const allQuotations: QuotationSummary[] = [];

      // Fetch quotations for each participant
      for (const participant of participants) {
        try {
          const quotations = await this.getParticipantQuotations(participant.id);
          
          const quotationsWithParticipant = quotations.map((q): QuotationSummary => 
            this.sanitizeQuotationSummary({
              id: q.id,
              participant_id: q.participant_id,
              quote_number: q.quote_number,
              version: q.version,
              status: q.status,
              currency: q.currency,
              grand_total: q.grand_total,
              valid_from: q.valid_from,
              valid_to: q.valid_to,
              created_at: q.created_at,
              updated_at: q.updated_at,
              participant_name: `${participant.first_name} ${participant.last_name}`,
              participant_ndis: participant.ndis_number || 'Pending',
              items_count: q.items?.length || 0
            })
          );

          allQuotations.push(...quotationsWithParticipant);
        } catch (error) {
          console.warn(`Failed to fetch quotations for participant ${participant.id}:`, error);
          // Continue with other participants even if one fails
        }
      }

      // Sort by creation date (newest first)
      return allQuotations.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error fetching all quotations:', error);
      return [];
    }
  }

  /**
   * Download quotation as PDF
   */
  async downloadQuotationPDF(quotationId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}/download`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      await this.handleResponse(response); // This will throw the error
    }

    return response.blob();
  }

  /**
   * Send quotation via email
   */
  async sendQuotationEmail(quotationId: number, emailOptions?: {
    recipient?: string;
    subject?: string;
    message?: string;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailOptions || {}),
    });

    if (!response.ok) {
      await this.handleResponse(response); // This will throw the error
    }
  }

  /**
   * Check if a participant can generate a quotation
   */
  async checkQuotationEligibility(participantId: number): Promise<{
    canGenerate: boolean;
    reasons?: string[];
    requirements?: {
      hasCarePlan: boolean;
      carePlanFinalised: boolean;
      hasPricingItems: boolean;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}/eligibility`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse(response);
    } catch (error) {
      console.warn('Quotation eligibility endpoint not available, checking manually');
      
      try {
        // Check participant care plan status
        const participantResponse = await fetch(`${API_BASE_URL}/participants/${participantId}`);
        const participant = await this.handleResponse<any>(participantResponse);
        
        // Check care plan finalisation status
        const requirementsResponse = await fetch(`${API_BASE_URL}/care/participants/${participantId}/onboarding-requirements`);
        const requirements = await this.handleResponse<any>(requirementsResponse);
        
        const hasCarePlan = requirements.requirements?.care_plan?.exists || false;
        const carePlanFinalised = requirements.requirements?.care_plan?.finalised || false;
        
        const canGenerate = hasCarePlan && carePlanFinalised;
        const reasons: string[] = [];
        
        if (!hasCarePlan) {
          reasons.push('Care plan must be created');
        }
        if (hasCarePlan && !carePlanFinalised) {
          reasons.push('Care plan must be finalised');
        }
        
        return {
          canGenerate,
          reasons: reasons.length > 0 ? reasons : undefined,
          requirements: {
            hasCarePlan,
            carePlanFinalised,
            hasPricingItems: true // Assume pricing items are configured
          }
        };
      } catch (fallbackError) {
        console.error('Failed to check quotation eligibility:', fallbackError);
        return {
          canGenerate: false,
          reasons: ['Unable to verify eligibility']
        };
      }
    }
  }

  /**
   * Get quotation statistics with NaN protection
   */
  calculateQuotationStats(quotations: QuotationSummary[]): {
    totalQuotations: number;
    draftQuotations: number;
    finalQuotations: number;
    totalValue: number;
    averageValue: number;
    thisMonthCount: number;
    expiringCount: number;
  } {
    const total = quotations.length;
    const draft = quotations.filter(q => q.status === 'draft').length;
    const final = quotations.filter(q => q.status === 'final').length;
    
    // 🔥 FIX: Safe calculation of totals
    const totalValue = quotations.reduce((sum, q) => sum + this.safeNumber(q.grand_total), 0);
    const averageValue = total > 0 ? totalValue / total : 0;
    
    // Calculate this month's quotations
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthCount = quotations.filter(q => 
      new Date(q.created_at) >= thisMonth
    ).length;

    // Calculate expiring quotations (expiring within 7 days)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    const expiringCount = quotations.filter(q => {
      if (!q.valid_to) return false;
      const expiryDate = new Date(q.valid_to);
      const now = new Date();
      return expiryDate > now && expiryDate <= weekFromNow;
    }).length;

    return {
      totalQuotations: total,
      draftQuotations: draft,
      finalQuotations: final,
      totalValue,
      averageValue,
      thisMonthCount,
      expiringCount
    };
  }

  /**
   * Format currency amount with NaN protection
   */
  formatCurrency(amount: number | any, currency: string = 'AUD'): string {
    const safeAmount = this.safeNumber(amount);
    
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency
      }).format(safeAmount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      return `$${safeAmount.toFixed(2)}`;
    }
  }

  /**
   * Check if quotation is expiring soon (within 7 days)
   */
  isExpiringSoon(validTo: string | null | undefined): boolean {
    if (!validTo) return false;
    
    try {
      const expiryDate = new Date(validTo);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    } catch (error) {
      console.warn('Date parsing error:', error);
      return false;
    }
  }

  /**
   * Check if quotation is expired
   */
  isExpired(validTo: string | null | undefined): boolean {
    if (!validTo) return false;
    
    try {
      const expiryDate = new Date(validTo);
      const today = new Date();
      
      return expiryDate < today;
    } catch (error) {
      console.warn('Date parsing error:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const quotationService = new QuotationService();
export default quotationService;