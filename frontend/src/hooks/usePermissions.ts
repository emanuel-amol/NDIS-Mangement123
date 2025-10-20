// frontend/src/hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  hasRole 
} from '../config/permissions';

/**
 * Custom hook for checking user permissions and roles
 * 
 * @example
 * const { can, hasRole } = usePermissions();
 * if (can('invoicing.create')) {
 *   // Show create invoice button
 * }
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role;

  return {
    /**
     * Check if user has a specific permission
     * @param permission - Permission string (e.g., 'invoicing.create')
     */
    can: (permission: string): boolean => {
      return hasPermission(userRole, permission);
    },

    /**
     * Check if user has ANY of the specified permissions
     * @param permissions - Array of permission strings
     */
    canAny: (permissions: string[]): boolean => {
      return hasAnyPermission(userRole, permissions);
    },

    /**
     * Check if user has ALL of the specified permissions
     * @param permissions - Array of permission strings
     */
    canAll: (permissions: string[]): boolean => {
      return hasAllPermissions(userRole, permissions);
    },

    /**
     * Check if user has one of the allowed roles
     * @param roles - Array of role strings (e.g., ['HR', 'SERVICE_MANAGER'])
     */
    hasRole: (roles: string[]): boolean => {
      return hasRole(userRole, roles);
    },

    /**
     * Get the current user's role
     */
    role: userRole,

    /**
     * Get the current user object
     */
    user,
  };
}