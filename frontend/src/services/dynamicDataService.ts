// frontend/src/services/dynamicDataService.ts
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface DataType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataPoint {
  id: string;
  data_type_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  extra_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DataTypeWithPoints extends DataType {
  data_points: DataPoint[];
}

class DynamicDataService {
  private baseUrl: string = `${API_BASE_URL}/dynamic-data`;

  async getDataTypes(): Promise<DataType[]> {
    const response = await fetch(`${this.baseUrl}/data-types`);
    if (!response.ok) throw new Error('Failed to fetch data types');
    return response.json();
  }

  async getDataPointsByType(typeName: string): Promise<DataPoint[]> {
    const response = await fetch(`${this.baseUrl}/data-types/${encodeURIComponent(typeName)}/points`);
    if (!response.ok) throw new Error(`Failed to fetch points for ${typeName}`);
    return response.json();
  }

  async createDataPoint(payload: {
    data_type_id: string;
    name: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    extra_data?: Record<string, any>;
  }): Promise<DataPoint> {
    const response = await fetch(`${this.baseUrl}/data-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create data point');
    return response.json();
  }

  async updateDataPoint(id: string, patch: Partial<{
    name: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    extra_data?: Record<string, any>;
  }>): Promise<DataPoint> {
    const response = await fetch(`${this.baseUrl}/data-points/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error('Failed to update data point');
    return response.json();
  }

  async deleteDataPoint(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data-points/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete data point');
  }

  // Convenience methods for specific data types
  async getDisabilityTypes(): Promise<DataPoint[]> {
    return this.getDataPointsByType('disability_types');
  }

  async getServiceTypes(): Promise<DataPoint[]> {
    return this.getDataPointsByType('service_types');
  }

  async getPlanTypes(): Promise<DataPoint[]> {
    return this.getDataPointsByType('plan_types');
  }

  async getContactMethods(): Promise<DataPoint[]> {
    return this.getDataPointsByType('contact_methods');
  }

  async getRiskLevels(): Promise<DataPoint[]> {
    return this.getDataPointsByType('risk_levels');
  }

  async getSupportCategories(): Promise<DataPoint[]> {
    return this.getDataPointsByType('support_categories');
  }
}

export const dynamicDataService = new DynamicDataService();