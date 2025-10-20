// frontend/src/pages/dashboards/ManagerDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Eye, Loader } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Helper function to get auth headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { authProvider } = await import('../../lib/auth-provider');
  const token = await authProvider.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/care/manager/reviews`, {
        headers: await getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueue(data);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (participantId) => {
    if (!confirm('Approve this participant for onboarding?')) return;
    
    setProcessing(participantId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/manager-approve`,
        {
          method: 'POST',
          headers: await getAuthHeaders()
        }
      );
      
      if (response.ok) {
        alert('✅ Approved!');
        await loadQueue();
      } else {
        alert('❌ Approval failed');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (participantId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    setProcessing(participantId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/manager-reject`,
        {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ comments: reason })
        }
      );
      
      if (response.ok) {
        alert('✅ Rejected');
        await loadQueue();
      } else {
        alert('❌ Rejection failed');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleConvert = async (participantId) => {
    if (!confirm('Convert this participant to onboarded?')) return;
    
    setProcessing(participantId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/convert-to-onboarded`,
        {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            manager_name: 'Manager',
            manager_title: 'Service Manager'
          })
        }
      );
      
      if (response.ok) {
        alert('✅ Participant onboarded!');
        navigate(`/participants/${participantId}`);
      } else {
        const error = await response.json();
        alert('❌ Failed: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const pendingItems = queue.filter(item => item.manager_review_status === 'pending');
  const approvedItems = queue.filter(item => item.manager_review_status === 'approved');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manager Approvals</h1>
      
      {/* PENDING SECTION */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Pending Approval ({pendingItems.length})</h2>
        {pendingItems.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">No items waiting for approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div key={item.participant_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {item.participant_name || `Participant ${item.participant_id}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Status: {item.manager_review_status}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/care/signoff/${item.participant_id}`)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={processing === item.participant_id}
                    >
                      <Eye size={16} />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleApprove(item.participant_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      disabled={processing === item.participant_id}
                    >
                      <CheckCircle size={16} />
                      {processing === item.participant_id ? 'Processing...' : 'Approve'}
                    </button>
                    
                    <button
                      onClick={() => handleReject(item.participant_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      disabled={processing === item.participant_id}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVED - READY TO ONBOARD SECTION */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ready to Onboard ({approvedItems.length})</h2>
        {approvedItems.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">No participants ready to onboard</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedItems.map((item) => (
              <div key={item.participant_id} className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {item.participant_name || `Participant ${item.participant_id}`}
                    </h3>
                    <p className="text-sm text-green-600 font-medium">
                      ✅ Approved - Ready for onboarding
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/care/signoff/${item.participant_id}`)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={processing === item.participant_id}
                    >
                      <Eye size={16} />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleConvert(item.participant_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      disabled={processing === item.participant_id}
                    >
                      <CheckCircle size={16} />
                      {processing === item.participant_id ? 'Converting...' : 'Onboard'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}