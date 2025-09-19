// frontend/src/pages/onboarding-management-lifecycle/ReferralManagement.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  status: string;
  created_at: string;
  disability_type: string;
  urgency_level: string;
  referred_for: string;
  referrer_first_name: string;
  referrer_last_name: string;
  plan_type: string;
  support_category: string;
}

const ReferralManagement: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (response.ok) {
        const data = await response.json();
        // Filter for submitted referrals only
        const submittedReferrals = data.filter((ref: Referral) => 
          ref.status === 'submitted' || ref.status === 'pending'
        );
        setReferrals(submittedReferrals);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToParticipant = async (referralId: number) => {
    setConverting(referralId);
    try {
      const response = await fetch(`${API_BASE_URL}/participants/create-from-referral/${referralId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully converted referral to participant! Participant ID: ${result.id}`);
        
        // Remove the converted referral from the list
        setReferrals(prev => prev.filter(ref => ref.id !== referralId));
        
        // Optionally redirect to the new participant
        navigate(`/participants/${result.id}`);
      } else {
        const error = await response.json();
        alert(`Error converting referral: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error converting referral:', error);
      alert('Network error occurred while converting referral');
    } finally {
      setConverting(null);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Referral Management</h1>
          <p className="text-gray-600">Review and convert referrals to participants</p>
        </div>
        <div className="text-sm text-gray-500">
          {referrals.length} pending referral{referrals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {referrals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">No pending referrals</h3>
          <p className="text-gray-400">All referrals have been processed or no new referrals submitted</p>
        </div>
      ) : (
        <div className="space-y-6">
          {referrals.map((referral) => (
            <div key={referral.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {referral.first_name} {referral.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Submitted: {formatDate(referral.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(referral.urgency_level)}`}>
                    {referral.urgency_level} priority
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    {referral.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contact Information</h4>
                  <p className="text-sm text-gray-600">Phone: {referral.phone_number}</p>
                  {referral.email_address && (
                    <p className="text-sm text-gray-600">Email: {referral.email_address}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Disability & Support</h4>
                  <p className="text-sm text-gray-600">
                    Type: {referral.disability_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-sm text-gray-600">
                    Category: {referral.support_category?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Referrer</h4>
                  <p className="text-sm text-gray-600">
                    {referral.referrer_first_name} {referral.referrer_last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Referred for: {referral.referred_for?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Plan Type: {referral.plan_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/referral/${referral.id}`)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  
                  <button
                    onClick={() => convertToParticipant(referral.id)}
                    disabled={converting === referral.id}
                    className={`px-6 py-2 text-sm rounded-md text-white font-medium ${
                      converting === referral.id 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {converting === referral.id ? 'Converting...' : 'Convert to Participant'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralManagement;