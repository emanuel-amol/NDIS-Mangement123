// frontend/src/pages/documents/Documents.tsx
import React, { useMemo, useState } from "react";
import Generate from "./Generate";

type Participant = {
  id: number;
  full_name: string;
  ndis_number?: string;
  address?: string;
  email?: string;
  phone?: string;
};

// TODO: replace with API call later
const MOCK_PARTICIPANTS: Participant[] = [
  { id: 101, full_name: "Alex Nguyen", ndis_number: "430-000-123", address: "1 Example St, Melbourne VIC 3000", email: "alex@example.com", phone: "+61 400 000 001" },
  { id: 102, full_name: "Samira Khan", ndis_number: "430-000-456", address: "25 King St, Sydney NSW 2000", email: "samira@example.com", phone: "+61 400 000 002" },
  { id: 103, full_name: "John Citizen", ndis_number: "430-000-789", address: "88 Collins St, Melbourne VIC 3000", email: "john@example.com", phone: "+61 400 000 003" },
];

export default function Documents() {
  const [selected, setSelected] = useState<Participant | null>(null);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    if (!search.trim()) return MOCK_PARTICIPANTS;
    const s = search.toLowerCase();
    return MOCK_PARTICIPANTS.filter(
      (p) =>
        p.full_name.toLowerCase().includes(s) ||
        (p.ndis_number || "").toLowerCase().includes(s) ||
        (p.address || "").toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Documents</h1>

      {/* Participants list */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="p-4 flex gap-2 items-center">
          <input
            className="flex-1 border rounded-lg p-2"
            placeholder="Search participants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">NDIS #</th>
              <th className="text-left p-3">Address</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={5}>No participants found.</td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.full_name}</td>
                  <td className="p-3">{p.ndis_number || "-"}</td>
                  <td className="p-3">{p.address || "-"}</td>
                  <td className="p-3 text-sm text-gray-600">
                    {p.phone || "-"} {p.email ? `• ${p.email}` : ""}
                  </td>
                  <td className="p-3">
                    <button
                      className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                      onClick={() => setSelected(p)}
                    >
                      Retrieve data
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generator only after a participant is selected */}
      {selected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Retrieve data for: <span className="text-gray-700">{selected.full_name}</span>
            </h2>
            <button
              className="text-sm text-gray-600 underline"
              onClick={() => setSelected(null)}
            >
              Clear selection
            </button>
          </div>

          <Generate
            participantPrefill={{
              id: selected.id,
              full_name: selected.full_name,
              ndis_number: selected.ndis_number,
              address: selected.address,
            }}
            defaultTemplate="service_agreement"
          />
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow p-4 text-gray-600">
          Select a participant above to retrieve data and generate documents.
        </div>
      )}
    </div>
  );
}
