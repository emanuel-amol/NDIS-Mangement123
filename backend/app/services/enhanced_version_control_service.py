# backend/app/services/enhanced_version_control_service.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.models.document import Document
from app.models.document_workflow import DocumentVersion, DocumentApproval
from app.models.participant import Participant
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import os
import shutil
import json
import logging
from pathlib import Path
import hashlib
import difflib

logger = logging.getLogger(__name__)

class EnhancedVersionControlService:
    """Enhanced version control service with granular change tracking"""
    
    @staticmethod
    def create_version_with_changes(
        db: Session,
        document_id: int,
        new_file_path: str,
        changes_summary: str,
        created_by: str,
        change_details: Optional[Dict[str, Any]] = None
    ) -> DocumentVersion:
        """Create a new version with detailed change tracking"""
        try:
            # Get the original document
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            # Get the current highest version
            latest_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first()
            
            new_version_number = (latest_version.version_number + 1) if latest_version else 1
            
            # Calculate file hash for integrity checking
            file_hash = EnhancedVersionControlService._calculate_file_hash(new_file_path)
            
            # Get file size
            file_size = os.path.getsize(new_file_path) if os.path.exists(new_file_path) else 0
            
            # Generate unique filename for the version
            file_extension = Path(new_file_path).suffix
            version_filename = f"{document.participant_id}_{document_id}_v{new_version_number}{file_extension}"
            version_dir = Path(new_file_path).parent / "versions"
            version_dir.mkdir(exist_ok=True)
            version_file_path = version_dir / version_filename
            
            # Copy file to version storage
            shutil.copy2(new_file_path, version_file_path)
            
            # Prepare change metadata
            change_metadata = {
                'change_type': 'file_update',
                'file_hash': file_hash,
                'file_size_change': file_size - document.file_size,
                'timestamp': datetime.now().isoformat(),
                'user_agent': change_details.get('user_agent') if change_details else None,
                'ip_address': change_details.get('ip_address') if change_details else None,
                'change_reason': change_details.get('change_reason') if change_details else None,
                'affected_fields': change_details.get('affected_fields', []) if change_details else []
            }
            
            # Create new version record
            new_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=version_filename,
                file_path=str(version_file_path),
                file_size=file_size,
                mime_type=document.mime_type,
                changes_summary=changes_summary,
                change_metadata=change_metadata,
                file_hash=file_hash,
                created_by=created_by
            )
            
            db.add(new_version)
            
            # Mark previous version as replaced
            if latest_version:
                latest_version.replaced_by_version_id = new_version.id
                latest_version.replaced_at = datetime.now()
            
            # Update main document record
            document.filename = version_filename
            document.file_path = str(version_file_path)
            document.version = new_version_number
            document.file_size = file_size
            document.updated_at = datetime.now()
            
            db.commit()
            db.refresh(new_version)
            
            logger.info(f"Created version {new_version_number} for document {document_id}")
            return new_version
            
        except Exception as e:
            logger.error(f"Error creating version for document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def create_metadata_version(
        db: Session,
        document_id: int,
        old_metadata: Dict[str, Any],
        new_metadata: Dict[str, Any],
        created_by: str,
        change_reason: Optional[str] = None
    ) -> DocumentVersion:
        """Create a version for metadata-only changes"""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            # Get the current highest version
            latest_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first()
            
            new_version_number = (latest_version.version_number + 1) if latest_version else 1
            
            # Calculate changes
            changes = EnhancedVersionControlService._calculate_metadata_changes(old_metadata, new_metadata)
            
            # Generate changes summary
            changes_summary = f"Metadata update: {', '.join(changes['changed_fields'])}"
            if change_reason:
                changes_summary += f" - {change_reason}"
            
            # Prepare change metadata
            change_metadata = {
                'change_type': 'metadata_update',
                'changed_fields': changes['changed_fields'],
                'field_changes': changes['field_changes'],
                'timestamp': datetime.now().isoformat(),
                'change_reason': change_reason
            }
            
            # Create version record (no file changes)
            new_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=document.filename,  # Keep same filename
                file_path=document.file_path,  # Keep same path
                file_size=document.file_size,
                mime_type=document.mime_type,
                changes_summary=changes_summary,
                change_metadata=change_metadata,
                file_hash=latest_version.file_hash if latest_version else None,
                created_by=created_by,
                is_metadata_only=True
            )
            
            db.add(new_version)
            
            # Mark previous version as replaced
            if latest_version:
                latest_version.replaced_by_version_id = new_version.id
                latest_version.replaced_at = datetime.now()
            
            # Update main document version number
            document.version = new_version_number
            document.updated_at = datetime.now()
            
            db.commit()
            db.refresh(new_version)
            
            logger.info(f"Created metadata version {new_version_number} for document {document_id}")
            return new_version
            
        except Exception as e:
            logger.error(f"Error creating metadata version for document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_version_history_detailed(
        db: Session,
        document_id: int,
        include_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """Get detailed version history with change analysis"""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            # Get all versions
            versions = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).all()
            
            version_history = []
            
            for version in versions:
                version_data = {
                    'id': version.id,
                    'version_number': version.version_number,
                    'filename': version.filename,
                    'file_size': version.file_size,
                    'changes_summary': version.changes_summary,
                    'created_at': version.created_at.isoformat() if version.created_at else None,
                    'created_by': version.created_by,
                    'is_current': version.replaced_by_version_id is None,
                    'is_metadata_only': getattr(version, 'is_metadata_only', False),
                    'file_hash': getattr(version, 'file_hash', None),
                    'change_metadata': version.change_metadata if hasattr(version, 'change_metadata') else {},
                    'replaced_at': version.replaced_at.isoformat() if hasattr(version, 'replaced_at') and version.replaced_at else None
                }
                
                if include_metadata and hasattr(version, 'change_metadata') and version.change_metadata:
                    version_data['detailed_changes'] = version.change_metadata
                
                version_history.append(version_data)
            
            return version_history
            
        except Exception as e:
            logger.error(f"Error getting version history for document {document_id}: {str(e)}")
            raise e
    
    @staticmethod
    def compare_versions(
        db: Session,
        document_id: int,
        version1_id: int,
        version2_id: int
    ) -> Dict[str, Any]:
        """Compare two versions of a document"""
        try:
            version1 = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == version1_id, DocumentVersion.document_id == document_id)
            ).first()
            
            version2 = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == version2_id, DocumentVersion.document_id == document_id)
            ).first()
            
            if not version1 or not version2:
                raise ValueError("One or both versions not found")
            
            comparison = {
                'version1': {
                    'id': version1.id,
                    'version_number': version1.version_number,
                    'created_at': version1.created_at.isoformat(),
                    'created_by': version1.created_by,
                    'file_size': version1.file_size,
                    'changes_summary': version1.changes_summary
                },
                'version2': {
                    'id': version2.id,
                    'version_number': version2.version_number,
                    'created_at': version2.created_at.isoformat(),
                    'created_by': version2.created_by,
                    'file_size': version2.file_size,
                    'changes_summary': version2.changes_summary
                },
                'differences': {
                    'file_size_change': version2.file_size - version1.file_size,
                    'time_between_versions': (version2.created_at - version1.created_at).total_seconds(),
                    'different_creators': version1.created_by != version2.created_by
                }
            }
            
            # Compare file hashes if available
            if hasattr(version1, 'file_hash') and hasattr(version2, 'file_hash'):
                comparison['differences']['file_content_changed'] = version1.file_hash != version2.file_hash
            
            # Compare change metadata if available
            if (hasattr(version1, 'change_metadata') and hasattr(version2, 'change_metadata') and 
                version1.change_metadata and version2.change_metadata):
                comparison['change_analysis'] = EnhancedVersionControlService._compare_change_metadata(
                    version1.change_metadata, version2.change_metadata
                )
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing versions: {str(e)}")
            raise e
    
    @staticmethod
    def rollback_to_version(
        db: Session,
        document_id: int,
        target_version_id: int,
        rollback_reason: str,
        created_by: str
    ) -> DocumentVersion:
        """Rollback document to a specific version"""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            target_version = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == target_version_id, DocumentVersion.document_id == document_id)
            ).first()
            
            if not target_version:
                raise ValueError("Target version not found")
            
            # Create a new version that restores the target version
            current_version_number = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first().version_number
            
            new_version_number = current_version_number + 1
            
            # Copy the target version file to a new location
            target_file_path = Path(target_version.file_path)
            if not target_file_path.exists():
                raise ValueError(f"Target version file not found: {target_file_path}")
            
            # Generate new filename
            file_extension = target_file_path.suffix
            new_filename = f"{document.participant_id}_{document_id}_v{new_version_number}{file_extension}"
            version_dir = target_file_path.parent
            new_file_path = version_dir / new_filename
            
            # Copy file
            shutil.copy2(target_file_path, new_file_path)
            
            # Calculate file hash
            file_hash = EnhancedVersionControlService._calculate_file_hash(str(new_file_path))
            
            # Prepare rollback metadata
            rollback_metadata = {
                'change_type': 'rollback',
                'rolled_back_to_version': target_version.version_number,
                'rollback_reason': rollback_reason,
                'timestamp': datetime.now().isoformat(),
                'file_hash': file_hash
            }
            
            # Create new version record
            rollback_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=new_filename,
                file_path=str(new_file_path),
                file_size=target_version.file_size,
                mime_type=target_version.mime_type,
                changes_summary=f"Rolled back to version {target_version.version_number}: {rollback_reason}",
                change_metadata=rollback_metadata,
                file_hash=file_hash,
                created_by=created_by
            )
            
            db.add(rollback_version)
            
            # Update main document
            document.filename = new_filename
            document.file_path = str(new_file_path)
            document.version = new_version_number
            document.file_size = target_version.file_size
            document.updated_at = datetime.now()
            
            # Mark current version as replaced
            current_version = db.query(DocumentVersion).filter(
                and_(
                    DocumentVersion.document_id == document_id,
                    DocumentVersion.replaced_by_version_id.is_(None),
                    DocumentVersion.id != rollback_version.id
                )
            ).first()
            
            if current_version:
                current_version.replaced_by_version_id = rollback_version.id
                current_version.replaced_at = datetime.now()
            
            db.commit()
            db.refresh(rollback_version)
            
            logger.info(f"Rolled back document {document_id} to version {target_version.version_number}")
            return rollback_version
            
        except Exception as e:
            logger.error(f"Error rolling back document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_version_analytics(
        db: Session,
        document_id: int
    ) -> Dict[str, Any]:
        """Get analytics about document version history"""
        try:
            versions = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(DocumentVersion.version_number).all()
            
            if not versions:
                return {'error': 'No versions found'}
            
            # Calculate analytics
            total_versions = len(versions)
            
            # File size evolution
            file_sizes = [v.file_size for v in versions]
            size_changes = [file_sizes[i] - file_sizes[i-1] for i in range(1, len(file_sizes))]
            
            # Version frequency (versions per day)
            if total_versions > 1:
                time_span = (versions[-1].created_at - versions[0].created_at).total_seconds()
                versions_per_day = total_versions / (time_span / 86400) if time_span > 0 else 0
            else:
                versions_per_day = 0
            
            # Contributors
            contributors = list(set([v.created_by for v in versions if v.created_by]))
            
            # Change types
            change_types = {}
            for v in versions:
                if hasattr(v, 'change_metadata') and v.change_metadata:
                    change_type = v.change_metadata.get('change_type', 'unknown')
                    change_types[change_type] = change_types.get(change_type, 0) + 1
            
            analytics = {
                'total_versions': total_versions,
                'first_version_date': versions[0].created_at.isoformat(),
                'latest_version_date': versions[-1].created_at.isoformat(),
                'unique_contributors': len(contributors),
                'contributors': contributors,
                'versions_per_day': round(versions_per_day, 2),
                'file_size_evolution': {
                    'initial_size': file_sizes[0],
                    'current_size': file_sizes[-1],
                    'total_size_change': file_sizes[-1] - file_sizes[0],
                    'largest_size': max(file_sizes),
                    'smallest_size': min(file_sizes),
                    'average_size_change': sum(size_changes) / len(size_changes) if size_changes else 0
                },
                'change_type_distribution': change_types,
                'rollback_count': sum(1 for v in versions if hasattr(v, 'change_metadata') and 
                                   v.change_metadata and v.change_metadata.get('change_type') == 'rollback')
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting version analytics for document {document_id}: {str(e)}")
            raise e
    
    @staticmethod
    def cleanup_old_versions(
        db: Session,
        document_id: int,
        keep_versions: int = 10,
        keep_days: int = 90
    ) -> Dict[str, int]:
        """Clean up old document versions while preserving important ones"""
        try:
            # Get all versions except current
            all_versions = db.query(DocumentVersion).filter(
                and_(
                    DocumentVersion.document_id == document_id,
                    DocumentVersion.replaced_by_version_id.isnot(None)  # Not current version
                )
            ).order_by(desc(DocumentVersion.version_number)).all()
            
            cutoff_date = datetime.now() - timedelta(days=keep_days)
            
            # Determine versions to keep
            versions_to_keep = set()
          
            # Keep recent versions
            for version in all_versions[:keep_versions]:
                versions_to_keep.add(version.id)
            
            # Keep versions newer than cutoff date
            for version in all_versions:
                if version.created_at > cutoff_date:
                    versions_to_keep.add(version.id)
            
            # Keep milestone versions (every 10th version)
            for version in all_versions:
                if version.version_number % 10 == 0:
                    versions_to_keep.add(version.id)
            
            # Keep rollback versions
            for version in all_versions:
                if (hasattr(version, 'change_metadata') and version.change_metadata and 
                    version.change_metadata.get('change_type') == 'rollback'):
                    versions_to_keep.add(version.id)
            
            # Delete versions not in keep set
            deleted_count = 0
            deleted_size = 0
            
            for version in all_versions:
                if version.id not in versions_to_keep:
                    # Delete file if it exists
                    if os.path.exists(version.file_path):
                        file_size = os.path.getsize(version.file_path)
                        os.remove(version.file_path)
                        deleted_size += file_size
                    
                    # Delete database record
                    db.delete(version)
                    deleted_count += 1
            
            db.commit()
            
            cleanup_result = {
                'deleted_versions': deleted_count,
                'kept_versions': len(versions_to_keep),
                'deleted_file_size': deleted_size,
                'total_versions_before': len(all_versions)
            }
            
            logger.info(f"Cleaned up {deleted_count} versions for document {document_id}")
            return cleanup_result
            
        except Exception as e:
            logger.error(f"Error cleaning up versions for document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    # Helper methods
    
    @staticmethod
    def _calculate_file_hash(file_path: str) -> str:
        """Calculate SHA-256 hash of file"""
        try:
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""
        
    @staticmethod
    def _calculate_metadata_changes(
        old_metadata: Dict[str, Any],
        new_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate changes between metadata dictionaries"""
        changes = {
            'changed_fields': [],
            'field_changes': {}
        }
        
        all_fields = set(old_metadata.keys()) | set(new_metadata.keys())
        
        for field in all_fields:
            old_value = old_metadata.get(field)
            new_value = new_metadata.get(field)
            
            if old_value != new_value:
                changes['changed_fields'].append(field)
                changes['field_changes'][field] = {
                    'old_value': old_value,
                    'new_value': new_value,
                    'change_type': 'modified' if field in old_metadata and field in new_metadata
                                 else 'added' if field not in old_metadata
                                 else 'removed'
                }
        
        return changes
    
    @staticmethod
    def _compare_change_metadata(
        metadata1: Dict[str, Any],
        metadata2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare change metadata between versions"""
        return {
            'change_type_1': metadata1.get('change_type'),
            'change_type_2': metadata2.get('change_type'),
            'different_change_types': metadata1.get('change_type') != metadata2.get('change_type'),
            'file_size_change_1': metadata1.get('file_size_change', 0),
            'file_size_change_2': metadata2.get('file_size_change', 0),
            'affected_fields_1': metadata1.get('affected_fields', []),
            'affected_fields_2': metadata2.get('affected_fields', [])
        }

