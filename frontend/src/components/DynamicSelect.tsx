// frontend/src/components/DynamicSelect.tsx - COMPLETE FILE
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dynamicDataAPI } from '../services/api';

interface DynamicSelectProps {
  dataType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
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

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  dataType,
  value,
  onChange,
  placeholder = 'Please select...',
  required = false,
  includeOther = false,
  onOtherValueChange,
  otherValue = ''
}) => {
  // Fetch dynamic data from API
  const { data: options = [], isLoading, error } = useQuery<DynamicDataEntry[]>({
    queryKey: ['dynamic-data', dataType],
    queryFn: () => dynamicDataAPI.getByType(dataType),
  });

  const handleSelectChange = (selectedValue: string) => {
    onChange(selectedValue);
    if (selectedValue !== 'other' && onOtherValueChange) {
      onOtherValueChange('');
    }
  };

  if (isLoading) {
    return (
      <select
        disabled
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
      >
        <option>Loading...</option>
      </select>
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
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
        {includeOther && <option value="other">Other</option>}
      </select>
      
      {includeOther && value === 'other' && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherValueChange?.(e.target.value)}
          placeholder="Please specify..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      )}
    </div>
  );
};