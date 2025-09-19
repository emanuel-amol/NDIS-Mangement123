# backend/app/services/document_permissions_service.py - ROLE-BASED ACCESS CONTROL
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.document import Document
from app.models.participant import Participant
from typing import List, Optional, Dict, Any, Set
import logging
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    CASE_MANAGER = "case_manager"
    SUPPORT_WORKER = "support_worker"
    PARTICIPANT = "participant"
    REPRESENTATIVE = "representative"
    VIEWER = "viewer"

class DocumentAction(str, Enum):
    VIEW = "view"
    DOWNLOAD = "download"
    UPLOAD = "upload"
    EDIT = "edit"
    DELETE = "delete"
    APPROVE = "approve"
    REJECT = "reject"
    SHARE = "share"
    MANAGE_VERSIONS = "manage_versions"

class DocumentPermissionsService:
    
    def __init__(self):
        """Initialize permissions matrix"""
        self.permissions_matrix = {
            UserRole.SUPER_ADMIN: {
                DocumentAction.VIEW: True,
                DocumentAction.DOWNLOAD: True,
                DocumentAction.UPLOAD: True,
                DocumentAction.EDIT: True,
                DocumentAction.DELETE: True,
                DocumentAction.APPROVE: True,
                DocumentAction.REJECT: True,
                DocumentAction.SHARE: True,
                DocumentAction.MANAGE_VERSIONS: True,
            },
            UserRole.ADMIN: {
                DocumentAction.VIEW: True,
                DocumentAction.DOWNLOAD: True,
                DocumentAction.UPLOAD: True,
                DocumentAction.EDIT: True,
                DocumentAction.DELETE: True,
                DocumentAction.APPROVE: True,
                DocumentAction.REJECT: True,
                DocumentAction.SHARE: True,
                DocumentAction.MANAGE_VERSIONS: True,
            },
            UserRole.MANAGER: {
                DocumentAction.VIEW: True,
                DocumentAction.DOWNLOAD: True,
                DocumentAction.UPLOAD: True,
                DocumentAction.EDIT: True,
                DocumentAction.DELETE: False,  # Cannot delete, only archive
                DocumentAction.APPROVE: True,
                DocumentAction.REJECT: True,
                DocumentAction.SHARE: True,
                DocumentAction.MANAGE_VERSIONS: True,
            },
            UserRole.CASE_MANAGER: {
                DocumentAction.VIEW: True,
                DocumentAction.DOWNLOAD: True,
                DocumentAction.UPLOAD: True,
                DocumentAction.EDIT: True,
                DocumentAction.DELETE: False,
                DocumentAction.APPROVE: False,  # Can only recommend approval
                DocumentAction.REJECT: False,
                DocumentAction.SHARE: True,
                DocumentAction.MANAGE_VERSIONS: False,
            },
            UserRole.SUPPORT_WORKER: {
                DocumentAction.VIEW: "conditional",  # Only if document.visible_to_support_worker
                DocumentAction.DOWNLOAD: "conditional",
                DocumentAction.UPLOAD: False,
                DocumentAction.EDIT: False,
                DocumentAction.DELETE: False,
                DocumentAction.APPROVE: False,
                DocumentAction.REJECT: False,
                DocumentAction.SHARE: False,
                DocumentAction.MANAGE_VERSIONS: False,
            },
            UserRole.PARTICIPANT: {
                DocumentAction.VIEW: "own_only",  # Only own documents
                DocumentAction.DOWNLOAD: "own_only",
                DocumentAction.UPLOAD: "own_only",
                DocumentAction.EDIT: "limited",  # Can edit description/tags only
                DocumentAction.DELETE: False,
                DocumentAction.APPROVE: False,
                DocumentAction.REJECT: False,
                DocumentAction.SHARE: False,
                DocumentAction.MANAGE_VERSIONS: False,
            },
            UserRole.REPRESENTATIVE: {
                DocumentAction.VIEW: "represented_only",  # Only for represented participants
                DocumentAction.DOWNLOAD: "represented_only",
                DocumentAction.UPLOAD: "represented_only",
                DocumentAction.EDIT: "limited",
                DocumentAction.DELETE: False,
                DocumentAction.APPROVE: False,
                DocumentAction.REJECT: False,
                DocumentAction.SHARE: False,
                DocumentAction.MANAGE_VERSIONS: False,
            },
            UserRole.VIEWER: {
                DocumentAction.VIEW: "assigned_only",  # Only assigned participants
                DocumentAction.DOWNLOAD: False,
                DocumentAction.UPLOAD: False,
                DocumentAction.EDIT: False,
                DocumentAction.DELETE: False,
                DocumentAction.APPROVE: False,
                DocumentAction.REJECT: False,
                DocumentAction.SHARE: False,
                DocumentAction.MANAGE_VERSIONS: False,
            }
        }
        
        # Category-specific permissions
        self.category_permissions = {
            'medical_consent': {
                UserRole.SUPPORT_WORKER: {DocumentAction.VIEW: True},  # Override for medical docs
            },
            'service_agreements': {
                UserRole.PARTICIPANT: {DocumentAction.EDIT: False},  # Cannot edit agreements
                UserRole.REPRESENTATIVE: {DocumentAction.EDIT: False},
            }
        }
        
        # Time-based permissions
        self.time_restrictions = {
            UserRole.SUPPORT_WORKER: {
                'working_hours_only': True,
                'working_hours': (8, 18),  # 8 AM to 6 PM
                'working_days': [0, 1, 2, 3, 4],  # Monday to Friday
            }
        }
    
    def check_permission(self, user_id: int, user_role: UserRole, document: Document,
                        action: DocumentAction, participant_assignments: Optional[List[int]] = None,
                        represented_participants: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Check if user has permission to perform action on document
        
        Returns:
            {
                'allowed': bool,
                'reason': str,
                'conditions': List[str],
                'requires_approval': bool
            }
        """
        result = {
            'allowed': False,
            'reason': 'Permission denied',
            'conditions': [],
            'requires_approval': False
        }
        
        try:
            # Get base permission for role and action
            base_permission = self.permissions_matrix.get(user_role, {}).get(action, False)
            
            if base_permission is False:
                result['reason'] = f"Role {user_role} does not have {action} permission"
                return result
            
            # Check category-specific overrides
            category_override = self.category_permissions.get(document.category, {}).get(user_role, {}).get(action)
            if category_override is not None:
                base_permission = category_override
            
            # Handle conditional permissions
            if base_permission == "conditional":
                return self._check_conditional_permission(user_id, user_role, document, action, result)
            
            elif base_permission == "own_only":
                if document.participant_id != user_id:
                    result['reason'] = "Can only access own documents"
                    return result
            
            elif base_permission == "represented_only":
                if not represented_participants or document.participant_id not in represented_participants:
                    result['reason'] = "Can only access documents of represented participants"
                    return result
            
            elif base_permission == "assigned_only":
                if not participant_assignments or document.participant_id not in participant_assignments:
                    result['reason'] = "Can only access documents of assigned participants"
                    return result
            
            elif base_permission == "limited":
                return self._check_limited_permission(user_role, document, action, result)
            
            # Check time-based restrictions
            if not self._check_time_restrictions(user_role):
                result['reason'] = "Access restricted to working hours"
                return result
            
            # Check document status restrictions
            if not self._check_document_status_permissions(user_role, document, action):
                result['reason'] = f"Cannot {action} document with status {document.status}"
                return result
            
            # Check if approval is required for this action
            if self._requires_approval(user_role, document, action):
                result['requires_approval'] = True
                result['conditions'].append("Requires manager approval")
            
            # Permission granted
            result['allowed'] = True
            result['reason'] = "Permission granted"
            
            # Add any conditions
            conditions = self._get_permission_conditions(user_role, document, action)
            result['conditions'].extend(conditions)
            
        except Exception as e:
            logger.error(f"Error checking permission: {str(e)}")
            result['reason'] = "Permission check failed"
        
        return result
    
    def _check_conditional_permission(self, user_id: int, user_role: UserRole, document: Document,
                                    action: DocumentAction, result: Dict) -> Dict:
        """Check conditional permissions (e.g., visible_to_support_worker)"""
        if user_role == UserRole.SUPPORT_WORKER:
            if document.visible_to_support_worker:
                result['allowed'] = True
                result['reason'] = "Document visible to support workers"
            else:
                result['reason'] = "Document not visible to support workers"
        
        return result
    
    def _check_limited_permission(self, user_role: UserRole, document: Document,
                                action: DocumentAction, result: Dict) -> Dict:
        """Check limited permissions (e.g., edit description only)"""
        if action == DocumentAction.EDIT:
            if user_role in [UserRole.PARTICIPANT, UserRole.REPRESENTATIVE]:
                result['allowed'] = True
                result['reason'] = "Limited edit permission granted"
                result['conditions'].append("Can only edit description and tags")
            else:
                result['reason'] = "Limited edit not applicable to this role"
        
        return result
    
    def _check_time_restrictions(self, user_role: UserRole) -> bool:
        """Check if access is allowed at current time"""
        restrictions = self.time_restrictions.get(user_role)
        if not restrictions or not restrictions.get('working_hours_only'):
            return True
        
        now = datetime.now()
        
        # Check working days
        if now.weekday() not in restrictions.get('working_days', []):
            return False
        
        # Check working hours
        working_hours = restrictions.get('working_hours', (0, 24))
        if not (working_hours[0] <= now.hour < working_hours[1]):
            return False
        
        return True
    
    def _check_document_status_permissions(self, user_role: UserRole, document: Document,
                                         action: DocumentAction) -> bool:
        """Check if action is allowed based on document status"""
        # Archived documents - read-only for most users
        if document.status == 'archived':
            if action in [DocumentAction.EDIT, DocumentAction.DELETE]:
                return user_role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        
        # Expired documents - limited actions
        if document.status == 'expired':
            if action in [DocumentAction.EDIT, DocumentAction.UPLOAD]:
                return user_role in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
        
        # Pending approval - restricted actions
        if document.status == 'pending_approval':
            if action in [DocumentAction.EDIT, DocumentAction.DELETE]:
                return user_role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        
        return True
    
    def _requires_approval(self, user_role: UserRole, document: Document, action: DocumentAction) -> bool:
        """Check if action requires additional approval"""
        # Deletion by non-admins requires approval
        if action == DocumentAction.DELETE:
            return user_role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
        
        # Editing critical documents requires approval
        if action == DocumentAction.EDIT and document.category in ['service_agreements', 'medical_consent']:
            return user_role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
        
        return False
    
    def _get_permission_conditions(self, user_role: UserRole, document: Document,
                                 action: DocumentAction) -> List[str]:
        """Get any additional conditions for the permission"""
        conditions = []
        
        # Add logging requirement
        if action in [DocumentAction.DOWNLOAD, DocumentAction.VIEW]:
            conditions.append("Access will be logged")
        
        # Add approval trail for sensitive documents
        if document.category == 'medical_consent':
            conditions.append("Access requires medical consent verification")
        
        # Add expiry warning
        if document.expiry_date and document.is_expired:
            conditions.append("Document has expired")
        
        return conditions
    
    def filter_documents_by_permissions(self, db: Session, documents: List[Document],
                                      user_id: int, user_role: UserRole,
                                      action: DocumentAction = DocumentAction.VIEW,
                                      participant_assignments: Optional[List[int]] = None,
                                      represented_participants: Optional[List[int]] = None) -> List[Document]:
        """Filter document list based on user permissions"""
        filtered_documents = []
        
        for document in documents:
            permission_check = self.check_permission(
                user_id, user_role, document, action,
                participant_assignments, represented_participants
            )
            
            if permission_check['allowed']:
                filtered_documents.append(document)
        
        return filtered_documents
    
    def get_allowed_actions(self, user_id: int, user_role: UserRole, document: Document,
                          participant_assignments: Optional[List[int]] = None,
                          represented_participants: Optional[List[int]] = None) -> Dict[DocumentAction, bool]:
        """Get all allowed actions for a user on a specific document"""
        allowed_actions = {}
        
        for action in DocumentAction:
            permission_check = self.check_permission(
                user_id, user_role, document, action,
                participant_assignments, represented_participants
            )
            allowed_actions[action] = permission_check['allowed']
        
        return allowed_actions
    
    def log_access_attempt(self, db: Session, user_id: int, user_role: str, document_id: int,
                          action: str, allowed: bool, reason: str, ip_address: str = None):
        """Log document access attempt for audit trail"""
        try:
            from app.models.document_content import DocumentAccessLog
            
            access_log = DocumentAccessLog(
                document_id=document_id,
                participant_id=0,  # Would need to get from