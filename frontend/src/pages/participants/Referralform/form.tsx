<<<<<<< HEAD
// frontend/src/pages/participants/Referralform/form.tsx
import React, { useState, useEffect } from 'react';
=======
import React, { useState } from 'react';
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
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
<<<<<<< HEAD
  emailAddress: z.string().email('Valid email is required'),
=======
  emailAddress: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, {
    message: 'Invalid email format'
  }),
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
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
<<<<<<< HEAD
  repEmailAddress: z.string().email('Enter a valid email').optional(),
  repRelationship: z.string().optional(),
=======
  repEmailAddress: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, {
    message: 'Invalid email format'
  }),
  repStreetAddress: z.string().optional(),
  repCity: z.string().optional(),
  repState: z.string().optional(),
  repPostcode: z.string().optional(),

  // NDIS Details
  planType: z.string().min(1, 'Plan type is required'),
  planManagerName: z.string().optional(),
  planManagerAgency: z.string().optional(),
  ndisNumber: z.string().optional(),
  availableFunding: z.string().optional(),
  planStartDate: z.string().min(1, 'Plan start date is required'),
  planReviewDate: z.string().min(1, 'Plan review date is required'),
  clientGoals: z.string().min(1, 'Client goals are required'),

  // Referrer Details
  referrerFirstName: z.string().min(1, 'Referrer first name is required'),
  referrerLastName: z.string().min(1, 'Referrer last name is required'),
  referrerAgency: z.string().optional(),
  referrerRole: z.string().optional(),
  referrerEmail: z.string().email('Invalid email format').min(1, 'Referrer email is required'),
  referrerPhone: z.string().min(1, 'Referrer phone is required'),

  // Reason for Referral
  referredFor: z.string().min(1, 'Please select what client is referred for'),
  reasonForReferral: z.string().min(10, 'Please provide detailed reason for referral'),

  // Consent and Contact Preference
  consentCheckbox: z.boolean().refine(val => val === true, 'Consent is required'),
  preferredContact: z.string().min(1, 'Preferred contact method is required'),
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
});

type ReferralFormData = z.infer<typeof referralFormSchema>;

const NDISReferralForm: React.FC = () => {
<<<<<<< HEAD
  const [states, setStates] = useState<DataPoint[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<DataPoint[]>([]);
  const [disabilities, setDisabilities] = useState<DataPoint[]>([]);
  const [serviceTypes, setServiceTypes] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string>('');

=======
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referralId, setReferralId] = useState<string>('');
  
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
<<<<<<< HEAD
=======
    trigger
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
  } = useForm<ReferralFormData>({
    resolver: zodResolver(referralFormSchema),
    mode: 'onBlur'
  });

<<<<<<< HEAD
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
=======
  const planType = watch('planType');
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a

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

<<<<<<< HEAD
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form...</p>
          </div>
