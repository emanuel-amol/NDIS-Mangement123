// frontend/src/pages/quotations/QuotationDetail.tsx
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
  Download,
  Send,
  Edit,
  User,
  Building,
  Hash,
  Info
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
  phone_number: string;
  email_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  disability_type: string;
  support_category: string;
}

export default function QuotationDetail() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quotationId) {
      fetchQuotationDetails();
    }
  }, [quotationId]);

  const fetchQuotationDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch quotation details
      const quotationResponse = await fetch(`${API_BASE_URL}/quotations/${quotationId}`);
      if (!quotationResponse.ok) {
        if (quotationResponse.status === 404) {
          throw new Error('Quotation not found');
        }
        throw new Error('Failed to fetch quotation details');
      }
      
      const quotationData = await quotationResponse.json();
      setQuotation(quotationData);

      // Fetch participant details
      if (quotationData.participant_id) {
        const participantResponse = await fetch(`${API_BASE_URL}/participants/${quotationData.participant_id}`);
        if (participantResponse.ok) {
          const participantData = await participantResponse.json();
          setParticipant(participantData);
        }
      }

    } catch (error) {
      console.error('Error fetching quotation details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const finaliseQuotation = async () => {
    if (!quotation || quotation.status === 'final') return;

    if (!confirm('Are you sure you want to finalise this quotation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${quotation.id}/finalise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const finalisedQuotation = await response.json();
        setQuotation(finalisedQuotation);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-5 w-5 text-yellow-600" />;
      case 'final':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quotation Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested quotation could not be found.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const participantName = participant ? `${participant.first_name} ${participant.last_name}` : 'Unknown Participant';
  const participantAddress = participant ? [
    participant.street_address,
    participant.city,
    participant.state,
    participant.postcode
  ].filter(Boolean).join(', ') : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
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
                  Version {quotation.version} • {participantName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quotation.status)}`}>
                {getStatusIcon(quotation.status)}
                <span className="ml-2">{quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}</span>
              </span>
              
              {quotation.status === 'draft' && (
                <button
                  onClick={finaliseQuotation}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle size={16} />
                  Finalise Quotation
                </button>
              )}
              
              <button
                onClick={() => alert('Download functionality would export quotation as PDF')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quotation Header Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Company/Provider Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Provider</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">NDIS Care Services</p>
                    <p className="text-sm text-gray-600">Registered NDIS Provider</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 ml-8">
                  <p>123 Care Street</p>
                  <p>Melbourne VIC 3000</p>
                  <p>Phone: (03) 9000 0000</p>
                  <p>Email: admin@ndiscare.com.au</p>
                </div>
              </div>
            </div>

            {/* Right Column - Participant Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Details</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{participantName}</p>
                    <p className="text-sm text-gray-600">
                      NDIS: {participant?.ndis_number || 'Pending'}
                    </p>
                  </div>
                </div>
                {participantAddress && (
                  <div className="text-sm text-gray-600 ml-8">
                    <p>{participantAddress}</p>
                  </div>
                )}
                {participant?.phone_number && (
                  <div className="text-sm text-gray-600 ml-8">
                    <p>Phone: {participant.phone_number}</p>
                  </div>
                )}
                {participant?.email_address && (
                  <div className="text-sm text-gray-600 ml-8">
                    <p>Email: {participant.email_address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quotation Metadata */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center mb-1">
                  <Hash className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Quote Number</span>
                </div>
                <p className="text-sm text-gray-900">{quotation.quote_number}</p>
              </div>
              
              <div>
                <div className="flex items-center mb-1">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Created</span>
                </div>
                <p className="text-sm text-gray-900">{formatDate(quotation.created_at)}</p>
              </div>
              
              {quotation.valid_from && quotation.valid_to && (
                <div>
                  <div className="flex items-center mb-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Valid Period</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {formatDate(quotation.valid_from)} - {formatDate(quotation.valid_to)}
                  </p>
                </div>
              )}
              
              <div>
                <div className="flex items-center mb-1">
                  <Info className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Version</span>
                </div>
                <p className="text-sm text-gray-900">Version {quotation.version}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service Items</h3>
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.service_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        {item.meta && (
                          <p className="text-xs text-gray-500 mt-1">
                            {Object.entries(item.meta)
                              .filter(([key]) => !['rate', 'unit', 'service_code'].includes(key))
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' • ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Totals */}
          <div className="lg:col-span-2">
            {quotation.care_plan_snapshot && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Care Plan Reference</h3>
                <div className="text-sm text-gray-600">
                  <p className="mb-2">
                    <span className="font-medium">Care Plan ID:</span> {quotation.care_plan_id || 'N/A'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Generated from:</span> Finalised Care Plan
                  </p>
                  {quotation.care_plan_snapshot.supports && (
                    <p>
                      <span className="font-medium">Support Items:</span> {quotation.care_plan_snapshot.supports.length} items from care plan
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(quotation.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (GST):</span>
                <span className="font-medium text-gray-900">{formatCurrency(quotation.tax_total)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(quotation.grand_total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">All amounts in {quotation.currency}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {quotation.status === 'final' && (
                <button
                  onClick={() => alert('Send functionality would email quotation to participant')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send size={16} />
                  Send to Participant
                </button>
              )}
              
              <button
                onClick={() => alert('Download functionality would export detailed quotation as PDF')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} />
                Download Detailed PDF
              </button>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quotation Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {formatDateTime(quotation.created_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {formatDateTime(quotation.updated_at)}
            </div>
            <div>
              <span className="font-medium">Status:</span> {quotation.status}
            </div>
            <div>
              <span className="font-medium">Items Count:</span> {quotation.items.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}