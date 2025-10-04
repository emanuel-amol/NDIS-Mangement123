// frontend/src/pages/main-application/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [selectedRole, setSelectedRole] = useState('');

  const roles = [
    { value: 'admin', label: 'Platform Administrator', route: '/dashboard/admin' },
    { value: 'provider', label: 'Service Provider Admin', route: '/dashboard/provider' },
    { value: 'manager', label: 'Service Manager', route: '/dashboard/manager' },
    { value: 'worker', label: 'Support Worker', route: '/dashboard/worker' },
    { value: 'participant', label: 'Participant', route: '/dashboard/participant' },
    { value: 'hr', label: 'HR Personnel', route: '/dashboard/hr' },
    { value: 'finance', label: 'Finance/Accounting', route: '/dashboard/finance' },
    { value: 'regional', label: 'Regional Manager', route: '/dashboard/regional' },
    { value: 'it', label: 'IT Support', route: '/dashboard/it' },
    { value: 'dataEntry', label: 'Data Entry/Admin Assistant', route: '/dashboard/data-entry' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    if (!selectedRole) {
      toast.error('Please select your role');
      return;
    }

    try {
      // TODO: Replace with actual authentication API call
      // const response = await loginAPI(formData);
      
      // Mock authentication - simulate successful login
      const mockAuth = {
        success: true,
        user: {
          id: '1',
          email: formData.email,
          role: selectedRole,
          name: 'Demo User'
        }
      };

      if (mockAuth.success) {
        // Store user data (in production, use proper auth state management)
        localStorage.setItem('user', JSON.stringify(mockAuth.user));
        
        // Find the route for the selected role
        const roleConfig = roles.find(r => r.value === selectedRole);
        
        if (roleConfig) {
          toast.success(`Welcome back! Redirecting to ${roleConfig.label} dashboard...`);
          
          // Redirect to role-specific dashboard
          setTimeout(() => {
            navigate(roleConfig.route);
          }, 1000);
        } else {
          // Fallback to generic dashboard
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NDIS Management System</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Role
            </label>
            <select
              value={selectedRole}
              onChange={handleRoleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select your role...</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email or Phone
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email or phone"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter password"
              required
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Demo Mode:</strong> Select any role and use any credentials to test the role-based dashboards.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;