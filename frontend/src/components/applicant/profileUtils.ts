// Shared types and utilities for applicant profile components
import React, { useState } from "react";

export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export interface CandidateResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string | null;
  job_title?: string | null;
  address?: string | null;
  status: string;
  applied_on: string;
}

export interface ProfileResponse {
  id: number;
  summary?: string | null;
  skills?: string | null;
  linkedin?: string | null;
  address?: string | null;
  resume_path?: string | null;
  photo_path?: string | null;
  extras?: string | null;
}

export interface MeResponse {
  user: UserResponse;
  candidate: CandidateResponse | null;
  profile: ProfileResponse | null;
}

// Format an ISO date string to a human-readable format or return "Not provided".
export const formatDate = (iso?: string | null) => {
  if (!iso) return "Not provided";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Not provided";
  return parsed.toLocaleDateString();
};

// Figures out how complete the profile is (0–100%)
export const computeProgress = (candidate: CandidateResponse | null, profile: ProfileResponse | null) => {
  const sections = [
    candidate?.job_title,
    profile?.summary,
    profile?.skills,
    profile?.linkedin,
    profile?.resume_path,
    profile?.photo_path,
  ];
  const filled = sections.filter((value) => typeof value === "string" && value.trim() !== "").length;
  const percent = Math.round((filled / sections.length) * 100);
  return Number.isNaN(percent) ? 0 : Math.min(100, Math.max(0, percent));
};

// Tab definitions
export const TAB_ITEMS = [
  { id: "overview", label: "Overview", path: "/components/applicant/Applicant_profile" },
  { id: "documents", label: "Documents", path: "/components/applicant/Applicant_profile_document" },
  { id: "settings", label: "Settings", path: "/components/applicant/Applicant_profile_setting" },
  { id: "forms", label: "Forms", path: "/components/applicant/Applicant_profile_form" },
];

// Custom hook to fetch profile data
export const useProfileData = (userId?: string) => {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = userId ? `/api/v1/admin/users/${userId}/profile` : "/api/v1/me";
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Unable to load profile (status ${response.status})`);
      }
      const json = (await response.json()) as MeResponse;
      setData(json);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error loading profile.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const endpoint = userId ? `/api/v1/admin/users/${userId}/profile` : "/api/v1/me";
      const resp = await fetch(endpoint, { credentials: "include" });
      if (!resp.ok) return;
      const json = (await resp.json()) as MeResponse;
      setData(json);
    } catch (e) {
      // ignore refresh failures silently
    }
  };

  // Automatically fetch profile data when the hook is used
  React.useEffect(() => {
    fetchProfile();
  }, [userId]);

  return { data, loading, error, fetchProfile, refreshProfile, setData };
};