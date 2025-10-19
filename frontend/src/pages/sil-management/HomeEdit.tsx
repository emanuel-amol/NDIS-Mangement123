// frontend/src/pages/sil-management/HomeEdit.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  silService,
  HomeDetailResponse,
  HomeFeaturePayload,
  HomeFormPayload,
  HomeSharedSpacePayload,
} from "../../services/silService";

const states = [
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
];

const propertyTypes = ["Apartment", "Duplex", "House", "Unit"];
const sdaTypes = [
  "Fully Accessible",
  "High Physical Support",
  "Improved Livability",
  "Robust Construction",
];
const defaultFeatureKeys = ["frontYard", "backyard", "swimmingPool"] as const;

const HomeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: "",
    address: "",
    state: "",
    postalCode: "",
    propertyType: "",
    sdaType: "",
    status: "Available",
    description: "",
    assignedManager: "",
    totalRooms: "",
    bathrooms: "",
    kitchens: "",
    parkingSpaces: "",
    sharedSpacesText: "",
    features: {} as Record<string, boolean>,
  });

  const {
    data: home,
    isLoading,
    isError,
    error,
  } = useQuery<HomeDetailResponse, Error>({
    queryKey: ["sil", "homes", id],
    queryFn: () => silService.getHome(id ?? ""),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!home) return;

    const propertyDetail = home.propertyDetail;
    const featuresRecord = defaultFeatureKeys.reduce<Record<string, boolean>>(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {},
    );

    home.features.forEach((feature) => {
      featuresRecord[feature.featureName] = feature.isAvailable;
    });

    setFormData({
      displayName: home.profile?.displayName ?? "",
      address: home.address,
      state: home.state,
      postalCode: home.postalCode,
      propertyType: home.propertyType,
      sdaType: home.sdaType ?? "",
      status: home.status ?? "Available",
      description: home.description ?? "",
      assignedManager: home.profile?.assignedManager ?? "",
      totalRooms: propertyDetail ? String(propertyDetail.totalRooms) : "",
      bathrooms: propertyDetail ? String(propertyDetail.bathrooms) : "",
      kitchens: propertyDetail ? String(propertyDetail.kitchens) : "",
      parkingSpaces: propertyDetail ? String(propertyDetail.parkingSpaces) : "",
      sharedSpacesText: home.sharedSpaces.map((space) => space.name).join(", "),
      features: featuresRecord,
    });
  }, [home]);

  const updateHomeMutation = useMutation({
    mutationFn: (payload: HomeFormPayload) =>
      silService.updateHome(id ?? "", payload),
    onSuccess: (data) => {
      toast.success("Home updated");
      queryClient.invalidateQueries({ queryKey: ["sil", "homes"] });
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] });
      navigate(`/sil/homes/${data.id}`);
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message);
    },
  });

  const sharedSpaces = useMemo<HomeSharedSpacePayload[]>(() => {
    if (!formData.sharedSpacesText) return [];
    return formData.sharedSpacesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }, [formData.sharedSpacesText]);

  const buildFeatures = (): HomeFeaturePayload[] =>
    Object.entries(formData.features).map(([featureName, isAvailable]) => ({
      featureName,
      isAvailable,
    }));

  const handleInputChange = (
    key: keyof typeof formData,
    value: string | Record<string, boolean>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!home) return;

    if (!formData.displayName.trim()) {
      toast.error("Please provide a home name");
      return;
    }

    const totalRooms = parseInt(formData.totalRooms, 10);
    const bathrooms = parseInt(formData.bathrooms, 10);
    const kitchens = parseInt(formData.kitchens, 10);
    const parkingSpaces = parseInt(formData.parkingSpaces, 10);

    if (
      Number.isNaN(totalRooms) ||
      Number.isNaN(bathrooms) ||
      Number.isNaN(kitchens) ||
      Number.isNaN(parkingSpaces)
    ) {
      toast.error("Please provide valid numeric values for property details");
      return;
    }

    const payload: HomeFormPayload = {
      home: {
        address: formData.address,
        state: formData.state,
        postalCode: formData.postalCode,
        propertyType: formData.propertyType,
        sdaType: formData.sdaType || undefined,
        status: formData.status,
        description: formData.description || undefined,
      },
      profile: {
        displayName: formData.displayName,
        assignedManager: formData.assignedManager || undefined,
      },
      propertyDetail: {
        totalRooms,
        bathrooms,
        kitchens,
        parkingSpaces,
      },
      sharedSpaces,
      features: buildFeatures(),
    };

    updateHomeMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading home details...</p>
        </div>
      </div>
    );
  }

  if (isError || !home) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load home
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.message ?? "Please try again later."}
          </p>
          <Link
            to="/sil/homes"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to homes
          </Link>
        </div>
      </div>
    );
  }

  const { features } = formData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link to="/sil" className="hover:text-blue-600">
                SIL Management
              </Link>
              <span>&gt;</span>
              <Link to="/sil/homes" className="hover:text-blue-600">
                Homes
              </Link>
              <span>&gt;</span>
              <Link
                to={`/sil/homes/${home.id}`}
                className="hover:text-blue-600"
              >
                {formData.displayName || home.address}
              </Link>
              <span>&gt;</span>
              <span className="text-gray-900">Edit</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Edit SIL Home</h1>
            <p className="mt-2 text-gray-600">
              Update property information and details
            </p>
          </div>

          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Property Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="displayName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Home Name *
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.displayName}
                      onChange={(e) =>
                        handleInputChange("displayName", e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Address *
                    </label>
                    <input
                      id="address"
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      State *
                    </label>
                    <select
                      id="state"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="postalCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Postcode *
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.postalCode}
                      onChange={(e) =>
                        handleInputChange("postalCode", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="propertyType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Property Type *
                    </label>
                    <select
                      id="propertyType"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.propertyType}
                      onChange={(e) =>
                        handleInputChange("propertyType", e.target.value)
                      }
                    >
                      <option value="">Select property type</option>
                      {propertyTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="sdaType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      SDA Type
                    </label>
                    <select
                      id="sdaType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.sdaType}
                      onChange={(e) =>
                        handleInputChange("sdaType", e.target.value)
                      }
                    >
                      <option value="">Select SDA Type</option>
                      {sdaTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
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
                      value={formData.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <option value="Available">Available</option>
                      <option value="Not Available">Not Available</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Property Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="totalRooms"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Rooms *
                    </label>
                    <input
                      id="totalRooms"
                      type="number"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.totalRooms}
                      onChange={(e) =>
                        handleInputChange("totalRooms", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bathrooms"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bathrooms *
                    </label>
                    <input
                      id="bathrooms"
                      type="number"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.bathrooms}
                      onChange={(e) =>
                        handleInputChange("bathrooms", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="kitchens"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Kitchens *
                    </label>
                    <input
                      id="kitchens"
                      type="number"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.kitchens}
                      onChange={(e) =>
                        handleInputChange("kitchens", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="parkingSpaces"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Parking Spaces *
                    </label>
                    <input
                      id="parkingSpaces"
                      type="number"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.parkingSpaces}
                      onChange={(e) =>
                        handleInputChange("parkingSpaces", e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="sharedSpaces"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Shared Spaces (comma separated)
                    </label>
                    <input
                      id="sharedSpaces"
                      type="text"
                      placeholder="Living Room, Dining Area, Study Room"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.sharedSpacesText}
                      onChange={(e) =>
                        handleInputChange("sharedSpacesText", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Property Features
                </h3>
                <div className="space-y-3">
                  {Object.entries(features).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={value}
                        onChange={(e) =>
                          handleInputChange("features", {
                            ...features,
                            [key]: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label
                      htmlFor="assignedManager"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Assigned Manager
                    </label>
                    <input
                      id="assignedManager"
                      type="text"
                      placeholder="e.g., Sarah Johnson"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.assignedManager}
                      onChange={(e) =>
                        handleInputChange("assignedManager", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the property, accessibility features, nearby amenities, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  to={`/sil/homes/${id}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={updateHomeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-60"
                >
                  {updateHomeMutation.isPending ? "Saving..." : "Update Home"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeEdit;
