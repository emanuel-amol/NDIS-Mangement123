# backend/app/security/rbac.py
"""
Role-Based Access Control (RBAC) permission mappings
Maps roles to their allowed permissions
"""

# Permission map: Role -> Set of permissions
ROLE_PERMS = {
    "PROVIDER_ADMIN": {
        "care.edit",              # Create/edit care plans
        "risk.edit",              # Create/edit risk assessments
        "quotation.generate",     # Generate quotations
        "quotation.finalise",     # Finalize quotations
        "docs.upload",            # Upload documents
        "docs.generate",          # Generate service documents
        "docs.view",              # View documents
        "docs.submit_review",     # Submit for manager review
        "participant.edit",       # Edit participant details
    },
    
    "SERVICE_MANAGER": {
        "manager.queue",          # View manager review queue
        "manager.approve",        # Approve/reject submissions
        "onboard.convert",        # Convert prospective to onboarded
        "roster.view",            # View rostering
        "finance.view",           # View financial reports
        "docs.view",              # View documents
        "docs.approve",           # Approve documents
        "care.view",              # View care plans
        "risk.view",              # View risk assessments
    },
    
    "SUPPORT_WORKER": {
        "docs.view",              # View assigned documents
        "roster.view",            # View own roster
        "care.view",              # View care plans for assigned participants
        "participant.view",       # View participant details
    },
    
    "PARTICIPANT": {
        "self.view",              # View own information
    },
    
    "HR": {
        "roster.manage",          # Manage rostering
        "roster.view",            # View rostering
        "worker.assign",          # Assign workers
        "worker.view",            # View worker details
        "participant.view",       # View participant details for scheduling
    },
    
    "FINANCE": {
        "invoice.generate",       # Generate invoices
        "invoice.sync",           # Sync with Xero
        "finance.view",           # View financial reports
        "participant.view",       # View participant details for billing
    },
    
    "IT": {
        "system.readonly",        # System health and status
    },
    
    "DATA_ENTRY": {
        "data.manage",            # Bulk data operations
        "docs.upload",            # Upload documents
        "participant.create",     # Create participants
    },
}

def has_perm(role: str, perm: str) -> bool:
    """
    Check if a role has a specific permission
    
    Args:
        role: User's role (e.g., "PROVIDER_ADMIN")
        perm: Permission to check (e.g., "care.edit")
    
    Returns:
        True if role has the permission, False otherwise
    """
    role_upper = role.upper()
    return perm in ROLE_PERMS.get(role_upper, set())

def get_role_permissions(role: str) -> set:
    """
    Get all permissions for a role
    
    Args:
        role: User's role
    
    Returns:
        Set of permission strings
    """
    return ROLE_PERMS.get(role.upper(), set())