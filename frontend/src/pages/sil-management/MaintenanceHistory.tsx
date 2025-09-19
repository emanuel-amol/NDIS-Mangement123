// frontend/src/pages/sil-management/MaintenanceHistory.tsx
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  assignedTo: string;
  cost: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  category: string;
  completedDate?: string;
  notes?: string;
  attachments?: string[];
}

const MaintenanceHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data - replace with actual API call
  const homeData = {
    name: 'Sunshine Villa',
    address: '123 Main Street, VIC 3000'
  };

  const maintenanceRecords: MaintenanceRecord[] = [
    {
      id: '1',
      date: '2024-01-10',
      description: 'HVAC System Quarterly Maintenance',
      assignedTo: 'HVAC Specialists Pty Ltd',
      cost: 350,
      status: 'Completed',
      priority: 'Medium',
      category: 'HVAC',
      completedDate: '2024-01-10',
      notes: 'All systems checked and serviced. Filters replaced.',
      attachments: ['hvac-service-report.pdf']
    },
    {
      id: '2',
      date: '2024-01-05',
      description: 'Kitchen sink leak repair',
      assignedTo: 'Quick Fix Plumbing',
      cost: 180,
      status: 'Completed',
      priority: 'High',
      category: 'Plumbing',
      completedDate: '2024-01-05',
      notes: 'Replaced faulty tap washer and checked all connections.',
      attachments: ['plumbing-invoice.pdf']
    },
    {
      id: '3',
      date: '2024-01-20',
      description: 'Garden maintenance and lawn care',
      assignedTo: 'Green Thumb Gardens',
      cost: 120,
      status: 'Scheduled',
      priority: 'Low',
      category: 'Landscaping',
      notes: 'Regular monthly garden maintenance scheduled.'
    },
    {
      id: '4',
      date: '2024-01-15',
      description: 'Bathroom accessibility grab rail installation',
      assignedTo: 'Accessible Homes Solutions',
      cost: 450,
      status: 'In Progress',
      priority: 'High',
      category: 'Accessibility',
      notes: 'Installing additional grab rails in main bathroom for improved accessibility.'
    },
    {
      id: '5',
      date: '2023-12-28',
      description: 'Electrical safety inspection',
      assignedTo: 'Safe Spark Electrical',
      cost: 200,
      status: 'Completed',
      priority: 'High',
      category: 'Electrical',
      completedDate: '2023-12-28',
      notes: 'All electrical systems passed inspection. Minor repairs to outlet in Room 2.',
      attachments: ['electrical-inspection-cert.pdf']
    },
    {
      id: '6',
      date: '2024-01-25',
      description: 'Fire alarm battery replacement',
      assignedTo: 'Safety First Systems',
      cost: 80,
      status: 'Scheduled',
      priority: 'Medium',
      category: 'Safety',
      notes: 'Quarterly battery replacement for all smoke detectors.'
    }
  ];

  const categories = ['All', 'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Accessibility', 'Safety', 'General Repairs'];

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch = record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
    const matchesCategory = filterCategory === 'All' || record.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedRecords = maintenanceRecords.filter(r => r.status === 'Completed').length;
  const inProgressRecords = maintenanceRecords.filter(r => r.status === 'In Progress').length;
  const scheduledRecords = maintenanceRecords.filter(r => r.status === 'Scheduled').length;
  const totalCost = maintenanceRecords.filter(r => r.status === 'Completed').reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link to="/sil" className="hover:text-blue-600">SIL Management</Link>
              <span>&gt;</span>
              <Link to="/sil/homes" className="hover:text-blue-600">Homes</Link>
              <span>&gt;</span>
              <Link to={`/sil/homes/${id}`} className="hover:text-blue-600">{homeData.name}</Link>
              <span>&gt;</span>
              <span className="text-gray-900">Maintenance History</span>
            </nav>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Maintenance History</h1>
                <p className="mt-2 text-gray-600">{homeData.name} - {homeData.address}</p>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add Maintenance Request
              </button>
            </div>
          </div>

          {/* Maintenance Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                      <dd className="text-lg font-medium text-gray-900">{completedRecords}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⏳</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                      <dd className="text-lg font-medium text-gray-900">{inProgressRecords}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                      <dd className="text-lg font-medium text-gray-900">{scheduledRecords}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Cost (YTD)</dt>
                      <dd className="text-lg font-medium text-gray-900">${totalCost}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Maintenance
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search description or contractor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('All');
                    setFilterCategory('All');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredRecords.length} of {maintenanceRecords.length} maintenance records
            </p>
          </div>

          {/* Maintenance Records */}
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div key={record.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{record.description}</h3>
                    <p className="text-sm text-gray-600 mt-1">Assigned to: {record.assignedTo}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(record.priority)}`}>
                      {record.priority}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Date Scheduled:</span>
                    <p className="font-medium">{record.date}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Category:</span>
                    <p className="font-medium">{record.category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Cost:</span>
                    <p className="font-medium text-green-600">${record.cost}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Completed:</span>
                    <p className="font-medium">{record.completedDate || 'Not completed'}</p>
                  </div>
                </div>

                {record.notes && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Notes:</span>
                    <p className="text-sm mt-1">{record.notes}</p>
                  </div>
                )}

                {record.attachments && record.attachments.length > 0 && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Attachments:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {record.attachments.map((attachment, index) => (
                        <button
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          📎 {attachment}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                    Edit
                  </button>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔧</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance records found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'All' || filterCategory !== 'All'
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first maintenance request."}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add Maintenance Request
              </button>
            </div>
          )}

          {/* Add Maintenance Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add Maintenance Request</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of maintenance needed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select category</option>
                        {categories.slice(1).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contractor or service provider name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional details about the maintenance request"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceHistory;