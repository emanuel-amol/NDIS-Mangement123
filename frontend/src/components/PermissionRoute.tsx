// frontend/src/components/PermissionRoute.tsx

import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionRouteProps {
  children: ReactElement;
  
  // Permission-based (recommended)
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  
  // Role-based (legacy support)
  roles?: string[];
}

/**
 * Route guard component that checks permissions OR roles
 * 
 * @example
 * // Permission-based (recommended)
 * <PermissionRoute permission="invoicing.create">
 *   <InvoiceGeneration />
 * </PermissionRoute>
 * 
 * // Multiple permissions (any)
 * <PermissionRoute anyPermission={['invoicing.create', 'invoicing.edit']}>
 *   <InvoiceGeneration />
 * </PermissionRoute>
 * 
 * // Legacy role-based
 * <PermissionRoute roles={['FINANCE', 'SERVICE_MANAGER']}>
 *   <InvoicingDashboard />
 * </PermissionRoute>
 */
export default function PermissionRoute({ 
  children, 
  permission,
  anyPermission,
  allPermissions,
  roles 
}: PermissionRouteProps) {
  const { isAuthenticated } = useAuth();
  const { can, canAny, canAll, hasRole: checkRole } = usePermissions();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions (priority: specific > any > all > roles)
  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = canAny(anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = canAll(allPermissions);
  } else if (roles && roles.length > 0) {
    hasAccess = checkRole(roles);
  }

  // Redirect to unauthorized if no access
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Backward compatibility export
export { PermissionRoute as RoleRoute };