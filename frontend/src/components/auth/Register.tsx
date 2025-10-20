import React, { useState } from "react";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = new FormData();
    form.append("username", formData.username);
    form.append("email", formData.email);
    form.append("password", formData.password);

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        body: form,
      });

      if (response.ok) {
        alert("Registration successful! Please log in.");
        window.location.href = "/login";
      } else {
        const errorText = await response.text();
        alert(`Registration failed: ${errorText}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("An error occurred during registration.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center items-center pt-24 pb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4 text-center">
          Join&nbsp; NDigital Today
        </h1>
        <p className="text-gray-400 text-lg mb-12 text-center">
          Start your journey with us and enjoy a 7-day free trial!
        </p>
      </div>
      {/* Form */}
      <div className="bg-[#ececed] flex-1 flex flex-col items-center py-16">
        <form className="w-full max-w-xl space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-2 text-gray-700 font-medium">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-700 font-medium">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-700 font-medium">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#5c7ab3] text-white py-3 rounded mt-4 font-medium text-lg hover:bg-[#46649a] transition"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-[#5c7ab3] hover:underline font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;