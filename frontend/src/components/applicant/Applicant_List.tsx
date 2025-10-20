import React from "react";
import { Link } from "react-router-dom";

const ApplicantList: React.FC = () => {
  const chips = [
    { label: "Applied", count: 1 },
    { label: "Phone screening", count: 0 },
    { label: "Pending", count: 0 },
    { label: "Offered", count: 1 },
    { label: "Hired", count: 1 },
    { label: "Rejected", count: 2 },
  ];

  const tableHeaders = [
    "NAME",
    "ROLE",
    "EMAIL ADDRESS",
    "STATUS",
    "PHONE NUMBER",
    "ACTION",
  ];

  return (
    <div className="bg-[#f7f8fa] min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            All Applicants
          </h2>
          <nav className="text-xs text-gray-500 flex items-center gap-1">
            <span>Dashboard</span>
            <span className="mx-1">›</span>
            <span className="text-gray-600">All Applicant</span>
          </nav>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200">
            <span className="text-base leading-none">🔗</span>
            View From LinkedIn
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200">
            <span className="text-base leading-none">🔗</span>
            View From Indeed
          </button>

          <Link to="/components/applicant/Can-intake-form">
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200">
              <span className="text-base leading-none">＋</span>
              Add Applicant
            </button>
          </Link>
        </div>
      </div>

      {/* Chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
          >
            {chip.label} {chip.count}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg">
        <div className="min-w-full">
          <div className="grid grid-cols-6 bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
            {tableHeaders.map((header) => (
              <div key={header} className="px-4 py-3">
                {header}
              </div>
            ))}
          </div>
          {[...Array(1)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 items-center px-4 py-4 even:bg-white odd:bg-[#f7f8fa]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  P
                </div>
                <Link
                  to="/components/applicant/Applicant_profile"
                  className="text-gray-700 text-sm hover:underline"
                >
                  <span className="text-gray-700 text-sm">Profile</span>
                </Link>
              </div>
              {Array.from({ length: 5 }).map((__, j) => (
                <div key={j} className="h-4 w-5/6 rounded bg-gray-100" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApplicantList;