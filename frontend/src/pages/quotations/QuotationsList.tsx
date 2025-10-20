// frontend/src/pages/quotations/QuotationsList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  User,
  TrendingUp,
  BarChart3,
  Eye,
  Download,
  Plus
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface QuotationSummary {
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
  participant_name: string;
  participant_ndis: string;
  items_count: number;
}

interface QuotationStats {
  total_quotations: number;
  draft_quotations: number;
  final_quotations: number;
  total_value: number;
  average_value: number;
  this_month_count: number;
}

export default function QuotationsList() {
  const navigate = useNavigate();
  
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [allQuotations, setAllQuotations] = useState<QuotationSummary[]>([]);
  const [stats, setStats] = useState<QuotationStats>({
    total_quotations: 0,
    draft_quotations: 0,
    final_quotations: 0,
    total_value: 0,
    average_value: 0,
    this_month_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAllQuotations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, allQuotations]);

  const fetchAllQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all participants to collect their quotations
      const participantsResponse = await fetch(`${API_BASE_URL}/participants`);
      if (!participantsResponse.ok) {
        throw new Error('Failed to fetch participants');
      }
      
      const participants = await participantsResponse.json();
      
      // Fetch quotations for each participant
      const allQuotationsData: QuotationSummary[] = [];
      
      for (const participant of participants) {
        try {
          const quotationsResponse = await fetch(`${API_BASE_URL}/quotations/participants/${participant.id}`);
          if (quotationsResponse.ok) {
            const participantQuotations = await quotationsResponse.json();
            
            // Transform quotations to include participant info
            const quotationsWithParticipant = participantQuotations.map((q: any) => ({
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
            }));
            
            allQuotationsData.push(...quotationsWithParticipant);
          }
        } catch (error) {
          console.warn(`Failed to fetch quotations for participant ${participant.id}:`, error);
        }
      }

      // Sort quotations by creation date (newest first)
      allQuotationsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAllQuotations(allQuotationsData);
      calculateStats(allQuotationsData);

    } catch (error) {
      console.error('Error fetching quotations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quotations');
      setAllQuotations([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (quotationsList: QuotationSummary[]) => {
    const total = quotationsList.length;
    const draft = quotationsList.filter(q => q.status === 'draft').length;
    const final = quotationsList.filter(q => q.status === 'final').length;
    const totalValue = quotationsList.reduce((sum, q) => sum + q.grand_total, 0);
    const averageValue = total > 0 ? totalValue / total : 0;
    
    // Calculate this month's quotations
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthCount = quotationsList.filter(q => 
      new Date(q.created_at) >= thisMonth
    ).length;

    setStats({
      total_quotations: total,
      draft_quotations: draft,
      final_quotations: final,
      total_value: totalValue,
      average_value: averageValue,
      this_month_count: thisMonthCount
    });
  };

  const applyFilters = () => {
    let filteredQuotations = allQuotations;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredQuotations = filteredQuotations.filter(q =>
        q.quote_number.toLowerCase().includes(searchLower) ||
        q.participant_name.toLowerCase().includes(searchLower) ||
        q.participant_ndis.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredQuotations = filteredQuotations.filter(q => q.status === statusFilter);
    }

    setQuotations(filteredQuotations);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'final':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
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
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (validTo: string | null | undefined) => {
    if (!validTo) return false;
    
    const expiryDate = new Date(validTo);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (validTo: string | null | undefined) => {
    if (!validTo) return false;
    
    const expiryDate = new Date(validTo);
    const today = new Date();
    
    return expiryDate < today;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Quotations</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAllQuotations}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quotations</h1>
          <p className="text-gray-600">Manage service quotations and pricing</p>
        </div>
        <button
          onClick={() => navigate('/participants')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Generate New Quotation
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_quotations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="text-yellow-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Draft</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft_quotations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Final</p>
              <p className="text-2xl font-bold text-gray-900">{stats.final_quotations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <DollarSign className="text-purple-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_value)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <div className="flex items-center">
            <TrendingUp className="text-indigo-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.this_month_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by quote number, participant name, or NDIS number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft ({stats.draft_quotations})</option>
              <option value="final">Final ({stats.final_quotations})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-lg shadow">
        {quotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {quotation.quote_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            Version {quotation.version} • {quotation.items_count} item{quotation.items_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {quotation.participant_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            NDIS: {quotation.participant_ndis}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                        {getStatusIcon(quotation.status)}
                        <span className="ml-1">{quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(quotation.grand_total)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.currency}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {quotation.valid_to ? (
                        <div className="text-sm">
                          <div className={`font-medium ${
                            isExpired(quotation.valid_to) ? 'text-red-600' :
                            isExpiringSoon(quotation.valid_to) ? 'text-yellow-600' :
                            'text-gray-900'
                          }`}>
                            {formatDate(quotation.valid_to)}
                          </div>
                          {isExpired(quotation.valid_to) && (
                            <div className="text-xs text-red-500">Expired</div>
                          )}
                          {isExpiringSoon(quotation.valid_to) && !isExpired(quotation.valid_to) && (
                            <div className="text-xs text-yellow-600">Expiring Soon</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No expiry</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {formatDate(quotation.created_at)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => navigate(`/quotations/${quotation.id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => navigate(`/quotations/participants/${quotation.participant_id}`)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Manage Participant Quotations"
                        >
                          <User className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => alert('Download functionality would export quotation as PDF')}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              {allQuotations.length === 0 ? 'No Quotations Found' : 'No Quotations Match Your Search'}
            </h3>
            <p className="text-gray-400 mb-6">
              {allQuotations.length === 0 
                ? 'Start by generating quotations from participant care plans'
                : 'Try adjusting your search criteria or filters'
              }
            </p>
            {allQuotations.length === 0 && (
              <button
                onClick={() => navigate('/participants')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Generate First Quotation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      {stats.total_quotations > 0 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.average_value)}
              </div>
              <div className="text-sm text-gray-600">
                Average quotation value
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((stats.final_quotations / stats.total_quotations) * 100)}%
              </div>
              <div className="text-sm text-gray-600">
                Finalisation rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.this_month_count}
              </div>
              <div className="text-sm text-gray-600">
                Generated this month
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}