// frontend/src/pages/sil-management/HomeNew.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  silService,
  HomeFormPayload,
  HomeSharedSpacePayload,
  HomeFeaturePayload,
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

/* -------------------- Strict inline helpers (no extra files) -------------------- */
const sanitizeDigits4 = (v: string) => v.replace(/\D/g, "").slice(0, 4);
const isFourDigit = (v: string) => /^\d{4}$/.test(v);
/** requires at least one digit and one letter; min length 5 */
const looksLikeStreetAddress = (v: string) =>
  /\d/.test(v) && /[A-Za-z]/.test(v) && v.trim().length >= 5;
/** suburb: letters/spaces/hyphens/apostrophes only; min length 2 */
const isValidSuburb = (v: string) => /^[A-Za-z][A-Za-z \-']{1,}$/.test(v.trim());
/** display name: at least one letter, min length 2 */
const isValidDisplayName = (v: string) => /[A-Za-z]/.test(v) && v.trim().length >= 2;

/** AU postcode → expected full state name (based on typical ranges) */
function expectedStateFromPostcode(pc: string):
  | "Australian Capital Territory"
  | "New South Wales"
  | "Northern Territory"
  | "Queensland"
  | "South Australia"
  | "Tasmania"
  | "Victoria"
  | "Western Australia"
  | "" {
  if (!isFourDigit(pc)) return "";
  const n = parseInt(pc, 10);

  // ACT
  if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920))
    return "Australian Capital Territory";

  // NSW
  if ((n >= 1000 && n <= 1999) || (n >= 2000 && n <= 2599) || (n >= 2619 && n <= 2899) || (n >= 2921 && n <= 2999))
    return "New South Wales";

  // VIC
  if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999))
    return "Victoria";

  // QLD
  if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999))
    return "Queensland";

  // SA
  if ((n >= 5000 && n <= 5799) || (n >= 5800 && n <= 5999))
    return "South Australia";

  // WA
  if ((n >= 6000 && n <= 6797) || (n >= 6800 && n <= 6999))
    return "Western Australia";

  // TAS
  if ((n >= 7000 && n <= 7799) || (n >= 7800 && n <= 7999))
    return "Tasmania";

  // NT
  if ((n >= 800 && n <= 899) || (n >= 900 && n <= 999))
    return "Northern Territory";

  return "";
}
/* ------------------------------------------------------------------------------ */

const HomeNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: "",
    address: "",
    suburb: "", // << add suburb field
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
    features: {
      frontYard: false,
      backyard: false,
      swimmingPool: false,
    },
  });

  const createHomeMutation = useMutation({
    mutationFn: (payload: HomeFormPayload) => silService.createHome(payload),
    onSuccess: (data) => {
      toast.success("Home created successfully");
      queryClient.invalidateQueries({ queryKey: ["sil", "homes"] });
      navigate(`/sil/homes/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInputChange = (
    field: keyof typeof formData,
    value:
      | string
      | boolean
      | { frontYard: boolean; backyard: boolean; swimmingPool: boolean },
  ) => {
    let nextVal: any = value;
    if (typeof value === "string") {
      // Trim leading spaces for all string inputs
      nextVal = value.replace(/^\s+/, "");

      // Sanitize certain fields
      if (field === "postalCode") {
        nextVal = sanitizeDigits4(nextVal);
      }
      if (
        field === "totalRooms" ||
        field === "bathrooms" ||
        field === "kitchens" ||
        field === "parkingSpaces"
      ) {
        // Keep only digits, avoid negatives/NaN
        const digits = String(nextVal).replace(/\D/g, "");
        nextVal = digits;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: nextVal,
    }));
  };

  // Derive validity to prevent accidental submits with random text
  const isFormValid = (() => {
    const name = formData.displayName.trim();
    const address = formData.address.trim();
    const suburb = formData.suburb.trim();
    const state = formData.state;
    const postcode = formData.postalCode;

    if (!name) return false;
    if (!looksLikeStreetAddress(address)) return false;
    if (!isValidSuburb(suburb)) return false;
    if (!isFourDigit(postcode)) return false;
    if (!state || !states.includes(state)) return false;
    const expected = expectedStateFromPostcode(postcode);
    if (expected && expected !== state) return false;

    const totalRooms = parseInt(formData.totalRooms, 10);
    const bathrooms = parseInt(formData.bathrooms, 10);
    const kitchens = parseInt(formData.kitchens, 10);
    const parkingSpaces = parseInt(formData.parkingSpaces, 10);
    if (
      Number.isNaN(totalRooms) ||
      Number.isNaN(bathrooms) ||
      Number.isNaN(kitchens) ||
      Number.isNaN(parkingSpaces)
    ) return false;

    // Require a property type selection
    if (!formData.propertyType) return false;
    return true;
  })();

  const buildSharedSpaces = (value: string): HomeSharedSpacePayload[] =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

  const buildFeatures = (): HomeFeaturePayload[] =>
    Object.entries(formData.features).map(([featureName, isAvailable]) => ({
      featureName,
      isAvailable,
    }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formData.displayName.trim();
    const address = formData.address.trim();
    const suburb = formData.suburb.trim();
    const state = formData.state;
    const postcode = formData.postalCode;

    if (!isValidDisplayName(name)) {
      toast.error("Please provide a valid name (min 2 chars, letters)");
      return;
    }

    if (!looksLikeStreetAddress(address)) {
      toast.error("Enter a valid street address (e.g., '10 Smith St').");
      return;
    }

    if (!isValidSuburb(suburb)) {
      toast.error("Enter a valid suburb/town (letters, spaces, - ' only).");
      return;
    }

    if (!isFourDigit(postcode)) {
      toast.error("Postcode must be exactly 4 digits.");
      return;
    }

    if (!state || !states.includes(state)) {
      toast.error("Please select a valid state.");
      return;
    }

    // *** The key guard you asked for: postcode MUST match chosen state ***
    const expected = expectedStateFromPostcode(postcode);
    if (expected && expected !== state) {
      toast.error(`Postcode ${postcode} belongs to ${expected}, not ${state}.`);
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

    if (!formData.propertyType) {
      toast.error("Please select a property type");
      return;
    }

    if (formData.sdaType && !sdaTypes.includes(formData.sdaType)) {
      toast.error("Please select a valid SDA type");
      return;
    }

    const payload: HomeFormPayload = {
      home: {
        address: `${address}, ${suburb}`, // keep address + suburb together if your API expects single field
        state: state,
        postalCode: postcode,
        propertyType: formData.propertyType,
        sdaType: formData.sdaType || undefined,
        status: formData.status,
        description: formData.description || undefined,
      },
      profile: {
        displayName: name,
        assignedManager: formData.assignedManager || undefined,
      },
      propertyDetail: {
        totalRooms,
        bathrooms,
        kitchens,
        parkingSpaces,
      },
      sharedSpaces: buildSharedSpaces(formData.sharedSpacesText),
      features: buildFeatures(),
    };

    createHomeMutation.mutate(payload);
  };

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
              <span className="text-gray-900">Add New Home</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">
              Add New SIL Home
            </h1>
            <p className="mt-2 text-gray-600">
              Register a new Supported Independent Living property
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
                      type="text"
                      id="displayName"
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
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="address"
                      required
                      placeholder="e.g., 10 Smith St"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="suburb"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Suburb/Town *
                    </label>
                    <input
                      type="text"
                      id="suburb"
                      required
                      placeholder="e.g., Melbourne"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.suburb}
                      onChange={(e) =>
                        handleInputChange("suburb", e.target.value)
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
                      type="text"
                      id="postalCode"
                      required
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4 digits"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.postalCode}
                      onChange={(e) =>
                        handleInputChange(
                          "postalCode",
                          sanitizeDigits4(e.target.value)
                        )
                      }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Numbers only; 4 digits. Must match the selected state.
                    </p>
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
                      Initial Status
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
                        handleInputChange(
                          "totalRooms",
                          String(Math.max(0, Number(e.target.value) || 0))
                        )
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
                        handleInputChange(
                          "bathrooms",
                          String(Math.max(0, Number(e.target.value) || 0))
                        )
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
                        handleInputChange(
                          "kitchens",
                          String(Math.max(0, Number(e.target.value) || 0))
                        )
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
                        handleInputChange(
                          "parkingSpaces",
                          String(Math.max(0, Number(e.target.value) || 0))
                        )
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
                  to="/sil/homes"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={createHomeMutation.isPending || !isFormValid}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-60"
                >
                  {createHomeMutation.isPending ? "Creating..." : "Create Home"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeNew;
