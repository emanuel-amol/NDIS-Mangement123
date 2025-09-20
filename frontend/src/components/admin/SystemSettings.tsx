// frontend/src/components/admin/SystemSettings.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CogIcon, 
  BuildingOfficeIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  SaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminAPI, ApplicationSettings } from '../../services/api';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('application');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const queryClient = useQueryClient();

  // Fetch application settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'application'],
    queryFn: adminAPI.getApplicationSettings,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: adminAPI.updateApplicationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setHasUnsavedChanges(false);
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    },
  });

  const tabs = [
    { id: 'application', name: 'Application', icon: CogIcon },
    { id: 'contact', name: 'Contact Info', icon: BuildingOfficeIcon },
    { id: 'mobile', name: 'Mobile App', icon: DevicePhoneMobileIcon },
    { id: 'social', name: 'Social Links', icon: GlobeAltIcon },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure application settings and preferences
        </p>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                You have unsaved changes
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                Don't forget to save your changes before leaving this page.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'application' && (
            <ApplicationSettingsTab 
              settings={settings}
              onUpdate={updateSettingsMutation.mutate}
              onMarkUnsaved={() => setHasUnsavedChanges(true)}
              isLoading={updateSettingsMutation.isPending}
            />
          )}
          {activeTab === 'contact' && (
            <ContactSettingsTab 
              settings={settings}
              onUpdate={updateSettingsMutation.mutate}
              onMarkUnsaved={() => setHasUnsavedChanges(true)}
              isLoading={updateSettingsMutation.isPending}
            />
          )}
          {activeTab === 'mobile' && (
            <MobileSettingsTab 
              settings={settings}
              onUpdate={updateSettingsMutation.mutate}
              onMarkUnsaved={() => setHasUnsavedChanges(true)}
              isLoading={updateSettingsMutation.isPending}
            />
          )}
          {activeTab === 'social' && (
            <SocialSettingsTab 
              settings={settings}
              onUpdate={updateSettingsMutation.mutate}
              onMarkUnsaved={() => setHasUnsavedChanges(true)}
              isLoading={updateSettingsMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Application Settings Tab
const ApplicationSettingsTab: React.FC<{
  settings?: ApplicationSettings;
  onUpdate: (updates: Partial<ApplicationSettings>) => void;
  onMarkUnsaved: () => void;
  isLoading: boolean;
}> = ({ settings, onUpdate, onMarkUnsaved, isLoading }) => {
  const [formData, setFormData] = useState({
    application_name: settings?.application_name || '',
    logo_url: settings?.logo_url || '',
    favicon_url: settings?.favicon_url || '',
    copyright_text: settings?.copyright_text || '',
    default_meta_keywords: settings?.default_meta_keywords || '',
    default_meta_description: settings?.default_meta_description || '',
    default_social_share_image: settings?.default_social_share_image || '',
    maintenance_mode: settings?.maintenance_mode || false,
    maintenance_message: settings?.maintenance_message || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    onMarkUnsaved();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Application Name</label>
            <input
              type="text"
              value={formData.application_name}
              onChange={(e) => handleChange('application_name', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://play.google.com/store/apps/details?id=com.yourapp"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Apple App Store Link</label>
            <input
              type="url"
              value={formData.appstore_link}
              onChange={(e) => handleChange('appstore_link', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://apps.apple.com/app/yourapp/id123456789"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Social Settings Tab
const SocialSettingsTab: React.FC<{
  settings?: ApplicationSettings;
  onUpdate: (updates: Partial<ApplicationSettings>) => void;
  onMarkUnsaved: () => void;
  isLoading: boolean;
}> = ({ settings, onUpdate, onMarkUnsaved, isLoading }) => {
  const [formData, setFormData] = useState({
    social_links: settings?.social_links || {}
  });

  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
    { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/yourhandle' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourcompany' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/c/yourchannel' },
  ];

  const handleChange = (platform: string, value: string) => {
    const newSocialLinks = { ...formData.social_links, [platform]: value };
    setFormData({ ...formData, social_links: newSocialLinks });
    onMarkUnsaved();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ social_links: formData.social_links });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media Links</h3>
        <p className="text-sm text-gray-600 mb-6">
          Add links to your organization's social media profiles. Leave blank to hide.
        </p>
        
        <div className="space-y-4">
          {socialPlatforms.map((platform) => (
            <div key={platform.key}>
              <label className="block text-sm font-medium text-gray-700">
                {platform.label}
              </label>
              <input
                type="url"
                value={formData.social_links[platform.key] || ''}
                onChange={(e) => handleChange(platform.key, e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={platform.placeholder}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default SystemSettings;mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="NDIS Management System"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Copyright Text</label>
            <input
              type="text"
              value={formData.copyright_text}
              onChange={(e) => handleChange('copyright_text', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="© 2025 NDIS Management System"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
            <input
              type="url"
              value={formData.favicon_url}
              onChange={(e) => handleChange('favicon_url', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://example.com/favicon.ico"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Default Meta Keywords</label>
          <input
            type="text"
            value={formData.default_meta_keywords}
            onChange={(e) => handleChange('default_meta_keywords', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="NDIS, disability services, management"
          />
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Default Meta Description</label>
          <textarea
            rows={3}
            value={formData.default_meta_description}
            onChange={(e) => handleChange('default_meta_description', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Comprehensive NDIS management system for service providers"
          />
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Social Share Image URL</label>
          <input
            type="url"
            value={formData.default_social_share_image}
            onChange={(e) => handleChange('default_social_share_image', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://example.com/social-share.jpg"
          />
        </div>
      </div>
      
      {/* Maintenance Mode */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Maintenance Mode</h4>
        
        <div className="flex items-center">
          <input
            id="maintenance-mode"
            type="checkbox"
            checked={formData.maintenance_mode}
            onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="maintenance-mode" className="ml-2 block text-sm text-gray-900">
            Enable maintenance mode
          </label>
        </div>
        
        {formData.maintenance_mode && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Maintenance Message</label>
            <textarea
              rows={3}
              value={formData.maintenance_message}
              onChange={(e) => handleChange('maintenance_message', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="System is under maintenance. Please check back later."
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Contact Settings Tab
const ContactSettingsTab: React.FC<{
  settings?: ApplicationSettings;
  onUpdate: (updates: Partial<ApplicationSettings>) => void;
  onMarkUnsaved: () => void;
  isLoading: boolean;
}> = ({ settings, onUpdate, onMarkUnsaved, isLoading }) => {
  const [formData, setFormData] = useState({
    office_address: settings?.office_address || '',
    contact_number: settings?.contact_number || '',
    email_address: settings?.email_address || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    onMarkUnsaved();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Office Address</label>
            <textarea
              rows={3}
              value={formData.office_address}
              onChange={(e) => handleChange('office_address', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="123 Main Street, Melbourne VIC 3000, Australia"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => handleChange('contact_number', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="+61 2 1234 5678"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={formData.email_address}
                onChange={(e) => handleChange('email_address', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="info@ndismanagement.com"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <SaveIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// Mobile Settings Tab
const MobileSettingsTab: React.FC<{
  settings?: ApplicationSettings;
  onUpdate: (updates: Partial<ApplicationSettings>) => void;
  onMarkUnsaved: () => void;
  isLoading: boolean;
}> = ({ settings, onUpdate, onMarkUnsaved, isLoading }) => {
  const [formData, setFormData] = useState({
    playstore_link: settings?.playstore_link || '',
    appstore_link: settings?.appstore_link || '',
    current_app_version: settings?.current_app_version || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    onMarkUnsaved();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Mobile App Settings</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current App Version</label>
            <input
              type="text"
              value={formData.current_app_version}
              onChange={(e) => handleChange('current_app_version', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="1.0.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Google Play Store Link</label>
            <input
              type="url"
              value={formData.playstore_link}
              onChange={(e) => handleChange('playstore_link', e.target.value)}
              className="