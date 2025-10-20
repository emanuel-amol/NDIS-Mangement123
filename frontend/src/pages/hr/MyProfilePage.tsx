import React, { useState, useEffect } from "react";
import NavigationBar from "../components/navigation/NavigationBar";

interface User {
  id: number;
  username: string;
  email: string;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  job_title?: string;
  address?: string;
}

interface Profile {
  id: number;
  summary?: string;
  skills?: string;
  linkedin?: string;
  address?: string;
  extras?: string;
}

interface ProfileData {
  user: User;
  candidate: Candidate | null;
  profile: Profile | null;
}

const MyProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [editSuburb, setEditSuburb] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactNumber, setEditEmergencyContactNumber] = useState("");
  const [editQuickSnapshot, setEditQuickSnapshot] = useState("");
  const [editMaxHours, setEditMaxHours] = useState("");
  const [editKeyStrengths, setEditKeyStrengths] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/profile", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const profileData: ProfileData = await response.json();
      
      // Initialize form fields
      if (profileData.candidate) {
        setEditFirstName(profileData.candidate.first_name || "");
        setEditLastName(profileData.candidate.last_name || "");
        setEditEmail(profileData.candidate.email || "");
        setEditPhone(profileData.candidate.mobile || "");
        setEditJobTitle(profileData.candidate.job_title || "");
      }
      
      if (profileData.profile) {
        setEditSummary(profileData.profile.summary || "");
        setEditSkills(profileData.profile.skills || "");
        setEditLinkedin(profileData.profile.linkedin || "");
        
        // Parse address
        const address = profileData.profile.address || "";
        const addressParts = address.split(", ");
        setEditStreetAddress(addressParts[0] || "");
        setEditSuburb(addressParts[1] || "");
        setEditState(addressParts[2] || "");
        setEditPostalCode(addressParts[3] || "");
        
        // Parse extras
        try {
          const extras = profileData.profile.extras ? JSON.parse(profileData.profile.extras as unknown as string) : {};
          setEditDateOfBirth(extras.date_of_birth || "");
          setEditGender(extras.gender || "");
          setEditEmergencyContactName(extras.emergency_contact_name || "");
          setEditEmergencyContactNumber(extras.emergency_contact_number || "");
          setEditQuickSnapshot(extras.quick_snapshot || "");
          setEditMaxHours(extras.max_hours || "");
          setEditKeyStrengths(extras.key_strengths || "");
        } catch {
          // Ignore JSON parse errors
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      
      // Build composed address
      const addressParts = [editStreetAddress, editSuburb, editState, editPostalCode].filter(Boolean);
      const composedAddress = addressParts.join(", ");
      
      // Build extras object
      const extras: Record<string, string> = {};
      if (editDateOfBirth) extras.date_of_birth = editDateOfBirth;
      if (editGender) extras.gender = editGender;
      if (editEmergencyContactName) extras.emergency_contact_name = editEmergencyContactName;
      if (editEmergencyContactNumber) extras.emergency_contact_number = editEmergencyContactNumber;
      if (editQuickSnapshot) extras.quick_snapshot = editQuickSnapshot;
      if (editMaxHours) extras.max_hours = editMaxHours;
      if (editKeyStrengths) extras.key_strengths = editKeyStrengths;
      
      const payload = {
        job_title: editJobTitle,
        summary: editSummary,
        skills: editSkills,
        linkedin: editLinkedin,
        address: composedAddress,
        extras: extras, // Send as object, not JSON string
      };
      
      const response = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || `Failed to save profile (${response.status})`;
        throw new Error(errorMsg);
      }
      
      setSaveMessage("Profile saved successfully!");
      await fetchProfile(); // Refresh data
      setSaving(false);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <NavigationBar />
        <div className="flex-1 p-8">
          <div className="text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <NavigationBar />
        <div className="flex-1 p-8">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <NavigationBar />
      <div className="flex-1 p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">My Profile</h1>
          
          {saveMessage && (
            <div className={`mb-4 p-4 rounded ${saveMessage.includes("success") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {saveMessage}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-6 space-y-8">
            {/* Personal Information */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to update</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to update</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to update</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to update</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact admin to update</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Select Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Profile */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Brief summary about yourself"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Skills</label>
                    <textarea
                      value={editSkills}
                      onChange={(e) => setEditSkills(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Comma-separated skills"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={editEmergencyContactName}
                    onChange={(e) => setEditEmergencyContactName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editEmergencyContactNumber}
                    onChange={(e) => setEditEmergencyContactNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </section>

            {/* Address */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Street Address</label>
                  <input
                    type="text"
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Suburb</label>
                  <input
                    type="text"
                    value={editSuburb}
                    onChange={(e) => setEditSuburb(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </section>

            {/* Worker Details */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Worker Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quick Snapshot</label>
                  <input
                    type="text"
                    value={editQuickSnapshot}
                    onChange={(e) => setEditQuickSnapshot(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Allowed Hours</label>
                  <input
                    type="text"
                    value={editMaxHours}
                    onChange={(e) => setEditMaxHours(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Key Strengths & Areas of Improvement</label>
                  <textarea
                    value={editKeyStrengths}
                    onChange={(e) => setEditKeyStrengths(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfilePage;
