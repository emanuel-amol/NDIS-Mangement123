# frontend/src/components/ParticipantFunding.tsx
import React, { useState, useEffect } from 'react';

interface FundingRecord {
  id: number;
  funding_source: string;
  managed_by: string;
  catalog_version: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
  funding_start_date: string;
  funding_end_date: string;
  status: string;
  notes?: string;
}

interface ParticipantFundingProps {
  participantId: number;
}

const ParticipantFunding: React.FC<ParticipantFundingProps> = ({ participantId }) => {
  const [fundingRecords, setFundingRecords] = useState<FundingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchFundingRecords();
  }, [participantId]);

  const fetchFundingRecords = async () => {
    try {
      const response = await fetch(`/api/v1/participants/${participantId}/funding`);
      const data = await response.json();
      setFundingRecords(data);
    } catch (error) {
      console.error('Error fetching funding records:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading funding information...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">NDIS Funding</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Funding
        </button>
      </div>

      {fundingRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No funding records found for this participant
        </div>
      ) : (
        <div className="space-y-4">
          {fundingRecords.map((funding) => (
            <div key={funding.id} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {funding.funding_source} - {funding.catalog_version}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Managed by: {funding.managed_by}
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    funding.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {funding.status}
                  </span>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Funding Period</div>
                  <div className="font-medium">
                    {new Date(funding.funding_start_date).toLocaleDateString()} - 
                    {new Date(funding.funding_end_date).toLocaleDateString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Budget</div>
                  <div className="font-medium">
                    ${funding.remaining_amount.toLocaleString()} / ${funding.total_amount.toLocaleString()}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((funding.total_amount - funding.remaining_amount) / funding.total_amount) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${funding.used_amount.toLocaleString()} used
                  </div>
                </div>
              </div>
              
              {funding.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-600">Notes:</div>
                  <div className="text-sm">{funding.notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantFunding;