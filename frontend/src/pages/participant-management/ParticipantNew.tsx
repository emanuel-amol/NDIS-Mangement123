// frontend/src/pages/onboarding-management-lifecycle/ParticipantNew.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicSelect } from '../../components/DynamicSelect';
import { DynamicRadio } from '../../components/DynamicRadio';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface ParticipantFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string;
  email_address: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  preferred_contact: string;
  disability_type: string;
  rep_first_name: string;
  rep_last_name: string;
  rep_phone_number: string;
  rep_email_address: string;
  rep_street_address: string;
  rep_city: string;
  rep_state: string;
  rep_postcode: string;
  rep_relationship: string;
  ndis_number: string;
  plan_type: string;
  plan_manager_name: string;
  plan_manager_agency: string;
  available_funding: string;
  plan_start_date: string;
  plan_review_date: string;
  support_category: string;
  client_goals: string;
  support_goals: string;
  current_supports: string;
  accessibility_needs: string;
  cultural_considerations: string;
  risk_level: string;
  risk_notes: string;
}

const ParticipantNew: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState<ParticipantFormData>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone_number: '',
    email_address: '',
    street_address: '',
    city: '',
    state: '',
    postcode: '',
    preferred_contact: '',
    disability_type: '',
    rep_first_name: '',
    rep_last_name: '',
    rep_phone_number: '',
    rep_email_address: '',
    rep_street_address: '',
    rep_city: '',
    rep_state: '',
    rep_postcode: '',
    rep_relationship: '',
    ndis_number: '',
    plan_type: '',
    plan_manager_name: '',
    plan_manager_agency: '',
    available_funding: '',
    plan_start_date: '',
    plan_review_date: '',
    support_category: '',
    client_goals: '',
    support_goals: '',
    current_supports: '',
    accessibility_needs: '',
    cultural_considerations: '',
    risk_level: 'low',
    risk_notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDynamicChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required';
    if (!formData.street_address) newErrors.street_address = 'Street address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.postcode) newErrors.postcode = 'Postcode is required';
    if (!formData.disability_type) newErrors.disability_type = 'Disability type is required';
    if (!formData.plan_type) newErrors.plan_type = 'Plan type is required';
    if (!formData.support_category) newErrors.support_category = 'Support category is required';
    if (!formData.plan_start_date) newErrors.plan_start_date = 'Plan start date is required';
    if (!formData.plan_review_date) newErrors.plan_review_date = 'Plan review date is required';
    if (!formData.client_goals) newErrors.client_goals = 'Client goals are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/participants/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Participant created successfully!');
        navigate(`/participants/${result.id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create participant: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating participant:', error);
      alert('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone_number: '',
      email_address: '',
      street_address: '',
      city: '',
      state: '',
      postcode: '',
      preferred_contact: '',
      disability_type: '',
      rep_first_name: '',
      rep_last_name: '',
      rep_phone_number: '',
      rep_email_address: '',
      rep_street_address: '',
      rep_city: '',
      rep_state: '',
      rep_postcode: '',
      rep_relationship: '',
      ndis_number: '',
      plan_type: '',
      plan_manager_name: '',
      plan_manager_agency: '',
      available_funding: '',
      plan_start_date: '',
      plan_review_date: '',
      support_category: '',
      client_goals: '',
      support_goals: '',
      current_supports: '',
      accessibility_needs: '',
      cultural_considerations: '',
      risk_level: 'low',
      risk_notes: ''
    });
    setErrors({});
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/participants')}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← Back to Participants
          </button>
          <h1 className="text-4xl font-bold text-blue-600 mb-4">Add New Participant</h1>
          <p className="text-lg text-gray-600 mb-2">
            Directly create a new participant profile for your service
          </p>
          <p className="text-sm text-gray-500">
            Complete all required fields marked with *
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
                {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
                {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
              </div>

              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>}
              </div>

              <div>
                <label htmlFor="email_address" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email_address"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="street_address"
                name="street_address"
                value={formData.street_address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter street address"
              />
              {errors.street_address && <p className="mt-1 text-sm text-red-600">{errors.street_address}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  <option value="NSW">New South Wales</option>
                  <option value="VIC">Victoria</option>
                  <option value="QLD">Queensland</option>
                  <option value="WA">Western Australia</option>
                  <option value="SA">South Australia</option>
                  <option value="TAS">Tasmania</option>
                  <option value="ACT">Australian Capital Territory</option>
                  <option value="NT">Northern Territory</option>
                </select>
                {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="postcode"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter postcode"
                />
                {errors.postcode && <p className="mt-1 text-sm text-red-600">{errors.postcode}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Disability Type <span className="text-red-500">*</span>
              </label>
              <DynamicSelect
                dataType="disability_types"
                value={formData.disability_type}
                onChange={(value) => handleDynamicChange('disability_type', value)}
                placeholder="Select primary disability type"
                required={true}
                includeOther={true}
              />
              {errors.disability_type && <p className="mt-1 text-sm text-red-600">{errors.disability_type}</p>}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contact Method
              </label>
              <DynamicRadio
                dataType="contact_methods"
                name="preferred_contact"
                value={formData.preferred_contact}
                onChange={(value) => handleDynamicChange('preferred_contact', value)}
                layout="horizontal"
              />
            </div>
          </div>

          {/* Representative Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Representative Details (Optional)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="rep_first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="rep_first_name"
                  name="rep_first_name"
                  value={formData.rep_first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter representative first name"
                />
              </div>

              <div>
                <label htmlFor="rep_last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="rep_last_name"
                  name="rep_last_name"
                  value={formData.rep_last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter representative last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship
                </label>
                <DynamicSelect
                  dataType="relationship_types"
                  value={formData.rep_relationship}
                  onChange={(value) => handleDynamicChange('rep_relationship', value)}
                  placeholder="Select relationship"
                  includeOther={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="rep_phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="rep_phone_number"
                  name="rep_phone_number"
                  value={formData.rep_phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label htmlFor="rep_email_address" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="rep_email_address"
                  name="rep_email_address"
                  value={formData.rep_email_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          {/* NDIS Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">NDIS Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="ndis_number" className="block text-sm font-medium text-gray-700 mb-2">
                  NDIS Number
                </label>
                <input
                  type="text"
                  id="ndis_number"
                  name="ndis_number"
                  value={formData.ndis_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter NDIS number (if available)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Type <span className="text-red-500">*</span>
                </label>
                <DynamicRadio
                  dataType="plan_types"
                  name="plan_type"
                  value={formData.plan_type}
                  onChange={(value) => handleDynamicChange('plan_type', value)}
                  required={true}
                  layout="vertical"
                />
                {errors.plan_type && <p className="mt-2 text-sm text-red-600">{errors.plan_type}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="plan_start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="plan_start_date"
                  name="plan_start_date"
                  value={formData.plan_start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.plan_start_date && <p className="mt-1 text-sm text-red-600">{errors.plan_start_date}</p>}
              </div>

              <div>
                <label htmlFor="plan_review_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Review Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="plan_review_date"
                  name="plan_review_date"
                  value={formData.plan_review_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.plan_review_date && <p className="mt-1 text-sm text-red-600">{errors.plan_review_date}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Support Category <span className="text-red-500">*</span>
              </label>
              <DynamicSelect
                dataType="support_categories"
                value={formData.support_category}
                onChange={(value) => handleDynamicChange('support_category', value)}
                placeholder="Select primary support category"
                required={true}
              />
              {errors.support_category && <p className="mt-1 text-sm text-red-600">{errors.support_category}</p>}
            </div>

            <div className="mt-6">
              <label htmlFor="client_goals" className="block text-sm font-medium text-gray-700 mb-2">
                Client Goals <span className="text-red-500">*</span>
              </label>
              <textarea
                id="client_goals"
                name="client_goals"
                rows={4}
                value={formData.client_goals}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please describe the participant's primary goals and objectives"
              />
              {errors.client_goals && <p className="mt-1 text-sm text-red-600">{errors.client_goals}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="current_supports" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Supports & Services
                </label>
                <textarea
                  id="current_supports"
                  name="current_supports"
                  rows={3}
                  value={formData.current_supports}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List any current supports or services"
                />
              </div>

              <div>
                <label htmlFor="accessibility_needs" className="block text-sm font-medium text-gray-700 mb-2">
                  Accessibility Needs
                </label>
                <textarea
                  id="accessibility_needs"
                  name="accessibility_needs"
                  rows={3}
                  value={formData.accessibility_needs}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any specific accessibility requirements"
                />
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Risk Assessment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="risk_level" className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level
                </label>
                <select
                  id="risk_level"
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="cultural_considerations" className="block text-sm font-medium text-gray-700 mb-2">
                  Cultural Considerations
                </label>
                <input
                  type="text"
                  id="cultural_considerations"
                  name="cultural_considerations"
                  value={formData.cultural_considerations}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any cultural, linguistic, or religious considerations"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="risk_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Risk Assessment Notes
              </label>
              <textarea
                id="risk_notes"
                name="risk_notes"
                rows={3}
                value={formData.risk_notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any risk assessment notes or special considerations"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/participants')}
                  className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Form
                </button>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating Participant...' : 'Create Participant'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParticipantNew;