// frontend/src/components/DynamicSelect.tsx
import React from 'react';

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

// Mock data for different types - in real app this would come from API
const mockData: Record<string, string[]> = {
  // Existing data types
  disability_types: [
    'Physical Disability',
    'Intellectual Disability', 
    'Sensory Disability',
    'Mental Health Condition',
    'Neurological Condition',
    'Multiple Disabilities'
  ],
  relationship_types: [
    'Parent/Guardian',
    'Spouse/Partner',
    'Sibling',
    'Child',
    'Friend',
    'Carer',
    'Case Manager',
    'Support Coordinator'
  ],
  support_categories: [
    'Core Support',
    'Capital Support', 
    'Capacity Building Support',
    'Assistance with Daily Living',
    'Transport',
    'Social and Community Participation',
    'Employment Support'
  ],
  referrer_roles: [
    'Doctor/GP',
    'Specialist',
    'Social Worker',
    'Occupational Therapist',
    'Physiotherapist',
    'Psychologist',
    'Case Manager',
    'Support Coordinator',
    'Family Member',
    'Self-Referral'
  ],
  
  // Care Plan data types
  plan_periods: [
    '6 months',
    '12 months',
    '18 months',
    '24 months',
    'Ongoing'
  ],
  goal_categories: [
    'Independence Skills',
    'Social Participation',
    'Employment & Education',
    'Health & Wellbeing',
    'Communication',
    'Mobility & Transport',
    'Daily Living Skills',
    'Behavior Support',
    'Community Access'
  ],
  goal_timeframes: [
    '1-3 months',
    '3-6 months',
    '6-12 months',
    '12+ months'
  ],
  support_frequencies: [
    'Daily',
    'Multiple times per week',
    'Weekly',
    'Fortnightly',
    'Monthly',
    'As needed',
    'One-off'
  ],
  support_durations: [
    '30 minutes',
    '1 hour',
    '2 hours',
    '3 hours',
    '4 hours',
    'Half day (4+ hours)',
    'Full day (8+ hours)',
    'Overnight',
    'Extended (multiple days)'
  ],
  support_locations: [
    'Home',
    'Community',
    'Provider facility',
    'Workplace',
    'School/Education facility',
    'Recreation facility',
    'Healthcare facility',
    'Transport/Vehicle'
  ],
  staff_ratios: [
    '1:1 (One-on-one)',
    '1:2 (One worker, two participants)',
    '1:3 (One worker, three participants)',
    '1:4 (One worker, four participants)',
    '2:1 (Two workers, one participant)',
    'Group support'
  ],
  review_frequencies: [
    'Weekly',
    'Fortnightly',
    'Monthly',
    'Quarterly',
    'Bi-annually',
    'Annually',
    'As needed'
  ],
  
  // Risk Assessment data types
  assessor_roles: [
    'Support Coordinator',
    'Service Manager',
    'Occupational Therapist',
    'Behavior Support Practitioner',
    'Allied Health Professional',
    'Social Worker',
    'Psychologist',
    'Registered Nurse'
  ],
  risk_categories: [
    'Physical Safety',
    'Medical/Health',
    'Behavioral',
    'Environmental',
    'Social/Emotional',
    'Communication',
    'Medication',
    'Transport',
    'Financial',
    'Abuse/Neglect'
  ],
  risk_likelihood: [
    'Very Low',
    'Low',
    'Medium',
    'High',
    'Very High'
  ],
  risk_impact: [
    'Very Low',
    'Low',
    'Medium', 
    'High',
    'Very High'
  ],
  risk_status: [
    'Identified',
    'Under Review',
    'Managed',
    'Resolved',
    'Escalated'
  ],
  overall_risk_ratings: [
    'Low Risk',
    'Medium Risk',
    'High Risk',
    'Critical Risk'
  ]
};

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
  const options = mockData[dataType] || [];

  const handleSelectChange = (selectedValue: string) => {
    onChange(selectedValue);
    if (selectedValue !== 'other' && onOtherValueChange) {
      onOtherValueChange('');
    }
  };

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
          <option key={option} value={option.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}>
            {option}
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