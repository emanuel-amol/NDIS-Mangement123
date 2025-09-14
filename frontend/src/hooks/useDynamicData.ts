// frontend/src/hooks/useDynamicData.ts
import { useState, useEffect } from 'react';
import { dynamicDataService, DataPoint } from '../services/dynamicDataService';

export function useDynamicData(dataTypeName: string) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const points = await dynamicDataService.getDataPointsByType(dataTypeName);
        setData(points);
      } catch (err: any) {
        console.error(`Error fetching ${dataTypeName}:`, err);
        setError(err.message || 'Failed to load data');
        // Provide fallback data based on type
        setData(getFallbackData(dataTypeName));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataTypeName]);

  const refresh = () => {
    const fetchData = async () => {
      try {
        const points = await dynamicDataService.getDataPointsByType(dataTypeName);
        setData(points);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to refresh data');
      }
    };
    fetchData();
  };

  return { data, loading, error, refresh };
}

// Fallback data for when API is not available
function getFallbackData(dataTypeName: string): DataPoint[] {
  const fallbackData: Record<string, DataPoint[]> = {
    disability_types: [
      { id: '1', data_type_id: '1', name: 'intellectual', description: 'Intellectual Disability', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '2', data_type_id: '1', name: 'physical', description: 'Physical Disability', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '3', data_type_id: '1', name: 'sensory', description: 'Sensory Disability', sort_order: 3, is_active: true, created_at: '', updated_at: '' },
      { id: '4', data_type_id: '1', name: 'psychosocial', description: 'Psychosocial Disability', sort_order: 4, is_active: true, created_at: '', updated_at: '' }
    ],
    service_types: [
      { id: '5', data_type_id: '2', name: 'physiotherapy', description: 'Physiotherapy', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '6', data_type_id: '2', name: 'chiro', description: 'Chiropractic', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '7', data_type_id: '2', name: 'psychologist', description: 'Psychology', sort_order: 3, is_active: true, created_at: '', updated_at: '' },
      { id: '8', data_type_id: '2', name: 'occupational_therapy', description: 'Occupational Therapy', sort_order: 4, is_active: true, created_at: '', updated_at: '' },
      { id: '9', data_type_id: '2', name: 'speech_pathology', description: 'Speech Pathology', sort_order: 5, is_active: true, created_at: '', updated_at: '' }
    ],
    plan_types: [
      { id: '10', data_type_id: '3', name: 'plan-managed', description: 'Plan Managed', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '11', data_type_id: '3', name: 'self-managed', description: 'Self Managed', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '12', data_type_id: '3', name: 'agency-managed', description: 'Agency Managed', sort_order: 3, is_active: true, created_at: '', updated_at: '' }
    ],
    contact_methods: [
      { id: '13', data_type_id: '4', name: 'phone', description: 'Phone Call', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '14', data_type_id: '4', name: 'email', description: 'Email', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '15', data_type_id: '4', name: 'sms', description: 'SMS/Text Message', sort_order: 3, is_active: true, created_at: '', updated_at: '' }
    ],
    risk_levels: [
      { id: '16', data_type_id: '5', name: 'low', description: 'Low Risk', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '17', data_type_id: '5', name: 'medium', description: 'Medium Risk', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '18', data_type_id: '5', name: 'high', description: 'High Risk', sort_order: 3, is_active: true, created_at: '', updated_at: '' }
    ],
    support_categories: [
      { id: '19', data_type_id: '6', name: 'core_support', description: 'Core Support', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      { id: '20', data_type_id: '6', name: 'capacity_building', description: 'Capacity Building', sort_order: 2, is_active: true, created_at: '', updated_at: '' },
      { id: '21', data_type_id: '6', name: 'capital_support', description: 'Capital Support', sort_order: 3, is_active: true, created_at: '', updated_at: '' }
    ]
  };

  return fallbackData[dataTypeName] || [];
}