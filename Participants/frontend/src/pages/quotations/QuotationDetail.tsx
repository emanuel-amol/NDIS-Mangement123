// Updated QuotationDetail.tsx with NaN fixes
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Download, Send, Edit, Trash2 } from "lucide-react";
import type { Quotation, QuotationItem } from "../../services/quotationService";
import { quotationService } from "../../services/quotationService";

export default function QuotationDetail() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quotationId) {
      setError("Quotation ID is required");
      setLoading(false);
      return;
    }

    const numericQuotationId = parseInt(quotationId, 10);
    if (isNaN(numericQuotationId)) {
      setError("Invalid quotation ID");
      setLoading(false);
      return;
    }

    loadQuotation(numericQuotationId);
  }, [quotationId]);

  const loadQuotation = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await quotationService.getQuotation(id);
      setQuotation(data);
    } catch (error: any) {
      console.error('Error loading quotation:', error);
      setError(error.message || "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIX: Safe number conversion and validation
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  };

  // 🔥 FIX: Enhanced currency formatting with NaN protection
  const formatCurrency = (amount: any, currency: string = 'AUD') => {
    const safeAmount = safeNumber(amount);
    
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency
      }).format(safeAmount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      return `$${safeAmount.toFixed(2)}`;
    }
  };

  // 🔥 FIX: Safe calculation functions
  const calculateSubtotal = (items: QuotationItem[]): number => {
    return items.reduce((sum, item) => {
      const quantity = safeNumber(item.quantity);
      const rate = safeNumber(item.rate);
      return sum + (quantity * rate);
    }, 0);
  };

  const calculateTax = (subtotal: number, taxRate: number = 0.1): number => {
    return safeNumber(subtotal) * safeNumber(taxRate);
  };

  const calculateGrandTotal = (subtotal: number, tax: number): number => {
    return safeNumber(subtotal) + safeNumber(tax);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleGoBack = () => {
    if (quotation) {
      navigate(`/quotations/participants/${quotation.participant_id}`);
    } else {
      navigate('/quotations');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Quotation</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleGoBack}
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="inline mr-2 h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quotation not found</p>
          <button
            onClick={handleGoBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // 🔥 FIX: Recalculate totals with safe numbers
  const recalculatedSubtotal = calculateSubtotal(quotation.items || []);
  const recalculatedTax = calculateTax(recalculatedSubtotal);
  const recalculatedGrandTotal = calculateGrandTotal(recalculatedSubtotal, recalculatedTax);

  // Use recalculated values if original values are NaN
  const displaySubtotal = safeNumber(quotation.subtotal) || recalculatedSubtotal;
  const displayTax = safeNumber(quotation.tax_total) || recalculatedTax;
  const displayGrandTotal = safeNumber(quotation.grand_total) || recalculatedGrandTotal;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Quotation {quotation.quote_number}
                </h1>
                <p className="text-sm text-gray-600">
                  Version {quotation.version} • Status: {quotation.status}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => alert('Download functionality would export quotation as PDF')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Download size={16} />
                Download PDF
              </button>
              
              {quotation.status === 'final' && (
                <button
                  onClick={() => alert('Send functionality would email quotation to participant')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send size={16} />
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (GST):</span>
                <span className="font-medium">{formatCurrency(displayTax)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Grand Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(displayGrandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Quote Number</span>
                <p className="font-medium">{quotation.quote_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Version</span>
                <p className="font-medium">{quotation.version}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Currency</span>
                <p className="font-medium">{quotation.currency}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-medium">{formatDate(quotation.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Validity Period</h3>
            <div className="space-y-3">
              {quotation.valid_from ? (
                <div>
                  <span className="text-sm text-gray-500">Valid From</span>
                  <p className="font-medium">{formatDate(quotation.valid_from)}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No start date set</p>
              )}
              
              {quotation.valid_to ? (
                <div>
                  <span className="text-sm text-gray-500">Valid Until</span>
                  <p className="font-medium">{formatDate(quotation.valid_to)}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No expiry date set</p>
              )}
            </div>
          </div>
        </div>

        {/* Service Items Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service Items</h3>
            <p className="text-sm text-gray-600">
              {quotation.items?.length || 0} service item{(quotation.items?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(quotation.items || []).map((item, index) => {
                  const itemQuantity = safeNumber(item.quantity);
                  const itemRate = safeNumber(item.rate);
                  const itemTotal = safeNumber(item.line_total) || (itemQuantity * itemRate);
                  
                  return (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.service_code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{item.label || 'No description'}</div>
                        {item.meta && (
                          <div className="mt-1 text-xs text-gray-500">
                            {[
                              item.meta.support_type,
                              item.meta.frequency,
                              item.meta.duration,
                              item.meta.location,
                              item.meta.staff_ratio,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {itemQuantity.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.unit || 'each'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(itemRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    Subtotal:
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(displaySubtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    Tax (GST):
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(displayTax)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-lg font-bold text-gray-900 text-right">
                    Grand Total:
                  </td>
                  <td className="px-6 py-4 text-lg font-bold text-blue-600 text-right">
                    {formatCurrency(displayGrandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Debug Information (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
            <div className="text-sm text-yellow-700">
              <p>Original Subtotal: {quotation.subtotal} → {displaySubtotal}</p>
              <p>Original Tax: {quotation.tax_total} → {displayTax}</p>
              <p>Original Grand Total: {quotation.grand_total} → {displayGrandTotal}</p>
              <p>Items Count: {quotation.items?.length || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}