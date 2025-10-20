// frontend/src/pages/invoicing/InvoiceEdit.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Invoice, InvoiceItem } from '../../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    participant_name: '',
    billing_period_start: '',
    billing_period_end: '',
    issue_date: '',
    due_date: '',
    payment_method: 'ndis_direct',
    notes: '',
    items: [] as InvoiceItem[]
  });

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

      const response = await fetch(`${API_BASE_URL}/invoicing/invoices/${id}`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });

      if (response.ok) {
        const data = await response.json();

        // Check if invoice can be edited
        if (data.status !== 'draft') {
          setError(`Cannot edit invoice with status "${data.status}". Only draft invoices can be edited.`);
          setLoading(false);
          return;
        }

        setInvoice(data);
        setFormData({
          participant_name: data.participant_name,
          billing_period_start: data.billing_period_start,
          billing_period_end: data.billing_period_end,
          issue_date: data.issue_date,
          due_date: data.due_date,
          payment_method: data.payment_method,
          notes: data.notes || '',
          items: data.items
        });
      } else {
        setError('Failed to load invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Error loading invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

      const response = await fetch(`${API_BASE_URL}/invoicing/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_API_KEY
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Invoice updated successfully!');
        navigate(`/invoicing/invoice/${id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      setError('Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total if hours or rate changed
    if (field === 'hours' || field === 'hourly_rate') {
      const hours = field === 'hours' ? parseFloat(value) : updatedItems[index].hours;
      const rate = field === 'hourly_rate' ? parseFloat(value) : updatedItems[index].hourly_rate;
      updatedItems[index].total_amount = hours * rate;
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `new-${Date.now()}`,
      appointment_id: 0,
      service_type: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      hours: 8,
      hourly_rate: 35,
      total_amount: 280,
      support_worker_name: '',
      notes: ''
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total_amount, 0);
    const gst = subtotal * 0.1;
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
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

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/invoicing/invoice/${id}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Invoice
              </button>
              <div className="border-l border-gray-300 h-6 mx-4"></div>
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Invoice {invoice?.invoice_number}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/invoicing/invoice/${id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="text-red-600 mr-3" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Participant Name
              </label>
              <input
                type="text"
                value={formData.participant_name}
                onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ndis_direct">NDIS Direct</option>
                <option value="plan_managed">Plan Managed</option>
                <option value="self_managed">Self Managed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period Start
              </label>
              <input
                type="date"
                value={formData.billing_period_start}
                onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period End
              </label>
              <input
                type="date"
                value={formData.billing_period_end}
                onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Service Items</h2>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type
                    </label>
                    <input
                      type="text"
                      value={item.service_type}
                      onChange={(e) => handleItemChange(index, 'service_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support Worker
                    </label>
                    <input
                      type="text"
                      value={item.support_worker_name}
                      onChange={(e) => handleItemChange(index, 'support_worker_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={item.start_time}
                      onChange={(e) => handleItemChange(index, 'start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => handleItemChange(index, 'end_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={item.hours}
                      onChange={(e) => handleItemChange(index, 'hours', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.hourly_rate}
                      onChange={(e) => handleItemChange(index, 'hourly_rate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-right">
                  <span className="text-sm text-gray-600">Total: </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(item.total_amount)}
                  </span>
                </div>
              </div>
            ))}

            {formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items added. Click "Add Item" to add service items to this invoice.
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Totals</h2>

          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>GST (10%):</span>
              <span className="font-medium">{formatCurrency(totals.gst)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-semibold text-gray-900">
              <span>Total:</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
