// frontend/src/pages/participants/Referralform/form.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

// Type for dynamic data points
interface DataPoint {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

// Expanded Zod validation schema
const referralFormSchema = z.object({
  // Client Details
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  emailAddress: z.string().email('Valid email is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  
  // NDIS Specific Information
  disabilityType: z.string().min(1, 'Disability type is required'),
  serviceTypes: z.array(z.string()).min(1, 'At least one service type is required'),
  ndisNumber: z.string().optional(),
  urgencyLevel: z.string().min(1, 'Urgency level is required'),
  preferredContactMethod: z.string().min(1, 'Preferred contact method is required'),
  
  // Support Requirements
  currentSupports: z.string().min(1, 'Current supports information is required'),
  supportGoals: z.string().min(1, 'Support goals are required'),
  accessibilityNeeds: z.string().optional(),
  culturalConsiderations: z.string().optional(),
  
  // Representative Details (Optional)
  repFirstName: z.string().optional(),
  repLastName: z.string().optional(),
  repPhoneNumber: z.string().optional(),
  repEmailAddress: z.string().email('Enter a valid email').optional(),
  repRelationship: z.string().optional(),
});

type ReferralFormData = z.infer<typeof referralFormSchema>;

const NDISReferralForm: React.FC = () => {
  const [states, setStates] = useState<DataPoint[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<DataPoint[]>([]);
  const [disabilities, setDisabilities] = useState<DataPoint[]>([]);
  const [serviceTypes, setServiceTypes] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ReferralFormData>({
    resolver: zodResolver(referralFormSchema),
    mode: 'onBlur'
  });

  // Watch for service types to handle multiple selections
  const selectedServices = watch('serviceTypes') || [];

  // Fetch dynamic data on component mount
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required dynamic data in parallel
        const [statesResponse, relationshipsResponse, disabilitiesResponse, servicesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/dynamic-data/data-types/states/points`),
          fetch(`${API_BASE_URL}/dynamic-data/data-types/relationship_types/points`),
          fetch(`${API_BASE_URL}/dynamic-data/data-types/disabilities/points`),
          fetch(`${API_BASE_URL}/dynamic-data/data-types/service_types/points`)
        ]);

        if (statesResponse.ok) {
          const statesData = await statesResponse.json();
          setStates(statesData);
        }

        if (relationshipsResponse.ok) {
          const relationshipsData = await relationshipsResponse.json();
          setRelationshipTypes(relationshipsData);
        }

        if (disabilitiesResponse.ok) {
          const disabilitiesData = await disabilitiesResponse.json();
          setDisabilities(disabilitiesData);
        }

        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          setServiceTypes(servicesData);
        }

      } catch (error) {
        console.error('Error fetching dynamic data:', error);
        setApiError('Failed to load form options. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, []);

  const onSubmit = async (data: ReferralFormData) => {
    const payload = {
      ...data,
      dateOfBirth: data.dateOfBirth?.slice(0, 10),
      repFirstName: data.repFirstName?.trim() || null,
      repLastName: data.repLastName?.trim() || null,
      repPhoneNumber: data.repPhoneNumber?.trim() || null,
      repEmailAddress: data.repEmailAddress?.trim() || null,
      repRelationship: data.repRelationship?.trim() || null,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/participants/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setReferralId(result.id || 'N/A');
        setShowSuccess(true);
      } else {
        let message = 'Failed to submit form';
        try {
          const err = await response.json();
          if (err?.detail) {
            message = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form. ${error?.message ?? ''}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-4">NDIS Referral Form</h1>
          <p className="text-lg text-gray-600 mb-2">
            Take the first step towards accessing NDIS support
          </p>
          <p className="text-sm text-gray-500">
            Please complete all required fields marked with * | All information is kept confidential
          </p>
          {apiError && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              {apiError}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Client Details Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Client Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  {...register('dateOfBirth')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  {...register('phoneNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="emailAddress"
                  {...register('emailAddress')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
                {errors.emailAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.emailAddress.message}</p>
                )}
              </div>
            </div>

            {/* Address Section */}
            <div className="mt-6">
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="streetAddress"
                {...register('streetAddress')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter street address"
              />
              {errors.streetAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.streetAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  {...register('city')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  id="state"
                  {...register('state')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="postcode"
                  {...register('postcode')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter postcode"
                />
                {errors.postcode && (
                  <p className="mt-1 text-sm text-red-600">{errors.postcode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* NDIS Information Section */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">NDIS Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="disabilityType" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Disability Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="disabilityType"
                  {...register('disabilityType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Disability Type</option>
                  {disabilities.map((disability) => (
                    <option key={disability.id} value={disability.name}>
                      {disability.name}
                    </option>
                  ))}
                </select>
                {errors.disabilityType && (
                  <p className="mt-1 text-sm text-red-600">{errors.disabilityType.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="ndisNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  NDIS Number (if known)
                </label>
                <input
                  type="text"
                  id="ndisNumber"
                  {...register('ndisNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter NDIS number if available"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="urgencyLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="urgencyLevel"
                  {...register('urgencyLevel')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Urgency</option>
                  <option value="low">Low - Within 4 weeks</option>
                  <option value="medium">Medium - Within 2 weeks</option>
                  <option value="high">High - Within 1 week</option>
                  <option value="urgent">Urgent - Within 24-48 hours</option>
                </select>
                {errors.urgencyLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.urgencyLevel.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method <span className="text-red-500">*</span>
                </label>
                <select
                  id="preferredContactMethod"
                  {...register('preferredContactMethod')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Contact Method</option>
                  <option value="phone">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS/Text</option>
                  <option value="inPerson">In Person</option>
                </select>
                {errors.preferredContactMethod && (
                  <p className="mt-1 text-sm text-red-600">{errors.preferredContactMethod.message}</p>
                )}
              </div>
            </div>

            {/* Services Needed */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services Needed <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {serviceTypes.map((service) => (
                  <label key={service.id} className="flex items-center">
                    <input
                      type="checkbox"
                      value={service.name}
                      {...register('serviceTypes')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                  </label>
                ))}
              </div>
              {errors.serviceTypes && (
                <p className="mt-1 text-sm text-red-600">{errors.serviceTypes.message}</p>
              )}
            </div>
          </div>

          {/* Support Requirements Section */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Support Requirements</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="currentSupports" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Supports & Services <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="currentSupports"
                  {...register('currentSupports')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe current supports, services, or care arrangements..."
                />
                {errors.currentSupports && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentSupports.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="supportGoals" className="block text-sm font-medium text-gray-700 mb-2">
                  Support Goals & Outcomes <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="supportGoals"
                  {...register('supportGoals')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What goals or outcomes are you hoping to achieve with NDIS support?"
                />
                {errors.supportGoals && (
                  <p className="mt-1 text-sm text-red-600">{errors.supportGoals.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="accessibilityNeeds" className="block text-sm font-medium text-gray-700 mb-2">
                  Accessibility Requirements
                </label>
                <textarea
                  id="accessibilityNeeds"
                  {...register('accessibilityNeeds')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any accessibility needs (wheelchair access, hearing support, etc.)..."
                />
              </div>

              <div>
                <label htmlFor="culturalConsiderations" className="block text-sm font-medium text-gray-700 mb-2">
                  Cultural & Language Considerations
                </label>
                <textarea
                  id="culturalConsiderations"
                  {...register('culturalConsiderations')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Language preferences, cultural considerations, religious requirements..."
                />
              </div>
            </div>
          </div>

          {/* Representative Details Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Representative Details (If Applicable)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="repFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="repFirstName"
                  {...register('repFirstName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter representative first name"
                />
              </div>

              <div>
                <label htmlFor="repLastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="repLastName"
                  {...register('repLastName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter representative last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="repPhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="repPhoneNumber"
                  {...register('repPhoneNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label htmlFor="repEmailAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="repEmailAddress"
                  {...register('repEmailAddress')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
                {errors.repEmailAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.repEmailAddress.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="repRelationship" className="block text-sm font-medium text-gray-700 mb-2">
                Relationship to Client
              </label>
              <select
                id="repRelationship"
                {...register('repRelationship')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select relationship</option>
                {relationshipTypes.map((relationship) => (
                  <option key={relationship.id} value={relationship.name.toLowerCase()}>
                    {relationship.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                By submitting this form, you consent to us contacting you about NDIS services and understand that this information will be used to assess your support needs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => reset()}
                className="px-8 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting Your Referral...' : 'Submit NDIS Referral'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NDISReferralForm;