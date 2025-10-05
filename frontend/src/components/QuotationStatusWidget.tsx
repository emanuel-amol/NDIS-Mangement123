// frontend/src/components/QuotationStatusWidget.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { quotationService, QuotationSummary } from '../services/quotationService';

interface QuotationStatusWidgetProps {
  participantId?: number; // If provided, shows quotations for specific participant
  className?: string;
  compact?: boolean;
}

export default function QuotationStatusWidget({ 
  participantId, 
  className = '',
  compact = false 
}: QuotationStatusWidgetProps) {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotations();
  }, [participantId]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      let quotationsData: QuotationSummary[];
      
      if (participantId) {
        // Get quotations for specific participant
        const participantQuotations = await quotationService.getParticipantQuotations(participantId);
        quotationsData = participantQuotations.map((q): QuotationSummary => ({
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
          items_count: q.items?.length || 0
        }));
      } else {
        // Get all quotations
        quotationsData = await quotationService.getAllQuotations();
      }

      setQuotations(quotationsData);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const stats = quotationService.calculateQuotationStats(quotations);
  
  const getRecentQuotations = () => {
    return quotations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, compact ? 3 : 5);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'final':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-gray-400" />;
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

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchQuotations}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-500">No Quotations</h3>
          <p className="text-xs text-gray-400 mt-1">
            {participantId 
              ? 'No quotations generated for this participant'
              : 'No quotations found in the system'
            }
          </p>
          {participantId && (
            <button
              onClick={() => navigate(`/quotations/participants/${participantId}`)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Generate Quotation
            </button>
          )}
        </div>
      </div>
    );
  }

  const recentQuotations = getRecentQuotations();

  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              {participantId ? 'Quotations' : 'Recent Quotations'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchQuotations}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(participantId ? `/quotations/participants/${participantId}` : '/quotations')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {!compact && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{stats.totalQuotations}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{stats.finalQuotations}</div>
              <div className="text-xs text-gray-500">Final</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {quotationService.formatCurrency(stats.totalValue)}
              </div>
              <div className="text-xs text-gray-500">Total Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Quotations List */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {recentQuotations.map((quotation) => (
            <div 
              key={quotation.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => navigate(`/quotations/${quotation.id}`)}
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {quotation.quote_number}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(quotation.created_at)}
                    {quotation.participant_name && ` • ${quotation.participant_name}`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(quotation.status)}`}>
                  {getStatusIcon(quotation.status)}
                  <span className="ml-1">{quotation.status}</span>
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {quotationService.formatCurrency(quotation.grand_total)}
                  </div>
                  {quotation.valid_to && (
                    <div className={`text-xs ${
                      quotationService.isExpired(quotation.valid_to) ? 'text-red-500' :
                      quotationService.isExpiringSoon(quotation.valid_to) ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {quotationService.isExpired(quotation.valid_to) ? 'Expired' :
                       quotationService.isExpiringSoon(quotation.valid_to) ? 'Expiring Soon' :
                       `Until ${formatDate(quotation.valid_to)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {stats.expiringCount > 0 && (
              <span className="text-yellow-600">
                {stats.expiringCount} expiring soon
              </span>
            )}
          </div>
          <button
            onClick={() => navigate(participantId ? `/quotations/participants/${participantId}` : '/quotations')}
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage All
            <ArrowRight className="h-3 w-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}