# backend/app/security/rbac.py
"""
Role-Based Access Control (RBAC) permission mappings
Maps roles to their allowed permissions
"""

# Permission map: Role -> Set of permissions
ROLE_PERMS = {
    "PROVIDER_ADMIN": {
        # Care & Risk
        "care.edit",
        "care.view",
        "risk.edit",
        "risk.view",
        
        # Quotations
        "quotation.generate",
        "quotation.finalise",
        "quotation.view",
        
        # Documents
        "docs.upload",
        "docs.generate",
        "docs.view",
        "docs.submit_review",
        "docs.approve",
        
        # Participants
        "participant.edit",
        "participant.view",
        "participant.create",
        
        # ⭐ INVOICING PERMISSIONS - ADDED FOR PROVIDER_ADMIN
        "invoice.view",
        "invoice.create",
        "invoice.edit",
        "invoice.generate",
        "invoice.delete",
        "payment.view",
        "payment.record",
        "payment.edit",
        "finance.view",
        
        # Scheduling
        "roster.view",
        "roster.manage",
        
        # Management
        "manager.queue",
        "manager.approve",
        "onboard.convert",
    },
    
    "SERVICE_MANAGER": {
        "manager.queue",
        "manager.approve",
        "onboard.convert",
        "roster.view",
        "roster.manage",
        "finance.view",
        "docs.view",
        "docs.approve",
        "care.view",
        "care.edit",
        "risk.view",
        "risk.edit",
        "participant.view",
        "participant.edit",
        
        # Invoicing for managers
        "invoice.view",
        "invoice.create",
        "invoice.edit",
        "invoice.generate",
        "payment.view",
        "payment.record",
    },
    
    "SUPPORT_WORKER": {
        "docs.view",
        "roster.view",
        "care.view",
        "participant.view",
    },
    
    "PARTICIPANT": {
        "self.view",
    },
    
    "HR": {
        "roster.manage",
        "roster.view",
        "worker.assign",
        "worker.view",
        "participant.view",
    },
    
    "FINANCE": {
        "invoice.view",
        "invoice.create",
        "invoice.edit",
        "invoice.delete",
        "invoice.generate",
        "invoice.sync",
        "payment.view",
        "payment.record",
        "payment.edit",
        "finance.view",
        "participant.view",
    },
    
    "IT": {
        "system.readonly",
    },
    
    "DATA_ENTRY": {
        "data.manage",
        "docs.upload",
        "participant.create",
        "participant.view",
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