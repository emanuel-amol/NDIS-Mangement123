import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Database, Settings, ArrowLeft } from 'lucide-react';

// Mock data types and points
const mockDataTypes = [
  { id: '1', name: 'disability_types', display_name: 'Disability Types', description: 'Types of disabilities', is_active: true },
  { id: '2', name: 'contact_methods', display_name: 'Contact Methods', description: 'Ways to contact participants', is_active: true },
  { id: '3', name: 'plan_types', display_name: 'Plan Types', description: 'NDIS plan management types', is_active: true },
  { id: '4', name: 'service_types', display_name: 'Service Types', description: 'Types of services offered', is_active: true },
  { id: '5', name: 'support_categories', display_name: 'Support Categories', description: 'Categories of support', is_active: true },
  { id: '6', name: 'urgency_levels', display_name: 'Urgency Levels', description: 'Priority levels for referrals', is_active: true },
  { id: '7', name: 'risk_categories', display_name: 'Risk Categories', description: 'Types of risks to assess', is_active: true },
  { id: '8', name: 'goal_categories', display_name: 'Goal Categories', description: 'Categories for participant goals', is_active: true }
];

const mockDataPoints = {
  disability_types: [
    { id: '1', name: 'intellectual', description: 'Intellectual Disability', sort_order: 1, is_active: true },
    { id: '2', name: 'physical', description: 'Physical Disability', sort_order: 2, is_active: true },
    { id: '3', name: 'sensory', description: 'Sensory Disability', sort_order: 3, is_active: true },
    { id: '4', name: 'autism', description: 'Autism Spectrum Disorder', sort_order: 4, is_active: true },
    { id: '5', name: 'psychosocial', description: 'Psychosocial Disability', sort_order: 5, is_active: true },
    { id: '6', name: 'neurological', description: 'Neurological Disability', sort_order: 6, is_active: true }
  ],
  contact_methods: [
    { id: '7', name: 'phone', description: 'Phone Call', sort_order: 1, is_active: true },
    { id: '8', name: 'email', description: 'Email', sort_order: 2, is_active: true },
    { id: '9', name: 'sms', description: 'SMS/Text Message', sort_order: 3, is_active: true },
    { id: '10', name: 'mail', description: 'Postal Mail', sort_order: 4, is_active: true }
  ],
  plan_types: [
    { id: '11', name: 'self-managed', description: 'Self-Managed', sort_order: 1, is_active: true },
    { id: '12', name: 'plan-managed', description: 'Plan-Managed', sort_order: 2, is_active: true },
    { id: '13', name: 'agency-managed', description: 'NDIA-Managed', sort_order: 3, is_active: true }
  ],
  service_types: [
    { id: '14', name: 'physiotherapy', description: 'Physiotherapy', sort_order: 1, is_active: true },
    { id: '15', name: 'psychology', description: 'Psychology', sort_order: 2, is_active: true },
    { id: '16', name: 'occupational_therapy', description: 'Occupational Therapy', sort_order: 3, is_active: true },
    { id: '17', name: 'speech_pathology', description: 'Speech Pathology', sort_order: 4, is_active: true },
    { id: '18', name: 'support_coordination', description: 'Support Coordination', sort_order: 5, is_active: true }
  ],
  support_categories: [
    { id: '19', name: 'core_supports', description: 'Core Supports', sort_order: 1, is_active: true },
    { id: '20', name: 'capital_supports', description: 'Capital Supports', sort_order: 2, is_active: true },
    { id: '21', name: 'capacity_building', description: 'Capacity Building', sort_order: 3, is_active: true }
  ],
  urgency_levels: [
    { id: '22', name: 'low', description: 'Low - Non-urgent', sort_order: 1, is_active: true },
    { id: '23', name: 'medium', description: 'Medium - Standard priority', sort_order: 2, is_active: true },
    { id: '24', name: 'high', description: 'High - Urgent', sort_order: 3, is_active: true },
    { id: '25', name: 'critical', description: 'Critical - Immediate attention required', sort_order: 4, is_active: true }
  ],
  risk_categories: [
    { id: '26', name: 'physical_safety', description: 'Physical Safety', sort_order: 1, is_active: true },
    { id: '27', name: 'medication', description: 'Medication Management', sort_order: 2, is_active: true },
    { id: '28', name: 'behavioral', description: 'Behavioral Risks', sort_order: 3, is_active: true },
    { id: '29', name: 'environmental', description: 'Environmental Hazards', sort_order: 4, is_active: true }
  ],
  goal_categories: [
    { id: '30', name: 'independence', description: 'Independence & Daily Living', sort_order: 1, is_active: true },
    { id: '31', name: 'social', description: 'Social & Community Participation', sort_order: 2, is_active: true },
    { id: '32', name: 'employment', description: 'Employment & Education', sort_order: 3, is_active: true },
    { id: '33', name: 'health', description: 'Health & Wellbeing', sort_order: 4, is_active: true }
  ]
};

