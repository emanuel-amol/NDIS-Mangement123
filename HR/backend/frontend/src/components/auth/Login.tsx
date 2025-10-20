import React, { useState } from "react";

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = new FormData();
    form.append("email", formData.email);
    form.append("password", formData.password);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        body: form,
      });

      if (response.ok) {
        // Redirect will be handled by the server
        window.location.href = "/";
      } else {
        alert("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-[#ececed] flex flex-col justify-center items-center relative overflow-hidden">
      {/* Decorative Blue Circle */}
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#183267] rounded-full translate-x-1/4 translate-y-1/4 z-0"></div>

      <div className="z-10 w-full max-w-xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-800 mb-4 text-center mt-12">
          Welcome back
        </h1>
        <p className="text-gray-400 text-lg mb-12 text-center">
          Welcome back! Please enter your details.
        </p>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
          <div className="flex items-center justify-between">
            <label className="flex items-center text-gray-500 text-sm">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="mr-2 accent-[#183267] w-4 h-4"
              />
              Remember me
            </label>
            <a
              href="#"
              className="text-gray-500 text-sm hover:underline text-right"
            >
              Forgot <br /> Password?
            </a>
          </div>
          <button
            type="submit"
            className="w-full bg-[#5c7ab3] text-white py-3 rounded font-medium text-lg hover:bg-[#46649a] transition"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;