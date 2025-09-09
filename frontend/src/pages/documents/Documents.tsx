// src/pages/documents/Documents.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Documents() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>

        {/* Link to your generator page */}
        <Link to="/admin/documents/generate">
          <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
            New Document
          </button>
        </Link>
      </div>

      {/* your existing list/table can go here */}
      <div className="rounded-xl bg-white shadow p-4 text-gray-600">
        Coming soon: documents list…
      </div>
    </div>
  );
}
