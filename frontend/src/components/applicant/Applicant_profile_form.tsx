import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import NavigationBar from '../navigation/NavigationBar';
import { useProfileData, computeProgress } from './profileUtils';

interface Form {
  id: number;
  title: string;
  category: string;
  status: 'completed' | 'pending' | 'not_started';
  deadline?: string;
  description: string;
  required: boolean;
}

const Applicant_profile_form: React.FC = () => {
  const { id, userId } = useParams<{ id?: string; userId?: string }>();
  const location = useLocation();
  const qUserId = new URLSearchParams(location.search).get('userId') || undefined;
  // Prefer explicit userId (admin route), then applicant id, then query param
  const profileId = userId || id || qUserId;
  // Build tab base path that matches where the page is mounted
  const basePath = userId
    ? `/portal/profile/admin/${userId}`
    : id
      ? `/applicant/${id}`
      : '/portal/profile';
  const { data: profileData, loading: isLoading, error } = useProfileData(profileId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [forms, setForms] = useState<Form[]>([]);

  useEffect(() => {
    // Mock forms data - in a real app, this would come from the API
    const mockForms: Form[] = [
      {
        id: 1,
        title: 'Initial Assessment Form',
        category: 'assessment',
        status: 'completed',
        deadline: '2024-01-15',
        description: 'Basic assessment and screening form',
        required: true
      },
      {
        id: 2,
        title: 'Personal Information',
        category: 'personal',
        status: 'completed',
        description: 'Personal details and contact information',
        required: true
      },
      {
        id: 3,
        title: 'Medical History',
        category: 'medical',
        status: 'pending',
        deadline: '2024-02-01',
        description: 'Medical history and current conditions',
        required: true
      },
      {
        id: 4,
        title: 'Emergency Contacts',
        category: 'personal',
        status: 'not_started',
        deadline: '2024-02-15',
        description: 'Emergency contact information',
        required: true
      },
      {
        id: 5,
        title: 'Additional Support Needs',
        category: 'support',
        status: 'not_started',
        description: 'Additional support requirements assessment',
        required: false
      },
      {
        id: 6,
        title: 'Goals and Preferences',
        category: 'planning',
        status: 'pending',
        deadline: '2024-02-20',
        description: 'Personal goals and service preferences',
        required: true
      }
    ];
    setForms(mockForms);
  }, []);

  const filteredForms = forms.filter(form => {
    const matchesCategory = selectedCategory === 'all' || form.category === selectedCategory;
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'not_started': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <NavigationBar />
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex h-screen bg-gray-50">
        <NavigationBar />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              Error loading profile data: {error || 'Unknown error'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = computeProgress(profileData?.candidate || null, profileData?.profile || null);

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationBar />
      <div className="flex-1 overflow-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {profileData.profile?.photo_path ? (
                    <img
                      className="h-16 w-16 rounded-full object-cover"
                      src={`/uploads/${profileData.candidate?.id}/photo.${profileData.profile.photo_path.split('.').pop()}`}
                      alt="Profile"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xl font-medium text-gray-600">
                        {profileData.candidate?.first_name?.charAt(0) || profileData.user?.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profileData.candidate?.first_name && profileData.candidate?.last_name 
                      ? `${profileData.candidate.first_name} ${profileData.candidate.last_name}`
                      : profileData.user?.username || 'User Profile'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {profileData.user?.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Profile Completion</div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{progress}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <Link
                to={`${basePath}`}
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Overview
              </Link>
              <Link
                to={`${basePath}/documents`
                }
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Documents
              </Link>
              <Link
                to={`${basePath}/settings`}
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Settings
              </Link>
              <Link
                to={`${basePath}/forms`}
                className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                Forms
              </Link>
            </nav>
          </div>
        </div>

  {/* Forms Content */}
  <div className="max-w-6xl mx-auto space-y-6">
          {/* Search and Filter Controls */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="sr-only">
                  Search forms
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="search"
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="category" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="category"
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="personal">Personal</option>
                  <option value="medical">Medical</option>
                  <option value="assessment">Assessment</option>
                  <option value="support">Support</option>
                  <option value="planning">Planning</option>
                </select>
              </div>
            </div>
          </div>

          {/* Forms Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Forms and Documentation
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Complete the required forms to proceed with your application.
              </p>
            </div>
            
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {form.title}
                              {form.required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {form.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                          {form.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(form.status)}`}>
                          {form.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className={isOverdue(form.deadline) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(form.deadline)}
                          {isOverdue(form.deadline) && (
                            <span className="ml-1 text-red-500">(Overdue)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {form.status === 'completed' ? (
                            <button className="text-blue-600 hover:text-blue-900">
                              View
                            </button>
                          ) : (
                            <button className="text-blue-600 hover:text-blue-900">
                              {form.status === 'pending' ? 'Continue' : 'Start'}
                            </button>
                          )}
                          {form.status === 'completed' && (
                            <button className="text-green-600 hover:text-green-900">
                              Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredForms.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No forms found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No forms match your current search and filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {forms.filter(f => f.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed Forms</div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {forms.filter(f => f.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {forms.filter(f => f.status === 'not_started').length}
                  </div>
                  <div className="text-sm text-gray-600">Not Started</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Applicant_profile_form;