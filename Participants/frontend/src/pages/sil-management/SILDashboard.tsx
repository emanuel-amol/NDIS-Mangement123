// frontend/src/pages/sil-management/SILDashboard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  silService,
  HomeSummaryResponse,
  HomeStatsSummary,
} from "../../services/silService";

const SILDashboard: React.FC = () => {
  const homesQuery = useQuery<HomeSummaryResponse[], Error>({
    queryKey: ["sil", "homes"],
    queryFn: silService.getHomes,
  });

  const statsQuery = useQuery<HomeStatsSummary, Error>({
    queryKey: ["sil", "stats"],
    queryFn: silService.getStats,
  });

  const homes = homesQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SIL Management
              </h1>
              <p className="mt-2 text-gray-600">
                Monitor Supported Independent Living performance across your
                portfolio.
              </p>
            </div>
            <Link
              to="/sil/homes/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add New Home
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <p className="text-sm font-medium text-gray-500">Total Homes</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {stats
                  ? stats.totalHomes
                  : homesQuery.isLoading
                    ? "�"
                    : homes.length}
              </p>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <p className="text-sm font-medium text-gray-500">
                Available Rooms
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {stats ? stats.availableRooms : "�"}
              </p>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <p className="text-sm font-medium text-gray-500">
                Occupied Rooms
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {stats ? stats.occupiedRooms : "�"}
              </p>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <p className="text-sm font-medium text-gray-500">
                Open Maintenance
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {stats ? stats.pendingMaintenance : "�"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Homes
                </h3>
                <Link
                  to="/sil/homes"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {homesQuery.isLoading && (
                  <p className="text-sm text-gray-600">Loading homes...</p>
                )}
                {!homesQuery.isLoading && homes.length === 0 && (
                  <p className="text-sm text-gray-600">
                    No homes added yet. Start by creating your first home.
                  </p>
                )}
                {homes.slice(0, 5).map((home) => (
                  <div
                    key={home.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {home.displayName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {home.address}, {home.state} {home.postalCode}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {home.status ?? "Available"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Occupancy Snapshot
                </h3>
                <Link
                  to="/sil/homes"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Manage rooms
                </Link>
              </div>
              <div className="p-6 space-y-4">
                {homes.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No rooms to display yet.
                  </p>
                ) : (
                  homes.slice(0, 5).map((home) => (
                    <div
                      key={home.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {home.displayName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {home.address}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600">
                          {home.roomsAvailable} / {home.roomsTotal} rooms
                          available
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${home.roomsTotal > 0 ? ((home.roomsTotal - home.roomsAvailable) / home.roomsTotal) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/sil/homes"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <h4 className="font-semibold text-gray-900">Manage Homes</h4>
                <p className="text-sm text-gray-600 mt-1">
                  View and update property records.
                </p>
              </Link>
              <Link
                to="/sil/homes"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <h4 className="font-semibold text-gray-900">Manage Rooms</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Add rooms and assign participants.
                </p>
              </Link>
              <Link
                to="/sil/homes"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <h4 className="font-semibold text-gray-900">Maintenance</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Track and resolve maintenance requests.
                </p>
              </Link>
              <Link
                to="/sil/homes"
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <h4 className="font-semibold text-gray-900">Documents</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Access property notes and files.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SILDashboard;
