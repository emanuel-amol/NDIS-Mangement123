// frontend/src/services/auth.ts - Fixed Authentication Helper

/**
 * Get authentication headers for API requests
 * Includes JWT token from localStorage
 */
export const withAuth = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No authentication token found in localStorage');
  }

  return headers;
};

/**
 * Get the current auth token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Set the auth token
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Remove the auth token (logout)
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return token !== null && token !== '';
};

/**
 * Get user info from token (basic decode)
 * Note: This is not a security feature, just for UI purposes
 */
export const getUserFromToken = (): any | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    // JWT tokens have 3 parts: header.payload.signature
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export default {
  withAuth,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isAuthenticated,
  getUserFromToken
};
