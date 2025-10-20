// frontend/src/config/permissions.ts

/**
 * Centralized Permission & Role Management System
 * This defines all roles, their hierarchies, and permissions in one place
 */

// All available permissions in the system
export const PERMISSIONS = {
  // Invoicing
  INVOICING_VIEW: 'invoicing.view',
  INVOICING_CREATE: 'invoicing.create',
  INVOICING_EDIT: 'invoicing.edit',
  INVOICING_DELETE: 'invoicing.delete',
  INVOICING_GENERATE: 'invoicing.generate',
  INVOICING_XERO_SYNC: 'invoicing.xero_sync',
  
  // Payments
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_RECORD: 'payment.record',
  PAYMENT_EDIT: 'payment.edit',
  
  // Participants
  PARTICIPANT_VIEW: 'participant.view',
  PARTICIPANT_CREATE: 'participant.create',
  PARTICIPANT_EDIT: 'participant.edit',
  PARTICIPANT_DELETE: 'participant.delete',
  
  // Care Plans
  CARE_PLAN_VIEW: 'care_plan.view',
  CARE_PLAN_EDIT: 'care_plan.edit',
  CARE_PLAN_APPROVE: 'care_plan.approve',
  
  // Scheduling
  SCHEDULING_VIEW: 'scheduling.view',
  SCHEDULING_MANAGE: 'scheduling.manage',
  SCHEDULING_ROSTER: 'scheduling.roster',
  
  // Documents
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_GENERATE: 'documents.generate',
  
  // Admin
  ADMIN_ACCESS: 'admin.access',
  USER_MANAGEMENT: 'user.management',
  SYSTEM_SETTINGS: 'system.settings',
} as const;

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  PROVIDER_ADMIN: [
    // Full access to most features
    PERMISSIONS.INVOICING_VIEW,
    PERMISSIONS.INVOICING_CREATE,
    PERMISSIONS.INVOICING_EDIT,
    PERMISSIONS.INVOICING_GENERATE,
    PERMISSIONS.INVOICING_XERO_SYNC,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.PARTICIPANT_VIEW,
    PERMISSIONS.PARTICIPANT_CREATE,
    PERMISSIONS.PARTICIPANT_EDIT,
    PERMISSIONS.CARE_PLAN_VIEW,
    PERMISSIONS.CARE_PLAN_EDIT,
    PERMISSIONS.SCHEDULING_VIEW,
    PERMISSIONS.SCHEDULING_MANAGE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_GENERATE,
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.USER_MANAGEMENT,
  ],
  
  SERVICE_MANAGER: [
    PERMISSIONS.INVOICING_VIEW,
    PERMISSIONS.INVOICING_CREATE,
    PERMISSIONS.INVOICING_EDIT,
    PERMISSIONS.INVOICING_GENERATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.PARTICIPANT_VIEW,
    PERMISSIONS.PARTICIPANT_EDIT,
    PERMISSIONS.CARE_PLAN_VIEW,
    PERMISSIONS.CARE_PLAN_EDIT,
    PERMISSIONS.CARE_PLAN_APPROVE,
    PERMISSIONS.SCHEDULING_VIEW,
    PERMISSIONS.SCHEDULING_MANAGE,
    PERMISSIONS.SCHEDULING_ROSTER,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_GENERATE,
  ],
  
  FINANCE: [
    PERMISSIONS.INVOICING_VIEW,
    PERMISSIONS.INVOICING_CREATE,
    PERMISSIONS.INVOICING_EDIT,
    PERMISSIONS.INVOICING_DELETE,
    PERMISSIONS.INVOICING_GENERATE,
    PERMISSIONS.INVOICING_XERO_SYNC,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.PAYMENT_EDIT,
    PERMISSIONS.PARTICIPANT_VIEW, // Need to see participant details for invoicing
  ],
  
  HR: [
    PERMISSIONS.SCHEDULING_VIEW,
    PERMISSIONS.SCHEDULING_MANAGE,
    PERMISSIONS.SCHEDULING_ROSTER,
    PERMISSIONS.PARTICIPANT_VIEW,
    PERMISSIONS.USER_MANAGEMENT,
  ],
  
  SUPPORT_WORKER: [
    PERMISSIONS.PARTICIPANT_VIEW,
    PERMISSIONS.CARE_PLAN_VIEW,
    PERMISSIONS.SCHEDULING_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
  ],
  
  DATA_ENTRY: [
    PERMISSIONS.PARTICIPANT_VIEW,
    PERMISSIONS.PARTICIPANT_CREATE,
    PERMISSIONS.PARTICIPANT_EDIT,
    PERMISSIONS.DOCUMENTS_UPLOAD,
  ],
  
  IT: [
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.SYSTEM_SETTINGS,
  ],
  
  PARTICIPANT: [
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.CARE_PLAN_VIEW,
    PERMISSIONS.SCHEDULING_VIEW,
  ],
};

// Role hierarchy - roles inherit permissions from parent roles
export const ROLE_HIERARCHY: Record<string, string[]> = {
  PROVIDER_ADMIN: ['SERVICE_MANAGER', 'FINANCE', 'HR'],
  SERVICE_MANAGER: ['SUPPORT_WORKER'],
  // Add more hierarchies as needed
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  
  const normalizedRole = role.toUpperCase();
  const directPermissions = ROLE_PERMISSIONS[normalizedRole] || [];
  
  // Check direct permissions
  if (directPermissions.includes(permission)) {
    return true;
  }
  
  // Check inherited permissions from role hierarchy
  const inheritedRoles = ROLE_HIERARCHY[normalizedRole] || [];
  for (const inheritedRole of inheritedRoles) {
    if (hasPermission(inheritedRole, permission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: string | undefined, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: string | undefined, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getRolePermissions(role: string | undefined): string[] {
  if (!role) return [];
  
  const normalizedRole = role.toUpperCase();
  const permissions = new Set<string>(ROLE_PERMISSIONS[normalizedRole] || []);
  
  // Add inherited permissions
  const inheritedRoles = ROLE_HIERARCHY[normalizedRole] || [];
  for (const inheritedRole of inheritedRoles) {
    getRolePermissions(inheritedRole).forEach(p => permissions.add(p));
  }
  
  return Array.from(permissions);
}

/**
 * Check if user's role is one of the allowed roles
 * (Legacy support - prefer permission-based checks)
 */
export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.map(r => r.toUpperCase()).includes(userRole.toUpperCase());
}