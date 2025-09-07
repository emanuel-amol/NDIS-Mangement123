// frontend/src/pages/admin/DynamicData.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

interface DataType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DataPoint {
  id: string;
  data_type_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DataTypeWithPoints extends DataType {
  data_points: DataPoint[];
}

const DynamicDataAdmin: React.FC = () => {
  const [dataTypes, setDataTypes] = useState<DataTypeWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [editingPoint, setEditingPoint] = useState<string>('');
  const [newPointName, setNewPointName] = useState<string>('');
  const [editPointName, setEditPointName] = useState<string>('');

  useEffect(() => {
    fetchDataTypes();
  }, []);

  const fetchDataTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-types`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data types');
      }

      const types = await response.json();
      
      // Fetch data points for each type
      const typesWithPoints = await Promise.all(
        types.map(async (type: DataType) => {
          try {
            const pointsResponse = await fetch(
              `${API_BASE_URL}/dynamic-data/data-types/${type.name}/points`
            );
            
            if (pointsResponse.ok) {
              const points = await pointsResponse.json();
              return { ...type, data_points: points };
            } else {
              return { ...type, data_points: [] };
            }
          } catch (error) {
            console.error(`Failed to fetch points for ${type.name}:`, error);
            return { ...type, data_points: [] };
          }
        })
      );

      setDataTypes(typesWithPoints);
    } catch (error) {
      console.error('Error fetching data types:', error);
      setError('Failed to load data types. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addDataPoint = async (dataTypeId: string, dataTypeName: string) => {
    if (!newPointName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_type_id: dataTypeId,
          name: newPointName.trim(),
          sort_order: 0,
          is_active: true,
        }),
      });

      if (response.ok) {
        setNewPointName('');
        await fetchDataTypes(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to add data point: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding data point:', error);
      alert('Failed to add data point. Please try again.');
    }
  };

  const updateDataPoint = async (pointId: string) => {
    if (!editPointName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-points/${pointId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editPointName.trim(),
        }),
      });

      if (response.ok) {
        setEditingPoint('');
        setEditPointName('');
        await fetchDataTypes(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to update data point: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating data point:', error);
      alert('Failed to update data point. Please try again.');
    }
  };

  const deleteDataPoint = async (pointId: string, pointName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${pointName}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-points/${pointId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDataTypes(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to delete data point: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting data point:', error);
      alert('Failed to delete data point. Please try again.');
    }
  };

  const toggleDataPointStatus = async (pointId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-points/${pointId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (response.ok) {
        await fetchDataTypes(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`Failed to update status: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dynamic Data Management</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dynamic data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dynamic Data Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchDataTypes}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dynamic Data Management</h1>
        <p className="text-sm text-gray-600">
          Manage configurable data used throughout the NDIS system
        </p>
      </div>

      {/* Data Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {dataTypes.map((dataType) => (
          <div key={dataType.id} className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {dataType.display_name}
                  </h3>
                  <p className="text-sm text-gray-500">{dataType.description}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    {dataType.data_points.length} items
                  </span>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    dataType.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {dataType.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-4">
              {/* Add New Data Point */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add new item..."
                    value={selectedType === dataType.id ? newPointName : ''}
                    onChange={(e) => {
                      setSelectedType(dataType.id);
                      setNewPointName(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addDataPoint(dataType.id, dataType.name);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => addDataPoint(dataType.id, dataType.name)}
                    disabled={!newPointName.trim() || selectedType !== dataType.id}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Data Points List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dataType.data_points.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No items yet</p>
                ) : (
                  dataType.data_points.map((point) => (
                    <div
                      key={point.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        point.is_active ? 'bg-gray-50' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      {editingPoint === point.id ? (
                        <div className="flex-1 flex space-x-2">
                          <input
                            type="text"
                            value={editPointName}
                            onChange={(e) => setEditPointName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateDataPoint(point.id);
                              }
                              if (e.key === 'Escape') {
                                setEditingPoint('');
                                setEditPointName('');
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => updateDataPoint(point.id)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPoint('');
                              setEditPointName('');
                            }}
                            className="p-1 text-gray-600 hover:text-gray-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`text-sm flex-1 ${
                              point.is_active ? 'text-gray-900' : 'text-gray-500 line-through'
                            }`}
                          >
                            {point.name}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => toggleDataPointStatus(point.id, point.is_active)}
                              className={`px-2 py-1 text-xs rounded ${
                                point.is_active
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {point.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingPoint(point.id);
                                setEditPointName(point.name);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteDataPoint(point.id, point.name)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Add new items by typing in the input field and pressing Enter or clicking the + button</li>
          <li>• Edit items by clicking the edit icon</li>
          <li>• Disable/enable items to control their visibility in forms</li>
          <li>• Delete items permanently by clicking the trash icon</li>
          <li>• Changes are applied immediately and affect all forms using this data</li>
        </ul>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dataTypes.length}</div>
            <div className="text-sm text-gray-600">Data Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dataTypes.reduce((sum, type) => sum + type.data_points.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {dataTypes.reduce((sum, type) => sum + type.data_points.filter(p => p.is_active).length, 0)}
            </div>
            <div className="text-sm text-gray-600">Active Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {dataTypes.reduce((sum, type) => sum + type.data_points.filter(p => !p.is_active).length, 0)}
            </div>
            <div className="text-sm text-gray-600">Inactive Items</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicDataAdmin;