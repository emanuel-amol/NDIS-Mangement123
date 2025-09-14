import React, { useState, useEffect } from 'react';

// Mock data - same as DynamicSelect
const mockDataPoints = {
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
  urgency_levels: [
    { id: '22', name: 'low', description: 'Low - Non-urgent', is_active: true },
    { id: '23', name: 'medium', description: 'Medium - Standard priority', is_active: true },
    { id: '24', name: 'high', description: 'High - Urgent', is_active: true },
    { id: '25', name: 'critical', description: 'Critical - Immediate attention required', is_active: true }
  ]
};

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
      // In real app, this would be an API call
      // const response = await fetch(`/api/v1/dynamic-data/data-types/${dataType}/points`);
      // const data = await response.json();
      
      // Mock data simulation
      await new Promise(resolve => setTimeout(resolve, 100));
      const data = mockDataPoints[dataType as keyof typeof mockDataPoints] || [];
      setOptions(data.filter(opt => opt.is_active));
    } catch (err) {
      setError('Failed to load options');
      console.error('Error loading options:', err);
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
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
  );
};