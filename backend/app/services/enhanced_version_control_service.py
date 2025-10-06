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

logger = logging.getLogger(__name__)


class EnhancedVersionControlService:
    """Enhanced version control service with granular change tracking"""

    # -----------------------------
    # Version creation
    # -----------------------------
    @staticmethod
    def create_version_with_changes(
        db: Session,
        document_id: int,
        new_file_path: str,
        changes_summary: str,
        created_by: str,
        change_details: Optional[Dict[str, Any]] = None
    ) -> DocumentVersion:
        """
        Create a new version with detailed change tracking.

        Supports:
        - Local filesystem paths (file is copied into a /versions folder next to the source)
        - Cloud/object-storage keys (e.g., IBM COS) — no local copying attempted
        """
        try:
            # 1) Load current document and latest version
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")

            latest_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first()

            new_version_number = (latest_version.version_number + 1) if latest_version else 1

            # 2) Decide whether this path is local or a remote key
            is_local_path = os.path.exists(new_file_path)
            file_size = 0
            file_hash = ""
            version_filename: str
            version_file_path: str

            if is_local_path:
                # --- LOCAL: compute size/hash and place under a single /versions folder ---
                file_size = os.path.getsize(new_file_path)

                try:
                    file_hash = EnhancedVersionControlService._calculate_file_hash(new_file_path)
                except Exception:
                    file_hash = ""

                src = Path(new_file_path)
                # If the uploaded version already lives inside a "versions" folder, don't nest again
                dest_dir = src.parent if src.parent.name == "versions" else (src.parent / "versions")
                dest_dir.mkdir(parents=True, exist_ok=True)

                # keep original suffix, but enforce versioned name
                version_filename = f"{document.participant_id}_{document_id}_v{new_version_number}{src.suffix or ''}"
                dest = dest_dir / version_filename

                # Only copy when src != dest
                if src.resolve() != dest.resolve():
                    shutil.copy2(src, dest)

                version_file_path = str(dest.resolve())
            else:
                # --- REMOTE/OBJECT STORAGE: treat new_file_path as a key; don't copy ---
                # try to get file_size from change_details if provided (optional)
                if change_details and isinstance(change_details.get("file_size"), int):
                    file_size = change_details["file_size"]

                # Use the key's tail as filename if present; otherwise synthesize one
                tail = Path(new_file_path).name
                suffix = Path(tail).suffix
                version_filename = tail or f"{document.participant_id}_{document_id}_v{new_version_number}"
                version_file_path = new_file_path  # store the key directly

            # 3) Prepare metadata
            change_metadata = {
                "change_type": "file_update",
                "file_hash": file_hash or None,
                "file_size_change": (file_size - (document.file_size or 0)),
                "timestamp": datetime.now().isoformat(),
                "user_agent": (change_details or {}).get("user_agent"),
                "ip_address": (change_details or {}).get("ip_address"),
                "change_reason": (change_details or {}).get("change_reason"),
                "affected_fields": (change_details or {}).get("affected_fields", []),
                "storage_type": (change_details or {}).get("storage_type"),
            }

            # 4) Create and flush the new version so it has an id
            new_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=version_filename,
                file_path=version_file_path,
                file_size=file_size,
                mime_type=document.mime_type,
                changes_summary=changes_summary,
                change_metadata=change_metadata,
                file_hash=file_hash or None,
                created_by=created_by,
            )
            db.add(new_version)
            db.flush()  # ensures new_version.id is available

            # 5) Mark previous version as replaced (now that new_version.id exists)
            if latest_version:
                latest_version.replaced_by_version_id = new_version.id
                latest_version.replaced_at = datetime.now()

            # 6) Update the "current" document pointers
            document.filename = version_filename
            document.file_path = version_file_path
            document.version = new_version_number
            document.file_size = file_size
            document.updated_at = datetime.now()

            # If storage type is provided, keep provider/key coherent
            storage_type = (change_details or {}).get("storage_type")
            if storage_type == "cos" or storage_type == "ibm-cos":
                document.storage_provider = "ibm-cos"
                # treat file_path as the key for COS-backed docs
                document.storage_key = version_file_path

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

            latest_version = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first()

            new_version_number = (latest_version.version_number + 1) if latest_version else 1

            changes = EnhancedVersionControlService._calculate_metadata_changes(old_metadata, new_metadata)

            changes_summary = f"Metadata update: {', '.join(changes['changed_fields'])}" if changes["changed_fields"] else "Metadata update"
            if change_reason:
                changes_summary += f" - {change_reason}"

            change_metadata = {
                "change_type": "metadata_update",
                "changed_fields": changes["changed_fields"],
                "field_changes": changes["field_changes"],
                "timestamp": datetime.now().isoformat(),
                "change_reason": change_reason,
            }

            new_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=document.filename,
                file_path=document.file_path,
                file_size=document.file_size or 0,
                mime_type=document.mime_type,
                changes_summary=changes_summary,
                change_metadata=change_metadata,
                file_hash=(latest_version.file_hash if latest_version else None),
                created_by=created_by,
                is_metadata_only=True,
            )
            db.add(new_version)
            db.flush()

            if latest_version:
                latest_version.replaced_by_version_id = new_version.id
                latest_version.replaced_at = datetime.now()

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

    # -----------------------------
    # History / Compare / Rollback
    # -----------------------------
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

            versions = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).all()

            history: List[Dict[str, Any]] = []
            for v in versions:
                row = {
                    "id": v.id,
                    "version_number": v.version_number,
                    "filename": v.filename,
                    "file_size": v.file_size,
                    "changes_summary": v.changes_summary,
                    "created_at": (v.created_at.isoformat() if getattr(v, "created_at", None) else None),
                    "created_by": v.created_by,
                    "is_current": v.replaced_by_version_id is None,
                    "is_metadata_only": getattr(v, "is_metadata_only", False),
                    "file_hash": getattr(v, "file_hash", None),
                    "change_metadata": getattr(v, "change_metadata", {}) or {},
                    "replaced_at": (v.replaced_at.isoformat() if getattr(v, "replaced_at", None) else None),
                }
                if include_metadata and getattr(v, "change_metadata", None):
                    row["detailed_changes"] = v.change_metadata
                history.append(row)

            return history

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
            v1 = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == version1_id, DocumentVersion.document_id == document_id)
            ).first()
            v2 = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == version2_id, DocumentVersion.document_id == document_id)
            ).first()

            if not v1 or not v2:
                raise ValueError("One or both versions not found")

            created_at_1 = getattr(v1, "created_at", None)
            created_at_2 = getattr(v2, "created_at", None)

            comparison = {
                "version1": {
                    "id": v1.id,
                    "version_number": v1.version_number,
                    "created_at": created_at_1.isoformat() if created_at_1 else None,
                    "created_by": v1.created_by,
                    "file_size": v1.file_size,
                    "changes_summary": v1.changes_summary,
                },
                "version2": {
                    "id": v2.id,
                    "version_number": v2.version_number,
                    "created_at": created_at_2.isoformat() if created_at_2 else None,
                    "created_by": v2.created_by,
                    "file_size": v2.file_size,
                    "changes_summary": v2.changes_summary,
                },
                "differences": {
                    "file_size_change": (v2.file_size - v1.file_size),
                    "time_between_versions": (
                        (created_at_2 - created_at_1).total_seconds() if created_at_1 and created_at_2 else None
                    ),
                    "different_creators": (v1.created_by != v2.created_by),
                },
            }

            # Hash comparison (when available)
            if getattr(v1, "file_hash", None) is not None and getattr(v2, "file_hash", None) is not None:
                comparison["differences"]["file_content_changed"] = (v1.file_hash != v2.file_hash)

            # Metadata comparison
            if getattr(v1, "change_metadata", None) and getattr(v2, "change_metadata", None):
                comparison["change_analysis"] = EnhancedVersionControlService._compare_change_metadata(
                    v1.change_metadata, v2.change_metadata
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

            target = db.query(DocumentVersion).filter(
                and_(DocumentVersion.id == target_version_id, DocumentVersion.document_id == document_id)
            ).first()
            if not target:
                raise ValueError("Target version not found")

            current_latest = db.query(DocumentVersion).filter(
                DocumentVersion.document_id == document_id
            ).order_by(desc(DocumentVersion.version_number)).first()
            new_version_number = (current_latest.version_number + 1) if current_latest else 1

            target_path = Path(target.file_path)
            if not target_path.exists():
                # For object storage keys, we cannot copy locally here. Caller should restore via storage service.
                raise ValueError(f"Target version file not found locally: {target_path}")

            # Prepare destination inside the same versions folder
            dest_dir = target_path.parent
            new_filename = f"{document.participant_id}_{document_id}_v{new_version_number}{target_path.suffix}"
            new_path = dest_dir / new_filename
            shutil.copy2(target_path, new_path)

            file_hash = EnhancedVersionControlService._calculate_file_hash(str(new_path))

            rollback_metadata = {
                "change_type": "rollback",
                "rolled_back_to_version": target.version_number,
                "rollback_reason": rollback_reason,
                "timestamp": datetime.now().isoformat(),
                "file_hash": file_hash,
            }

            rollback_version = DocumentVersion(
                document_id=document_id,
                version_number=new_version_number,
                filename=new_filename,
                file_path=str(new_path.resolve()),
                file_size=target.file_size,
                mime_type=target.mime_type,
                changes_summary=f"Rolled back to version {target.version_number}: {rollback_reason}",
                change_metadata=rollback_metadata,
                file_hash=file_hash,
                created_by=created_by,
            )
            db.add(rollback_version)
            db.flush()

            # Mark previous current as replaced
            if current_latest and current_latest.id != rollback_version.id:
                current_latest.replaced_by_version_id = rollback_version.id
                current_latest.replaced_at = datetime.now()

            # Update document pointers
            document.filename = new_filename
            document.file_path = str(new_path.resolve())
            document.version = new_version_number
            document.file_size = target.file_size
            document.updated_at = datetime.now()

            db.commit()
            db.refresh(rollback_version)

            logger.info(f"Rolled back document {document_id} to version {target.version_number}")
            return rollback_version

        except Exception as e:
            logger.error(f"Error rolling back document {document_id}: {str(e)}")
            db.rollback()
            raise e

    # -----------------------------
    # Analytics / Cleanup
    # -----------------------------
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
                return {"error": "No versions found"}

            total_versions = len(versions)
            file_sizes = [v.file_size for v in versions]
            size_changes = [file_sizes[i] - file_sizes[i - 1] for i in range(1, len(file_sizes))]

            if total_versions > 1 and getattr(versions[0], "created_at", None) and getattr(versions[-1], "created_at", None):
                time_span = (versions[-1].created_at - versions[0].created_at).total_seconds()
                versions_per_day = total_versions / (time_span / 86400) if time_span > 0 else 0
            else:
                versions_per_day = 0

            contributors = list({v.created_by for v in versions if v.created_by})

            change_types: Dict[str, int] = {}
            for v in versions:
                md = getattr(v, "change_metadata", {}) or {}
                ct = md.get("change_type", "unknown")
                change_types[ct] = change_types.get(ct, 0) + 1

            analytics = {
                "total_versions": total_versions,
                "first_version_date": (versions[0].created_at.isoformat() if getattr(versions[0], "created_at", None) else None),
                "latest_version_date": (versions[-1].created_at.isoformat() if getattr(versions[-1], "created_at", None) else None),
                "unique_contributors": len(contributors),
                "contributors": contributors,
                "versions_per_day": round(versions_per_day, 2),
                "file_size_evolution": {
                    "initial_size": file_sizes[0],
                    "current_size": file_sizes[-1],
                    "total_size_change": file_sizes[-1] - file_sizes[0],
                    "largest_size": max(file_sizes),
                    "smallest_size": min(file_sizes),
                    "average_size_change": (sum(size_changes) / len(size_changes)) if size_changes else 0,
                },
                "change_type_distribution": change_types,
                "rollback_count": sum(
                    1
                    for v in versions
                    if (getattr(v, "change_metadata", {}) or {}).get("change_type") == "rollback"
                ),
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
        """Clean up old document versions while preserving important ones (local files only)."""
        try:
            all_versions = db.query(DocumentVersion).filter(
                and_(
                    DocumentVersion.document_id == document_id,
                    DocumentVersion.replaced_by_version_id.isnot(None)  # not current
                )
            ).order_by(desc(DocumentVersion.version_number)).all()

            cutoff_date = datetime.now() - timedelta(days=keep_days)

            versions_to_keep = set()

            # Keep most recent N
            for v in all_versions[:keep_versions]:
                versions_to_keep.add(v.id)

            # Keep versions newer than cutoff
            for v in all_versions:
                if getattr(v, "created_at", None) and v.created_at > cutoff_date:
                    versions_to_keep.add(v.id)

            # Keep milestone versions (every 10th)
            for v in all_versions:
                if v.version_number % 10 == 0:
                    versions_to_keep.add(v.id)

            # Keep rollbacks
            for v in all_versions:
                md = getattr(v, "change_metadata", {}) or {}
                if md.get("change_type") == "rollback":
                    versions_to_keep.add(v.id)

            # Delete the rest (local only)
            deleted_count = 0
            deleted_size = 0

            for v in all_versions:
                if v.id in versions_to_keep:
                    continue

                fp = v.file_path
                if fp and os.path.exists(fp):
                    try:
                        size = os.path.getsize(fp)
                        os.remove(fp)
                        deleted_size += size
                    except Exception as e:
                        logger.warning(f"Failed deleting version file {fp}: {e}")

                db.delete(v)
                deleted_count += 1

            db.commit()

            return {
                "deleted_versions": deleted_count,
                "kept_versions": len(versions_to_keep),
                "deleted_file_size": deleted_size,
                "total_versions_before": len(all_versions),
            }

        except Exception as e:
            logger.error(f"Error cleaning up versions for document {document_id}: {str(e)}")
            db.rollback()
            raise e

    # -----------------------------
    # Helpers
    # -----------------------------
    @staticmethod
    def _calculate_file_hash(file_path: str) -> str:
        """Calculate SHA-256 hash of a local file"""
        try:
            hasher = hashlib.sha256()
            with open(file_path, "rb") as f:
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
        changes = {"changed_fields": [], "field_changes": {}}

        all_fields = set(old_metadata.keys()) | set(new_metadata.keys())
        for field in all_fields:
            old_value = old_metadata.get(field)
            new_value = new_metadata.get(field)
            if old_value != new_value:
                changes["changed_fields"].append(field)
                changes["field_changes"][field] = {
                    "old_value": old_value,
                    "new_value": new_value,
                    "change_type": (
                        "modified" if field in old_metadata and field in new_metadata
                        else "added" if field not in old_metadata
                        else "removed"
                    ),
                }
        return changes

    @staticmethod
    def _compare_change_metadata(
        metadata1: Dict[str, Any],
        metadata2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare change metadata between versions"""
        return {
            "change_type_1": metadata1.get("change_type"),
            "change_type_2": metadata2.get("change_type"),
            "different_change_types": metadata1.get("change_type") != metadata2.get("change_type"),
            "file_size_change_1": metadata1.get("file_size_change", 0),
            "file_size_change_2": metadata2.get("file_size_change", 0),
            "affected_fields_1": metadata1.get("affected_fields", []),
            "affected_fields_2": metadata2.get("affected_fields", []),
        }
