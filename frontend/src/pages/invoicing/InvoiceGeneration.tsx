// frontend/src/pages/invoicing/InvoiceGeneration.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign,
  Settings,
  Download
} from 'lucide-react';
import { InvoiceItem } from '../../types/invoice';

interface Participant {
  id: number;
  name: string;
  ndis_number: string;
  payment_method: 'ndis_direct' | 'plan_managed' | 'self_managed';
}

interface BillableService {
  id: string;
  appointment_id: number;
  participant_id: number;
  participant_name: string;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total_amount: number;
  support_worker_name: string;
  notes?: string;
  selected: boolean;
}

interface GenerationSettings {
  billing_period_start: string;
  billing_period_end: string;
  issue_date: string;
  due_days: number;
  include_gst: boolean;
  gst_rate: number;
  group_by_participant: boolean;
  auto_send: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function InvoiceGeneration() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'review' | 'generate' | 'complete'>('select');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [billableServices, setBillableServices] = useState<BillableService[]>([]);
  const [selectedServices, setSelectedServices] = useState<BillableService[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    billing_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    billing_period_end: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    due_days: 30,
    include_gst: true,
    gst_rate: 10,
    group_by_participant: true,
    auto_send: false
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState<string[]>([]);

  useEffect(() => {
    fetchBillableServices();
  }, [settings.billing_period_start, settings.billing_period_end]);

  const fetchBillableServices = async () => {
    try {
      setLoading(true);
      
      // Mock billable services data
      const mockServices: BillableService[] = [
        {
          id: '1',
          appointment_id: 1,
          participant_id: 1,
          participant_name: 'Jordan Smith',
          service_type: 'Personal Care',
          date: '2025-01-15',
          start_time: '09:00',
          end_time: '11:00',
          hours: 2,
          hourly_rate: 35.00,
          total_amount: 70.00,
          support_worker_name: 'Sarah Wilson',
          notes: 'Morning routine assistance',
          selected: false
        },
        {
          id: '2',
          appointment_id: 2,
          participant_id: 1,
          participant_name: 'Jordan Smith',
          service_type: 'Community Access',
          date: '2025-01-16',
          start_time: '14:00',
          end_time: '16:00',
          hours: 2,
          hourly_rate: 35.00,
          total_amount: 70.00,
          support_worker_name: 'Sarah Wilson',
          notes: 'Shopping assistance',
          selected: false
        },
        {
          id: '3',
          appointment_id: 3,
          participant_id: 2,
          participant_name: 'Amrita Kumar',
          service_type: 'Domestic Assistance',
          date: '2025-01-17',
          start_time: '10:00',
          end_time: '12:00',
          hours: 2,
          hourly_rate: 30.00,
          total_amount: 60.00,
          support_worker_name: 'Michael Chen',
          selected: false
        },
        {
          id: '4',
          appointment_id: 4,
          participant_id: 3,
          participant_name: 'Linh Nguyen',
          service_type: 'Social Participation',
          date: '2025-01-18',
          start_time: '15:00',
          end_time: '17:00',
          hours: 2,
          hourly_rate: 32.00,
          total_amount: 64.00,
          support_worker_name: 'Emma Thompson',
          selected: false
        }
      ];

      setBillableServices(mockServices);

      // Mock participants data
      setParticipants([
        { id: 1, name: 'Jordan Smith', ndis_number: 'NDIS123456', payment_method: 'ndis_direct' },
        { id: 2, name: 'Amrita Kumar', ndis_number: 'NDIS789012', payment_method: 'plan_managed' },
        { id: 3, name: 'Linh Nguyen', ndis_number: 'NDIS345678', payment_method: 'self_managed' }
      ]);

    } catch (error) {
      console.error('Error fetching billable services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelection = (serviceId: string, selected: boolean) => {
    setBillableServices(prev =>
      prev.map(service =>
        service.id === serviceId ? { ...service, selected } : service
      )
    );
  };

  const handleSelectAllParticipant = (participantId: number, selected: boolean) => {
    setBillableServices(prev =>
      prev.map(service =>
        service.participant_id === participantId ? { ...service, selected } : service
      )
    );
  };

  const proceedToReview = () => {
    const selected = billableServices.filter(service => service.selected);
    if (selected.length === 0) {
      alert('Please select at least one service to invoice');
      return;
    }
    setSelectedServices(selected);
    setStep('review');
  };

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      // Group services by participant if required
      const serviceGroups = settings.group_by_participant
        ? groupServicesByParticipant(selectedServices)
        : { 'all': selectedServices };

      const invoicePromises = Object.entries(serviceGroups).map(async ([participantKey, services]) => {
        const invoiceData = {
          participant_id: services[0].participant_id,
          billing_period_start: settings.billing_period_start,
          billing_period_end: settings.billing_period_end,
          issue_date: settings.issue_date,
          due_date: calculateDueDate(settings.issue_date, settings.due_days),
          payment_method: participants.find(p => p.id === services[0].participant_id)?.payment_method,
          items: services.map(service => ({
            service_type: service.service_type,
            date: service.date,
            start_time: service.start_time,
            end_time: service.end_time,
            hours: service.hours,
            hourly_rate: service.hourly_rate,
            total_amount: service.total_amount,
            support_worker_name: service.support_worker_name,
            notes: service.notes
          })),
          include_gst: settings.include_gst,
          gst_rate: settings.gst_rate,
          auto_send: settings.auto_send
        };

        const response = await fetch(`${API_BASE_URL}/invoicing/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData)
        });

        if (response.ok) {
          const result = await response.json();
          return result.invoice_number;
        } else {
          throw new Error('Failed to generate invoice');
        }
      });

      const invoiceNumbers = await Promise.all(invoicePromises);
      setGeneratedInvoices(invoiceNumbers);
      setStep('complete');

    } catch (error) {
      console.error('Error generating invoices:', error);
      alert('Failed to generate invoices. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const groupServicesByParticipant = (services: BillableService[]) => {
    return services.reduce((groups, service) => {
      const key = service.participant_id.toString();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(service);
      return groups;
    }, {} as Record<string, BillableService[]>);
  };

  const calculateDueDate = (issueDate: string, dueDays: number) => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + dueDays);
    return date.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const calculateTotals = () => {
    const subtotal = selectedServices.reduce((sum, service) => sum + service.total_amount, 0);
    const gstAmount = settings.include_gst ? subtotal * (settings.gst_rate / 100) : 0;
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billable services...</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Generate Invoices</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {['select', 'review', 'generate', 'complete'].map((stepName, index) => {
              const isActive = step === stepName;
              const isCompleted = ['select', 'review', 'generate', 'complete'].indexOf(step) > index;
              const stepNumber = index + 1;
              
              return (
                <div key={stepName} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium
                    ${isCompleted ? 'bg-green-600 border-green-600 text-white' :
                      isActive ? 'bg-blue-600 border-blue-600 text-white' :
                      'bg-gray-100 border-gray-300 text-gray-400'}
                  `}>
                    {isCompleted ? <CheckCircle size={16} /> : stepNumber}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                      {stepName === 'select' ? 'Select Services' :
                       stepName === 'review' ? 'Review & Configure' :
                       stepName === 'generate' ? 'Generate Invoices' :
                       'Complete'}
                    </h3>
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Select Services */}
        {step === 'select' && (
          <div className="space-y-6">
            {/* Billing Period Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={settings.billing_period_start}
                    onChange={(e) => setSettings({ ...settings, billing_period_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={settings.billing_period_end}
                    onChange={(e) => setSettings({ ...settings, billing_period_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Billable Services */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Billable Services ({formatDate(settings.billing_period_start)} - {formatDate(settings.billing_period_end)})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select completed services to include in invoices
                </p>
              </div>

              {participants.map(participant => {
                const participantServices = billableServices.filter(s => s.participant_id === participant.id);
                const selectedCount = participantServices.filter(s => s.selected).length;
                const totalAmount = participantServices.reduce((sum, s) => sum + s.total_amount, 0);

                return (
                  <div key={participant.id} className="border-b border-gray-200 last:border-b-0">
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCount === participantServices.length && participantServices.length > 0}
                            onChange={(e) => handleSelectAllParticipant(participant.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <h3 className="font-medium text-gray-900">{participant.name}</h3>
                            <p className="text-sm text-gray-600">
                              {participant.ndis_number} • {participant.payment_method.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {selectedCount}/{participantServices.length} services
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {participantServices.map(service => (
                        <div key={service.id} className="p-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={service.selected}
                              onChange={(e) => handleServiceSelection(service.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">{service.service_type}</h4>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(service.date)} • {service.start_time} - {service.end_time} ({service.hours}h)
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Support Worker: {service.support_worker_name}
                                  </p>
                                  {service.notes && (
                                    <p className="text-sm text-gray-500 mt-1">{service.notes}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">
                                    {formatCurrency(service.total_amount)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {formatCurrency(service.hourly_rate)}/hour
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {billableServices.length === 0 && (
                <div className="p-8 text-center">
                  <Clock className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No billable services found</h3>
                  <p className="text-gray-400">
                    No completed services found for the selected billing period.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={proceedToReview}
                disabled={billableServices.filter(s => s.selected).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review Selected Services ({billableServices.filter(s => s.selected).length})
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Configure */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Invoice Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={settings.issue_date}
                    onChange={(e) => setSettings({ ...settings, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={settings.due_days}
                    onChange={(e) => setSettings({ ...settings, due_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.include_gst}
                    onChange={(e) => setSettings({ ...settings, include_gst: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Include GST ({settings.gst_rate}%)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.group_by_participant}
                    onChange={(e) => setSettings({ ...settings, group_by_participant: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Group by participant
                  </label>
                </div>
              </div>
            </div>

            {/* Review Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
              
              {(() => {
                const totals = calculateTotals();
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    {settings.include_gst && (
                      <div className="flex justify-between text-sm">
                        <span>GST ({settings.gst_rate}%):</span>
                        <span>{formatCurrency(totals.gstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-medium border-t pt-4">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('select')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('generate')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Generate Invoices
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generate */}
        {step === 'generate' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-6">
              {generating ? (
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              ) : (
                <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              )}
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {generating ? 'Generating Invoices...' : 'Ready to Generate'}
              </h2>
              
              <p className="text-gray-600 mb-8">
                {generating 
                  ? 'Please wait while we create your invoices and sync with Xero.'
                  : `Generate ${settings.group_by_participant ? participants.filter(p => selectedServices.some(s => s.participant_id === p.id)).length : 1} invoice(s) for ${selectedServices.length} services.`
                }
              </p>
            </div>

            {!generating && (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setStep('review')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={generateInvoices}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generate Invoices
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Invoices Generated Successfully!
            </h2>
            
            <p className="text-gray-600 mb-8">
              {generatedInvoices.length} invoice(s) have been created and synced with Xero.
            </p>

            <div className="bg-green-50 rounded-lg p-4 mb-8">
              <h3 className="font-medium text-green-900 mb-2">Generated Invoices:</h3>
              <div className="space-y-1">
                {generatedInvoices.map(invoiceNumber => (
                  <div key={invoiceNumber} className="text-sm text-green-700">
                    {invoiceNumber}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/invoicing')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => navigate('/invoicing/invoices')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Invoices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}