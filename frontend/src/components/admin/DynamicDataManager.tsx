// frontend/src/components/admin/DynamicDataManager.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { dynamicDataAPI } from '../../services/api';

interface DynamicDataEntry {
  id: number;
  type: string;
  code: string;
  label: string;
  is_active: boolean;
  meta?: any;
}

interface CreateEntryData {
  type: string;
  code: string;
  label: string;
  meta?: any;
}

const DynamicDataManager: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('contact_methods');
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<DynamicDataEntry | null>(null);

  const queryClient = useQueryClient();

  // Available data types (from SRS)
  const dataTypes = [
    { value: 'contact_methods', label: 'Contact Methods' },
    { value: 'disabilities', label: 'Disabilities' },
    { value: 'genders', label: 'Genders' },
    { value: 'qualifications', label: 'Qualifications' },
    { value: 'likes', label: 'Likes' },
    { value: 'dislikes', label: 'Dislikes' },
    { value: 'vaccinations', label: 'Vaccinations' },
    { value: 'relationship_types', label: 'Relationship Types' },
    { value: 'service_types', label: 'Service Types' },
    { value: 'pricing_items', label: 'Pricing Items' },
  ];

  // Fetch dynamic data for selected type
  const { data: entries, isLoading } = useQuery({
    queryKey: ['dynamic-data', selectedType, showInactive],
    queryFn: () => dynamicDataAPI.getByType(selectedType, showInactive),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateEntryData) => dynamicDataAPI.create(data.type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data'] });
      setIsCreateModalOpen(false);
      toast.success('Entry created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create entry');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DynamicDataEntry> }) => 
      dynamicDataAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data'] });
      setEditingEntry(null);
      toast.success('Entry updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update entry');
    },
  });

  // Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      dynamicDataAPI.setStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data'] });
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => dynamicDataAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data'] });
      toast.success('Entry deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete entry');
    },
  });

  // Filter entries based on search term
  const filteredEntries = entries?.filter(entry =>
    entry.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = (data: CreateEntryData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id: number, data: Partial<DynamicDataEntry>) => {
    updateMutation.mutate({ id, data });
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Data Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage reusable data types used throughout the system
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="data-type" className="block text-sm font-medium text-gray-700">
                Data Type
              </label>
              <select
                id="data-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {dataTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="show-inactive"
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="show-inactive" className="ml-2 block text-sm text-gray-900">
                Show inactive
              </label>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Entry
          </button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meta Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.meta ? (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {Object.keys(entry.meta).length} field(s)
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(entry.id, entry.is_active)}
                          className={`p-1 rounded ${
                            entry.is_active 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                          title={entry.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {entry.is_active ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-1 text-indigo-600 hover:text-indigo-800 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-red-600 hover:text-red-800 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No entries match your search.' : 'No entries found for this data type.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateEntryModal
          dataType={selectedType}
          dataTypeLabel={dataTypes.find(t => t.value === selectedType)?.label || selectedType}
          onSubmit={handleCreate}
          onClose={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onSubmit={(data) => handleUpdate(editingEntry.id, data)}
          onClose={() => setEditingEntry(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
};

// Create Entry Modal Component
const CreateEntryModal: React.FC<{
  dataType: string;
  dataTypeLabel: string;
  onSubmit: (data: CreateEntryData) => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ dataType, dataTypeLabel, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    meta: dataType === 'pricing_items' ? { rate: '', unit: 'hour', service_code: '' } : null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: dataType,
      code: formData.code.toUpperCase(),
      label: formData.label,
      meta: formData.meta
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Edit {entry.type.replace(/_/g, ' ')} Entry
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="UNIQUE_CODE"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Label</label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Human readable label"
                  />
                </div>

                {entry.type === 'pricing_items' && formData.meta && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Pricing Information</h4>
                    <div>
                      <label className="block text-xs text-gray-600">Service Code</label>
                      <input
                        type="text"
                        value={formData.meta.service_code || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, service_code: e.target.value } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="SVC_001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.meta.rate || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, rate: parseFloat(e.target.value) || 0 } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="72.35"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Unit</label>
                      <select
                        value={formData.meta.unit || 'hour'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, unit: e.target.value } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                        <option value="session">Session</option>
                        <option value="item">Item</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DynamicDataManager; sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Add New {dataTypeLabel} Entry
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="UNIQUE_CODE"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Label</label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Human readable label"
                  />
                </div>

                {dataType === 'pricing_items' && formData.meta && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Pricing Information</h4>
                    <div>
                      <label className="block text-xs text-gray-600">Service Code</label>
                      <input
                        type="text"
                        value={formData.meta.service_code}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, service_code: e.target.value } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="SVC_001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.meta.rate}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, rate: parseFloat(e.target.value) } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="72.35"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Unit</label>
                      <select
                        value={formData.meta.unit}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          meta: { ...formData.meta, unit: e.target.value } 
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                        <option value="session">Session</option>
                        <option value="item">Item</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Entry Modal Component
const EditEntryModal: React.FC<{
  entry: DynamicDataEntry;
  onSubmit: (data: Partial<DynamicDataEntry>) => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ entry, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    code: entry.code,
    label: entry.label,
    meta: entry.meta || (entry.type === 'pricing_items' ? { rate: '', unit: 'hour', service_code: '' } : null)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code: formData.code.toUpperCase(),
      label: formData.label,
      meta: formData.meta
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4