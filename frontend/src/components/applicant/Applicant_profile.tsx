/**
* ApplicantProfile (simple comments)
* ------------------------------------------------------------
* This page shows a candidate/user profile. It can load the current
* user's profile ("/api/v1/me") or, if an admin opened a specific user,
* it will load that user's profile ("/api/v1/admin/users/:userId/profile").
*/

import { useEffect, useMemo, useRef, useState } from "react"; // React hooks
import { useParams, useNavigate, Link } from "react-router-dom"; // for route params and navigation
import NavigationBar from "../navigation/NavigationBar"; // Navigation sidebar

type TabKey = "overview" | "documents" | "settings" | "forms"; // possible tabs

interface UserResponse { // user data structure
  id: number; // user ID
  username: string; // username
  email: string; // email address
}

// candidate data structure
interface CandidateResponse { // candidate details
  id: number; // candidate ID
  first_name: string; // first name
  last_name: string; // last name
  email: string; // email address
  mobile?: string | null; // mobile number
  job_title?: string | null;  // job title
  address?: string | null;  // address
  status: string; // application status
  applied_on: string; // application date (ISO string)
}

interface ProfileResponse { // profile details
  id: number; // profile ID
  summary?: string | null;  // summary or bio
  skills?: string | null; // comma-separated skills
  linkedin?: string | null;  // LinkedIn URL
  address?: string | null;  // address
  resume_path?: string | null;  // path to resume file
  photo_path?: string | null; // path to photo file
}

interface MeResponse { // combined response structure
  user: UserResponse;   // user info
  candidate: CandidateResponse | null;  // candidate info (if any)
  profile: ProfileResponse | null;  // profile info (if any)
}

// Format an ISO date string to a human-readable format or return "Not provided".
const formatDate = (iso?: string | null) => { // format ISO date
  if (!iso) return "Not provided"; // handle null/undefined
  const parsed = new Date(iso); 
  if (Number.isNaN(parsed.getTime())) return "Not provided"; // invalid date check
  return parsed.toLocaleDateString(); // format to local date string
};

// Figures out how complete the profile is (0–100%)
// We check fields; each non-empty one counts toward the score.
const computeProgress = (candidate: CandidateResponse | null, profile: ProfileResponse | null) => { 
  const sections = [  // Add to the when needed
    candidate?.job_title,
    profile?.summary,
    profile?.skills,
    profile?.linkedin,
    profile?.resume_path,
    profile?.photo_path,
  ];
  const filled = sections.filter((value) => typeof value === "string" && value.trim() !== "").length; // count filled fields
  const percent = Math.round((filled / sections.length) * 100); // calculate percentage
  return Number.isNaN(percent) ? 0 : Math.min(100, Math.max(0, percent));
};

// Tab order mirrors the supplied mock design.
const TAB_ITEMS: { id: TabKey; label: string; path: string }[] = [  // tab definitions
  { id: "overview", label: "Overview", path: "/components/applicant/Applicant_profile" },  // default tab
  { id: "documents", label: "Documents", path: "/components/applicant/Applicant_profile_document" }, // documents tab
  { id: "settings", label: "Settings", path: "/components/applicant/Applicant_profile_setting" }, // settings tab
  { id: "forms", label: "Forms", path: "/components/applicant/Applicant_profile_form" }, // forms tab
];

