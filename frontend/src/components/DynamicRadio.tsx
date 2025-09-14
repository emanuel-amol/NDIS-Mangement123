// frontend/src/components/DynamicRadio.tsx
import React from 'react';
import { useDynamicData } from '../hooks/useDynamicData';
import { DataPoint } from '../services/dynamicDataService';

interface DynamicRadioProps {
  dataType: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  includeOther?: boolean;
  onOtherValueChange?: (value: string) => void;
  otherValue?: string;
}

export const DynamicRadio: React.FC<DynamicRadioProps> = ({
  dataType,
  name,
  value,
  onChange,
  required = false,
  className = "",
  layout = 'vertical',
  includeOther = false,
  onOtherValueChange,
  otherValue = ""
}) => {
  const { data, loading, error } = useDynamicData(dataType);
  const [showOtherInput, setShowOtherInput] = React.useState(value === 'other');

  const handleRadioChange = (selectedValue: string) => {
    if (selectedValue === 'other') {
      setShowOtherInput(true);
      onChange(selectedValue);
    } else {
      setShowOtherInput(false);
      onChange(selectedValue);
    }
  };

  const containerClass = layout === 'horizontal' 
    ? `flex flex-wrap gap-6 ${className}` 
    : `space-y-3 ${className}`;

  if (loading) {
    return <div className="text-gray-500">Loading options...</div>;
  }

  if (error) {
    console.warn(`Dynamic data error for ${dataType}: ${error}`);
    // Component still works with fallback data
  }

  return (
    <div className="space-y-4">
      <div className={containerClass}>
        {data.map((item: DataPoint) => (
          <label key={item.id} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={item.name}
              checked={value === item.name}
              onChange={(e) => handleRadioChange(e.target.value)}
              required={required}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <span>{item.description || item.name}</span>
          </label>
        ))}
        
        {includeOther && (
          <label className="flex items-center">
            <input
              type="radio"
              name={name}
              value="other"
              checked={value === 'other'}
              onChange={(e) => handleRadioChange(e.target.value)}
              required={required}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <span>Other</span>
          </label>
        )}
      </div>

      {showOtherInput && includeOther && onOtherValueChange && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherValueChange(e.target.value)}
          placeholder="Please specify..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required={required && value === 'other'}
        />
      )}
    </div>
  );
};