// frontend/src/components/DynamicRadio.tsx
import React from 'react';

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
}

// Mock data for different radio button types
const mockData: Record<string, string[]> = {
  contact_methods: [
    'Phone Call',
    'SMS/Text',
    'Email',
    'In Person'
  ],
  plan_types: [
    'Self-Managed',
    'Plan-Managed', 
    'Agency-Managed'
  ],
  urgency_levels: [
    'Low',
    'Medium',
    'High',
    'Urgent'
  ],
  service_types: [
    'Personal Care',
    'Domestic Assistance',
    'Community Access',
    'Transport',
    'Respite Care',
    'Supported Independent Living',
    'Therapy Services',
    'Behavior Support'
  ]
};

export const DynamicRadio: React.FC<DynamicRadioProps> = ({
  dataType,
  name,
  value,
  onChange,
  required = false,
  layout = 'vertical',
  includeOther = false,
  onOtherValueChange,
  otherValue = ''
}) => {
  const options = mockData[dataType] || [];
  
  const containerClass = layout === 'horizontal' 
    ? 'flex flex-wrap gap-4' 
    : 'space-y-3';

  return (
    <div className={containerClass}>
      {options.map((option) => {
        const optionValue = option.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return (
          <label key={option} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        );
      })}
      
      {includeOther && (
        <div className="flex items-center flex-col space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name={name}
              value="other"
              checked={value === 'other'}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              className="mr-2 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Other</span>
          </label>
          
          {value === 'other' && (
            <input
              type="text"
              value={otherValue}
              onChange={(e) => onOtherValueChange?.(e.target.value)}
              placeholder="Please specify..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
};