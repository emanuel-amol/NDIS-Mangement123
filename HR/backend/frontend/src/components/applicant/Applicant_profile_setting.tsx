import React, { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import NavigationBar from "../navigation/NavigationBar";
import { useProfileData, TAB_ITEMS, computeProgress } from "./profileUtils";

const ProfileSettings: React.FC = () => {
  const { userId, id } = useParams<{ userId?: string; id?: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const qUserId = searchParams.get("userId") || undefined;
  const debug = searchParams.get("debug") === "1";
  const profileId = userId || id || qUserId;
  const isAdminView = Boolean(profileId);
  
  const { data, loading, error, setData } = useProfileData(profileId);
  
  // Settings form state
  const [editJobTitle, setEditJobTitle] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editSummary, setEditSummary] = useState<string>("");
  const [editSkills, setEditSkills] = useState<string>("");
  const [editLinkedin, setEditLinkedin] = useState<string>("");
  
  // Additional form fields from original design
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [editDateOfBirth, setEditDateOfBirth] = useState<string>("");
  const [editGender, setEditGender] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState<string>("");
  const [editEmergencyContactNumber, setEditEmergencyContactNumber] = useState<string>("");
  const [editStreetAddress, setEditStreetAddress] = useState<string>("");
  const [editSuburb, setEditSuburb] = useState<string>("");
  const [editState, setEditState] = useState<string>("");
  const [editPostalCode, setEditPostalCode] = useState<string>("");
  const [editQuickSnapshot, setEditQuickSnapshot] = useState<string>("");
  const [editMaxHours, setEditMaxHours] = useState<string>("");
  const [editKeyStrengths, setEditKeyStrengths] = useState<string>("");
  const [editEmployeeType, setEditEmployeeType] = useState<string>("");
  const [editSalarySlab, setEditSalarySlab] = useState<string>("");
  const [editHourlyRate, setEditHourlyRate] = useState<string>("");
  const [editRole, setEditRole] = useState<string>("");
  
  // Account settings
  const [editCurrentEmail, setEditCurrentEmail] = useState<string>("");
  const [editNewEmail, setEditNewEmail] = useState<string>("");
  const [editNewPassword, setEditNewPassword] = useState<string>("");
  const [editConfirmPassword, setEditConfirmPassword] = useState<string>("");
  
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  
  // Admin password-change state
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  const candidate = data?.candidate ?? null;
  const profile = data?.profile ?? null;
  const user = data?.user ?? null;

  React.useEffect(() => {
    if (data) {
      setEditJobTitle(data.candidate?.job_title ?? "");
      setEditAddress(data.profile?.address ?? data.candidate?.address ?? "");
      setEditSummary(data.profile?.summary ?? "");
      setEditSkills(data.profile?.skills ?? "");
      setEditLinkedin(data.profile?.linkedin ?? "");
      
      // Initialize additional fields
      if (data.candidate) {
        setEditFirstName(data.candidate.first_name ?? "");
        setEditLastName(data.candidate.last_name ?? "");
      } else {
        // Fallback: derive a best-effort name from username/email so the UI isn't blank
        const username = data.user?.username || data.user?.email || "";
        const parts = username.replace(/@.*/,'').split(/[._\s-]+/);
        setEditFirstName(parts[0] || "");
        setEditLastName(parts.slice(1).join(" "));
      }
      setEditPhone(data.candidate?.mobile ?? "");
      setEditCurrentEmail(data.candidate?.email ?? data.user?.email ?? "");
      
      // Parse address into components if it exists
      const address = data.profile?.address ?? data.candidate?.address ?? "";
      const addressParts = address.split(", ");
      setEditStreetAddress(addressParts[0] ?? "");
      setEditSuburb(addressParts[1] ?? "");
      setEditState(addressParts[2] ?? "");
      setEditPostalCode(addressParts[3] ?? "");

      // Parse extras JSON if present
      try {
        const raw = data.profile?.extras ?? null;
        if (raw) {
          const ex = JSON.parse(raw as unknown as string);
          if (ex && typeof ex === 'object') {
            setEditQuickSnapshot(ex.quick_snapshot ?? "");
            setEditMaxHours(ex.max_hours ?? "");
            setEditKeyStrengths(ex.key_strengths ?? "");
            setEditEmployeeType(ex.employee_type ?? "");
            setEditSalarySlab(ex.salary_slab ?? "");
            setEditHourlyRate(ex.hourly_rate ?? "");
            setEditRole(ex.role ?? "");
            setEditGender(ex.gender ?? editGender);
            setEditDateOfBirth(ex.date_of_birth ?? editDateOfBirth);
            setEditEmergencyContactName(ex.emergency_contact_name ?? "");
            setEditEmergencyContactNumber(ex.emergency_contact_number ?? "");
          }
        }
      } catch {}
    }
  }, [data]);

  const fullName = useMemo(() => {
    const candidateName = candidate
      ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim()
      : "";
    if (candidateName) return candidateName;
    if (isAdminView) {
      return user?.username || user?.email || "Profile";
    }
    return user?.username ?? "Profile";
  }, [candidate, user, isAdminView]);

  const progress = useMemo(() => computeProgress(candidate, profile), [candidate, profile]);

  // Handler used by admins to save another user's profile
  const handleAdminSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault?.();
    if (!profileId) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const extras: Record<string, any> = {
        quick_snapshot: editQuickSnapshot || undefined,
        max_hours: editMaxHours || undefined,
        key_strengths: editKeyStrengths || undefined,
        employee_type: editEmployeeType || undefined,
        salary_slab: editSalarySlab || undefined,
        hourly_rate: editHourlyRate || undefined,
        role: editRole || undefined,
        gender: editGender || undefined,
        date_of_birth: editDateOfBirth || undefined,
        emergency_contact_name: editEmergencyContactName || undefined,
        emergency_contact_number: editEmergencyContactNumber || undefined,
      };

      const response = await fetch(`/api/v1/admin/users/${profileId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          job_title: editJobTitle || undefined,
          summary: editSummary || undefined,
          skills: editSkills || undefined,
          linkedin: editLinkedin || undefined,
          address: `${editStreetAddress}, ${editSuburb}, ${editState}, ${editPostalCode}`.replace(/^,\s*|,\s*$/g, '') || undefined,
          extras,
        }),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(txt || `Save failed (status ${response.status})`);
      }

  const refreshResp = await fetch(`/api/v1/admin/users/${profileId}/profile`, { credentials: "include" });
      if (refreshResp.ok) {
        const updated = (await refreshResp.json()) as any;
        setData(updated);
        setSettingsMessage("Profile updated (admin).");
      } else {
        setSettingsMessage("Saved, but failed to refresh profile.");
      }

      // Handle password change if provided
      if (newPassword) {
        try {
          setPasswordMessage(null);
          if (newPassword !== confirmPassword) {
            setPasswordMessage("Passwords do not match.");
          } else if (newPassword.length < 6) {
            setPasswordMessage("Password must be at least 6 characters.");
          } else {
            setPasswordSaving(true);
            const pform = new FormData();
            pform.append("new_password", newPassword);
            pform.append("confirm_password", confirmPassword);
            const presp = await fetch(`/portal/profile/admin/${profileId}/password`, {
              method: "POST",
              credentials: "include",
              body: pform,
            });
            if (!presp.ok) {
              const txt = await presp.text().catch(() => "");
              throw new Error(txt || `Password change failed (status ${presp.status})`);
            }
            setPasswordMessage("Password updated.");
            setNewPassword("");
            setConfirmPassword("");
          }
        } catch (err) {
          setPasswordMessage(err instanceof Error ? err.message : "Unable to change password");
        } finally {
          setPasswordSaving(false);
        }
      }
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : "Unable to save profile (admin)");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Settings save handler for current user
  const handleSettingsSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault?.();
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const extras: Record<string, any> = {
        quick_snapshot: editQuickSnapshot || undefined,
        max_hours: editMaxHours || undefined,
        key_strengths: editKeyStrengths || undefined,
        employee_type: editEmployeeType || undefined,
        salary_slab: editSalarySlab || undefined,
        hourly_rate: editHourlyRate || undefined,
        role: editRole || undefined,
        gender: editGender || undefined,
        date_of_birth: editDateOfBirth || undefined,
        emergency_contact_name: editEmergencyContactName || undefined,
        emergency_contact_number: editEmergencyContactNumber || undefined,
      };

      const payload = {
        job_title: editJobTitle || undefined,
        summary: editSummary || undefined,
        skills: editSkills || undefined,
        linkedin: editLinkedin || undefined,
        address: `${editStreetAddress}, ${editSuburb}, ${editState}, ${editPostalCode}`.replace(/^,\s*|,\s*$/g, '') || undefined,
        extras,
      } as Record<string, unknown>;

      const response = await fetch("/api/v1/portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Save failed (status ${response.status})`);
      }

      const json = (await response.json().catch(() => null)) as any;
      
      if (json?.candidate) {
        setEditJobTitle(json.candidate.job_title ?? editJobTitle);
      }
      if (json?.profile) {
        setEditSummary(json.profile.summary ?? editSummary);
        setEditSkills(json.profile.skills ?? editSkills);
        setEditLinkedin(json.profile.linkedin ?? editLinkedin);
        setEditAddress(json.profile.address ?? editAddress);
        try {
          if (json.profile.extras) {
            const ex = JSON.parse(json.profile.extras);
            setEditQuickSnapshot(ex.quick_snapshot ?? editQuickSnapshot);
            setEditMaxHours(ex.max_hours ?? editMaxHours);
            setEditKeyStrengths(ex.key_strengths ?? editKeyStrengths);
            setEditEmployeeType(ex.employee_type ?? editEmployeeType);
            setEditSalarySlab(ex.salary_slab ?? editSalarySlab);
            setEditHourlyRate(ex.hourly_rate ?? editHourlyRate);
            setEditRole(ex.role ?? editRole);
            setEditGender(ex.gender ?? editGender);
            setEditDateOfBirth(ex.date_of_birth ?? editDateOfBirth);
            setEditEmergencyContactName(ex.emergency_contact_name ?? editEmergencyContactName);
            setEditEmergencyContactNumber(ex.emergency_contact_number ?? editEmergencyContactNumber);
          }
        } catch {}
      }

      setSettingsMessage("Profile saved successfully.");
      setData((prev) => ({
        user: prev?.user ?? (json?.user ?? null),
        candidate: json?.candidate ?? prev?.candidate ?? null,
        profile: json?.profile ?? prev?.profile ?? null,
      } as any));
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    setAccountMessage(null);
    if (!editNewEmail.trim()) {
      setAccountMessage("Please enter a new email.");
      return;
    }
    try {
      const url = isAdminView ? `/api/v1/admin/users/${profileId}/email` : `/api/v1/me/email`;
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ new_email: editNewEmail.trim() }),
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Change email failed (${resp.status})`);
      }
      const json = await resp.json();
      setEditCurrentEmail(json.email || editNewEmail.trim());
      setEditNewEmail("");
      setAccountMessage("Email updated.");
    } catch (e) {
      setAccountMessage(e instanceof Error ? e.message : "Unable to change email");
    }
  };

  const handleChangePassword = async () => {
    setAccountMessage(null);
    if (!editNewPassword || !editConfirmPassword) {
      setAccountMessage("Enter and confirm the new password.");
      return;
    }
    if (editNewPassword !== editConfirmPassword) {
      setAccountMessage("Passwords do not match.");
      return;
    }
    if (editNewPassword.length < 6) {
      setAccountMessage("Password must be at least 6 characters.");
      return;
    }
    try {
      const url = isAdminView ? `/api/v1/admin/users/${profileId}/password` : `/api/v1/me/password`;
      const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ new_password: editNewPassword, confirm_password: editConfirmPassword }),
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Change password failed (${resp.status})`);
      }
      setEditNewPassword("");
      setEditConfirmPassword("");
      setAccountMessage("Password updated.");
    } catch (e) {
      setAccountMessage(e instanceof Error ? e.message : "Unable to change password");
    }
  };

  const handleDeactivate = async () => {
    if (!isAdminView || !profileId) return;
    if (!confirm("Deactivate this user (archive applicant/worker)?")) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${profileId}/archive`, {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Deactivate failed (${resp.status})`);
      }
      setAccountMessage("User archived.");
    } catch (e) {
      setAccountMessage(e instanceof Error ? e.message : "Unable to deactivate user");
    }
  };

  const handleDelete = async () => {
    if (!isAdminView || !profileId) return;
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${profileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Delete failed (${resp.status})`);
      }
      setAccountMessage("User deleted.");
      // Optionally redirect back to list
      // window.location.assign('/admin/users');
    } catch (e) {
      setAccountMessage(e instanceof Error ? e.message : "Unable to delete user");
    }
  };

  // Debug overlay (always-on when ?debug=1), visible regardless of loading/error
  if (debug) {
    // eslint-disable-next-line jsx-a11y/aria-role
    const _overlay = (
      <div className="fixed top-2 left-64 z-50 bg-white/95 border border-gray-300 shadow px-3 py-2 rounded text-[11px] text-gray-800 max-w-[50vw]">
        <div className="font-semibold mb-1">Settings Debug</div>
        <pre className="max-h-48 overflow-auto">{JSON.stringify({ profileId, isAdminView, loading, error, hasData: Boolean(data), hasCandidate: Boolean(candidate), hasProfile: Boolean(profile) }, null, 2)}</pre>
      </div>
    );
    // Render overlay by returning a fragment that includes overlay plus normal rendering below
    // We fall through to loading/error/UI returns below, but overlay stays visible.
    // @ts-ignore - allow unused constant in JSX below
    void _overlay;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f7f8fa]">
        <NavigationBar />
        <div className="flex-1 p-6 text-gray-600">
          <div className="max-w-6xl mx-auto">
            {debug && (
              <div className="mb-3 text-xs text-gray-700">Loading… (debug mode enabled)</div>
            )}
            <p className="text-sm">Loading profile…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#f7f8fa]">
        <NavigationBar />
        <div className="flex-1 p-6 text-gray-700">
          <div className="max-w-3xl mx-auto space-y-3">
            {debug && (
              <div className="p-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
                Debug error: {String(error)}
              </div>
            )}
            <div className="bg-white border border-red-200 text-red-600 rounded-md px-4 py-3">
              {error}
            </div>
            {isAdminView ? (
              <div className="text-sm text-gray-500">
                Try returning to the applicants or workers list to pick another profile.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <NavigationBar />
      <div className="flex-1 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {profile?.photo_path ? (
            <img
              src={`/${profile.photo_path}`}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
              {fullName.charAt(0).toUpperCase() || "P"}
            </div>
          )}
          <span className="font-medium text-gray-700">{fullName}</span>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-200 text-sm font-medium">
            Print Support Plan
          </button>
          <button className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-200 text-sm font-medium">
            Case Notes
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 ml-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16h.01M12 8v4" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2 rounded mb-2">
        <div className="bg-gray-400 h-2 rounded" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs text-gray-500 mb-2 ml-1">Progress Indicator</div>

      {/* Tabs */}
      <div className="bg-white rounded-md shadow-sm flex items-center px-2 py-1 mb-6">
        {TAB_ITEMS.map((tab) => {
          const isActive = tab.id === "settings";
          const basePath = profileId ? `/portal/profile/admin/${profileId}` : "/portal/profile";
          const tabPath = tab.id === "overview" ? basePath : `${basePath}/${tab.id}`;
          return (
            <Link
              key={tab.id}
              to={tabPath}
              className={`px-3 py-1 text-sm font-medium ${
                isActive
                  ? "border-b-2 border-gray-700 text-gray-900"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

  {/* Main Content */}
  <div className="grid grid-cols-3 gap-6">
        {/* Left Section - Main Form */}
        <div className="col-span-2 bg-white rounded-md shadow-sm p-6 overflow-y-auto max-h-[75vh]">
          {debug && (
            <pre className="mb-4 text-xs bg-gray-50 border border-gray-200 text-gray-700 p-2 rounded overflow-auto">
{JSON.stringify({ profileId, isAdminView, loading, hasData: Boolean(data), hasCandidate: Boolean(candidate), hasProfile: Boolean(profile), error }, null, 2)}
            </pre>
          )}
          {settingsMessage && (
            <div className={`mb-4 p-3 rounded ${settingsMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {settingsMessage}
            </div>
          )}
          {isAdminView && !candidate && (
            <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
              This user doesn't have a candidate profile yet. Some fields may be empty. You can still update account
              details on the right and basic profile fields below.
            </div>
          )}
          
          {isAdminView ? (
            <form onSubmit={handleAdminSave} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Admin Profile Editor</h2>
              
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First Name"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last Name"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <select 
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  >
                    <option value="">Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={editCurrentEmail}
                    onChange={(e) => setEditCurrentEmail(e.target.value)}
                    placeholder="Email"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editEmergencyContactName}
                    onChange={(e) => setEditEmergencyContactName(e.target.value)}
                    placeholder="Emergency Contact Name"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="tel"
                    value={editEmergencyContactNumber}
                    onChange={(e) => setEditEmergencyContactNumber(e.target.value)}
                    placeholder="Emergency Contact Number"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    placeholder="Street Address"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editSuburb}
                    onChange={(e) => setEditSuburb(e.target.value)}
                    placeholder="Suburb"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="State"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    placeholder="Postal Code"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editQuickSnapshot}
                    onChange={(e) => setEditQuickSnapshot(e.target.value)}
                    placeholder="Quick Snapshot"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editMaxHours}
                    onChange={(e) => setEditMaxHours(e.target.value)}
                    placeholder="Max Allowed Hours"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Professional Details */}
              <div>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder="Job Title"
                  className="border rounded-md p-2 text-sm w-full mb-4"
                />
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={3}
                  placeholder="Profile summary"
                  className="border rounded-md p-2 text-sm w-full mb-4"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    placeholder="Skills (comma-separated)"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="url"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    placeholder="LinkedIn URL"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Key Strengths */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Key Strengths, Likes & Areas of Improvement (Maximum 12)
                </label>
                <textarea
                  value={editKeyStrengths}
                  onChange={(e) => setEditKeyStrengths(e.target.value)}
                  rows={4}
                  className="border rounded-md p-2 w-full text-sm"
                  placeholder="Enter key strengths and improvement areas..."
                />
              </div>

              {/* Payroll */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Payroll</h3>
                <div className="grid grid-cols-3 gap-4">
                  <select
                    value={editEmployeeType}
                    onChange={(e) => setEditEmployeeType(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  >
                    <option value="">Employee Type</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                  <select
                    value={editSalarySlab}
                    onChange={(e) => setEditSalarySlab(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  >
                    <option value="">Salary Slab</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Annual">Annual</option>
                  </select>
                  <input
                    type="text"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    placeholder="Hourly Rate"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Role"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Admin Password Change */}
              {passwordMessage && (
                <div className={`p-3 rounded ${passwordMessage.includes('updated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passwordMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (leave blank to keep current)"
                  className="border rounded-md p-2 text-sm w-full"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="border rounded-md p-2 text-sm w-full"
                />
              </div>

              <button
                type="submit"
                disabled={settingsSaving || passwordSaving}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:opacity-50"
              >
                {settingsSaving || passwordSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSettingsSave} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={candidate?.first_name || ""}
                  placeholder="First Name"
                  className="border rounded-md p-2 text-sm w-full bg-gray-50"
                  readOnly
                />
                <input
                  type="text"
                  value={candidate?.last_name || ""}
                  placeholder="Last Name"
                  className="border rounded-md p-2 text-sm w-full bg-gray-50"
                  readOnly
                />
                <input
                  type="date"
                  value={editDateOfBirth}
                  onChange={(e) => setEditDateOfBirth(e.target.value)}
                  className="border rounded-md p-2 text-sm w-full"
                />
                <select 
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="border rounded-md p-2 text-sm w-full"
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={candidate?.email || user?.email || ""}
                    placeholder="Email"
                    className="border rounded-md p-2 text-sm w-full bg-gray-50"
                    readOnly
                  />
                  <input
                    type="text"
                    value={editEmergencyContactName}
                    onChange={(e) => setEditEmergencyContactName(e.target.value)}
                    placeholder="Emergency Contact Name"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="tel"
                    value={candidate?.mobile || ""}
                    placeholder="Phone Number"
                    className="border rounded-md p-2 text-sm w-full bg-gray-50"
                    readOnly
                  />
                  <input
                    type="tel"
                    value={editEmergencyContactNumber}
                    onChange={(e) => setEditEmergencyContactNumber(e.target.value)}
                    placeholder="Emergency Contact Number"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editStreetAddress}
                    onChange={(e) => setEditStreetAddress(e.target.value)}
                    placeholder="Street Address"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editSuburb}
                    onChange={(e) => setEditSuburb(e.target.value)}
                    placeholder="Suburb"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="State"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    placeholder="Postal Code"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editQuickSnapshot}
                    onChange={(e) => setEditQuickSnapshot(e.target.value)}
                    placeholder="Quick Snapshot"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editMaxHours}
                    onChange={(e) => setEditMaxHours(e.target.value)}
                    placeholder="Max Allowed Hours"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              {/* Professional Details */}
              <div>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder="Job Title"
                  className="border rounded-md p-2 text-sm w-full mb-4"
                />
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="border rounded-md p-2 text-sm w-full mb-4"
                />
                <input
                  type="text"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  placeholder="Enter skills separated by commas"
                  className="border rounded-md p-2 text-sm w-full mb-4"
                />
                <input
                  type="url"
                  value={editLinkedin}
                  onChange={(e) => setEditLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="border rounded-md p-2 text-sm w-full"
                />
              </div>

              {/* Key Strengths */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Key Strengths, Likes & Areas of Improvement (Maximum 12)
                </label>
                <textarea
                  value={editKeyStrengths}
                  onChange={(e) => setEditKeyStrengths(e.target.value)}
                  rows={4}
                  className="border rounded-md p-2 w-full text-sm"
                  placeholder="Enter key strengths and improvement areas..."
                />
              </div>

              {/* Payroll */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Payroll</h3>
                <div className="grid grid-cols-3 gap-4">
                  <select
                    value={editEmployeeType}
                    onChange={(e) => setEditEmployeeType(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  >
                    <option value="">Employee Type</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                  <select
                    value={editSalarySlab}
                    onChange={(e) => setEditSalarySlab(e.target.value)}
                    className="border rounded-md p-2 text-sm w-full"
                  >
                    <option value="">Salary Slab</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Annual">Annual</option>
                  </select>
                  <input
                    type="text"
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(e.target.value)}
                    placeholder="Hourly Rate"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Role"
                    className="border rounded-md p-2 text-sm w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Update Settings'}
              </button>
            </form>
          )}
        </div>

        {/* Right Section - Profile Picture and Account Settings */}
        <div className="space-y-6 overflow-y-auto max-h-[75vh] bg-white rounded-md shadow-sm p-6">
          {/* Profile Picture */}
          <div className="text-center">
            {profile?.photo_path ? (
              <img
                src={`/${profile.photo_path}`}
                alt="Profile"
                className="w-32 h-32 mx-auto rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-32 h-32 mx-auto rounded-full border border-gray-300 flex items-center justify-center text-gray-500 bg-gray-100">
                <span className="text-sm text-center">Profile Picture</span>
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Login Email Address</h2>
            <input
              type="email"
              value={editCurrentEmail}
              className="border rounded-md p-2 text-sm w-full bg-gray-50"
              placeholder="Current Email"
              readOnly
            />
            <input
              type="email"
              value={editNewEmail}
              onChange={(e) => setEditNewEmail(e.target.value)}
              className="border rounded-md p-2 text-sm w-full"
              placeholder="New Email"
            />
            <button 
              type="button"
              className="bg-gray-800 text-white px-4 py-2 rounded-md w-full hover:bg-gray-900"
              onClick={handleChangeEmail}
            >
              Change Email
            </button>
            {accountMessage && (
              <div className={`text-xs mt-1 ${accountMessage.includes('updated') || accountMessage.includes('archived') ? 'text-green-700' : 'text-red-700'}`}>
                {accountMessage}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Change Password</h2>
            <input
              type="password"
              value={editNewPassword}
              onChange={(e) => setEditNewPassword(e.target.value)}
              className="border rounded-md p-2 text-sm w-full"
              placeholder="New Password"
            />
            <input
              type="password"
              value={editConfirmPassword}
              onChange={(e) => setEditConfirmPassword(e.target.value)}
              className="border rounded-md p-2 text-sm w-full"
              placeholder="Confirm New Password"
            />
            <button 
              type="button"
              className="bg-gray-800 text-white px-4 py-2 rounded-md w-full hover:bg-gray-900"
              onClick={handleChangePassword}
            >
              Change Password
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Deactivate / Delete</h2>
            <button 
              type="button"
              className="bg-red-600 text-white px-4 py-2 rounded-md w-full hover:bg-red-700"
              onClick={handleDeactivate}
              disabled={!isAdminView}
            >
              Deactivate User
            </button>
            <button 
              type="button"
              className="bg-red-800 text-white px-4 py-2 rounded-md w-full hover:bg-red-900"
              onClick={handleDelete}
              disabled={!isAdminView}
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProfileSettings;