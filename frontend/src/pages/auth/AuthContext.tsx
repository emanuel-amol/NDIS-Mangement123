// frontend/src/pages/admin/DynamicData.tsx
import React, { useState } from "react";
import api from "../../lib/api";

interface DataType {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  description?: string;
  data_points?: DataPoint[];
}

interface DataPoint {
  id: string;
  data_type_id: string;
  name: string;
  display_name: string;
  description?: string;
  code?: string;
  sort_order?: number;
  is_active?: boolean;
  extra_data?: Record<string, any>;
}

export default function DynamicData() {
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // list data types with their points
  const fetchDataTypes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/data-types");
      setDataTypes(data); // expects [{id,name,display_name,is_active,description,data_points:[...]}]
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load data types");
    } finally {
      setLoading(false);
    }
  };

  // list points for a given data type name
  const fetchPoints = async (dataTypeName: string) => {
    const { data } = await api.get(`/data-types/${encodeURIComponent(dataTypeName)}/points`);
    return data; // DataPointResponse[]
  };

  // create a data point
  const createPoint = async (payload: {
    data_type_id: string;
    name: string;
    display_name: string;
    description?: string;
    code?: string;
    sort_order?: number;
    is_active?: boolean;
    extra_data?: Record<string, any>;
  }) => {
    const { data } = await api.post("/data-points", payload);
    return data;
  };

  // update a data point
  const updatePoint = async (id: string, patch: Partial<{
    name: string; display_name: string; description?: string; code?: string;
    sort_order?: number; is_active?: boolean; extra_data?: Record<string, any>;
  }>) => {
    const { data } = await api.put(`/data-points/${id}`, patch);
    return data;
  };

  // delete a data point
  const removePoint = async (id: string) => {
    await api.delete(`/data-points/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Data</h1>
        <p className="text-gray-600">Manage dynamic data types and points for the system</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Data Types</h2>
          <button
            onClick={fetchDataTypes}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Data Types'}
          </button>
        </div>

        {dataTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataTypes.map((type) => (
              <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{type.display_name}</h3>
                <p className="text-sm text-gray-500">{type.name}</p>
                {type.description && (
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                )}
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    type.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {type.data_points && type.data_points.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">
                      {type.data_points.length} data points
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? 'Loading data types...' : 'No data types loaded. Click "Load Data Types" to fetch them.'}
          </div>
        )}
      </div>
    </div>
  );
}