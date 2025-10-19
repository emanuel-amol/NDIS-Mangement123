// frontend/src/pages/sil-management/HomesList.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { silService, HomeSummaryResponse } from "../../services/silService";
import { toast } from "react-hot-toast";

const statusColorMap: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  full: "bg-red-100 text-red-800",
  maintenance: "bg-gray-100 text-gray-800",
  "not available": "bg-gray-200 text-gray-700",
};

const HomesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPropertyType, setFilterPropertyType] = useState("All");
  const [filterState, setFilterState] = useState("All");

  const {
    data: homes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<HomeSummaryResponse[], Error>({
    queryKey: ["sil", "homes"],
    queryFn: silService.getHomes,
  });

  const filteredHomes = useMemo(() => {
    if (!homes) return [];
    return homes.filter((home) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        home.displayName.toLowerCase().includes(search) ||
        home.address.toLowerCase().includes(search) ||
        home.postalCode.toLowerCase().includes(search);

      const matchesStatus =
        filterStatus === "All" ||
        (home.status ?? "Available").toLowerCase() ===
          filterStatus.toLowerCase();

      const matchesPropertyType =
        filterPropertyType === "All" ||
        home.propertyType.toLowerCase() === filterPropertyType.toLowerCase();

      const matchesState =
        filterState === "All" ||
        home.state.toLowerCase() === filterState.toLowerCase();

      return (
        matchesSearch && matchesStatus && matchesPropertyType && matchesState
      );
    });
  }, [homes, searchTerm, filterStatus, filterPropertyType, filterState]);

  const handleRefresh = () => {
    refetch()
      .then(() => toast.success("Homes refreshed"))
      .catch(() => toast.error("Unable to refresh homes"));
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    const key = status.toLowerCase();
    const colorClass = statusColorMap[key] ?? "bg-gray-100 text-gray-800";
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}
      >
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading homes...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load homes
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.message ?? "Please try again later."}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const propertyTypes = Array.from(
    new Set((homes ?? []).map((home) => home.propertyType)),
  ).sort();
  const states = Array.from(
    new Set((homes ?? []).map((home) => home.state)),
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIL Homes</h1>
              <p className="mt-2 text-gray-600">
                Manage all Supported Independent Living properties
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Refresh
              </button>
              <Link
                to="/sil/homes/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add New Home
              </Link>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Search by name, address, or postcode
                </label>
                <input
                  id="search"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Start typing..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Partial">Partial</option>
                  <option value="Full">Full</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="property-type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Property Type
                </label>
                <select
                  id="property-type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterPropertyType}
                  onChange={(e) => setFilterPropertyType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  State
                </label>
                <select
                  id="state"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                >
                  <option value="All">All States</option>
                  {states.map((stateOption) => (
                    <option key={stateOption} value={stateOption}>
                      {stateOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("All");
                    setFilterPropertyType("All");
                    setFilterState("All");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-gray-600">
              Showing {filteredHomes.length} of {homes?.length ?? 0} homes
            </p>
            {homes && homes.length > 0 && (
              <span className="text-xs text-gray-500">
                Last refreshed moments ago
              </span>
            )}
          </div>

          {filteredHomes.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
              <div className="text-4xl mb-4">??</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No homes found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ||
                filterStatus !== "All" ||
                filterPropertyType !== "All" ||
                filterState !== "All"
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first SIL home."}
              </p>
              <Link
                to="/sil/homes/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Add New Home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHomes.map((home) => (
                <div
                  key={home.id}
                  className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {home.displayName}
                        </h3>
                        <p className="text-sm text-gray-600">{home.address}</p>
                        <p className="text-sm text-gray-600">
                          {home.state} {home.postalCode}
                        </p>
                      </div>
                      {renderStatusBadge(home.status)}
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property Type:</span>
                        <span className="font-medium">{home.propertyType}</span>
                      </div>
                      {home.sdaType && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">SDA Type:</span>
                          <span className="font-medium">{home.sdaType}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rooms:</span>
                        <span className="font-medium">
                          {home.roomsAvailable} available of {home.roomsTotal}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bathrooms:</span>
                        <span className="font-medium">{home.bathrooms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manager:</span>
                        <span className="font-medium">
                          {home.assignedManager ?? "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Link
                        to={`/sil/homes/${home.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium text-center"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/sil/homes/${home.id}/edit`}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium text-center"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomesList;
