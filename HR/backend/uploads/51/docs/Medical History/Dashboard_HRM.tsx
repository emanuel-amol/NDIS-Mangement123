import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => (
  <div className="bg-[#e7eaf0] min-h-screen p-4 pt-[90px]">
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
        <span className="text-sm mb-2">All Candidate</span>
        <span className="text-2xl font-bold flex items-center gap-2">
          {/* <span role="img" aria-label="icon">
            🗂️
          </span>{" "} */}
          121
        </span>
      </div>
      <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
        <span className="text-sm mb-2">All Staffs</span>
        <span className="text-2xl font-bold flex items-center gap-2">
          {/* <span role="img" aria-label="icon">
            🗂️
          </span>{" "} */}
          121
        </span>
      </div>
      <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
        <span className="text-sm mb-2">Training Session</span>
        <span className="text-2xl font-bold flex items-center gap-2">
          {/* <span role="img" aria-label="icon">
            🗂️
          </span>{" "} */}
          121
        </span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-6">
      <Link
        to="/components/applicant/Applicant_List"
        className="block hover:bg-gray-100 p-2 rounded-lg transition"
      >
        <div className="bg-gray-100 rounded-lg p-6 flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
          <div>
            <div className="font-medium">View All Applicants</div>
            <div className="text-xs text-gray-500">
              All Applicants in the Hiring Pipeline
            </div>
          </div>
        </div>
      </Link>

      <Link
        to="/components/employee/Employee_List"
        className="block hover:bg-gray-100 p-2 rounded-lg transition"
      >
        <div className="bg-gray-100 rounded-lg p-6 flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
          <div>
            <div className="font-medium">View All Staffs</div>
            <div className="text-xs text-gray-500">
              Manage staffs on the system
            </div>
          </div>
        </div>
      </Link>

      <Link
        to="/components/training/training_list"
        className="block hover:bg-gray-100 p-2 rounded-lg transition"
      >
        <div className="bg-gray-100 rounded-lg p-6 flex items-center">
          <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
          <div>
            <div className="font-medium">View All Training Session</div>
            <div className="text-xs text-gray-500">
              Manage training programme
            </div>
          </div>
        </div>
      </Link>
    </div>
  </div>
);

export default Dashboard;
