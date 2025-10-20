import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";

// useRef for file input, useState for form state
type FormState = { // form state structure
  firstName: string; // first name
  lastName: string; // last name
  appliedOn: string; // application date
  jobTitle: string; // job title
  email: string;  // email address
  phoneNumber: string;  // phone number
  // Address fields
  streetAddress: string;
  suburb: string; // suburb
  state: string;
  postalCode: string;
  summary: string; // profile summary
  skills: string; // skills
  linkedin: string; // linkedin url
  // Additional settings-like fields
  dateOfBirth: string;
  gender: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  quickSnapshot: string;
  maxHours: string;
  keyStrengths: string;
};

// Initialize form state with empty strings
const createInitialFormState = (): FormState => ({
  firstName: "",
  lastName: "",
  appliedOn: "",
  jobTitle: "",
  email: "",
  phoneNumber: "",
  streetAddress: "",
  suburb: "",
  state: "",
  postalCode: "",
  summary: "",
  skills: "",
  linkedin: "",
  dateOfBirth: "",
  gender: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  quickSnapshot: "",
  maxHours: "",
  keyStrengths: "",
});

// Main intake form component
function IntakeForm() { // main component
  const fileInputRef = useRef<HTMLInputElement>(null); // ref for file input
  const [formData, setFormData] = useState<FormState>(() => createInitialFormState());  // form data state
  const [isSubmitting, setIsSubmitting] = useState(false);  // submission state
  const [error, setError] = useState<string | null>(null);  // error message state
  const [success, setSuccess] = useState<string | null>(null);  // success message state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);  // selected file name state
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // keep actual file for submission

  // Handle input changes and update form state
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { // handle input changes
    const { name, value } = event.target; // get name and value
    setFormData((previous) => ({  // update form data
      ...previous, // keep previous data
      [name]: value,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { // handle file selection
    const file = event.target.files?.[0];  // get the first selected file
    setSelectedFileName(file ? file.name : null); // update selected file name
    setSelectedFile(file ?? null); // store file
  };

  const resetForm = () => { // reset form to initial state
    setFormData(createInitialFormState()); // reset form data
    setSelectedFileName(null);  // clear selected file name
    if (fileInputRef.current) { // clear file input value
      fileInputRef.current.value = "";  // reset file input
    }
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // prevent default form submission
    setError(null);
    setSuccess(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) { // validate names
      setError("First and last name are required.");  // set error if missing
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required."); // validate email
      return;
    }

    setIsSubmitting(true);

    // Always submit as multipart/form-data so an optional resume can be included.
    // Backend supports both JSON and form; using form ensures resume upload works.
    const form = new FormData();
    form.set("first_name", formData.firstName.trim());
    form.set("last_name", formData.lastName.trim());
    form.set("email", formData.email.trim());
    if (formData.phoneNumber.trim()) form.set("mobile", formData.phoneNumber.trim());
    if (formData.jobTitle.trim()) form.set("job_title", formData.jobTitle.trim());
    // Address parts (backend composes profile.address)
    if (formData.streetAddress.trim()) form.set("street_address", formData.streetAddress.trim());
    if (formData.suburb.trim()) form.set("suburb", formData.suburb.trim());
    if (formData.state.trim()) form.set("state", formData.state.trim());
    if (formData.postalCode.trim()) form.set("postal_code", formData.postalCode.trim());
    // Profile fields
    if (formData.summary.trim()) form.set("summary", formData.summary.trim());
    if (formData.skills.trim()) form.set("skills", formData.skills.trim());
    if (formData.linkedin.trim()) form.set("linkedin", formData.linkedin.trim());
    // Extras
    if (formData.dateOfBirth) form.set("date_of_birth", formData.dateOfBirth);
    if (formData.gender) form.set("gender", formData.gender);
    if (formData.emergencyContactName.trim()) form.set("emergency_contact_name", formData.emergencyContactName.trim());
    if (formData.emergencyContactNumber.trim()) form.set("emergency_contact_number", formData.emergencyContactNumber.trim());
    if (formData.quickSnapshot.trim()) form.set("quick_snapshot", formData.quickSnapshot.trim());
    if (formData.maxHours.trim()) form.set("max_hours", formData.maxHours.trim());
    if (formData.keyStrengths.trim()) form.set("key_strengths", formData.keyStrengths.trim());
    if (formData.appliedOn) form.set("applied_on", formData.appliedOn);
    if (selectedFile) form.set("resume", selectedFile, selectedFile.name);

    try {
      const response = await fetch("/api/v1/hr/recruitment/candidates/", {
        method: "POST",
        // Do not set Content-Type; the browser will set proper multipart boundary
        credentials: "include",
        body: form,
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const fallbackText = await response.text().catch(() => "");
        const message = fallbackText.trim();
        throw new Error(
          message ||
            (response.ok
              ? "Unexpected response from the server."
              : `Unable to submit the form. (status ${response.status})`)
        );
      }

      const data = (await response.json().catch(() => null)) as
        | {
            detail?: unknown;
            id?: unknown;
          }
        | null;

      if (!response.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : null;
        throw new Error(detail ?? "Unable to submit the form.");
      }

      const detail = typeof data?.detail === "string" ? data.detail : null;
      const id = typeof data?.id === "number" ? data.id : null;
      const baseMessage = detail
        ? detail.charAt(0).toUpperCase() + detail.slice(1)
        : "Candidate successfully submitted.";
      setSuccess(id ? `${baseMessage} (ID ${id}).` : baseMessage);
      resetForm();
      setSelectedFile(null);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit the form."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Add Applicants</h1>
        <Link
          to="/evaluation"
          className="bg-gray-700 text-white px-5 py-2 rounded font-medium"
        >
          Evaluation
        </Link>
      </div>
      <p className="mb-8 text-gray-700">
        Please enter following details to create new applicant
      </p>
      <form className="space-y-8" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Personal Information */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Applied On</label>
              <input
                type="date"
                name="appliedOn"
                value={formData.appliedOn}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Job Title</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="Enter job title"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </section>

        {/* Profile */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium">Summary</label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                placeholder="Brief summary about yourself"
                rows={3}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium">Skills</label>
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="Comma-separated skills or a brief list"
                  rows={3}
                  className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">LinkedIn URL</label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Personal Details */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency Contact Name"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Emergency Contact Number</label>
              <input
                type="tel"
                name="emergencyContactNumber"
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                placeholder="Emergency Contact Number"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Street Address</label>
              <input
                type="text"
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleChange}
                placeholder="Street Address"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Suburb</label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleChange}
                placeholder="Suburb"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Postal Code"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </section>

        {/* Resume */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Resume</h2>
          <label className="block mb-2 font-medium">File Attachment</label>
          <div
            className="border-2 border-gray-200 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-gray-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="w-10 h-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm text-gray-600">
              {selectedFileName ? `Selected: ${selectedFileName}` : "Click to upload resume (PDF, DOC, DOCX)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
          </div>
        </section>

        {/* Worker */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Worker</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Quick Snapshot</label>
              <input
                type="text"
                name="quickSnapshot"
                value={formData.quickSnapshot}
                onChange={handleChange}
                placeholder="Quick Snapshot"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Max Allowed Hours</label>
              <input
                type="text"
                name="maxHours"
                value={formData.maxHours}
                onChange={handleChange}
                placeholder="Max Allowed Hours"
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
          <div className="mt-6">
            <label className="block mb-2 font-medium">Key Strengths, Likes & Areas of Improvement (Maximum 12)</label>
            <textarea
              name="keyStrengths"
              value={formData.keyStrengths}
              onChange={handleChange}
              placeholder="Enter key strengths and improvement areas..."
              rows={4}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </section>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-800 text-white px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default IntakeForm;
