/** 
* AddEmployee
* ------------------------------------------------------------
* Admin-only screen to create a new employee/user (and optionally a
* candidate record) via POST /api/v1/admin/users.
**/
import { useState } from "react";
import type { ChangeEvent, FormEvent, FC } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../navigation/NavigationBar";

/** 
 * Form Data shape
**/
type FormState = {
  firstName: string;
  lastName: string;
  joiningDate: string;
  jobTitle: string;
  email: string;
  username: string;
  phoneNumber: string;
  suburb: string;
  status: string;
};

// list of status options
const statusOptions = ["Applied", "Active", "Hired", "Employee"];

// Starting empty form values
const initialState: FormState = {
  firstName: "",
  lastName: "",
  joiningDate: "",
  jobTitle: "",
  email: "",
  username: "",
  phoneNumber: "",
  suburb: "",
  status: "Applied",
};

// Clean up username
const sanitizeUsername = (value: string): string =>
  value.replace(/\s+/g, "").toLowerCase();

// Determine username based on input or email prefix
const normalizedUsername = (username: string, email: string): string => {
  const sanitizedInput = sanitizeUsername(username.trim()); // use trimmed input if available
  if (sanitizedInput) {
    return sanitizedInput;
  }

  // fallback to email prefix
  const trimmedEmail = email.trim(); // ensure email is trimmed
  if (!trimmedEmail) {
    return "";
  }

// Extract part before '@'
  const base = trimmedEmail.includes("@")
    ? trimmedEmail.split("@")[0]
    : trimmedEmail;
  const sanitizedEmailBase = sanitizeUsername(base.trim());
  return sanitizedEmailBase || base.trim();
};

// Main component
const AddEmployee: FC = () => { 
  const navigate = useNavigate(); // for navigation
  const [formValues, setFormValues] = useState<FormState>(initialState); // form state
  const [isSubmitting, setIsSubmitting] = useState(false); // submission state
  const [error, setError] = useState<string | null>(null); // error message
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // success message
  const [tempPassword, setTempPassword] = useState<string | null>(null); // temp password

  // Handle input changes
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>, // support both input and select elements
  ) => {
    const { name, value } = event.target; // get name and value
    setFormValues((prev) => ({ ...prev, [name]: value })); // update state
  };

  // Auto-suggest username from email if username is empty
  const handleEmailBlur = () => {
    if (!formValues.username.trim() && formValues.email.includes("@")) {
      const suggestion = formValues.email.split("@")[0].trim();
      setFormValues((prev) => ({ ...prev, username: sanitizeUsername(suggestion) }));
    }
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
    setError(null);
    setSuccessMessage(null);
    setTempPassword(null);

    const email = formValues.email.trim(); // ensure email is trimmed
    if (!email) {
      setError("Email is required."); // email is mandatory
      return;
    }

    const username = normalizedUsername(formValues.username, email); // get normalized username
    if (!username) {
      setError("Username is required."); // username is mandatory
      return;
    }

    const status = formValues.status.trim() || "Applied"; // default status
    const payload: Record<string, string> = { // prepare payload
      email,
      username,
      first_name: formValues.firstName.trim(),
      last_name: formValues.lastName.trim(),
      job_title: formValues.jobTitle.trim() || status,
      mobile: formValues.phoneNumber.trim(),
      status,
    };

// Optional fields
    const address = formValues.suburb.trim(); 
    if (address) {
      payload.address = address;
    }

// Joining date in YYYY-MM-DD format
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/admin/users", { // API call
        method: "POST", // POST request
        headers: { "Content-Type": "application/json" }, // JSON content
        body: JSON.stringify(payload), // send payload
      });

      const body = await response.json().catch(() => null); // parse JSON response

// Handle non-2xx responses
      if (!response.ok) {
        const detail = body && typeof body === "object" ? body.detail : null;
        setError(detail || "Unable to create the employee. Please try again.");
        return;
      }

// Success handling
      setFormValues(initialState); 
      const candidate = body?.candidate; // newly created candidate
      const displayName = [candidate?.first_name, candidate?.last_name] // format name
        .filter(Boolean) // remove empty parts
        .join(" ") // join with space
        .trim(); // trim whitespace
      setSuccessMessage(
        displayName // personalized message if name available
          ? `Employee ${displayName} created successfully.` // personalized message
          : "Employee created successfully.", // generic message
      );
      if (typeof body?.temp_password === "string") { // show temp password if provided
        setTempPassword(body.temp_password); // store temp password
      }
    } catch (submissionError) { // network or other errors
      setError("Something went wrong while creating the employee. Please retry."); // generic error message
    } finally {
      setIsSubmitting(false); // reset submission state
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <NavigationBar />
      <div className="flex-1">
        <div className="mx-auto mt-8 max-w-4xl px-4 pb-12">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add Employee</h1>
          <p className="text-sm text-gray-600">
            Please enter the details below to create a new employee.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
          >
            View All Users
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <p>{successMessage}</p>
          {tempPassword && (
            <p className="mt-2 text-xs">
              Temporary password:
              <span className="ml-1 font-mono font-semibold">{tempPassword}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-800"
            >
              Go to Employees
            </button>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="firstName">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formValues.firstName}
              onChange={handleChange}
              placeholder="Enter first name"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="lastName">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formValues.lastName}
              onChange={handleChange}
              placeholder="Enter last name"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formValues.email}
              onChange={handleChange}
              onBlur={handleEmailBlur}
              placeholder="name@example.com"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formValues.username}
              onChange={handleChange}
              placeholder="e.g. jdoe"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              If left blank we will reuse the email prefix.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="jobTitle">
              Job Title
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              value={formValues.jobTitle}
              onChange={handleChange}
              placeholder="Enter job title"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="phoneNumber">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formValues.phoneNumber}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="suburb">
              Suburb / Address
            </label>
            <input
              id="suburb"
              name="suburb"
              type="text"
              value={formValues.suburb}
              onChange={handleChange}
              placeholder="Enter suburb"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="status">
              Employment Status
            </label>
            <select
              id="status"
              name="status"
              value={formValues.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              {statusOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="joiningDate">
              Joining Date
            </label>
            <input
              id="joiningDate"
              name="joiningDate"
              type="date"
              value={formValues.joiningDate}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gray-800 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Create Employee"}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;


