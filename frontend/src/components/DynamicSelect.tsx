// frontend/src/components/DynamicSelect.tsx - FIXED TO USE API DATA
import React, { useEffect, useState } from 'react';
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

// frontend/src/components/DynamicRadio.tsx - FIXED TO USE API DATA
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