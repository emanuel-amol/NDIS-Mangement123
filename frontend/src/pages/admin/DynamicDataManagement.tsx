```typescript
// frontend/src/pages/admin/DynamicDataManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { dynamicDataService, DataType, DataPoint } from '../../services/dynamicDataService';

export default function DynamicDataManagement() {
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => {
    loadDataTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDataPoints(selectedType);
    }
  }, [selectedType]);

  const loadDataTypes = async () => {
    try {
      const types = await dynamicDataService.getDataTypes();
      setDataTypes(types);
    } catch (error) {
      console.error('Failed to load data types:', error);
    }
  };

  const loadDataPoints = async (typeName: string) => {
    try {
      setLoading(true);
      const points = await dynamicDataService.getDataPointsByType(typeName);
      setDataPoints(points);
    } catch (error) {
      console.error('Failed to load data points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoint = async () => {
    if (!selectedType || !newPoint.name) return;
    
    try {
      const selectedTypeObj = dataTypes.find(t => t.name === selectedType);
      if (!selectedTypeObj) return;

      await dynamicDataService.createDataPoint({
        data_type_id: selectedTypeObj.id,
        name: newPoint.name,
        description: newPoint.description,
        sort_order: newPoint.sort_order
      });
      
      setNewPoint({ name: '', description: '', sort_order: 0 });
      loadDataPoints(selectedType);
    } catch (error) {
      console.error('Failed to create data point:', error);
      alert('Failed to create data point');
    }
  };

  const handleUpdatePoint = async (point: DataPoint, updates: Partial<DataPoint>) => {
    try {
      await dynamicDataService.updateDataPoint(point.id, updates);
      loadDataPoints(selectedType);
      setEditingPoint(null);
    } catch (error) {
      console.error('Failed to update data point:', error);
      alert('Failed to update data point');
    }
  };

  const handleDeletePoint = async (pointId: string) => {
    if (!confirm('Are you sure you want to delete this data point?')) return;
    
    try {
      await dynamicDataService.deleteDataPoint(pointId);
      loadDataPoints(selectedType);
    } catch (error) {
      console.error('Failed to delete data point:', error);
      alert('Failed to delete data point');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Data Management</h1>
          <p className="text-sm text-gray-600">Manage dropdown options and data points used throughout the system</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Types List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Types</h3>
          <div className="space-y-2">
            {dataTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.name)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedType === type.name
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {type.display_name}
                <div className="text-xs text-gray-500">{type.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Data Points Management */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {selectedType ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {dataTypes.find(t => t.name === selectedType)?.display_name} Options
                </h3>
              </div>

              {/* Add New Point */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-700 mb-3">Add New Option</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Name (internal)"
                    value={newPoint.name}
                    onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Display name"
                    value={newPoint.description}
                    onChange={(e) => setNewPoint({ ...newPoint, description: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddPoint}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              {/* Data Points List */}
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {dataPoints.map((point) => (
                    <div key={point.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      {editingPoint === point.id ? (
                        <EditPointForm
                          point={point}
                          onSave={(updates) => handleUpdatePoint(point, updates)}
                          onCancel={() => setEditingPoint(null)}
                        />
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{point.description || point.name}</div>
                            <div className="text-sm text-gray-500">Internal: {point.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              point.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {point.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => setEditingPoint(point.id)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePoint(point.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a data type to manage its options
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Edit Point Form Component
interface EditPointFormProps {
  point: DataPoint;
  onSave: (updates: Partial<DataPoint>) => void;
  onCancel: () => void;
}

function EditPointForm({ point, onSave, onCancel }: EditPointFormProps) {
  const [name, setName] = useState(point.name);
  const [description, setDescription] = useState(point.description || '');
  const [isActive, setIsActive] = useState(point.is_active);

  const handleSave = () => {
    onSave({ name, description, is_active: isActive });
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-2 py-1 border border-gray-300 rounded text-sm"
        placeholder="Internal name"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="px-2 py-1 border border-gray-300 rounded text-sm"
        placeholder="Display name"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="text-blue-600"
        />
        <span className="text-sm">Active</span>
      </label>
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          <Save size={14} />
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}