// frontend/src/components/DynamicRadio.tsx - COMPLETE FILE
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dynamicDataAPI } from '../services/api';

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

interface DynamicDataEntry {
  id: number;
  type: string;
  code: string;
  label: string;
  is_active: boolean;
  meta?: any;
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
  otherValue = ''
}) => {
  // Fetch dynamic data from API
  const { data: options = [], isLoading, error } = useQuery<DynamicDataEntry[]>({
    queryKey: ['dynamic-data', dataType],
    queryFn: () => dynamicDataAPI.getByType(dataType),
  });

  const containerClass = layout === 'horizontal' 
    ? 'flex flex-wrap gap-4' 
    : 'space-y-3';

  if (isLoading) {
    return (
      <div className="text-gray-500">
        Loading {dataType.replace(/_/g, ' ')} options...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error loading options for {dataType}. Please try again.
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {options.map((option) => (
        <label key={option.code} className="flex items-center">
          <input
            type="radio"
            name={name}
            value={option.code}
            checked={value === option.code}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="mr-2 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{option.label}</span>
        </label>
      ))}
      
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