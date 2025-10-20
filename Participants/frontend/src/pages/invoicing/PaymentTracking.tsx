// frontend/src/pages/invoicing/PaymentTracking.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  Plus, 
  Search, 
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  FileText,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { Payment, Invoice } from '../../types/invoice';

interface PaymentWithInvoice extends Payment {
  invoice_number: string;
  participant_name: string;
  participant_id: number;
  invoice_total: number;
}

interface PaymentStats {
  total_received_this_month: number;
  total_outstanding: number;
  average_payment_days: number;
  overdue_amount: number;
  pending_payments: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function PaymentTracking() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentWithInvoice[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_received_this_month: 0,
    total_outstanding: 0,
    average_payment_days: 0,
    overdue_amount: 0,
    pending_payments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPaymentData();
  }, [dateRange, paymentMethodFilter]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

      // Fetch invoices and derive payment data
      const invoicesRes = await fetch(`${API_BASE_URL}/invoicing/invoices?limit=100`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });

      const statsRes = await fetch(`${API_BASE_URL}/invoicing/stats`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });

      if (invoicesRes.ok && statsRes.ok) {
        const allInvoices: Invoice[] = await invoicesRes.json();
        const statsData = await statsRes.json();

        // Extract paid invoices as payment records
        const paidInvoices = allInvoices.filter(inv =>
          inv.status === 'paid' &&
          inv.payment_date &&
          new Date(inv.payment_date) >= new Date(dateRange.start) &&
          new Date(inv.payment_date) <= new Date(dateRange.end)
        );

        const paymentsData: PaymentWithInvoice[] = paidInvoices.map(inv => ({
          id: inv.id,
          invoice_id: inv.id,
          amount: inv.amount_paid,
          payment_date: inv.payment_date!,
          payment_method: inv.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          reference_number: inv.xero_invoice_id || undefined,
          notes: inv.notes || undefined,
          processed_by: 'System',
          xero_payment_id: inv.xero_invoice_id || undefined,
          invoice_number: inv.invoice_number,
          participant_name: inv.participant_name,
          participant_id: inv.participant_id,
          invoice_total: inv.total_amount
        }));

        // Get outstanding invoices (sent or overdue)
        const outstanding = allInvoices.filter(inv =>
          inv.status === 'sent' || inv.status === 'overdue'
        );

        setPayments(paymentsData);
        setOutstandingInvoices(outstanding);

        // Calculate stats from invoices
        const receivedThisMonth = paidInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
        const overdueInvoices = outstanding.filter(inv => inv.status === 'overdue');
        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount_outstanding, 0);

        setStats({
          total_received_this_month: receivedThisMonth,
          total_outstanding: statsData.total_outstanding,
          average_payment_days: statsData.average_payment_days,
          overdue_amount: overdueAmount,
          pending_payments: outstanding.length
        });
      }

    } catch (error) {
      console.error('Error fetching payment data:', error);
      setPayments([]);
      setOutstandingInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = (invoiceId: string) => {
    navigate(`/invoicing/invoice/${invoiceId}/payment`);
  };

  const getPaymentMethodColor = (method: string) => {
    if (method.toLowerCase().includes('ndis')) return 'bg-blue-100 text-blue-800';
    if (method.toLowerCase().includes('bank')) return 'bg-green-100 text-green-800';
    if (method.toLowerCase().includes('direct')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertTriangle size={16} className="text-red-600" />;
      case 'sent': return <Clock size={16} className="text-yellow-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
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

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPaymentMethod = paymentMethodFilter === 'all' || 
      payment.payment_method.toLowerCase().includes(paymentMethodFilter.toLowerCase());
    
    return matchesSearch && matchesPaymentMethod;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/invoicing')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Invoicing
              </button>
              <div className="border-l border-gray-300 h-6 mx-4"></div>
              <div className="flex items-center gap-2">
                <DollarSign size={20} />
                <h1 className="text-xl font-semibold text-gray-900">Payment Tracking</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/invoicing/payments/bulk-record')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Import Payments
              </button>
              <button
                onClick={() => navigate('/invoicing/payments/new')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={16} />
                Record Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <DollarSign className="text-green-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Received This Month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_received_this_month)}</p>
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
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.overdue_amount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <TrendingUp className="text-blue-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Payment Days</p>
                <p className="text-2xl font-bold text-gray-900">{stats.average_payment_days}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <FileText className="text-purple-500 mr-3" size={24} />
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_payments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Invoices Alert */}
        {outstandingInvoices.filter(inv => inv.status === 'overdue').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertTriangle className="text-red-600 mr-3" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Overdue Invoices Require Attention</h3>
                <p className="text-sm text-red-700">
                  {outstandingInvoices.filter(inv => inv.status === 'overdue').length} invoice(s) are overdue. 
                  Follow up with participants or their plan managers.
                </p>
              </div>
              <button
                onClick={() => navigate('/invoicing/invoices?status=overdue')}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                View Overdue →
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Payments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by invoice, participant, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Methods</option>
                      <option value="ndis">NDIS Payments</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="direct">Direct Debit</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(payment.payment_date)}
                            </div>
                            {payment.reference_number && (
                              <div className="text-sm text-gray-500">
                                Ref: {payment.reference_number}
                              </div>
                            )}
                            {payment.processed_by && (
                              <div className="text-xs text-gray-400">
                                By: {payment.processed_by}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/invoicing/invoice/${payment.invoice_id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {payment.invoice_number}
                          </button>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/participants/${payment.participant_id}`)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {payment.participant_name}
                          </button>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </div>
                          {payment.amount < payment.invoice_total && (
                            <div className="text-xs text-gray-500">
                              Partial payment
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.payment_method)}`}>
                            {payment.payment_method}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/invoicing/payment/${payment.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            {payment.xero_payment_id && (
                              <button
                                onClick={() => window.open(`https://go.xero.com`, '_blank')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Xero
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredPayments.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No payments found</h3>
                  <p className="text-gray-400">
                    {searchTerm || paymentMethodFilter !== 'all' 
                      ? 'Try adjusting your search criteria' 
                      : 'No payments have been recorded for the selected period'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Invoices Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h3>
                <button
                  onClick={() => navigate('/invoicing/invoices?status=outstanding')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="space-y-4">
                {outstandingInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className={`p-4 rounded-lg border-l-4 ${
                    invoice.status === 'overdue' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getInvoiceStatusIcon(invoice.status)}
                          <button
                            onClick={() => navigate(`/invoicing/invoice/${invoice.id}`)}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {invoice.invoice_number}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">{invoice.participant_name}</p>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(invoice.amount_outstanding)}
                        </p>
                        <button
                          onClick={() => handleRecordPayment(invoice.id)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Record Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {outstandingInvoices.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle className="mx-auto text-green-300 mb-2" size={32} />
                    <p className="text-sm text-gray-500">All invoices paid!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
              
              <div className="space-y-3">
                {[
                  { method: 'NDIS Direct', amount: 3520.00, percentage: 46.5 },
                  { method: 'Bank Transfer', amount: 1850.00, percentage: 24.4 },
                  { method: 'Direct Debit', amount: 2200.00, percentage: 29.1 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard size={16} className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{item.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/invoicing/payments/reconcile')}
                  className="w-full text-left text-sm text-blue-800 hover:text-blue-900 font-medium"
                >
                  • Reconcile Bank Statement
                </button>
                <button
                  onClick={() => navigate('/invoicing/reports/payments')}
                  className="w-full text-left text-sm text-blue-800 hover:text-blue-900 font-medium"
                >
                  • Payment Reports
                </button>
                <button
                  onClick={() => navigate('/invoicing/settings/payment-methods')}
                  className="w-full text-left text-sm text-blue-800 hover:text-blue-900 font-medium"
                >
                  • Configure Payment Methods
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}