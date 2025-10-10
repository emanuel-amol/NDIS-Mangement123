// frontend/src/pages/invoicing/XeroSync.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Settings,
  Download,
  Upload,
  Zap,
  Clock,
  FileText
} from 'lucide-react';

interface XeroStatus {
  connected: boolean;
  last_sync: string | null;
  tenant_name: string | null;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  error_message?: string;
}

interface SyncItem {
  id: string;
  type: 'invoice' | 'payment' | 'contact';
  local_id: string;
  xero_id: string | null;
  status: 'pending' | 'synced' | 'error' | 'conflict';
  last_updated: string;
  error_message?: string;
  title: string;
  amount?: number;
}

interface SyncStats {
  total_invoices: number;
  synced_invoices: number;
  pending_invoices: number;
  failed_invoices: number;
  total_payments: number;
  synced_payments: number;
  pending_payments: number;
  failed_payments: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export default function XeroSync() {
  const navigate = useNavigate();
  const [xeroStatus, setXeroStatus] = useState<XeroStatus>({
    connected: false,
    last_sync: null,
    tenant_name: null,
    sync_status: 'idle'
  });
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    total_invoices: 0,
    synced_invoices: 0,
    pending_invoices: 0,
    failed_invoices: 0,
    total_payments: 0,
    synced_payments: 0,
    pending_payments: 0,
    failed_payments: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchXeroStatus();
    fetchSyncData();
  }, []);

  const fetchXeroStatus = async () => {
    try {
      // Mock Xero status
      setXeroStatus({
        connected: true,
        last_sync: '2025-01-19T14:30:00Z',
        tenant_name: 'NDIS Support Services Pty Ltd',
        sync_status: 'idle'
      });

      // Try real API
      try {
        const response = await fetch(`${API_BASE_URL}/invoicing/xero/status`);
        if (response.ok) {
          const data = await response.json();
          setXeroStatus(data);
        }
      } catch (apiError) {
        console.log('Using mock Xero status');
      }
    } catch (error) {
      console.error('Error fetching Xero status:', error);
    }
  };

  const fetchSyncData = async () => {
    try {
      setLoading(true);
      const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin-development-key-123';

      // Fetch invoices from real API
      const invoicesRes = await fetch(`${API_BASE_URL}/invoicing/invoices?limit=100`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();

        // Transform invoices to sync items
        const items: SyncItem[] = invoices.map((inv: any) => ({
          id: inv.id,
          type: 'invoice' as const,
          local_id: inv.invoice_number,
          xero_id: inv.xero_invoice_id || null,
          status: inv.xero_invoice_id ? 'synced' : (inv.status === 'draft' ? 'pending' : 'pending'),
          last_updated: inv.updated_at || inv.created_at,
          title: `${inv.participant_name} - ${new Date(inv.billing_period_start).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`,
          amount: inv.total_amount
        }));

        setSyncItems(items);

        // Calculate stats
        const totalInvoices = invoices.length;
        const syncedInvoices = items.filter(i => i.status === 'synced').length;
        const pendingInvoices = items.filter(i => i.status === 'pending').length;
        const failedInvoices = items.filter(i => i.status === 'error').length;

        setSyncStats({
          total_invoices: totalInvoices,
          synced_invoices: syncedInvoices,
          pending_invoices: pendingInvoices,
          failed_invoices: failedInvoices,
          total_payments: 0,
          synced_payments: 0,
          pending_payments: 0,
          failed_payments: 0
        });
      }

    } catch (error) {
      console.error('Error fetching sync data:', error);
      setSyncItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      // Redirect to Xero OAuth flow
      window.location.href = `${API_BASE_URL}/invoicing/xero/connect`;
    } catch (error) {
      console.error('Error connecting to Xero:', error);
      alert('Error connecting to Xero');
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect from Xero? This will stop automatic synchronization.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/invoicing/xero/disconnect`, {
          method: 'POST'
        });

        if (response.ok) {
          setXeroStatus({
            connected: false,
            last_sync: null,
            tenant_name: null,
            sync_status: 'idle'
          });
          alert('Disconnected from Xero successfully');
        } else {
          throw new Error('Failed to disconnect');
        }
      } catch (error) {
        console.error('Error disconnecting from Xero:', error);
        alert('Error disconnecting from Xero');
      }
    }
  };

  const handleSync = async (itemIds?: string[]) => {
    try {
      setXeroStatus({ ...xeroStatus, sync_status: 'syncing' });
      
      const response = await fetch(`${API_BASE_URL}/invoicing/xero/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds })
      });

      if (response.ok) {
        const result = await response.json();
        setXeroStatus({ 
          ...xeroStatus, 
          sync_status: 'success',
          last_sync: new Date().toISOString()
        });
        
        // Refresh data
        await fetchSyncData();
        setSelectedItems([]);
        
        alert(`Sync completed: ${result.synced} items synced, ${result.failed} failed`);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Error syncing with Xero:', error);
      setXeroStatus({ 
        ...xeroStatus, 
        sync_status: 'error',
        error_message: 'Sync failed. Please try again.'
      });
      alert('Error syncing with Xero');
    }
  };

  const handleRetryItem = async (itemId: string) => {
    await handleSync([itemId]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'error': return <AlertTriangle size={16} className="text-red-600" />;
      case 'conflict': return <AlertTriangle size={16} className="text-orange-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'conflict': return 'bg-orange-100 text-orange-800';
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
          <p className="text-gray-600">Loading Xero sync status...</p>
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
                <Zap size={20} />
                <h1 className="text-xl font-semibold text-gray-900">Xero Integration</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {xeroStatus.connected ? (
                <>
                  <button
                    onClick={() => handleSync()}
                    disabled={xeroStatus.sync_status === 'syncing'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={16} className={xeroStatus.sync_status === 'syncing' ? 'animate-spin' : ''} />
                    {xeroStatus.sync_status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ExternalLink size={16} />
                  Connect to Xero
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className={`rounded-lg p-6 mb-8 ${
          xeroStatus.connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                xeroStatus.connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <h3 className={`font-medium ${
                  xeroStatus.connected ? 'text-green-900' : 'text-red-900'
                }`}>
                  {xeroStatus.connected ? 'Connected to Xero' : 'Not Connected to Xero'}
                </h3>
                <p className={`text-sm ${
                  xeroStatus.connected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {xeroStatus.connected 
                    ? `Connected to ${xeroStatus.tenant_name}${xeroStatus.last_sync ? ` • Last sync: ${formatDate(xeroStatus.last_sync)}` : ''}`
                    : 'Connect to Xero to automatically sync invoices and payments'
                  }
                </p>
              </div>
            </div>
            
            {xeroStatus.sync_status === 'error' && (
              <div className="text-red-600">
                <AlertTriangle size={24} />
              </div>
            )}
          </div>
        </div>

        {xeroStatus.connected && (
          <>
            {/* Sync Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex items-center">
                  <FileText className="text-blue-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{syncStats.total_invoices}</p>
                    <p className="text-sm text-gray-600">{syncStats.synced_invoices} synced</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <div className="flex items-center">
                  <Clock className="text-yellow-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Sync</p>
                    <p className="text-2xl font-bold text-gray-900">{syncStats.pending_invoices + syncStats.pending_payments}</p>
                    <p className="text-sm text-gray-600">Items waiting</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <div className="flex items-center">
                  <AlertTriangle className="text-red-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Failed Sync</p>
                    <p className="text-2xl font-bold text-gray-900">{syncStats.failed_invoices + syncStats.failed_payments}</p>
                    <p className="text-sm text-gray-600">Need attention</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 mr-3" size={24} />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(((syncStats.synced_invoices + syncStats.synced_payments) / 
                        (syncStats.total_invoices + syncStats.total_payments)) * 100)}%
                    </p>
                    <p className="text-sm text-gray-600">Overall sync</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Items */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
                  <div className="flex items-center gap-3">
                    {selectedItems.length > 0 && (
                      <button
                        onClick={() => handleSync(selectedItems)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <RefreshCw size={16} />
                        Sync Selected ({selectedItems.length})
                      </button>
                    )}
                    
                    <button
                      onClick={() => window.open('https://go.xero.com', '_blank')}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open Xero
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === syncItems.length}
                          onChange={(e) => setSelectedItems(e.target.checked ? syncItems.map(item => item.id) : [])}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Local ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Xero ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.title}
                            </div>
                            {item.amount && (
                              <div className="text-sm text-gray-500">
                                {formatCurrency(item.amount)}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {item.type}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.local_id}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.xero_id ? (
                            <button
                              onClick={() => window.open(`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${item.xero_id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              {item.xero_id}
                              <ExternalLink size={12} />
                            </button>
                          ) : (
                            <span className="text-gray-400">Not synced</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(item.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </div>
                          {item.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              {item.error_message}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.last_updated)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.status === 'error' && (
                            <button
                              onClick={() => handleRetryItem(item.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {syncItems.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">All items synced</h3>
                  <p className="text-gray-400">No items require synchronization with Xero</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Integration Guide */}
        {!xeroStatus.connected && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect to Xero</h3>
            
            <div className="prose prose-sm text-gray-600 mb-6">
              <p>
                Connecting to Xero will automatically synchronize your invoices and payments, 
                ensuring your accounting records are always up to date.
              </p>
              
              <h4 className="font-medium text-gray-900 mt-4 mb-2">Benefits:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Automatic invoice creation in Xero</li>
                <li>Real-time payment reconciliation</li>
                <li>Participant contact synchronization</li>
                <li>Streamlined financial reporting</li>
                <li>Reduced manual data entry</li>
              </ul>
              
              <h4 className="font-medium text-gray-900 mt-4 mb-2">Requirements:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Active Xero subscription</li>
                <li>Administrator access to Xero organization</li>
                <li>Internet connection for real-time sync</li>
              </ul>
            </div>
            
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink size={20} />
              Connect to Xero Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}