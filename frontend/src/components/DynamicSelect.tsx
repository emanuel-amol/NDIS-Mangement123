import React, { useState, useEffect } from 'react';

// Mock data - in real app this would come from the API
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
  support_categories: [
    { id: '19', name: 'core_supports', description: 'Core Supports', is_active: true },
    { id: '20', name: 'capital_supports', description: 'Capital Supports', is_active: true },
    { id: '21', name: 'capacity_building', description: 'Capacity Building', is_active: true }
  ]
};

interface DataPoint {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface DynamicSelectProps {
  dataType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  includeOther?: boolean;
  onOtherValueChange?: (value: string) => void;
  otherValue?: string;
  className?: string;
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  dataType,
  value,
  onChange,
  placeholder = "Select an option",
  required = false,
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

  const baseClassName = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`;

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={baseClassName}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading...' : placeholder}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.name}>
            {option.description || option.name}
          </option>
        ))}
        {includeOther && (
          <option value="other">Other (please specify)</option>
        )}
      </select>

      {includeOther && value === 'other' && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherValueChange?.(e.target.value)}
          placeholder="Please specify..."
          className={`mt-2 ${baseClassName}`}
          required={required}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};