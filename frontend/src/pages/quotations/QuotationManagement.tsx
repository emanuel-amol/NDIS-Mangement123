// frontend/src/pages/quotations/QuotationManagement.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  Download,
  Send,
  Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface QuotationItem {
  id: number;
  service_code: string;
  label: string;
  unit: string;
  quantity: number;
  rate: number;
  line_total: number;
  meta?: Record<string, any>;
}

interface Quotation {
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

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  ndis_number?: string;
  status: string;
}

export default function QuotationManagement() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 FIX: Safe number conversion utility
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  };

  // 🔥 FIX: Calculate totals from items if main totals are NaN
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

  // 🔥 FIX: Sanitize quotation data
  const sanitizeQuotation = (quotation: any): Quotation => {
    const items = (quotation.items || []).map((item: any) => ({
      ...item,
      quantity: safeNumber(item.quantity),
      rate: safeNumber(item.rate),
      line_total: safeNumber(item.line_total) || (safeNumber(item.quantity) * safeNumber(item.rate))
    }));

    const calculatedSubtotal = calculateSubtotal(items);
    const calculatedTax = calculateTax(calculatedSubtotal);
    const calculatedGrandTotal = calculateGrandTotal(calculatedSubtotal, calculatedTax);

    return {
      ...quotation,
      subtotal: safeNumber(quotation.subtotal) || calculatedSubtotal,
      tax_total: safeNumber(quotation.tax_total) || calculatedTax,
      grand_total: safeNumber(quotation.grand_total) || calculatedGrandTotal,
      items
    };
  };

  useEffect(() => {
    if (participantId) {
      fetchParticipantAndQuotations();
    }
  }, [participantId]);

  const fetchParticipantAndQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch participant details
      const participantResponse = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (!participantResponse.ok) {
        throw new Error('Failed to fetch participant details');
      }
      const participantData = await participantResponse.json();
      setParticipant(participantData);

      // Fetch quotations for this participant
      const quotationsResponse = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}`);
      if (quotationsResponse.ok) {
        const quotationsData = await quotationsResponse.json();
        // 🔥 FIX: Sanitize all quotation data
        const sanitizedQuotations = quotationsData.map((q: any) => sanitizeQuotation(q));
        setQuotations(sanitizedQuotations);
      } else if (quotationsResponse.status !== 404) {
        console.warn('Failed to fetch quotations:', quotationsResponse.statusText);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateQuotation = async () => {
    if (!participantId) return;

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}/generate-from-care-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const newQuotationData = await response.json();
        // 🔥 FIX: Sanitize the new quotation data
        const newQuotation = sanitizeQuotation(newQuotationData);
        setQuotations(prev => [newQuotation, ...prev]);
        alert('Quotation generated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate quotation');
      }
    } catch (error) {
      console.error('Error generating quotation:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate quotation');
      alert(`Failed to generate quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const finaliseQuotation = async (quotationId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}/finalise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const finalisedQuotationData = await response.json();
        // 🔥 FIX: Sanitize the finalised quotation data
        const finalisedQuotation = sanitizeQuotation(finalisedQuotationData);
        setQuotations(prev => 
          prev.map(q => q.id === quotationId ? finalisedQuotation : q)
        );
        alert('Quotation finalised successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to finalise quotation');
      }
    } catch (error) {
      console.error('Error finalising quotation:', error);
      alert(`Failed to finalise quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteQuotation = async (quotationId: number) => {
    if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${quotationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQuotations(prev => prev.filter(q => q.id !== quotationId));
        alert('Quotation deleted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete quotation');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert(`Failed to delete quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'final':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'final':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🔥 FIX: Enhanced currency formatting with NaN protection
  const formatCurrency = (amount: any) => {
    const safeAmount = safeNumber(amount);
    
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      }).format(safeAmount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      return `$${safeAmount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('DateTime formatting error:', error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotations...</p>
        </div>
      </div>
    );
  }

  if (error && !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/participants')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Participants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/participants/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Profile
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Quotation Management</h1>
                <p className="text-sm text-gray-600">
                  {participant ? `${participant.first_name} ${participant.last_name}` : 'Participant Quotations'}
                  {participant?.ndis_number && ` • ${participant.ndis_number}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateQuotation}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Generate from Care Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quotations Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quotations Overview</h2>
          
          {quotations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{quotations.length}</div>
                <div className="text-sm text-blue-700">Total Quotations</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {quotations.filter(q => q.status === 'draft').length}
                </div>
                <div className="text-sm text-yellow-700">Draft Quotations</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {quotations.filter(q => q.status === 'final').length}
                </div>
                <div className="text-sm text-green-700">Final Quotations</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No Quotations Yet</h3>
              <p className="text-gray-400 mb-4">
                Generate your first quotation from the participant's care plan
              </p>
              <button
                onClick={generateQuotation}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Clock size={16} className="mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Generate Quotation
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Quotations List */}
        {quotations.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">All Quotations</h2>
            
            {quotations.map((quotation) => (
              <div key={quotation.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Quotation Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {quotation.quote_number}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Version {quotation.version} • Created {formatDateTime(quotation.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                        {getStatusIcon(quotation.status)}
                        <span className="ml-1">{quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}</span>
                      </span>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(quotation.grand_total)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quotation.currency}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Validity Period */}
                  {quotation.valid_from && quotation.valid_to && (
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Valid from {formatDate(quotation.valid_from)} to {formatDate(quotation.valid_to)}
                    </div>
                  )}
                </div>

                {/* Quotation Summary */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Financial Summary</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">{formatCurrency(quotation.tax_total)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t pt-1">
                          <span>Total:</span>
                          <span>{formatCurrency(quotation.grand_total)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Service Items</h4>
                      <div className="text-sm text-gray-600">
                        <p>{quotation.items.length} service item{quotation.items.length !== 1 ? 's' : ''}</p>
                        <p>Care Plan ID: {quotation.care_plan_id || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Last Updated</h4>
                      <div className="text-sm text-gray-600">
                        <p>{formatDateTime(quotation.updated_at)}</p>
                        {quotation.status === 'draft' && (
                          <p className="text-yellow-600 mt-1">• Draft - can be modified</p>
                        )}
                        {quotation.status === 'final' && (
                          <p className="text-green-600 mt-1">• Finalised - locked</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {quotation.status === 'draft' && (
                        <>
                          <button
                            onClick={() => finaliseQuotation(quotation.id)}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Finalise
                          </button>
                          
                          <button
                            onClick={() => deleteQuotation(quotation.id)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => alert('Download functionality would export quotation as PDF')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                      
                      {quotation.status === 'final' && (
                        <button
                          onClick={() => alert('Send functionality would email quotation to participant')}
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Debug Information (only show in development) */}
        {process.env.NODE_ENV === 'development' && quotations.length > 0 && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
            <div className="text-sm text-yellow-700">
              <p>Total Quotations: {quotations.length}</p>
              <p>Valid Financial Data: {quotations.filter(q => !isNaN(q.grand_total)).length}</p>
              <p>Quotations with NaN: {quotations.filter(q => isNaN(q.grand_total)).length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}