// frontend/src/hooks/usePermissions.ts

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  hasRole,
  getRolePermissions 
} from '../config/permissions';

/**
 * Hook to check user permissions
 * 
 * @example
 * const { can, canAny, canAll, role } = usePermissions();
 * 
 * if (can('invoicing.create')) {
 *   // Show create invoice button
 * }
 */
export function usePermissions() {
  const { user } = useAuth();
  
  // Get role from multiple sources with priority
  const role = useMemo(() => {
    const storedRole = localStorage.getItem('role');
    const userRole = user?.role;
    const metadataRole = user?.user_metadata?.role;
    
    return (storedRole || userRole || metadataRole || 'USER').toUpperCase();
  }, [user]);

  // Get all permissions for this role
  const permissions = useMemo(() => {
    return getRolePermissions(role);
  }, [role]);

  return {
    // The user's role
    role,
    
    // All permissions this user has
    permissions,
    
    // Check if user has a specific permission
    can: (permission: string) => hasPermission(role, permission),
    
    // Check if user has ANY of the permissions
    canAny: (perms: string[]) => hasAnyPermission(role, perms),
    
    // Check if user has ALL of the permissions
    canAll: (perms: string[]) => hasAllPermissions(role, perms),
    
    // Check if user has one of the roles (legacy support)
    hasRole: (roles: string[]) => hasRole(role, roles),
    
    // Quick role checks
    isAdmin: role === 'PROVIDER_ADMIN',
    isManager: role === 'SERVICE_MANAGER',
    isWorker: role === 'SUPPORT_WORKER',
    isFinance: role === 'FINANCE',
    isHR: role === 'HR',
  };
}