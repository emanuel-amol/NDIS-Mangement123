import { useEffect, useState } from 'react';
import { withAuth } from '../../services/auth';

const API =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

type QueueItem = {
  participant_id: number;
  participant_name?: string | null;
  updated_at?: string | null;
  manager_review_status?: string | null;
};

export default function ManagerReviewQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API}/care/manager/reviews`, {
          headers: withAuth(),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data: QueueItem[] = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load manager review queue', err);
        setError('Unable to load manager review queue');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleAction = async (participantId: number, approve: boolean) => {
    try {
      const endpoint = approve
        ? `${API}/care/participants/${participantId}/manager-approve`
        : `${API}/care/participants/${participantId}/manager-reject`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: withAuth(),
        body: approve ? undefined : JSON.stringify({ comments: 'Requires updates' }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setItems(current =>
        current.filter(item => item.participant_id !== participantId),
      );
    } catch (err) {
      console.error('Manager action failed', err);
      alert('Unable to complete action. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading manager queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Awaiting Manager Sign-off</h1>
        <p className="text-gray-600">Nothing is waiting for approval right now.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Awaiting Manager Sign-off</h1>
      {items.map(item => (
        <div
          key={item.participant_id}
          className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="font-medium text-gray-900">
              Participant #{item.participant_id}
            </p>
            {item.participant_name && (
              <p className="text-sm text-gray-600">{item.participant_name}</p>
            )}
            {item.updated_at && (
              <p className="text-xs text-gray-500">
                Updated {new Date(item.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="space-x-2">
            <button
              className="rounded border border-green-600 px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-50"
              onClick={() => handleAction(item.participant_id, true)}
            >
              Approve
            </button>
            <button
              className="rounded border border-red-600 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
              onClick={() => handleAction(item.participant_id, false)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}