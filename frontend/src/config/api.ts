// Dynamic API routing based on user role
export const API_URLS = {
  PARTICIPANTS: import.meta.env.VITE_PARTICIPANTS_API_URL || 'http://127.0.0.1:8000',
  HR: import.meta.env.VITE_HR_API_URL || 'http://127.0.0.1:8001',
};

// Determine which API to use based on user role
export const getApiBaseUrl = (userRole?: string): string => {
  const role = userRole?.toUpperCase();
  
  if (role === 'HR' || role === 'HRM_ADMIN') {
    return API_URLS.HR;
  }
  
  return API_URLS.PARTICIPANTS;
};

// Build full API URL
export const getApiUrl = (endpoint: string, userRole?: string): string => {
  const baseUrl = getApiBaseUrl(userRole);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};