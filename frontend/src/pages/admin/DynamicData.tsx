import api from "../../lib/api";

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
