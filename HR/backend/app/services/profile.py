"""Profile related helpers shared between the HTML and JSON routes."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
import re
import time

from fastapi import HTTPException
from starlette.datastructures import UploadFile
from sqlalchemy.orm import Session

from app import crud, models

# Align BASE_DIR with the application root used by main.py so the
# saved files live under the same `uploads` directory that FastAPI
# mounts at /uploads. main.py's BASE_DIR points to the repository
# backend folder (two levels up from this file), so move BASE_DIR
# up one additional level here.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


async def save_profile_upload(
    *,
    candidate: models.Candidate,
    kind: str,
    file: UploadFile,
    db: Session,
) -> str:
    """Persist an uploaded resume/photo and update the candidate profile."""

    normalized_kind = "photo" if kind == "picture" else kind
    if normalized_kind not in {"resume", "photo"}:
        raise HTTPException(status_code=400, detail="kind must be 'resume' or 'photo'")

    filename = file.filename or ""
    default_ext = ".png" if normalized_kind == "photo" else ".pdf"
    ext = os.path.splitext(filename)[1] or default_ext

    folder = UPLOAD_DIR / str(candidate.id)
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f"{normalized_kind}{ext}"

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")

    with open(dest, "wb") as buffer:
        buffer.write(contents)

    relative_path = str(dest.relative_to(BASE_DIR))
    crud.set_profile_file(db, candidate.id, normalized_kind, relative_path)
    return relative_path


def delete_profile_file(*, candidate: 'models.Candidate', kind: str, db: Session) -> None:
    """Remove the stored file for a candidate and clear the DB reference.

    This function is synchronous because file removal is quick and the
    HTTP handlers that call it run in threadpool workers by default.
    """
    normalized_kind = "photo" if kind == "picture" else kind
    if normalized_kind not in {"resume", "photo"}:
        raise HTTPException(status_code=400, detail="kind must be 'resume' or 'photo'")

    folder = UPLOAD_DIR / str(candidate.id)
    # expected filename pattern: resume.pdf or photo.png
    # remove any file that starts with the normalized_kind
    if folder.exists() and folder.is_dir():
        for child in folder.iterdir():
            if child.name.startswith(normalized_kind):
                try:
                    child.unlink()
                except Exception:
                    # non-fatal; continue to attempt DB update
                    pass

    # clear DB reference
    crud.clear_profile_file(db, candidate.id, normalized_kind)


# =========================
# Generic Documents Handling
# =========================

def _docs_root(candidate: 'models.Candidate') -> Path:
    return UPLOAD_DIR / str(candidate.id) / "docs"


def _safe_segment(name: str) -> str:
    # allow alnum, dash, underscore, space; collapse others to underscore
    cleaned = re.sub(r"[^A-Za-z0-9\-_. ]+", "_", name.strip())
    return cleaned[:128] or "untitled"


def create_documents_folder(*, candidate: 'models.Candidate', name: str, parent: Optional[str] = None) -> str:
    root = _docs_root(candidate)
    base = root
    if parent:
        base = root / _safe_segment(parent)
        base.mkdir(parents=True, exist_ok=True)
    folder = base / _safe_segment(name)
    folder.mkdir(parents=True, exist_ok=True)
    return str(folder.relative_to(BASE_DIR))


async def save_document_upload(
    *, candidate: 'models.Candidate', file: UploadFile, folder: Optional[str] = None
) -> str:
    root = _docs_root(candidate)
    if folder:
        # prevent path traversal
        folder_path = root / _safe_segment(folder)
    else:
        folder_path = root
    folder_path.mkdir(parents=True, exist_ok=True)

    filename = file.filename or f"file_{int(time.time())}"
    name = _safe_segment(filename)
    dest = folder_path / name

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")
    with open(dest, "wb") as f:
        f.write(contents)

    return str(dest.relative_to(BASE_DIR))


def list_documents(*, candidate: 'models.Candidate') -> List[Dict[str, Any]]:
    root = _docs_root(candidate)
    if not root.exists():
        return []
    items: List[Dict[str, Any]] = []
    for p in sorted(root.rglob("*")):
        rel = p.relative_to(root)
        # one-level display (folders/files under docs/*/* are allowed but we report relative path)
        try:
            stat = p.stat()
        except OSError:
            continue
        items.append(
            {
                "name": rel.name,
                "path": str((UPLOAD_DIR / str(candidate.id) / "docs" / rel).relative_to(BASE_DIR)),
                "is_dir": p.is_dir(),
                "size": 0 if p.is_dir() else stat.st_size,
                "modified": int(stat.st_mtime),
            }
        )
    return items


def delete_document(*, candidate: 'models.Candidate', rel_path: str) -> None:
    # rel_path is expected to be a relative path beginning with 'uploads/<id>/docs/'
    path = BASE_DIR / rel_path
    root = _docs_root(candidate)
    # enforce that path is within the docs root
    try:
        path.resolve().relative_to(root.resolve())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document path")

    if path.exists():
        if path.is_dir():
            # delete empty folder only
            try:
                path.rmdir()
            except OSError:
                raise HTTPException(status_code=400, detail="Folder is not empty")
        else:
            try:
                path.unlink()
            except OSError:
                raise HTTPException(status_code=400, detail="Unable to delete file")
