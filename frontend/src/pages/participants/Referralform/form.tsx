import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod validation schema
const referralFormSchema = z.object({
  // Client Details
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'), // <input type="date"> yields YYYY-MM-DD
  phoneNumber: z.string().min(1, 'Phone number is required'),
  emailAddress: z.string().email('Valid email is required'), // REQUIRED to match backend EmailStr
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(1, 'Postcode is required'),

  // Client Representative Details (Optional)
  repFirstName: z.string().optional(),
  repLastName: z.string().optional(),
  repPhoneNumber: z.string().optional(),
  repEmailAddress: z.string().email('Enter a valid email').optional(),
  repRelationship: z.string().optional(),
});

type ReferralFormData = z.infer<typeof referralFormSchema>;

const NDISReferralForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ReferralFormData>({
    resolver: zodResolver(referralFormSchema),
  });

  const onSubmit = async (data: ReferralFormData) => {
    // Convert "" → null for optional rep fields and enforce YYYY-MM-DD for date
    const payload = {
      ...data,
      dateOfBirth: data.dateOfBirth?.slice(0, 10),
      repFirstName: data.repFirstName?.trim() ? data.repFirstName : null,
      repLastName: data.repLastName?.trim() ? data.repLastName : null,
      repPhoneNumber: data.repPhoneNumber?.trim() ? data.repPhoneNumber : null,
      repEmailAddress: data.repEmailAddress?.trim() ? data.repEmailAddress : null,
      repRelationship: data.repRelationship?.trim() ? data.repRelationship : null,
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/participants/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Referral form submitted successfully! We will contact you soon.');
        reset();
      } else {
        // Try to surface FastAPI error details (e.g., 422 validation messages)
        let message = 'Failed to submit form';
        try {
          const err = await response.json();
          if (err?.detail) {
            message =
              typeof err.detail === 'string'
                ? err.detail
                : Array.isArray(err.detail)
                ? err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
                : JSON.stringify(err.detail);
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
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Client Details Section */}
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
                  <p className="mt-1 text-sm text-red-600">
                    {String(errors.emailAddress?.message || '')}
                  </p>
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
                  <p className="mt-1 text-sm text-red-600">
                    {String(errors.repEmailAddress?.message || '')}
                  </p>
                )}
              </div>
            </div>

            {/* Relationship */}
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
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="advocate">Advocate</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                By submitting this form, you consent to us contacting you about NDIS services.
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
                {isSubmitting ? 'Submitting Your Referral...' : 'Submit My Referral'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NDISReferralForm;
