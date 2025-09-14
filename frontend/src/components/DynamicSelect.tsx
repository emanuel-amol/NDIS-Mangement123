// frontend/src/components/DynamicSelect.tsx
import React from 'react';
import { useDynamicData } from '../hooks/useDynamicData';
import { DataPoint } from '../services/dynamicDataService';

interface DynamicSelectProps {
  dataType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  includeOther?: boolean;
  onOtherValueChange?: (value: string) => void;
  otherValue?: string;
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  dataType,
  value,
  onChange,
  placeholder = "Select an option",
  required = false,
  className = "",
  includeOther = false,
  onOtherValueChange,
  otherValue = ""
}) => {
  const { data, loading, error } = useDynamicData(dataType);
  const [showOtherInput, setShowOtherInput] = React.useState(false);

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'other') {
      setShowOtherInput(true);
      onChange(selectedValue);
    } else {
      setShowOtherInput(false);
      onChange(selectedValue);
    }
  };

  const baseSelectClass = `w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`;

  if (loading) {
    return (
      <select className={baseSelectClass} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  if (error) {
    console.warn(`Dynamic data error for ${dataType}: ${error}`);
    // Component still works with fallback data
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required}
        className={baseSelectClass}
      >
        <option value="">{placeholder}</option>
        {data.map((item: DataPoint) => (
          <option key={item.id} value={item.name}>
            {item.description || item.name}
          </option>
        ))}
        {includeOther && (
          <option value="other">Other</option>
        )}
      </select>

      {showOtherInput && includeOther && onOtherValueChange && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherValueChange(e.target.value)}
          placeholder="Please specify..."
          className={baseSelectClass}
          required={required}
        />
      )}
    </div>
  );
};