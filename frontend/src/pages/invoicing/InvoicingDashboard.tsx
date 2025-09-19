// frontend/src/pages/invoicing/InvoicingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Invoice, InvoiceStats } from '../../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

const InvoicingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InvoiceStats>({
    total_invoices: 0,
    total_outstanding: 0,
    total_overdue: 0,
    total_paid_this_month: 0,
    average_payment_days: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchInvoicingData();
  }, []);

  const fetchInvoicingData = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        total_invoices: 234,
        total_outstanding: 45720.50,
        total_overdue: 8450.00,
        total_paid_this_month: 123890.75,
        average_payment_days: 18
      });

      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoice_number: 'INV-2025-001',
          participant_id: 1,
          participant_name: 'Jordan Smith',
          participant_ndis_number: 'NDIS123456',
          billing_period_start: '2025-01-01',
          billing_period_end: '2025-01-31',
          issue_date: '2025-01-15',
          due_date: '2025-02-14',
          status: 'sent',
          payment_method: 'ndis_direct',
          items: [],
          subtotal: 2340.00,
          gst_amount: 234.00,
          total_amount: 2574.00,
          amount_paid: 0,
          amount_outstanding: 2574.00,
          created_at: '2025-01-15T10:30:00Z'
        },
        {
          id: '2',
          invoice_number: 'INV-2025-002',
          participant_id: 2,
          participant_name: 'Amrita Kumar',
          participant_ndis_number: 'NDIS789012',
          billing_period_start: '2025-01-01',
          billing_period_end: '2025-01-31',
          issue_date: '2025-01-10',
          due_date: '2025-02-09',
          status: 'overdue',
          payment_method: 'plan_managed',
          items: [],
          subtotal: 1850.00,
          gst_amount: 185.00,
          total_amount: 2035.00,
          amount_paid: 0,
          amount_outstanding: 2035.00,
          created_at: '2025-01-10T14:20:00Z'
        },
        {
          id: '3',
          invoice_number: 'INV-2025-003',
          participant_id: 3,
          participant_name: 'Linh Nguyen',
          participant_ndis_number: 'NDIS345678',
          billing_period_start: '2025-01-01',
          billing_period_end: '2025-01-31',
          issue_date: '2025-01-12',
          due_date: '2025-02-11',
          status: 'paid',
          payment_method: 'self_managed',
          items: [],
          subtotal: 3200.00,
          gst_amount: 320.00,
          total_amount: 3520.00,
          amount_paid: 3520.00,
          amount_outstanding: 0,
          payment_date: '2025-01-18',
          created_at: '2025-01-12T09:15:00Z'
        }
      ];

      setRecentInvoices(mockInvoices);
    } catch (error) {
      console.error('Error fetching invoicing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} className="text-green-600" />;
      case 'sent': return <Clock size={16} className="text-blue-600" />;
      case 'overdue': return <AlertTriangle size={16} className="text-red-600" />;
      case 'draft': return <FileText size={16} className="text-gray-600" />;
      case 'cancelled': return <XCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
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

  const filteredInvoices = recentInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.participant_ndis_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Invoicing & Payments</h1>
          <p className="text-gray-600">Manage invoices, payments, and billing for participants</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/invoicing/xero-sync')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={20} />
            Sync with Xero
          </button>
          <button
            onClick={() => navigate('/invoicing/generate')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Generate Invoices
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText className="text-blue-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_invoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="text-yellow-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_outstanding)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_overdue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <DollarSign className="text-green-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Paid This Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_paid_this_month)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <TrendingUp className="text-purple-500 mr-3" size={24} />
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Payment Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.average_payment_days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/invoicing/generate')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-blue-500"
        >
          <div className="flex items-center mb-4">
            <Plus className="text-blue-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Generate Invoices</h3>
          </div>
          <p className="text-sm text-gray-600">Create invoices from completed appointments</p>
        </button>

        <button
          onClick={() => navigate('/invoicing/payments')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-green-500"
        >
          <div className="flex items-center mb-4">
            <DollarSign className="text-green-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Record Payments</h3>
          </div>
          <p className="text-sm text-gray-600">Process and track invoice payments</p>
        </button>

        <button
          onClick={() => navigate('/invoicing/reports')}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left border-l-4 border-purple-500"
        >
          <div className="flex items-center mb-4">
            <TrendingUp className="text-purple-600 mr-3" size={24} />
            <h3 className="font-semibold text-gray-900">Financial Reports</h3>
          </div>
          <p className="text-sm text-gray-600">View detailed financial analytics</p>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by invoice number, participant name, or NDIS number..."
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
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => navigate('/invoicing/invoices')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(invoice.issue_date)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.participant_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.participant_ndis_number}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </div>
                    {invoice.amount_outstanding > 0 && (
                      <div className="text-sm text-red-600">
                        {formatCurrency(invoice.amount_outstanding)} outstanding
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(invoice.due_date)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(invoice.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/invoicing/invoice/${invoice.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => navigate(`/invoicing/invoice/${invoice.id}/payment`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No invoices found</h3>
            <p className="text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria' 
                : 'Start by generating invoices from completed appointments'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicingDashboard;