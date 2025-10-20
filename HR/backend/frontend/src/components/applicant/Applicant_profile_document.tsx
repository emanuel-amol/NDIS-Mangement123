import React, { useRef, useState, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import NavigationBar from "../navigation/NavigationBar";
import { useProfileData, TAB_ITEMS, computeProgress } from "./profileUtils";

const ApplicantProfileDocument: React.FC = () => {
  const { userId, id } = useParams<{ userId?: string; id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const qUserId = new URLSearchParams(location.search).get("userId") || undefined;
  const profileId = userId || id || qUserId;
  const isAdminView = Boolean(profileId);
  
  const { data, loading, error, refreshProfile } = useProfileData(profileId);
  
  // Upload state
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null); // Resume upload input
  const genericFileInputRef = useRef<HTMLInputElement | null>(null); // Generic docs upload input
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [docsMessage, setDocsMessage] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolder, setParentFolder] = useState<string>("");
  const [uploadFolder, setUploadFolder] = useState<string>("");
  const [documents, setDocuments] = useState<Array<{name: string; path: string; is_dir: boolean; size: number; modified: number}>>([]);

  const candidate = data?.candidate ?? null;
  const profile = data?.profile ?? null;
  const user = data?.user ?? null;

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
  const uploadUrl = isAdminView && profileId ? `/portal/profile/admin/${profileId}/upload` : '/portal/profile/upload';
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
      try { e.currentTarget.value = ''; } catch {};
    }
  };

  const handleResumeDelete = async () => {
    if (!confirm('Delete resume? This cannot be undone.')) return;
    setResumeMessage(null);
    try {
  const form = new FormData();
      form.append('kind', 'resume');
  const url = isAdminView && profileId ? `/portal/profile/admin/${profileId}/delete` : '/portal/profile/delete';
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
  const uploadUrl = isAdminView && profileId ? `/portal/profile/admin/${profileId}/upload` : '/portal/profile/upload';
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
  const fetchDocuments = async () => {
    if (!isAdminView || !profileId) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${profileId}/documents`, { credentials: 'include' });
      if (!resp.ok) return;
      const json = await resp.json();
      setDocuments(Array.isArray(json) ? json : []);
    } catch {}
  };

  const handleGenericUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdminView || !profileId) return;
    setDocsMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (uploadFolder.trim()) form.append('folder', uploadFolder.trim());
      const resp = await fetch(`/api/v1/admin/users/${profileId}/documents/upload`, {
        method: 'POST', credentials: 'include', body: form
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Upload failed (status ${resp.status})`);
      }
      setDocsMessage('File uploaded.');
      await fetchDocuments();
    } catch (err) {
      setDocsMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      try { e.currentTarget.value = ''; } catch {}
    }
  };

  const handleCreateFolder = async () => {
    if (!isAdminView || !profileId || !newFolderName.trim()) return;
    setDocsMessage(null);
    try {
  const form = new FormData();
  form.append('name', newFolderName.trim());
  if (parentFolder.trim()) form.append('parent', parentFolder.trim());
      const resp = await fetch(`/api/v1/admin/users/${profileId}/documents/folders`, { method: 'POST', credentials: 'include', body: form });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Create folder failed (status ${resp.status})`);
      }
      setNewFolderName("");
      setDocsMessage('Folder created.');
      await fetchDocuments();
    } catch (err) {
      setDocsMessage(err instanceof Error ? err.message : 'Create folder failed');
    }
  };

  const handleDeleteDoc = async (path: string) => {
    if (!isAdminView || !profileId) return;
    if (!confirm('Delete this item?')) return;
    try {
      const url = new URL(`/api/v1/admin/users/${profileId}/documents`, window.location.origin);
      url.searchParams.set('path', path);
      const resp = await fetch(url.toString(), { method: 'DELETE', credentials: 'include' });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Delete failed (status ${resp.status})`);
      }
      await fetchDocuments();
    } catch (err) {
      setDocsMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  React.useEffect(() => { fetchDocuments(); }, [profileId]);

  const handlePhotoDelete = async () => {
    if (!confirm('Delete photo? This cannot be undone.')) return;
    setPhotoMessage(null);
    try {
      const form = new FormData();
      form.append('kind', 'photo');
      const url = isAdminView && profileId ? `/portal/profile/admin/${profileId}/delete` : '/portal/profile/delete';
      const resp = await fetch(url, { method: 'POST', credentials: 'include', body: form });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Delete failed (status ${resp.status})`);
      }
      setPhotoMessage('Photo deleted.');
      await refreshProfile();
    } catch (err) {
      setPhotoMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f7f8fa]">
        <NavigationBar />
        <div className="flex-1 p-6 text-gray-600">
          <div className="max-w-6xl mx-auto">
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
          {/* Profile Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div>
                {profile?.photo_path ? (
                  <img
                    src={`/${profile.photo_path}`}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold border border-gray-300">
                    {fullName.charAt(0).toUpperCase() || "P"}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{fullName}</h1>
                <p className="text-sm text-gray-500">{candidate?.job_title || "Profile Details"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-200 text-sm">
                Send Email
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div className="bg-gray-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Progress Indicator</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-md shadow-sm flex items-center px-2 py-1">
            {TAB_ITEMS.map((tab) => {
              const isActive = tab.id === "documents";
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

          {/* Documents Content */}
          <div className="bg-white rounded-md p-6 shadow text-sm text-gray-700">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Documents Dashboard</h2>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    value={parentFolder}
                    onChange={(e) => setParentFolder(e.target.value)}
                    placeholder="Parent folder (optional)"
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                  >
                    + Create Folder
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    placeholder="Upload to folder (optional)"
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <input ref={genericFileInputRef} type="file" onChange={handleGenericUpload} className="hidden" />
                  <button
                    onClick={() => genericFileInputRef.current?.click()}
                    className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                  >
                    Upload File
                  </button>
                </div>
              </div>
              {docsMessage && (
                <div className={`mb-2 text-sm ${docsMessage.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{docsMessage}</div>
              )}
            </div>

            {/* Resume Section */}
            <div className="mb-6">
              <div className="mb-3 font-semibold text-gray-800">Resume</div>
              {profile?.resume_path ? (
                <div className="space-y-2">
                  <div>
                    <a className="text-blue-600 hover:underline" href={`/${profile.resume_path}`} target="_blank" rel="noopener noreferrer">
                      Download resume
                    </a>
                    <button onClick={handleResumeDelete} className="ml-3 text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No resume uploaded</div>
              )}
              
              {resumeMessage && (
                <div className={`mt-2 text-sm ${resumeMessage.includes('failed') || resumeMessage.includes('Unsupported') ? 'text-red-600' : 'text-green-600'}`}>
                  {resumeMessage}
                </div>
              )}
              
              <div className="mt-3">
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="hidden"
                />
                <button
                  onClick={() => docInputRef.current?.click()}
                  disabled={resumeUploading}
                  className="text-sm bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {resumeUploading ? 'Uploading...' : 'Upload Resume'}
                </button>
              </div>
            </div>

            {/* Photo Section */}
            <div className="mb-6">
              <div className="mb-3 font-semibold text-gray-800">Profile Photo</div>
              {profile?.photo_path ? (
                <div className="space-y-2">
                  <div>
                    <img
                      src={`/${profile.photo_path}`}
                      alt="Profile"
                      className="w-24 h-24 rounded object-cover border border-gray-300"
                    />
                  </div>
                  <div>
                    <button onClick={handlePhotoDelete} className="text-sm text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No photo uploaded</div>
              )}
              
              {photoMessage && (
                <div className={`mt-2 text-sm ${photoMessage.includes('failed') || photoMessage.includes('Unsupported') ? 'text-red-600' : 'text-green-600'}`}>
                  {photoMessage}
                </div>
              )}
              
              <div className="mt-3">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="text-sm bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="mt-6">
              <div className="text-sm text-gray-800 font-medium mb-2">Files & Folders</div>
              {documents.length === 0 ? (
                <div className="text-gray-500 text-sm">No documents yet.</div>
              ) : (
                <div className="border border-gray-200 rounded-md divide-y">
                  {documents.map((d) => (
                    <div key={`${d.path}`} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${d.is_dir ? 'bg-gray-400' : 'bg-gray-600'}`} />
                        {d.is_dir ? (
                          <span className="text-gray-800">{d.name}</span>
                        ) : (
                          <a className="text-blue-600 hover:underline" href={`/${d.path}`} target="_blank" rel="noopener noreferrer">
                            {d.name}
                          </a>
                        )}
                        {!d.is_dir && (
                          <span className="text-gray-400">({Math.ceil(d.size/1024)} KB)</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteDoc(d.path)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantProfileDocument;