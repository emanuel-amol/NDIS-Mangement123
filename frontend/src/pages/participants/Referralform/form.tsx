// frontend/src/pages/participants/Referralform/form.tsx
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

interface FormData {
  // Client Details
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  emailAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  postcode: string;
  preferredContact: string;

  // Representative Details (Optional)
  repFirstName: string;
  repLastName: string;
  repPhoneNumber: string;
  repEmailAddress: string;
  repStreetAddress: string;
  repCity: string;
  repState: string;
  repPostcode: string;

  // NDIS Details
  planType: string;
  planManagerName: string;
  planManagerAgency: string;
  ndisNumber: string;
  availableFunding: string;
  planStartDate: string;
  planReviewDate: string;
  clientGoals: string;

  // Referrer Details
  referrerFirstName: string;
  referrerLastName: string;
  referrerAgency: string;
  referrerRole: string;
  referrerEmail: string;
  referrerPhone: string;

  // Reason for Referral
  referredFor: string;
  reasonForReferral: string;

  // Consent
  consentCheckbox: boolean;
}

const NDISReferralForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referralId, setReferralId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    emailAddress: '',
    streetAddress: '',
    city: '',
    state: '',
    postcode: '',
    preferredContact: '',
    repFirstName: '',
    repLastName: '',
    repPhoneNumber: '',
    repEmailAddress: '',
    repStreetAddress: '',
    repCity: '',
    repState: '',
    repPostcode: '',
    planType: '',
    planManagerName: '',
    planManagerAgency: '',
    ndisNumber: '',
    availableFunding: '',
    planStartDate: '',
    planReviewDate: '',
    clientGoals: '',
    referrerFirstName: '',
    referrerLastName: '',
    referrerAgency: '',
    referrerRole: '',
    referrerEmail: '',
    referrerPhone: '',
    referredFor: '',
    reasonForReferral: '',
    consentCheckbox: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
      if (!formData.streetAddress) newErrors.streetAddress = 'Street address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.postcode) newErrors.postcode = 'Postcode is required';
      if (!formData.preferredContact) newErrors.preferredContact = 'Preferred contact method is required';
    }

    if (step === 2) {
      if (!formData.planType) newErrors.planType = 'Plan type is required';
      if (!formData.planStartDate) newErrors.planStartDate = 'Plan start date is required';
      if (!formData.planReviewDate) newErrors.planReviewDate = 'Plan review date is required';
      if (!formData.clientGoals) newErrors.clientGoals = 'Client goals are required';
    }

    if (step === 3) {
      if (!formData.referrerFirstName) newErrors.referrerFirstName = 'Referrer first name is required';
      if (!formData.referrerLastName) newErrors.referrerLastName = 'Referrer last name is required';
      if (!formData.referrerEmail) newErrors.referrerEmail = 'Referrer email is required';
      if (!formData.referrerPhone) newErrors.referrerPhone = 'Referrer phone is required';
    }

    if (step === 4) {
      if (!formData.referredFor) newErrors.referredFor = 'Please select what client is referred for';
      if (!formData.reasonForReferral) newErrors.reasonForReferral = 'Reason for referral is required';
      if (!formData.consentCheckbox) newErrors.consentCheckbox = 'Consent is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting form data:', formData);
      
      const response = await fetch(`${API_BASE_URL}/participants/referral-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result);
        setReferralId(result.id || 'N/A');
        setShowSuccess(true);
      } else {
        let message = 'Failed to submit form';
        try {
          const err = await response.json();
          console.log('Error response:', err);
          if (err?.detail) {
            message = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
          }
        } catch {
          // ignore JSON parse errors
        }
        alert(`Error submitting form: ${message}`);
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert(`Network error: ${error?.message ?? 'Could not connect to server'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phoneNumber: '',
      emailAddress: '',
      streetAddress: '',
      city: '',
      state: '',
      postcode: '',
      preferredContact: '',
      repFirstName: '',
      repLastName: '',
      repPhoneNumber: '',
      repEmailAddress: '',
      repStreetAddress: '',
      repCity: '',
      repState: '',
      repPostcode: '',
      planType: '',
      planManagerName: '',
      planManagerAgency: '',
      ndisNumber: '',
      availableFunding: '',
      planStartDate: '',
      planReviewDate: '',
      clientGoals: '',
      referrerFirstName: '',
      referrerLastName: '',
      referrerAgency: '',
      referrerRole: '',
      referrerEmail: '',
      referrerPhone: '',
      referredFor: '',
      reasonForReferral: '',
      consentCheckbox: false,
    });
    setCurrentStep(1);
    setShowSuccess(false);
    setReferralId('');
    setErrors({});
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
            Please complete all required fields marked with *
          </p>
        </div>

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

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Step 1: Client Details */}
          {currentStep === 1 && (
            <>
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
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter first name"
                    />
                    {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter last name"
                    />
                    {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
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
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                    {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
                  </div>

                  <div>
                    <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="emailAddress"
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="streetAddress"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter street address"
                  />
                  {errors.streetAddress && <p className="mt-1 text-sm text-red-600">{errors.streetAddress}</p>}
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
              </div>

              {/* Representative Details */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  Representative Details (Optional)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="repFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="repFirstName"
                      name="repFirstName"
                      value={formData.repFirstName}
                      onChange={handleInputChange}
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
                      name="repLastName"
                      value={formData.repLastName}
                      onChange={handleInputChange}
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
                      name="repPhoneNumber"
                      value={formData.repPhoneNumber}
                      onChange={handleInputChange}
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
                      name="repEmailAddress"
                      value={formData.repEmailAddress}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preferred Contact Method <span className="text-red-500">*</span></h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="phone"
                      checked={formData.preferredContact === 'phone'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Phone Call</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="email"
                      checked={formData.preferredContact === 'email'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value="sms"
                      checked={formData.preferredContact === 'sms'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>SMS/Text Message</span>
                  </label>
                </div>
                {errors.preferredContact && <p className="mt-2 text-sm text-red-600">{errors.preferredContact}</p>}
              </div>
            </>
          )}

          {/* Step 2: NDIS Details */}
          {currentStep === 2 && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">NDIS Details</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="planType"
                      value="plan-managed"
                      checked={formData.planType === 'plan-managed'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Plan Managed</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="planType"
                      value="self-managed"
                      checked={formData.planType === 'self-managed'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Self Managed</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="planType"
                      value="agency-managed"
                      checked={formData.planType === 'agency-managed'}
                      onChange={handleInputChange}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Agency Managed</span>
                  </label>
                </div>
                {errors.planType && <p className="mt-2 text-sm text-red-600">{errors.planType}</p>}
              </div>

              {(formData.planType === 'plan-managed' || formData.planType === 'agency-managed') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="planManagerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Manager Name
                    </label>
                    <input
                      type="text"
                      id="planManagerName"
                      name="planManagerName"
                      value={formData.planManagerName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter plan manager name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="planManagerAgency" className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Manager Agency
                    </label>
                    <input
                      type="text"
                      id="planManagerAgency"
                      name="planManagerAgency"
                      value={formData.planManagerAgency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter plan manager agency"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="ndisNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    NDIS Number
                  </label>
                  <input
                    type="text"
                    id="ndisNumber"
                    name="ndisNumber"
                    value={formData.ndisNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter NDIS number (optional)"
                  />
                </div>

                <div>
                  <label htmlFor="availableFunding" className="block text-sm font-medium text-gray-700 mb-2">
                    Available Funding
                  </label>
                  <input
                    type="text"
                    id="availableFunding"
                    name="availableFunding"
                    value={formData.availableFunding}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter available funding amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="planStartDate"
                    name="planStartDate"
                    value={formData.planStartDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.planStartDate && <p className="mt-1 text-sm text-red-600">{errors.planStartDate}</p>}
                </div>

                <div>
                  <label htmlFor="planReviewDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Review Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="planReviewDate"
                    name="planReviewDate"
                    value={formData.planReviewDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.planReviewDate && <p className="mt-1 text-sm text-red-600">{errors.planReviewDate}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="clientGoals" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Goals <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="clientGoals"
                  name="clientGoals"
                  rows={4}
                  value={formData.clientGoals}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please describe the client's goals as stated in their NDIS plan"
                />
                {errors.clientGoals && <p className="mt-1 text-sm text-red-600">{errors.clientGoals}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Referrer Details */}
          {currentStep === 3 && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Referrer Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="referrerFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="referrerFirstName"
                    name="referrerFirstName"
                    value={formData.referrerFirstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter referrer first name"
                  />
                  {errors.referrerFirstName && <p className="mt-1 text-sm text-red-600">{errors.referrerFirstName}</p>}
                </div>

                <div>
                  <label htmlFor="referrerLastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="referrerLastName"
                    name="referrerLastName"
                    value={formData.referrerLastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter referrer last name"
                  />
                  {errors.referrerLastName && <p className="mt-1 text-sm text-red-600">{errors.referrerLastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="referrerAgency" className="block text-sm font-medium text-gray-700 mb-2">
                    Agency
                  </label>
                  <input
                    type="text"
                    id="referrerAgency"
                    name="referrerAgency"
                    value={formData.referrerAgency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter agency name"
                  />
                </div>

                <div>
                  <label htmlFor="referrerRole" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    id="referrerRole"
                    name="referrerRole"
                    value={formData.referrerRole}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your role/position"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="referrerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="referrerEmail"
                    name="referrerEmail"
                    value={formData.referrerEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                  {errors.referrerEmail && <p className="mt-1 text-sm text-red-600">{errors.referrerEmail}</p>}
                </div>

                <div>
                  <label htmlFor="referrerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="referrerPhone"
                    name="referrerPhone"
                    value={formData.referrerPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                  {errors.referrerPhone && <p className="mt-1 text-sm text-red-600">{errors.referrerPhone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Reason for Referral & Consent */}
          {currentStep === 4 && (
            <div>
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Reason For Referral</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referred For <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="referredFor"
                        value="physiotherapy"
                        checked={formData.referredFor === 'physiotherapy'}
                        onChange={handleInputChange}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Physiotherapy</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="referredFor"
                        value="chiro"
                        checked={formData.referredFor === 'chiro'}
                        onChange={handleInputChange}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Chiropractic</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="referredFor"
                        value="psychologist"
                        checked={formData.referredFor === 'psychologist'}
                        onChange={handleInputChange}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Psychology</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="referredFor"
                        value="other"
                        checked={formData.referredFor === 'other'}
                        onChange={handleInputChange}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Other</span>
                    </label>
                  </div>
                  {errors.referredFor && <p className="mt-2 text-sm text-red-600">{errors.referredFor}</p>}
                </div>

                <div>
                  <label htmlFor="reasonForReferral" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason For Referral <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reasonForReferral"
                    name="reasonForReferral"
                    rows={4}
                    value={formData.reasonForReferral}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide detailed information about the reason for referral"
                  />
                  {errors.reasonForReferral && <p className="mt-1 text-sm text-red-600">{errors.reasonForReferral}</p>}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Upload (Optional)
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

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Consent</h3>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="consentCheckbox"
                    checked={formData.consentCheckbox}
                    onChange={handleInputChange}
                    className="mr-3 mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have obtained consent from the participant to make this referral and provide the healthcare provider with the participant's personal and medical details. <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.consentCheckbox && <p className="mt-2 text-sm text-red-600">{errors.consentCheckbox}</p>}
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NDISReferralForm;