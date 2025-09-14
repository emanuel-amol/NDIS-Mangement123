// PARTICIPANT PROFILE DASHBOARD
import React from "react";

const ParticipantProfileDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Participant Profiles
          </h1>
          <p className="text-sm text-gray-600">
            Automatically created when referrals are validated.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Profiles
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">86</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                New This Week
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">12</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Pending Validation
              </dt>
              <dd className="text-3xl font-semibold text-gray-900">5</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Participant Profiles */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Participant Profiles
          </h3>
          <div className="space-y-4">
            {/* Profile 1 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Jordan Smith — 28 yrs, Male
                </span>
                <span className="text-sm text-gray-500 block">
                  Contact: jordan.smith@email.com | 0400 123 456
                </span>
                <span className="text-sm text-gray-500">
                  Referral #R-001 (Occupational Therapy) — Created 2d ago
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Profile 2 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Amrita Kumar — 35 yrs, Female
                </span>
                <span className="text-sm text-gray-500 block">
                  Contact: amrita.kumar@email.com | 0432 987 654
                </span>
                <span className="text-sm text-gray-500">
                  Referral #R-002 (Physiotherapy) — Created 1d ago
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Profile 3 */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-900 block">
                  Linh Nguyen — 42 yrs, Non-binary
                </span>
                <span className="text-sm text-gray-500 block">
                  Contact: linh.nguyen@email.com | 0450 111 222
                </span>
                <span className="text-sm text-gray-500">
                  Referral #R-003 (Speech Pathology) — Created 3h ago
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantProfileDashboard;
