// frontend/src/pages/onboarding-management-lifecycle/ParticipantEdit.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  status: string;
}

const ParticipantEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
    risk_level: '',
    risk_notes: '',
    status: ''
  });

  useEffect(() => {
    if (id) {
      fetchParticipant(parseInt(id));
    }
  }, [id]);

  const fetchParticipant = async (participantId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          date_of_birth: data.date_of_birth || '',
          phone_number: data.phone_number || '',
          email_address: data.email_address || '',
          street_address: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
          postcode: data.postcode || '',
          preferred_contact: data.preferred_contact || '',
          disability_type: data.disability_type || '',
          rep_first_name: data.rep_first_name || '',
          rep_last_name: data.rep_last_name || '',
          rep_phone_number: data.rep_phone_number || '',
          rep_email_address: data.rep_email_address || '',
          rep_street_address: data.rep_street_address || '',
          rep_city: data.rep_city || '',
          rep_state: data.rep_state || '',
          rep_postcode: data.rep_postcode || '',
          rep_relationship: data.rep_relationship || '',
          ndis_number: data.ndis_number || '',
          plan_type: data.plan_type || '',
          plan_manager_name: data.plan_manager_name || '',
          plan_manager_agency: data.plan_manager_agency || '',
          available_funding: data.available_funding || '',
          plan_start_date: data.plan_start_date || '',
          plan_review_date: data.plan_review_date || '',
          support_category: data.support_category || '',
          client_goals: data.client_goals || '',
          support_goals: data.support_goals || '',
          current_supports: data.current_supports || '',
          accessibility_needs: data.accessibility_needs || '',
          cultural_considerations: data.cultural_considerations || '',
          risk_level: data.risk_level || '',
          risk_notes: data.risk_notes || '',
          status: data.status || ''
        });
      } else {
        alert('Failed to load participant data');
        navigate('/participants');
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      alert('Network error occurred');
      navigate('/participants');
    } finally {
      setLoading(false);
    }
  };

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
    if (!formData.plan_type) newErrors.plan_type = 'Plan type is required';
    if (!formData.support_category) newErrors.support_category = 'Support category is required';
    if (!formData.plan_start_date) newErrors.plan_start_date = 'Plan start date is required';
    if (!formData.plan_review_date) newErrors.plan_review_date = 'Plan review date is required';

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
      const response = await fetch(`${API_BASE_URL}/participants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Participant updated successfully!');
        navigate(`/participants/${id}`);
      } else {
        const error = await response.json();
        alert(`Failed to update participant: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating participant:', error);
      alert('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate(`/participants/${id}`)}
              className="text-blue-600 hover:text-blue-800 mb-2 text-sm"
            >
              ← Back to Profile
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              Edit Participant: {formData.first_name} {formData.last_name}
            </h1>
            <p className="text-gray-600">Update participant information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Personal Information</h2>
            
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
                />
                {errors.postcode && <p className="mt-1 text-sm text-red-600">{errors.postcode}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disability Type
              </label>
              <DynamicSelect
                dataType="disability_types"
                value={formData.disability_type}
                onChange={(value) => handleDynamicChange('disability_type', value)}
                placeholder="Select disability type"
              />
            </div>
          </div>

          {/* NDIS Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">NDIS Information</h2>
            
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
                placeholder="Select support category"
                required={true}
              />
              {errors.support_category && <p className="mt-1 text-sm text-red-600">{errors.support_category}</p>}
            </div>

            <div className="mt-6">
              <label htmlFor="client_goals" className="block text-sm font-medium text-gray-700 mb-2">
                Client Goals
              </label>
              <textarea
                id="client_goals"
                name="client_goals"
                rows={4}
                value={formData.client_goals}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status & Risk Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Status & Risk Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="prospective">Prospective</option>
                  <option value="onboarded">Onboarded</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

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
            </div>

            <div className="mt-6">
              <label htmlFor="risk_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Risk Notes
              </label>
              <textarea
                id="risk_notes"
                name="risk_notes"
                rows={3}
                value={formData.risk_notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any risk assessment notes or considerations"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={() => navigate(`/participants/${id}`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParticipantEdit;