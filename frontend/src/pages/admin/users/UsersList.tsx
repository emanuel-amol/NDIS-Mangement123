// frontend/src/pages/admin/users/UsersList.tsx
import { useEffect, useState } from "react";
import { listUsers, User } from "@/services/adminUsers";

export default function UsersList() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUsers({ role: "support_worker" }).then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Support Workers</h1>
      {loading ? <p>Loading…</p> : (
        <div className="space-y-2">
          {items.map(u => (
            <div key={u.id} className="border rounded-lg p-3">
              <div className="font-medium">{u.first_name} {u.last_name}</div>
              <div className="text-sm text-gray-600">{u.email} • {u.phone || "—"}</div>
              <div className="text-sm">Status: {u.is_active ? "Active" : "Inactive"}</div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-600">No support workers yet.</p>}
        </div>
      )}
    </div>
  );
}