interface DataType {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

interface DataPoint {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export default function DynamicDataManagement() {
  const [dataTypes, setDataTypes] = useState<DataType[]>(mockDataTypes);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState({ name: '', description: '', sort_order: 0 });

  useEffect(() => {
    if (selectedType) {
      loadDataPoints(selectedType);
    }
  }, [selectedType]);

  const loadDataPoints = async (typeName: string) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      const points = mockDataPoints[typeName as keyof typeof mockDataPoints] || [];
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
      const newId = Date.now().toString();
      const pointToAdd = {
        id: newId,
        name: newPoint.name,
        description: newPoint.description,
        sort_order: newPoint.sort_order || dataPoints.length + 1,
        is_active: true
      };
      
      setDataPoints([...dataPoints, pointToAdd]);
      setNewPoint({ name: '', description: '', sort_order: 0 });
    } catch (error) {
      console.error('Failed to create data point:', error);
      alert('Failed to create data point');
    }
  };

  const handleUpdatePoint = async (point: DataPoint, updates: Partial<DataPoint>) => {
    try {
      const updatedPoints = dataPoints.map(p => 
        p.id === point.id ? { ...p, ...updates } : p
      );
      setDataPoints(updatedPoints);
      setEditingPoint(null);
    } catch (error) {
      console.error('Failed to update data point:', error);
      alert('Failed to update data point');
    }
  };

  const handleDeletePoint = async (pointId: string) => {
    if (!window.confirm('Are you sure you want to delete this data point?')) return;
    
    try {
      setDataPoints(dataPoints.filter(p => p.id !== pointId));
    } catch (error) {
      console.error('Failed to delete data point:', error);
      alert('Failed to delete data point');
    }
  };

  const goBack = () => {
    // In a real app, this would use react-router
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div className="flex items-center gap-2">
                <Database className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Dynamic Data Management</h1>
                  <p className="text-sm text-gray-600">Manage dropdown options and data points used throughout the system</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Settings size={16} />
                <span>System Configuration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Data Types List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database size={18} />
              Data Types
            </h3>
            <div className="space-y-2">
              {dataTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.name)}
                  className={`w-full text-left px-3 py-3 rounded-md text-sm transition-colors ${
                    selectedType === type.name
                      ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{type.display_name}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  <div className="text-xs text-gray-400 mt-1">Internal: {type.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Points Management */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {selectedType ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {dataTypes.find(t => t.name === selectedType)?.display_name} Options
                  </h3>
                  <div className="text-sm text-gray-600">
                    {dataPoints.length} option{dataPoints.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Add New Point */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <Plus size={16} />
                    Add New Option
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Internal name (e.g., 'intellectual')"
                      value={newPoint.name}
                      onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                      className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Display name (e.g., 'Intellectual Disability')"
                      value={newPoint.description}
                      onChange={(e) => setNewPoint({ ...newPoint, description: e.target.value })}
                      className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Sort order"
                      value={newPoint.sort_order || ''}
                      onChange={(e) => setNewPoint({ ...newPoint, sort_order: parseInt(e.target.value) || 0 })}
                      className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddPoint}
                      disabled={!newPoint.name || !newPoint.description}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>

                {/* Data Points List */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataPoints.map((point) => (
                      <div key={point.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
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
                              <div className="text-xs text-gray-400">Sort order: {point.sort_order}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                point.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {point.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <button
                                onClick={() => setEditingPoint(point.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeletePoint(point.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {dataPoints.length === 0 && (
                      <div className="text-center py-8">
                        <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No options yet</h3>
                        <p className="text-gray-500">Add your first option using the form above.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Database className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a data type</h3>
                <p className="text-gray-500">Choose a data type from the left to manage its options.</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use Dynamic Data Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Adding Options:</h4>
              <ul className="space-y-1">
                <li>• Select a data type from the left panel</li>
                <li>• Use descriptive internal names (lowercase, underscores)</li>
                <li>• Provide clear display names for users</li>
                <li>• Set sort order to control display sequence</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Managing Options:</h4>
              <ul className="space-y-1">
                <li>• Click edit to modify existing options</li>
                <li>• Toggle active/inactive status as needed</li>
                <li>• Delete unused options carefully</li>
                <li>• Changes take effect immediately across the system</li>
              </ul>
            </div>
          </div>
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
  const [sortOrder, setSortOrder] = useState(point.sort_order);
  const [isActive, setIsActive] = useState(point.is_active);

  const handleSave = () => {
    onSave({ name, description, sort_order: sortOrder, is_active: isActive });
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Internal name"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Display name"
      />
      <input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Sort"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm">Active</span>
      </label>
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
        >
          <Save size={14} />
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center gap-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}