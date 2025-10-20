import { useState } from "react";

const statusOptions = ["Pending", "Interviewed", "Hired", "Rejected"];
const roleOptions = ["Developer", "Designer", "Manager"];
const internalRoleOptions = ["Admin", "HR", "Recruiter"];

function EvaluationForm() {
  const [form, setForm] = useState({
    applicantName: "",
    applicationDate: "",
    interviewQuestions: "",
    notes: "",
    status: "",
    role: "",
    internalRole: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    notify: false,
  });

  // ...existing code...
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };
  // ...existing code...

  const handleReset = () => {
    setForm({
      applicantName: "",
      applicationDate: "",
      interviewQuestions: "",
      notes: "",
      status: "",
      role: "",
      internalRole: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      notify: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic here
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Candidate Assessment</h1>
        <nav className="text-sm text-gray-500">
          <ol className="list-reset flex">
            <li>
              <a href="#" className="hover:underline">
                Dashboard
              </a>
            </li>
            <li>
              <span className="mx-2">{">"}</span>
              <a href="#" className="hover:underline">
                All Applicant
              </a>
            </li>
            <li>
              <span className="mx-2">{">"}</span>
              <a href="#" className="hover:underline">
                Applicant Profile
              </a>
            </li>
            <li>
              <span className="mx-2">{">"}</span>
              <span className="text-black">Applicant Assessments</span>
            </li>
          </ol>
        </nav>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium">Applicant Name</label>
            <input
              type="text"
              name="applicantName"
              value={form.applicantName}
              onChange={handleChange}
              placeholder="Enter application status"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Application Date</label>
            <input
              type="text"
              name="applicationDate"
              value={form.applicationDate}
              onChange={handleChange}
              placeholder="Enter application name"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 font-medium">Interview Questions</label>
          <textarea
            name="interviewQuestions"
            value={form.interviewQuestions}
            onChange={handleChange}
            placeholder="Write meta description here"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            rows={3}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Please enter notes that will be shared with applicants"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select status</option>
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select Role</option>
              {roleOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Internal Role</label>
            <select
              name="internalRole"
              value={form.internalRole}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select Internal Role</option>
              {internalRoleOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter Password"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Enter Password"
              className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            name="notify"
            checked={form.notify}
            onChange={handleChange}
            className="mr-2"
            id="notify"
          />
          <label htmlFor="notify" className="text-sm">
            Notify via Email
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="bg-black text-white px-8 py-2 rounded font-medium"
          >
            SUBMIT
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-black px-8 py-2 rounded font-medium border border-transparent hover:underline"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

export default EvaluationForm;