=======
  const nextStep = async () => {
    let fieldsToValidate: (keyof ReferralFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'emailAddress', 'streetAddress', 'city', 'state', 'postcode', 'preferredContact'];
        break;
      case 2:
        fieldsToValidate = ['planType', 'planStartDate', 'planReviewDate', 'clientGoals'];
        if (planType === 'plan-managed' || planType === 'agency-managed') {
          fieldsToValidate.push('planManagerName', 'planManagerAgency');
        }
        break;
      case 3:
        fieldsToValidate = ['referrerFirstName', 'referrerLastName', 'referrerEmail', 'referrerPhone'];
        break;
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const resetForm = () => {
    reset();
    setCurrentStep(1);
    setShowSuccess(false);
    setReferralId('');
  };

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">Referral Submitted Successfully!</h1>
            <p className="text-lg text-gray-600 mb-4">
              Thank you for submitting your NDIS referral form.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-2">Your referral ID:</p>
              <p className="text-xl font-mono font-bold text-blue-600">#{referralId}</p>
            </div>
            <div className="text-left bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Our team will review your referral within 2 business days</li>
                <li>• We'll contact you using your preferred contact method</li>
                <li>• We'll discuss your needs and available services</li>
                <li>• We'll help you get started with the right support</li>
              </ul>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit Another Referral
          </button>
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
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

<<<<<<< HEAD
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
=======
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Step {currentStep} of 4: {
                  currentStep === 1 ? 'Client & Representative Details' :
                  currentStep === 2 ? 'NDIS Details' :
                  currentStep === 3 ? 'Referrer Details' :
                  'Referral Reason & Consent'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Client Details Section */}
          {currentStep === 1 && (
            <>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Client Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* First Name */}
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

                  {/* Last Name */}
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

                  {/* Date of Birth */}
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
                  {/* Phone Number */}
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

                  {/* Email Address */}
                  <div>
                    <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="emailAddress"
                      {...register('emailAddress')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                    {errors.emailAddress && (
                      <p className="mt-1 text-sm text-red-600">{String(errors.emailAddress?.message || '')}</p>
                    )}
                  </div>
                </div>

                {/* Street Address */}
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
                  {/* City */}
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

                  {/* State */}
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
                      <option value="NSW">New South Wales</option>
                      <option value="VIC">Victoria</option>
                      <option value="QLD">Queensland</option>
                      <option value="WA">Western Australia</option>
                      <option value="SA">South Australia</option>
                      <option value="TAS">Tasmania</option>
                      <option value="ACT">Australian Capital Territory</option>
                      <option value="NT">Northern Territory</option>
                    </select>
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                    )}
                  </div>

                  {/* Postcode */}
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

              {/* Client Representative Details Section */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  Client Representative Details (If Applicable)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Representative First Name */}
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

                  {/* Representative Last Name */}
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
                  {/* Representative Phone */}
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

                  {/* Representative Email */}
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
                      <p className="mt-1 text-sm text-red-600">{String(errors.repEmailAddress?.message || '')}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {/* Rep Street Address */}
                  <div className="md:col-span-3">
                    <label htmlFor="repStreetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="repStreetAddress"
                      {...register('repStreetAddress')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter street address"
                    />
                  </div>

                  {/* Rep City */}
                  <div>
                    <label htmlFor="repCity" className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      id="repCity"
                      {...register('repCity')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter city"
                    />
                  </div>

                  {/* Rep State */}
                  <div>
                    <label htmlFor="repState" className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <select
                      id="repState"
                      {...register('repState')}
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
                  </div>

                  {/* Rep Postcode */}
                  <div>
                    <label htmlFor="repPostcode" className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode
                    </label>
                    <input
                      type="text"
                      id="repPostcode"
                      {...register('repPostcode')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter postcode"
                    />
                  </div>
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preferred Contact Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="phone"
                      {...register('preferredContact')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Phone Call</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="email"
                      {...register('preferredContact')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sms"
                      {...register('preferredContact')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>SMS/Text Message</span>
                  </label>
                </div>
                {errors.preferredContact && (
                  <p className="mt-2 text-sm text-red-600">{errors.preferredContact.message}</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: NDIS Details */}
          {currentStep === 2 && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">NDIS Details</h2>
              
              {/* Plan Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="plan-managed"
                      {...register('planType')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Plan Managed</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="self-managed"
                      {...register('planType')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Self Managed</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="agency-managed"
                      {...register('planType')}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Agency Managed</span>
                  </label>
                </div>
                {errors.planType && (
                  <p className="mt-2 text-sm text-red-600">{errors.planType.message}</p>
                )}
              </div>

              {/* Conditional Plan Manager Fields */}
              {(planType === 'plan-managed' || planType === 'agency-managed') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="planManagerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Manager Name (If Applicable)
                    </label>
                    <input
                      type="text"
                      id="planManagerName"
                      {...register('planManagerName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter plan manager name"
                    />
                    {errors.planManagerName && (
                      <p className="mt-1 text-sm text-red-600">{errors.planManagerName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="planManagerAgency" className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Manager Agency (If Applicable)
                    </label>
                    <input
                      type="text"
                      id="planManagerAgency"
                      {...register('planManagerAgency')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter plan manager agency"
                    />
                    {errors.planManagerAgency && (
                      <p className="mt-1 text-sm text-red-600">{errors.planManagerAgency.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* NDIS Number */}
                <div>
                  <label htmlFor="ndisNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    NDIS Number
                  </label>
                  <input
                    type="text"
                    id="ndisNumber"
                    {...register('ndisNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter NDIS number (optional)"
                  />
                  {errors.ndisNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.ndisNumber.message}</p>
                  )}
                </div>

                {/* Available Funding */}
                <div>
                  <label htmlFor="availableFunding" className="block text-sm font-medium text-gray-700 mb-2">
                    Available/Remaining Funding for Capacity Building Supports
                  </label>
                  <input
                    type="text"
                    id="availableFunding"
                    {...register('availableFunding')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter available funding amount"
                  />
                  {errors.availableFunding && (
                    <p className="mt-1 text-sm text-red-600">{errors.availableFunding.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Plan Start Date */}
                <div>
                  <label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="planStartDate"
                    {...register('planStartDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.planStartDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.planStartDate.message}</p>
                  )}
                </div>

                {/* Plan Review Date */}
                <div>
                  <label htmlFor="planReviewDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Review Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="planReviewDate"
                    {...register('planReviewDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.planReviewDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.planReviewDate.message}</p>
                  )}
                </div>
              </div>

              {/* Client Goals */}
              <div>
                <label htmlFor="clientGoals" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Goals (As stated in the NDIS plan) <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="clientGoals"
                  rows={4}
                  {...register('clientGoals')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please describe the client's goals as stated in their NDIS plan"
                />
                {errors.clientGoals && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientGoals.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Referrer Details */}
          {currentStep === 3 && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Referrer Details (Person Making the Referral)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Referrer First Name */}
                <div>
                  <label htmlFor="referrerFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="referrerFirstName"
                    {...register('referrerFirstName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter referrer first name"
                  />
                  {errors.referrerFirstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerFirstName.message}</p>
                  )}
                </div>

                {/* Referrer Last Name */}
                <div>
                  <label htmlFor="referrerLastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="referrerLastName"
                    {...register('referrerLastName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter referrer last name"
                  />
                  {errors.referrerLastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerLastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Agency */}
                <div>
                  <label htmlFor="referrerAgency" className="block text-sm font-medium text-gray-700 mb-2">
                    Agency
                  </label>
                  <input
                    type="text"
                    id="referrerAgency"
                    {...register('referrerAgency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter agency name"
                  />
                  {errors.referrerAgency && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerAgency.message}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="referrerRole" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    id="referrerRole"
                    {...register('referrerRole')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your role/position"
                  />
                  {errors.referrerRole && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerRole.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Address */}
                <div>
                  <label htmlFor="referrerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="referrerEmail"
                    {...register('referrerEmail')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                  {errors.referrerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerEmail.message}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="referrerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="referrerPhone"
                    {...register('referrerPhone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                  {errors.referrerPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.referrerPhone.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Reason for Referral & Consent */}
          {currentStep === 4 && (
            <div>
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Reason For Referral</h2>
                
                {/* Referred For */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referred For <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="physiotherapy"
                        {...register('referredFor')}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Physiotherapy</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="chiro"
                        {...register('referredFor')}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Chiro</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="psychologist"
                        {...register('referredFor')}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Psychologist</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="other"
                        {...register('referredFor')}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Other</span>
                    </label>
                  </div>
                  {errors.referredFor && (
                    <p className="mt-2 text-sm text-red-600">{errors.referredFor.message}</p>
                  )}
                </div>

                {/* Reason For Referral/Relevant Medical Information */}
                <div>
                  <label htmlFor="reasonForReferral" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason For Referral/Relevant Medical Information <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reasonForReferral"
                    rows={4}
                    {...register('reasonForReferral')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide detailed information about the reason for referral and any relevant medical information"
                  />
                  {errors.reasonForReferral && (
                    <p className="mt-1 text-sm text-red-600">{errors.reasonForReferral.message}</p>
                  )}
                </div>

                {/* File Upload Section */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Upload (Please attach a copy of the current NDIS plan if possible)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span>
                      <span> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                    <button
                      type="button"
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              </div>

              {/* Consent Section */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Consent</h3>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    {...register('consentCheckbox')}
                    className="mr-3 mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have obtained consent from the participant to make this referral and provide Compass Physiotherapy with the participant's personal and medical details. <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.consentCheckbox && (
                  <p className="mt-2 text-sm text-red-600">{errors.consentCheckbox.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex space-x-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Form
                </button>
              </div>
              
              <div>
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting Your Referral...' : 'Submit My Referral'}
                  </button>
                )}
              </div>
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NDISReferralForm;