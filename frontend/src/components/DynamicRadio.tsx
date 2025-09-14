// frontend/src/components/DynamicRadio.tsx - API Version
import React, { useState, useEffect } from 'react';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

interface DataPoint {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface DynamicRadioProps {
  dataType: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  layout?: 'horizontal' | 'vertical';
  includeOther?: boolean;
  onOtherValueChange?: (value: string) => void;
  otherValue?: string;
  className?: string;
}

export const DynamicRadio: React.FC<DynamicRadioProps> = ({
  dataType,
  name,
  value,
  onChange,
  required = false,
  layout = 'vertical',
  includeOther = false,
  onOtherValueChange,
  otherValue = '',
  className = ''
}) => {
  const [options, setOptions] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadOptions();
  }, [dataType]);

  const loadOptions = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`Loading radio options for dataType: ${dataType}`);
      
      // Make API call to your working endpoint
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-types/${dataType}/points`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Loaded ${data.length} radio options for ${dataType}:`, data);
      
      // Filter active options
      const activeOptions = data.filter((opt: DataPoint) => opt.is_active);
      setOptions(activeOptions);
      
    } catch (err: any) {
      console.error(`Error loading radio options for ${dataType}:`, err);
      setError('Failed to load options');
      
      // Fallback to mock data if API fails
      const mockData = getMockDataForType(dataType);
      setOptions(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Fallback mock data for when API is unavailable
  const getMockDataForType = (type: string): DataPoint[] => {
    const mockDataPoints: Record<string, DataPoint[]> = {
      disability_types: [
        { id: '1', name: 'intellectual', description: 'Intellectual Disability', is_active: true },
        { id: '2', name: 'physical', description: 'Physical Disability', is_active: true },
        { id: '3', name: 'sensory', description: 'Sensory Disability', is_active: true },
        { id: '4', name: 'autism', description: 'Autism Spectrum Disorder', is_active: true },
        { id: '5', name: 'psychosocial', description: 'Psychosocial Disability', is_active: true },
        { id: '6', name: 'neurological', description: 'Neurological Disability', is_active: true }
      ],
      contact_methods: [
        { id: '7', name: 'phone', description: 'Phone Call', is_active: true },
        { id: '8', name: 'email', description: 'Email', is_active: true },
        { id: '9', name: 'sms', description: 'SMS/Text Message', is_active: true },
        { id: '10', name: 'mail', description: 'Postal Mail', is_active: true }
      ],
      plan_types: [
        { id: '11', name: 'self-managed', description: 'Self-Managed', is_active: true },
        { id: '12', name: 'plan-managed', description: 'Plan-Managed', is_active: true },
        { id: '13', name: 'agency-managed', description: 'NDIA-Managed', is_active: true }
      ],
      service_types: [
        { id: '14', name: 'physiotherapy', description: 'Physiotherapy', is_active: true },
        { id: '15', name: 'psychology', description: 'Psychology', is_active: true },
        { id: '16', name: 'occupational_therapy', description: 'Occupational Therapy', is_active: true },
        { id: '17', name: 'speech_pathology', description: 'Speech Pathology', is_active: true },
        { id: '18', name: 'support_coordination', description: 'Support Coordination', is_active: true }
      ],
      support_categories: [
        { id: '19', name: 'core_supports', description: 'Core Supports', is_active: true },
        { id: '20', name: 'capital_supports', description: 'Capital Supports', is_active: true },
        { id: '21', name: 'capacity_building', description: 'Capacity Building', is_active: true }
      ],
      urgency_levels: [
        { id: '22', name: 'low', description: 'Low - Non-urgent', is_active: true },
        { id: '23', name: 'medium', description: 'Medium - Standard priority', is_active: true },
        { id: '24', name: 'high', description: 'High - Urgent', is_active: true },
        { id: '25', name: 'critical', description: 'Critical - Immediate attention required', is_active: true }
      ],
      relationship_types: [
        { id: '26', name: 'parent', description: 'Parent', is_active: true },
        { id: '27', name: 'guardian', description: 'Legal Guardian', is_active: true },
        { id: '28', name: 'sibling', description: 'Sibling', is_active: true },
        { id: '29', name: 'spouse', description: 'Spouse/Partner', is_active: true },
        { id: '30', name: 'friend', description: 'Friend', is_active: true },
        { id: '31', name: 'advocate', description: 'Advocate', is_active: true }
      ],
      referrer_roles: [
        { id: '32', name: 'doctor', description: 'Medical Doctor', is_active: true },
        { id: '33', name: 'social_worker', description: 'Social Worker', is_active: true },
        { id: '34', name: 'support_coordinator', description: 'Support Coordinator', is_active: true },
        { id: '35', name: 'case_manager', description: 'Case Manager', is_active: true },
        { id: '36', name: 'family_member', description: 'Family Member', is_active: true }
      ]
    };

    return mockDataPoints[type] || [];
  };

  const containerClassName = layout === 'horizontal' 
    ? `flex flex-wrap gap-4 ${className}`
    : `space-y-2 ${className}`;

  const itemClassName = layout === 'horizontal'
    ? 'flex items-center'
    : 'flex items-center';

  if (loading) {
    return <div className="text-gray-500">Loading options...</div>;
  }

  return (
    <div>
      <div className={containerClassName}>
        {options.map((option) => (
          <label key={option.id} className={itemClassName}>
            <input
              type="radio"
              name={name}
              value={option.name}
              checked={value === option.name}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {option.description || option.name}
            </span>
          </label>
        ))}
        
        {includeOther && (
          <div className={layout === 'vertical' ? 'space-y-2' : ''}>
            <label className={itemClassName}>
              <input
                type="radio"
                name={name}
                value="other"
                checked={value === 'other'}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Other (please specify)</span>
            </label>
            
            {value === 'other' && (
              <input
                type="text"
                value={otherValue}
                onChange={(e) => onOtherValueChange?.(e.target.value)}
                placeholder="Please specify..."
                className="ml-6 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={required && value === 'other'}
              />
            )}
          </div>
        )}
      </div>

      {error && !loading && (
        <p className="mt-1 text-sm text-orange-600">
          {error} (using fallback data)
        </p>
      )}
    </div>
  );
};