const ApplicantProfile = () => { // main component
  const { userId, id } = useParams<{ userId?: string; id?: string }>(); // get userId or id from route params
  const profileId = userId || id; // Handle both parameter names
  // If profileId is set, we're in admin view looking at another user's profile.
  // Otherwise, it's the current user's own profile.
  const isAdminView = Boolean(profileId);

  const navigate = useNavigate();

  // Track which tab is selected so we can keep the UI consistent with the supplied mock.
  const selectedTab = "overview"; // This component is always the overview tab
  const [data, setData] = useState<MeResponse | null>(null); // profile data
  const [loading, setLoading] = useState(true); // loading state
  const [error, setError] = useState<string | null>(null);  // error state

  // --- UI state for Forms tab ---
  type FormsCategory =
    | "Onboarding"
    | "Assessments"
    | "Reporting";
  const FORM_CATEGORIES: FormsCategory[] = [
      "Onboarding",
      "Assessments",
      "Reporting"
  ];
  const [formsCategory, setFormsCategory] = useState<FormsCategory>("Onboarding");
  const [formsList, setFormsList] = useState<string[]>([]);

  // --- Settings form state (editable for current user) ---
  const [editJobTitle, setEditJobTitle] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editSummary, setEditSummary] = useState<string>("");
  const [editSkills, setEditSkills] = useState<string>("");
  const [editLinkedin, setEditLinkedin] = useState<string>("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  // --- Admin password-change state ---
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  // Upload state
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {   // fetch profile data on mount or when profileId changes
    let isMounted = true;
    const controller = new AbortController();

    // Extracted load function so it can be reused after admin saves
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = profileId ? `/api/v1/admin/users/${profileId}/profile` : "/api/v1/me";
        const response = await fetch(endpoint, { credentials: "include", signal: controller.signal });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Unable to load profile (status ${response.status})`);
        }
        const json = (await response.json()) as MeResponse;
          if (isMounted) {
          setData(json);
          setError(null);
          setFormsList([]);
          setEditJobTitle(json.candidate?.job_title ?? "");
          setEditAddress(json.profile?.address ?? json.candidate?.address ?? "");
          setEditSummary(json.profile?.summary ?? "");
          setEditSkills(json.profile?.skills ?? "");
          setEditLinkedin(json.profile?.linkedin ?? "");
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : "Unexpected error loading profile.";
          setError(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // call initial fetch
    fetchProfile();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [profileId]);

  // small helper to refresh profile after uploads/changes
  const refreshProfile = async () => {
    try {
      const endpoint = userId ? `/api/v1/admin/users/${userId}/profile` : "/api/v1/me";
      const resp = await fetch(endpoint, { credentials: "include" });
      if (!resp.ok) return;
      const json = (await resp.json()) as MeResponse;
      setData(json);
      // update editable fields from refreshed data
      setEditJobTitle(json.candidate?.job_title ?? "");
      setEditAddress(json.profile?.address ?? json.candidate?.address ?? "");
      setEditSummary(json.profile?.summary ?? "");
      setEditSkills(json.profile?.skills ?? "");
      setEditLinkedin(json.profile?.linkedin ?? "");
    } catch (e) {
      // ignore refresh failures silently
    }
  };

  // Handler used by admins to save another user's profile via the portal admin endpoint.
  const handleAdminSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault?.();
    if (!userId) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const form = new FormData();
      form.append("job_title", editJobTitle || "");
      form.append("address", editAddress || "");
      form.append("summary", editSummary || "");
      form.append("skills", editSkills || "");
      form.append("linkedin", editLinkedin || "");

      // POST to the existing portal admin endpoint which accepts form data and updates the record
      const response = await fetch(`/portal/profile/admin/${profileId}`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(txt || `Save failed (status ${response.status})`);
      }

      // Refresh profile data after successful admin save
      // Reuse the fetch logic by calling the same endpoint used in useEffect
      const refreshResp = await fetch(`/api/v1/admin/users/${profileId}/profile`, { credentials: "include" });
      if (refreshResp.ok) {
        const updated = (await refreshResp.json()) as MeResponse;
        setData(updated);
        setSettingsMessage("Profile updated (admin).");
      } else {
        setSettingsMessage("Saved, but failed to refresh profile.");
      }
      // If an admin provided a new password, submit it now (after profile save)
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

  // password change removed; handled inline with admin save

  const candidate = data?.candidate ?? null;
  const profile = data?.profile ?? null;
  const user = data?.user ?? null;

  // When formsCategory changes we could fetch forms for that category from an API.
  // For now we populate a static placeholder list to match the screenshot.
  useEffect(() => {
    // simple static mapping — replace with real API call if available
    const mapping: Record<FormsCategory, string[]> = {
      Onboarding: ["Code of Conduct", "Privacy and Confidentiality", "Tax form"],
      Assessments: ["Police check", "WWCC / Clearance"],
      Reporting: ["Custom form A", "Custom form B"],
    };
    setFormsList(mapping[formsCategory]);
  }, [formsCategory]);

  // Settings save handler (current user only)
  const handleSettingsSave = async (ev?: React.FormEvent) => {
    ev?.preventDefault?.();
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const payload = {
        job_title: editJobTitle || undefined,
        summary: editSummary || undefined,
        skills: editSkills || undefined,
        linkedin: editLinkedin || undefined,
        address: editAddress || undefined,
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
      // Update local state with returned values (if any)
      if (json?.candidate) {
        setEditJobTitle(json.candidate.job_title ?? editJobTitle);
      }
      if (json?.profile) {
        setEditSummary(json.profile.summary ?? editSummary);
        setEditSkills(json.profile.skills ?? editSkills);
        setEditLinkedin(json.profile.linkedin ?? editLinkedin);
        setEditAddress(json.profile.address ?? editAddress);
      }

      setSettingsMessage("Profile saved successfully.");
      // refresh the global data to reflect server state
      setData((prev) => ({
        user: prev?.user ?? (json?.user ?? null),
        candidate: json?.candidate ?? prev?.candidate ?? null,
        profile: json?.profile ?? prev?.profile ?? null,
      } as MeResponse));
    } catch (err) {
      setSettingsMessage(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Upload handlers
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeMessage(null);
    if (!file.name.match(/\.(pdf|docx?|PDF|DOCX?)$/)) {
      setResumeMessage('Unsupported file type. Use PDF or Word.');
      return;
    }
    setResumeUploading(true);
    try {
      const form = new FormData();
      form.append('kind', 'resume');
      form.append('file', file);
      const uploadUrl = isAdminView && userId ? `/portal/profile/admin/${userId}/upload` : '/portal/profile/upload';
      const resp = await fetch(uploadUrl, { method: 'POST', credentials: 'include', body: form });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Upload failed (status ${resp.status})`);
      }
      setResumeMessage('Resume uploaded.');
      await refreshProfile();
    } catch (err) {
      setResumeMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setResumeUploading(false);
      // clear input value to allow re-upload of same file if needed
      try { e.currentTarget.value = ''; } catch {};
    }
  };

  const handleResumeDelete = async () => {
    if (!confirm('Delete resume? This cannot be undone.')) return;
    setResumeMessage(null);
    try {
      const form = new FormData();
      form.append('kind', 'resume');
      const url = isAdminView && userId ? `/portal/profile/admin/${userId}/delete` : '/portal/profile/delete';
      const resp = await fetch(url, { method: 'POST', credentials: 'include', body: form });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Delete failed (status ${resp.status})`);
      }
      setResumeMessage('Resume deleted.');
      await refreshProfile();
    } catch (err) {
      setResumeMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMessage(null);
    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Unsupported file type. Upload an image.');
      return;
    }
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append('kind', 'photo');
      form.append('file', file);
      const uploadUrl = isAdminView && userId ? `/portal/profile/admin/${userId}/upload` : '/portal/profile/upload';
      const resp = await fetch(uploadUrl, { method: 'POST', credentials: 'include', body: form });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Upload failed (status ${resp.status})`);
      }
      setPhotoMessage('Photo uploaded.');
      await refreshProfile();
    } catch (err) {
      setPhotoMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPhotoUploading(false);
      try { e.currentTarget.value = ''; } catch {};
    }
  };

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

  const skillList = useMemo(() => {
    if (!profile?.skills) return [] as string[];
    return profile.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }, [profile?.skills]);

  const primaryEmail = candidate?.email ?? user?.email ?? "";

  // --- Minimal recruitment placeholders (step 1) ---
  // UI-only actions and status selector; no backend calls yet.
  const STATUS_OPTIONS = ["Applied", "Interview", "Pending", "Rejected", "Offer", "Hired"] as const;
  const [pendingStatus, setPendingStatus] = useState<string>(candidate?.status ?? "Applied");
  useEffect(() => {
    setPendingStatus(candidate?.status ?? "Applied");
  }, [candidate?.status]);

  const handleSaveStatusPlaceholder = () => {
    if (isAdminView && userId) {
      fetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: pendingStatus }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Status update failed (${r.status})`);
          return r.json();
        })
        .then(() => {
          alert("Status updated.");
        })
        .catch((e) => alert(e instanceof Error ? e.message : "Status update failed"));
    } else {
      alert(`Change status to "${pendingStatus}" — placeholder (not implemented yet).`);
    }
  };
  
  const handleSendInitialEmail = async () => {
    if (!isAdminView || !userId) {
      alert("Send initial email is available in admin view only.");
      return;
    }
    
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/email/initial`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Failed to send email (${resp.status})`);
      }
      
      const result = await resp.json();
      alert(result.message || "Initial email sent successfully.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send initial email");
    }
  };
  
  const handleSendReminderEmail = async () => {
    if (!isAdminView || !userId) {
      alert("Send reminder email is available in admin view only.");
      return;
    }
    
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/email/reminder`, {
        method: "POST", 
        credentials: "include",
      });
      
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Failed to send email (${resp.status})`);
      }
      
      const result = await resp.json();
      alert(result.message || "Reminder email sent successfully.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send reminder email");
    }
  };

  // Offer modal (UI only)
  const [offerOpen, setOfferOpen] = useState<boolean>(false);
  const [offerContractName, setOfferContractName] = useState<string>("Employment_Contract.pdf");
  const [offerSubject, setOfferSubject] = useState<string>("Employment Offer and Contract");
  const defaultGreeting = candidate?.first_name ? `Hi ${candidate.first_name},` : "Hi,";
  const [offerBody, setOfferBody] = useState<string>(
    `${defaultGreeting}\n\nPlease find attached your employment contract. Kindly review, sign, and upload the signed copy via your portal.\n\nThank you.`
  );
  const [offerSending, setOfferSending] = useState<boolean>(false);
  const onOpenOffer = () => {
    if (!isAdminView) {
      alert("Attach contract is available in admin view only (placeholder).");
      return;
    }
    setOfferOpen(true);
  };
  const onSendOffer = () => {
    // No-op for now; simulate send and close
    setOfferSending(true);
    setTimeout(() => {
      setOfferSending(false);
      setOfferOpen(false);
      alert(`Offer sent (placeholder).\nSubject: ${offerSubject}\nAttachment: ${offerContractName}`);
    }, 400);
  };

  // Reference modal (generate link via API; no email send yet)
  const [refOpen, setRefOpen] = useState(false);
  const [refName, setRefName] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refGenerating, setRefGenerating] = useState(false);
  const [refLink, setRefLink] = useState<string | null>(null);
  type RefEntry = {
    token: string;
    referee_name: string;
    referee_email: string;
    status: string; // 'pending' | 'submitted'
    submitted_at?: number | null;
    relationship?: string | null;
    comments?: string | null;
    recommend?: boolean | null;
  };
  const [refList, setRefList] = useState<RefEntry[]>([]);
  const [refListLoading, setRefListLoading] = useState<boolean>(false);
  const [refListError, setRefListError] = useState<string | null>(null);
  const [refModalOpen, setRefModalOpen] = useState<boolean>(false);
  const [refModalEntry, setRefModalEntry] = useState<RefEntry | null>(null);

  const fetchReferences = async () => {
    if (!isAdminView || !userId) return;
    setRefListLoading(true);
    setRefListError(null);
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/references`, { credentials: "include" });
      if (!resp.ok) throw new Error(`Failed to load references (${resp.status})`);
      const json = await resp.json();
      setRefList(Array.isArray(json?.references) ? json.references : []);
    } catch (e) {
      setRefListError(e instanceof Error ? e.message : "Unable to load references");
    } finally {
      setRefListLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminView, userId]);
  const onOpenReference = () => {
    if (!isAdminView) { alert("Reference check is available in admin view only (placeholder)."); return; }
    setRefOpen(true);
    setRefLink(null);
  };
  const onGenerateReference = async () => {
    if (!userId) return;
    if (!refName.trim() || !refEmail.trim()) {
      alert("Enter referee name and email.");
      return;
    }
    setRefGenerating(true);
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/references/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referee_name: refName.trim(), referee_email: refEmail.trim() }),
      });
      if (!resp.ok) throw new Error(`Failed (${resp.status})`);
      const json = await resp.json();
      setRefLink(`${window.location.origin}${json.link}`);
      // refresh list so the new invite shows up
      fetchReferences();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to generate link");
    } finally {
      setRefGenerating(false);
    }
  };

  // Notes (persist for admin via API; otherwise local placeholder)
  const [notesText, setNotesText] = useState<string>("");
  const [interviewNotesText, setInterviewNotesText] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState<boolean>(false);
  const [notesMessage, setNotesMessage] = useState<string | null>(null);
  const handleSaveNotesPlaceholder = (kind: "general" | "interview") => {
    if (isAdminView && userId) {
      const payload = { general_notes: notesText, interview_notes: interviewNotesText };
      setNotesSaving(true);
      setNotesMessage(null);
      fetch(`/api/v1/admin/users/${userId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Save failed (${r.status})`);
          const json = await r.json();
          setNotesText(json.general_notes ?? notesText);
          setInterviewNotesText(json.interview_notes ?? interviewNotesText);
          setNotesMessage("Notes saved.");
        })
        .catch((e) => setNotesMessage(e instanceof Error ? e.message : "Save failed"))
        .finally(() => setNotesSaving(false));
    } else {
      const value = kind === "general" ? notesText : interviewNotesText;
      const label = kind === "general" ? "Notes" : "Interview Notes";
      alert(`${label} saved locally (placeholder). Value length: ${value.trim().length}`);
    }
  };

  // Prefill notes for admin view
  useEffect(() => {
    if (isAdminView && userId) {
      fetch(`/api/v1/admin/users/${userId}/notes`, { credentials: "include" })
        .then(async (r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json) {
            setNotesText(json.general_notes || "");
            setInterviewNotesText(json.interview_notes || "");
          }
        })
        .catch(() => {});
    }
    // only on mount or when profile target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminView, userId]);

  // --- Assessment form shell (UI-only) ---
  const ASSESS_STATUS_OPTIONS = ["Pending", "Rejected", "Offer"] as const;
  const ROLE_OPTIONS = ["Support Worker", "Support Manager"] as const;
  const EMP_TYPE_OPTIONS = ["Casual", "Part Time", "Full Time"] as const;

  const [assessmentDate, setAssessmentDate] = useState<string>("");
  const [assessmentQuestions, setAssessmentQuestions] = useState<string>("");
  const [assessmentNotes, setAssessmentNotes] = useState<string>("");
  const [assessmentStatus, setAssessmentStatus] = useState<string>("Pending");
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [offerRole, setOfferRole] = useState<string>("");
  const [offerEmpType, setOfferEmpType] = useState<string>("");
  const [offerSalarySlab, setOfferSalarySlab] = useState<string>("");
  const [assessmentErrors, setAssessmentErrors] = useState<Record<string, string>>({});
  const [assessmentSaving, setAssessmentSaving] = useState<boolean>(false);
  const [assessmentMessage, setAssessmentMessage] = useState<string | null>(null);

  const handleAssessmentSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const errs: Record<string, string> = {};
    if (!assessmentDate) errs.date = "Assessment Date is required";
    // Questions/Notes not required by spec; can be empty
    if (assessmentStatus === "Rejected" && !rejectionNotes.trim()) {
      errs.rejectionNotes = "Rejection Notes are required when status is Rejected";
    }
    if (assessmentStatus === "Offer") {
      if (!offerRole) errs.role = "Role is required when status is Offer";
      if (!offerEmpType) errs.empType = "Employment Type is required when status is Offer";
      if (!offerSalarySlab.trim()) errs.salary = "Salary Slab is required when status is Offer";
    }
    setAssessmentErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (isAdminView && userId) {
      setAssessmentSaving(true);
      setAssessmentMessage(null);
      const payload = {
        assessment_date: assessmentDate,
        interview_questions: assessmentQuestions,
        notes: assessmentNotes,
        status: assessmentStatus,
        rejection_notes: assessmentStatus === "Rejected" ? rejectionNotes : undefined,
        role: assessmentStatus === "Offer" ? offerRole : undefined,
        employment_type: assessmentStatus === "Offer" ? offerEmpType : undefined,
        salary_slab: assessmentStatus === "Offer" ? offerSalarySlab : undefined,
      };
      fetch(`/api/v1/admin/users/${userId}/assessment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`Assessment save failed (${r.status})`);
          return r.json();
        })
        .then(() => setAssessmentMessage("Assessment saved."))
        .catch((e) => setAssessmentMessage(e instanceof Error ? e.message : "Save failed"))
        .finally(() => setAssessmentSaving(false));
    } else {
      alert(
        `Assessment submitted — placeholder.\nDate: ${assessmentDate}\nStatus: ${assessmentStatus}\nQuestions length: ${assessmentQuestions.trim().length}\nNotes length: ${assessmentNotes.trim().length}`
      );
    }
  };

  // Prefill assessment for admin view
  useEffect(() => {
    if (isAdminView && userId) {
      fetch(`/api/v1/admin/users/${userId}/assessment`, { credentials: "include" })
        .then(async (r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!json) return;
          setAssessmentDate(json.assessment_date || "");
          setAssessmentQuestions(json.interview_questions || "");
          setAssessmentNotes(json.notes || "");
          setAssessmentStatus(json.status || "Pending");
          setRejectionNotes(json.rejection_notes || "");
          setOfferRole(json.role || "");
          setOfferEmpType(json.employment_type || "");
          setOfferSalarySlab(json.salary_slab || "");
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminView, userId]);

  if (loading) {
    return (
      <div className="bg-[#f7f8fa] min-h-screen p-6 text-gray-600">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#f7f8fa] min-h-screen p-6 text-gray-700">
        <div className="max-w-3xl mx-auto space-y-3">
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
    );
  }

  if (isAdminView && !candidate) {
    return (
      <div className="bg-[#f7f8fa] min-h-screen p-6 text-gray-700">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="bg-white border border-yellow-200 text-yellow-700 rounded-md px-4 py-3">
            No candidate profile is linked to this user yet.
          </div>
          <div className="text-sm text-gray-500">
            Link a candidate record in the admin portal and refresh this page afterwards.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      <NavigationBar />
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto mb-2">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:underline"
            aria-label="Go back"
          >
            Back
          </button>
        </div>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div>
              {profile?.photo_path ? (
                <img
                  src={`/${profile.photo_path}`}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-lg">
                  {(fullName ?? "P").charAt(0).toUpperCase() || "P"}
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-lg">{fullName}</div>
              <div className="text-sm text-gray-500">{candidate?.job_title || "Role not set"}</div>
            </div>
          </div>
          {/* (Photo upload moved into Settings tab right column) */}
          <div className="flex gap-2">
            <button
              className="bg-gray-200 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm"
              disabled={!primaryEmail}
              onClick={() => {
                if (primaryEmail) {
                  window.location.href = `mailto:${primaryEmail}`;
                }
              }}
            >
              {isAdminView ? "Email Candidate" : "Send Email"}
            </button>
            {profile?.resume_path ? (
              <a
                href={`/${profile.resume_path}`}
                className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Resume
              </a>
            ) : null}
            
          </div>
        </div>
        

        {/* Simple progress */}
        <div>
          <div className="w-full bg-gray-200 h-2 rounded">
            <div className="bg-gray-500 h-2 rounded" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Profile completion</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Manager Actions — placeholders only for now */}
        <div className="bg-white rounded-md shadow p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-1">Actions:</span>
            <button
              type="button"
              className="bg-gray-100 border border-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm hover:bg-gray-200"
              onClick={handleSendInitialEmail}
            >
              Send initial email
            </button>
            <button
              type="button"
              className="bg-gray-100 border border-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm hover:bg-gray-200"
              onClick={handleSendReminderEmail}
            >
              Send reminder
            </button>
            <button
              type="button"
              className="bg-gray-100 border border-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm hover:bg-gray-200"
              onClick={onOpenReference}
            >
              Send reference check
            </button>
            <button
              type="button"
              className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700"
              onClick={onOpenOffer}
            >
              Attach contract
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status</label>
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
              onClick={handleSaveStatusPlaceholder}
            >
              Save
            </button>
          </div>
        </div>

        {/* Tab navigation replicates the original mock; panels will evolve as functionality lands. */}
        <div className="bg-white rounded-md shadow-sm flex items-center px-2 py-1">
          {TAB_ITEMS.map((tab) => {
            const isActive = tab.id === "overview"; // Since this is the overview page, highlight the Overview tab
            const basePath = profileId ? `/portal/profile/admin/${profileId}` : "/portal/profile";
            const tabPath = tab.id === "overview" ? basePath : `${basePath}/${tab.id}`;
            return (
              <Link
                key={tab.id}
                to={tabPath}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? "border-gray-700 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {selectedTab === "overview" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white rounded-md p-5 shadow">
                  <div className="text-sm uppercase tracking-wide text-gray-400 mb-3">Quick Snapshot</div>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <div className="font-semibold text-gray-600">Status</div>
                      <div>{candidate?.status ?? "Not available"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Applied on</div>
                      <div>{formatDate(candidate?.applied_on)}</div>
                    </div>

                    {/* Offer Modal (UI only) */}
                    {offerOpen ? (
                      <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => (!offerSending ? setOfferOpen(false) : null)} />
                        <div className="relative bg-white rounded-md shadow-lg w-full max-w-lg mx-4 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">Attach Contract (placeholder)</h3>
                            <button
                              className="text-gray-500 hover:text-gray-700"
                              onClick={() => (!offerSending ? setOfferOpen(false) : null)}
                              aria-label="Close"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <label className="block text-gray-700 mb-1">Attachment name</label>
                              <input
                                value={offerContractName}
                                onChange={(e) => setOfferContractName(e.target.value)}
                                className="w-full rounded border border-gray-300 p-2"
                              />
                              <div className="text-xs text-gray-500 mt-1">This is a dummy filename — no file will be sent yet.</div>
                            </div>
                            <div>
                              <label className="block text-gray-700 mb-1">Email subject</label>
                              <input
                                value={offerSubject}
                                onChange={(e) => setOfferSubject(e.target.value)}
                                className="w-full rounded border border-gray-300 p-2"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-700 mb-1">Email message</label>
                              <textarea
                                rows={5}
                                value={offerBody}
                                onChange={(e) => setOfferBody(e.target.value)}
                                className="w-full rounded border border-gray-300 p-2"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={offerSending}
                              onClick={() => setOfferOpen(false)}
                              className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-60"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={offerSending}
                              onClick={onSendOffer}
                              className="px-4 py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-60"
                            >
                              {offerSending ? "Sending…" : "Send"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Reference Modal (link generation only) */}
                    {refOpen ? (
                      <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => (!refGenerating ? setRefOpen(false) : null)} />
                        <div className="relative bg-white rounded-md shadow-lg w-full max-w-lg mx-4 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">Reference Check (placeholder)</h3>
                            <button className="text-gray-500 hover:text-gray-700" onClick={() => (!refGenerating ? setRefOpen(false) : null)} aria-label="Close">✕</button>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-gray-700 mb-1">Referee name</label>
                                <input value={refName} onChange={(e) => setRefName(e.target.value)} className="w-full rounded border border-gray-300 p-2" />
                              </div>
                              <div>
                                <label className="block text-gray-700 mb-1">Referee email</label>
                                <input value={refEmail} onChange={(e) => setRefEmail(e.target.value)} className="w-full rounded border border-gray-300 p-2" />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" disabled={refGenerating} onClick={() => setRefOpen(false)} className="px-3 py-2 border border-gray-300 rounded text-sm disabled:opacity-60">Close</button>
                              <button type="button" disabled={refGenerating} onClick={onGenerateReference} className="px-4 py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-60">{refGenerating ? "Generating…" : "Generate Link"}</button>
                            </div>
                            {refLink ? (
                              <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 text-xs break-all">
                                <div className="text-gray-600 mb-1">Share this link with the referee:</div>
                                <a className="text-blue-600 hover:underline" href={refLink} target="_blank" rel="noopener noreferrer">{refLink}</a>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="font-semibold text-gray-600">Email</div>
                      <div>{primaryEmail || "Not provided"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Phone</div>
                      <div>{candidate?.mobile?.trim() || "Not provided"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-600">Location</div>
                      <div>{candidate?.address?.trim() || profile?.address?.trim() || "Not provided"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-md p-5 shadow">
                  <div className="font-medium text-gray-700 mb-2">Additional Links</div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {profile?.linkedin ? (
                      <a
                        className="text-blue-600 hover:underline"
                        href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn Profile
                      </a>
                    ) : (
                      <span className="text-gray-400">LinkedIn not provided.</span>
                    )}
                  </div>
                </div>

                {isAdminView ? (
                  <div className="bg-white rounded-md p-5 shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-800">References</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchReferences}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                    {refListLoading ? (
                      <div className="text-sm text-gray-500">Loading…</div>
                    ) : refListError ? (
                      <div className="text-sm text-red-600">{refListError}</div>
                    ) : refList.length === 0 ? (
                      <div className="text-sm text-gray-500">No references yet. Use "Send reference check" above to generate a link.</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {refList.map((r) => {
                          const publicLink = `${window.location.origin}/reference/${r.token}`;
                          const submitted = r.status === "submitted";
                          const comments = (r.comments ?? "").toString();
                          const previewLimit = 200;
                          const isTruncated = comments.length > previewLimit;
                          const previewText = isTruncated ? comments.slice(0, previewLimit) + "…" : comments;
                          return (
                            <li key={r.token} className="py-2 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-800">
                                  <span className="font-medium">{r.referee_name || "Referee"}</span>
                                  <span className="text-gray-500"> {r.referee_email ? `(${r.referee_email})` : ""}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded ${submitted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                    {submitted ? "Submitted" : "Pending"}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs text-red-600 hover:underline"
                                    onClick={async () => {
                                      if (!userId) return;
                                      if (!confirm("Remove this reference? This cannot be undone.")) return;
                                      try {
                                        const resp = await fetch(`/api/v1/admin/users/${userId}/references/${r.token}`, { method: "DELETE", credentials: "include" });
                                        if (!resp.ok) throw new Error(`Delete failed (${resp.status})`);
                                        fetchReferences();
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Unable to remove reference");
                                      }
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  className="text-blue-600 hover:underline"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(publicLink);
                                      alert("Link copied to clipboard.");
                                    } catch {
                                      window.prompt("Copy link:", publicLink);
                                    }
                                  }}
                                >
                                  Copy link
                                </button>
                                <a className="text-blue-600 hover:underline" href={publicLink} target="_blank" rel="noopener noreferrer">Open</a>
                                {submitted ? (
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:underline"
                                    onClick={() => { setRefModalEntry(r); setRefModalOpen(true); }}
                                  >
                                    View
                                  </button>
                                ) : null}
                                {submitted && (r.relationship || r.comments || typeof r.recommend === "boolean") ? (
                                  <span className="text-gray-500">|
                                    <span className="ml-2">{r.relationship || "Relationship N/A"}</span>
                                    <span className="ml-2">{typeof r.recommend === "boolean" ? (r.recommend ? "Recommends" : "Does not recommend") : ""}</span>
                                  </span>
                                ) : null}
                              </div>
                              {submitted && comments ? (
                                <div className="text-xs text-gray-600 whitespace-pre-wrap break-words break-all">
                                  {previewText}
                                  {isTruncated ? (
                                    <>
                                      {" "}
                                      <button
                                        type="button"
                                        className="text-blue-600 hover:underline"
                                        onClick={() => { setRefModalEntry(r); setRefModalOpen(true); }}
                                      >
                                        View full
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-md p-5 shadow">
                  <div className="font-semibold text-gray-800 text-lg mb-2">Summary</div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {profile?.summary?.trim() || "No summary added yet."}
                  </p>
                </div>

                <div className="bg-white rounded-md p-5 shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-800">Skills</div>
                      <div className="text-xs text-gray-500">Top strengths & focus areas</div>
                    </div>
                  </div>
                  {skillList.length ? (
                    <div className="flex flex-wrap gap-2">
                      {skillList.map((skill) => (
                        <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No skills captured yet.</div>
                  )}
                </div>

                <div className="bg-white rounded-md p-5 shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 text-sm">Work availability</span>
                    <span className="text-xs text-gray-500">Manage availability in the admin portal.</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Availability details are not tracked yet.
                  </div>
                </div>
              </div>
            </div>

            {/* Notes + Interview Notes (placeholders) */}
            <div className="bg-white rounded-md p-5 shadow">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">Notes</div>
                    <span className="text-xs text-gray-500">General remarks</span>
                  </div>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={6}
                    placeholder="Type general notes here (not saved yet)"
                    className="w-full rounded border border-gray-300 p-2 text-sm"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    {notesMessage ? (
                      <div className="text-xs text-gray-600">{notesMessage}</div>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => handleSaveNotesPlaceholder("general")}
                      disabled={notesSaving}
                      className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 disabled:opacity-60"
                    >
                      {notesSaving ? "Saving…" : "Save Notes"}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">Interview Notes</div>
                    <span className="text-xs text-gray-500">During interviews</span>
                  </div>
                  <textarea
                    value={interviewNotesText}
                    onChange={(e) => setInterviewNotesText(e.target.value)}
                    rows={6}
                    placeholder="Type interview notes here (not saved yet)"
                    className="w-full rounded border border-gray-300 p-2 text-sm"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveNotesPlaceholder("interview")}
                      disabled={notesSaving}
                      className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 disabled:opacity-60"
                    >
                      {notesSaving ? "Saving…" : "Save Interview Notes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment (UI only) */}
            <div className="bg-white rounded-md p-5 shadow">
              <div className="mb-3">
                <div className="font-semibold text-gray-800 text-lg">Assessment</div>
                <div className="text-xs text-gray-500">Starts after reference verification. Validation is client-side only.</div>
              </div>
              <form onSubmit={handleAssessmentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assessment Date</label>
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                  />
                  {assessmentErrors.date ? (
                    <div className="text-xs text-red-600 mt-1">{assessmentErrors.date}</div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={assessmentStatus}
                    onChange={(e) => setAssessmentStatus(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                  >
                    {ASSESS_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Interview Questions</label>
                  <textarea
                    rows={3}
                    value={assessmentQuestions}
                    onChange={(e) => setAssessmentQuestions(e.target.value)}
                    placeholder="Enter questions or paste your interview script"
                    className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    placeholder="General assessment notes"
                    className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>

                {assessmentStatus === "Rejected" ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Rejection Notes <span className="text-red-600">*</span></label>
                    <textarea
                      rows={3}
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="Explain why the application was rejected"
                      className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                    />
                    {assessmentErrors.rejectionNotes ? (
                      <div className="text-xs text-red-600 mt-1">{assessmentErrors.rejectionNotes}</div>
                    ) : null}
                  </div>
                ) : null}

                {assessmentStatus === "Offer" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role <span className="text-red-600">*</span></label>
                      <select
                        value={offerRole}
                        onChange={(e) => setOfferRole(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      >
                        <option value="">Select a role</option>
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {assessmentErrors.role ? (
                        <div className="text-xs text-red-600 mt-1">{assessmentErrors.role}</div>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employment Type <span className="text-red-600">*</span></label>
                      <select
                        value={offerEmpType}
                        onChange={(e) => setOfferEmpType(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      >
                        <option value="">Select type</option>
                        {EMP_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {assessmentErrors.empType ? (
                        <div className="text-xs text-red-600 mt-1">{assessmentErrors.empType}</div>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Salary Slab <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={offerSalarySlab}
                        onChange={(e) => setOfferSalarySlab(e.target.value)}
                        placeholder="e.g., Level 2.1, Award X, or custom details"
                        className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                      />
                      {assessmentErrors.salary ? (
                        <div className="text-xs text-red-600 mt-1">{assessmentErrors.salary}</div>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <div className="md:col-span-2 flex justify-between items-center gap-2">
                  {assessmentMessage ? (
                    <div className="text-xs text-gray-600">{assessmentMessage}</div>
                  ) : <span />}
                  <button
                    type="button"
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                    onClick={() => {
                      setAssessmentDate("");
                      setAssessmentQuestions("");
                      setAssessmentNotes("");
                      setAssessmentStatus("Pending");
                      setRejectionNotes("");
                      setOfferRole("");
                      setOfferEmpType("");
                      setOfferSalarySlab("");
                      setAssessmentErrors({});
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={assessmentSaving}
                    className="px-4 py-2 bg-gray-900 text-white rounded text-sm disabled:opacity-60"
                  >
                    {assessmentSaving ? "Saving…" : "Submit Assessment"}
                  </button>
                </div>
              </form>
            </div>

            {/* Induction Checklist (UI + upload via documents API) */}
            <div className="bg-white rounded-md p-5 shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-800 text-lg">Induction Checklist</div>
                  <div className="text-xs text-gray-500">Send a link and collect signed checklist. Upload uses the documents API.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm"
                    onClick={() => {
                      if (!isAdminView) { alert("Send link is for admin view only (placeholder). "); return; }
                      alert("Induction checklist link sent (placeholder). No email dispatched yet.");
                    }}
                  >
                    Send checklist link
                  </button>
                </div>
              </div>

              {/* Upload signed checklist */}
              <InductionUpload userId={userId} isAdminView={isAdminView} />
            </div>

            <div className="bg-white rounded-md p-5 shadow">
              <div className="font-semibold text-gray-800 mb-2">Documents</div>
              <div className="text-sm text-gray-600">
                {profile?.resume_path ? (
                  <div>
                    <span>Resume stored at </span>
                    <a
                      className="text-blue-600 hover:underline"
                      href={`/${profile.resume_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {profile.resume_path.split("/").pop()}
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400">No resume uploaded yet.</span>
                )}
              </div>
            </div>

            {/* Reference details modal (shown when clicking View in References) */}
            {refModalOpen && (
              <RefModal open={refModalOpen} onClose={() => setRefModalOpen(false)} entry={refModalEntry} />
            )}
          </>
        ) : selectedTab === "documents" ? (
          <div className="bg-white rounded-md p-6 shadow text-sm text-gray-700">
            <div className="mb-3 font-semibold text-gray-800">Documents</div>
            <div className="mb-4">
              {profile?.resume_path ? (
                <div>
                  <a className="text-blue-600 hover:underline" href={`/${profile.resume_path}`} target="_blank" rel="noopener noreferrer">Download resume</a>
                  <button onClick={handleResumeDelete} className="ml-3 text-sm text-red-600 hover:underline">Delete</button>
                </div>
              ) : (
                <div className="text-gray-500">No resume uploaded yet.</div>
              )}
            </div>
            <div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={resumeUploading}
                  className="bg-gray-100 border border-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-200 disabled:opacity-60"
                >
                  Upload File
                </button>
                <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: 'none' }} />
                {resumeMessage ? <div className="text-sm text-gray-600">{resumeMessage}</div> : null}
              </div>
            </div>
          </div>
        ) : selectedTab === "settings" ? (
          <div className="bg-white rounded-md p-6 shadow">
            <h3 className="font-semibold text-gray-800 mb-3">Edit profile</h3>
            {isAdminView ? (
              // Admin inline editor: allow admins to edit and save another user's profile in-place
              <form onSubmit={handleAdminSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                {settingsMessage ? (
                  <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{settingsMessage}</div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                  <input
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                  <input
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>

                {/* Photo upload for both admin and regular settings */}
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-100 rounded-md p-4 text-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => photoInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') photoInputRef.current?.click(); }}
                      className="w-32 h-32 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer border border-gray-200"
                    >
                      {photoUploading ? (
                        <div className="text-sm text-gray-600">Uploading…</div>
                      ) : profile?.photo_path ? (
                        <img src={`/${profile.photo_path}`} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-400 text-sm">Profile picture</div>
                      )}
                    </div>
                    <div className="mt-3">
                      <button type="button" onClick={() => photoInputRef.current?.click()} className="rounded-md bg-gray-100 px-3 py-2 text-sm">Browse</button>
                      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </div>
                    {photoMessage ? <div className="text-sm text-gray-600 mt-2">{photoMessage}</div> : null}
                  </div>
                </div>

                {/* Admin: change password fields (submitted together with admin save) */}
                {passwordMessage ? (
                  <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{passwordMessage}</div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="lg:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={settingsSaving || passwordSaving}
                    className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {settingsSaving || passwordSaving ? "Saving..." : "Save (admin)"}
                  </button>
                </div>
              </form>
            ) : (
               <form onSubmit={handleSettingsSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                {settingsMessage ? (
                  <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{settingsMessage}</div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                  <input
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                  <input
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-100 rounded-md p-4 text-center">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => photoInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') photoInputRef.current?.click(); }}
                      className="w-32 h-32 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer border border-gray-200"
                    >
                      {photoUploading ? (
                        <div className="text-sm text-gray-600">Uploading…</div>
                      ) : profile?.photo_path ? (
                        <img src={`/${profile.photo_path}`} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-400 text-sm">Profile picture</div>
                      )}
                    </div>
                    <div className="mt-3">
                      <button type="button" onClick={() => photoInputRef.current?.click()} className="rounded-md bg-gray-100 px-3 py-2 text-sm">Browse</button>
                      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </div>
                    {photoMessage ? <div className="text-sm text-gray-600 mt-2">{photoMessage}</div> : null}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {settingsSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
           <div className="bg-white rounded-md p-10 text-center shadow text-gray-500 text-sm">
            {/* Forms tab */}
            <div className="mb-4">
              <div className="text-sm text-gray-700 font-medium mb-2">Select form category</div>
              <div className="flex items-center gap-3">
                <select
                  value={formsCategory}
                  onChange={(e) => setFormsCategory(e.target.value as FormsCategory)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {FORM_CATEGORIES.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setFormsList((prev) => prev)}
                  className="rounded-md bg-gray-800 text-white px-3 py-2 text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="text-left">
              <div className="font-semibold mb-2">{formsCategory} forms</div>
              {formsList.length ? (
                <>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {formsList.map((f) => (
                      <li key={f} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                        <span>{f}</span>
                        <button className="text-sm text-blue-600">Open</button>
                      </li>
                    ))}
                  </ul>
                  {/* RefModal is rendered once below in the Overview section */}
                </>
              ) : (
                <div className="text-sm text-gray-400">No forms in this category.</div>
              )}
            </div>
           </div>
         )}
       </div>
      </div>
     </div>
   );
 };

 export default ApplicantProfile;

// Light inner component to keep the file tidy
function InductionUpload({ userId, isAdminView }: { userId?: string; isAdminView: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ name: string; path: string; is_dir: boolean }>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const FOLDER = "Induction";

  const refresh = () => {
    if (!isAdminView || !userId) return;
    fetch(`/api/v1/admin/users/${userId}/documents`, { credentials: "include" })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((list) => {
        const onlyInduction = (Array.isArray(list) ? list : []).filter(
          (it) => typeof it.path === "string" && it.path.toLowerCase().includes(`/docs/${FOLDER.toLowerCase()}`)
        );
        setItems(onlyInduction);
      })
      .catch(() => {});
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdminView, userId]);

  const onUpload = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!isAdminView || !userId) { alert("Upload is only available in admin view."); return; }
    setMessage(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", FOLDER);
      const resp = await fetch(`/api/v1/admin/users/${userId}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Upload failed (${resp.status})`);
      }
      setMessage("Uploaded.");
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      try { if (inputRef.current) inputRef.current.value = ""; } catch {}
    }
  };

  return (
    <div className="text-sm text-gray-700">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!isAdminView || uploading}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload signed checklist"}
        </button>
        <input ref={inputRef} type="file" onChange={onUpload} style={{ display: "none" }} />
        {message ? <div className="text-xs text-gray-600">{message}</div> : null}
      </div>
      <div className="mt-3">
        {items.length ? (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.path} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                <span className="truncate mr-3">{it.name}</span>
                <a
                  className="text-blue-600 text-xs hover:underline"
                  href={`/${it.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-sm">No checklist uploaded yet.</div>
        )}
      </div>
    </div>
  );
}

// Simple modal to display full reference text
function RefModal({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: any }) {
  if (!open || !entry) return null;
  const submittedAt = entry.submitted_at ? new Date(entry.submitted_at * 1000).toLocaleString() : null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded shadow-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-800">Reference details</div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
          </div>
          <div className="p-4 text-sm text-gray-800 space-y-2">
            <div><span className="text-gray-500">Referee:</span> {entry.referee_name || '—'} ({entry.referee_email || '—'})</div>
            <div><span className="text-gray-500">Status:</span> {entry.status || '—'} {submittedAt ? `· ${submittedAt}` : ''}</div>
            <div><span className="text-gray-500">Relationship:</span> {entry.relationship || '—'}</div>
            <div><span className="text-gray-500">Recommendation:</span> {typeof entry.recommend === 'boolean' ? (entry.recommend ? 'Recommends' : 'Does not recommend') : '—'}</div>
            <div>
              <div className="text-gray-500 mb-1">Comments</div>
              <div className="max-h-80 overflow-auto whitespace-pre-wrap break-words break-all border rounded p-3 bg-gray-50 text-gray-700">
                {entry.comments || '—'}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t flex justify-end gap-2">
            <button className="px-3 py-1.5 border rounded" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
