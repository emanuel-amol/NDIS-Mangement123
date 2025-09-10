// PROVIDER DASHBOARD
import React from "react";

const ProviderReferralDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Provider Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Review and validate participant referral data.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Participants
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">24</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Validated Referrals
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">15</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Pending Referrals
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">3</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Referrals
          </h3>
          <div className="space-y-4">
            {/* Referral 1 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Referral #R-001 - Jordan Smith (Occupational Therapy)
                </span>
                <span className="text-sm text-gray-500">
                  Pending Validation
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  Review
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Validate
                </button>
              </div>
            </div>

            {/* Referral 2 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Referral #R-002 - Amrita Kumar (Physiotherapy)
                </span>
                <span className="text-sm text-gray-500">In Review</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  Review
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Validate
                </button>
              </div>
            </div>

            {/* Referral 3 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Referral #R-003 - Linh Nguyen (Speech Pathology)
                </span>
                <span className="text-sm text-gray-500">Validated</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  Review
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gray-400 cursor-not-allowed shadow-sm"
                >
                  Validate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderReferralDashboard;
