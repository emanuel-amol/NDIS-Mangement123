// frontend/src/pages/invoicing/InvoiceDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit, 
  Trash2, 
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Invoice, Payment } from '../../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoiceDetail();
    }
  }, [id]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

      // Fetch real invoice data from API
      const response = await fetch(`${API_BASE_URL}/invoicing/invoices/${id}`, {
        headers: {
          'X-Admin-Key': ADMIN_API_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
        setPayments([]); // TODO: Add payment history endpoint
      } else if (response.status === 404) {
        setInvoice(null);
      } else {
        throw new Error('Failed to fetch invoice');
      }

    } catch (error) {
      console.error('Error fetching invoice:', error);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/invoicing/invoice/${id}/send`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setInvoice({ ...invoice, status: 'sent' });
        alert('Invoice sent successfully');
      } else {
        throw new Error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Error sending invoice');
    }
  };

  const handleDownloadPDF = () => {
    // Generate and download PDF
    window.open(`${API_BASE_URL}/invoicing/invoice/${id}/pdf`, '_blank');
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    
    if (confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/invoicing/invoice/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Invoice deleted successfully');
          navigate('/invoicing');
        } else {
          throw new Error('Failed to delete invoice');
        }
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Error deleting invoice');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={20} className="text-green-600" />;
      case 'sent': return <Clock size={20} className="text-blue-600" />;
      case 'overdue': return <AlertTriangle size={20} className="text-red-600" />;
      case 'draft': return <FileText size={20} className="text-gray-600" />;
      default: return <Clock size={20} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
          <button
            onClick={() => navigate('/invoicing')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to Invoicing
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
                <FileText size={20} />
                <h1 className="text-xl font-semibold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Download PDF
              </button>
              
              {invoice.status === 'draft' && (
                <button
                  onClick={handleSendInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} />
                  Send Invoice
                </button>
              )}
              
              {invoice.status !== 'paid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DollarSign size={16} />
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Invoice Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h2>
                  <p className="text-gray-600">
                    Billing Period: {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusIcon(invoice.status)}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Participant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Bill To:</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{invoice.participant_name}</p>
                    <p>NDIS Number: {invoice.participant_ndis_number}</p>
                    <p>Payment Method: {invoice.payment_method.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Invoice Details:</h3>
                  <div className="text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Issue Date:</span>
                      <span>{formatDate(invoice.issue_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Date:</span>
                      <span>{formatDate(invoice.due_date)}</span>
                    </div>
                    {invoice.xero_invoice_id && (
                      <div className="flex justify-between">
                        <span>Xero ID:</span>
                        <span className="text-blue-600">{invoice.xero_invoice_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Items */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Services Provided</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Support Worker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.service_type}
                            </div>
                            {item.notes && (
                              <div className="text-sm text-gray-500">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(item.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.support_worker_name}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.hours}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.hourly_rate)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>GST:</span>
                      <span>{formatCurrency(invoice.gst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Amount Paid:</span>
                          <span>-{formatCurrency(invoice.amount_paid)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold text-red-600">
                          <span>Outstanding:</span>
                          <span>{formatCurrency(invoice.amount_outstanding)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-900">
                            Payment Received
                          </p>
                          <p className="text-sm text-green-700">
                            {formatDate(payment.payment_date)} • {payment.payment_method}
                          </p>
                          {payment.reference_number && (
                            <p className="text-sm text-green-600">
                              Ref: {payment.reference_number}
                            </p>
                          )}
                        </div>
                        <div className="text-lg font-semibold text-green-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/participants/${invoice.participant_id}`)}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <User size={16} />
                  View Participant
                </button>
                
                <button
                  onClick={() => navigate(`/invoicing/invoice/${invoice.id}/edit`)}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={invoice.status === 'paid'}
                >
                  <Edit size={16} />
                  Edit Invoice
                </button>
                
                {invoice.xero_invoice_id && (
                  <button
                    onClick={() => window.open(`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.xero_invoice_id}`, '_blank')}
                    className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={16} />
                    View in Xero
                  </button>
                )}
                
                <button
                  onClick={handleDeleteInvoice}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  disabled={invoice.status === 'paid'}
                >
                  <Trash2 size={16} />
                  Delete Invoice
                </button>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Services:</span>
                  <span className="font-medium">{invoice.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-medium">
                    {invoice.items.reduce((sum, item) => sum + item.hours, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(invoice.created_at)}</span>
                </div>
                {invoice.payment_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-medium text-green-600">
                      {formatDate(invoice.payment_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Payment Method</h4>
              <p className="text-sm text-blue-800 capitalize">
                {invoice.payment_method.replace('_', ' ')}
              </p>
              {invoice.payment_method === 'ndis_direct' && (
                <p className="text-sm text-blue-700 mt-1">
                  Payment will be processed directly by NDIS
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={(payment) => {
            setPayments([...payments, payment]);
            setInvoice({
              ...invoice,
              amount_paid: invoice.amount_paid + payment.amount,
              amount_outstanding: invoice.amount_outstanding - payment.amount,
              status: invoice.amount_outstanding - payment.amount <= 0 ? 'paid' : invoice.status,
              payment_date: payment.payment_date
            });
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}

// Payment Modal Component
interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentRecorded: (payment: Payment) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, onClose, onPaymentRecorded }) => {
  const [paymentData, setPaymentData] = useState({
    amount: invoice.amount_outstanding,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/invoicing/invoice/${invoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const payment = await response.json();
        onPaymentRecorded(payment);
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={invoice.amount_outstanding}
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Outstanding: {formatCurrency(invoice.amount_outstanding)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentData.payment_method}
              onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="direct_debit">Direct Debit</option>
              <option value="ndis_payment">NDIS Payment</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={paymentData.reference_number}
              onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transaction reference or receipt number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional payment notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};