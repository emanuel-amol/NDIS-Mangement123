from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# ---------------------------------------------------------------------------
# Pydantic schema definitions
#
# This module contains request/response Pydantic models used across the
# FastAPI application. Models are organised and grouped by feature area:
#  - Candidate models
#  - User models
#  - Candidate profile models
#  - Admin / list / response models
#  - Notes, status, assessment, references, account payloads
#
# Only semantic comments are added here to improve readability. No runtime
# behavior or model definitions are modified.
# ---------------------------------------------------------------------------


## ---------------------
## Candidate schemas
## ---------------------

class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateOut(CandidateBase):
    id: int
    status: str
    applied_on: datetime

    class Config:
        from_attributes = True


class CandidateWithProfile(BaseModel):
    candidate: CandidateOut
    profile: Optional["CandidateProfileOut"] = None

###

## ---------------------
## User schemas
## ---------------------

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str



### ---------------------
### Candidate profile schemas
### ---------------------

class CandidateProfileBase(BaseModel):
    summary: Optional[str] = None
    skills: Optional[str] = None
    linkedin: Optional[str] = None
    address: Optional[str] = None
    # Arbitrary additional fields stored as JSON; accepted as dict on input
    extras: Optional[dict] = None

class CandidateProfileUpdate(CandidateProfileBase):
    pass

class CandidateProfileOut(CandidateProfileBase):
    id: int
    resume_path: Optional[str] = None
    photo_path: Optional[str] = None
    # When returning from DB, extras is stored as JSON text; keep as string for compatibility
    extras: Optional[str] = None
    # When returned as JSON
    class Config:
        from_attributes = True


## ---------------------
## Admin / list / response schemas
## ---------------------

class AdminMetrics(BaseModel):
    candidates: int
    users: int
    training: int


class AdminUserCreatePayload(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    mobile: Optional[str] = None
    status: Optional[str] = "Applied"
    address: Optional[str] = None


class AdminUserCreateResponse(BaseModel):
    user: UserOut
    candidate: CandidateOut
    temp_password: str


class WorkerQueryFilters(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    q: Optional[str] = None


class WorkerUserOut(BaseModel):
    user: UserOut
    candidate: CandidateOut


class WorkerListResponse(BaseModel):
    results: list[WorkerUserOut]
    filters: WorkerQueryFilters
    roles: list[str]
    status_options: list[str]


class CandidateListResponse(BaseModel):
    results: list[CandidateWithProfile]


class ApplicantListResponse(BaseModel):
    results: list[CandidateOut]


class ApplicantsPageResponse(BaseModel):
    applicants: list[CandidateOut]
    total: Optional[int] = None
    roles: list[str] = []
    status_options: list[str] = []


class ApplicantConvertResponse(BaseModel):
    detail: str


## ---------------------
## Misc responses
## ---------------------

class MeResponse(BaseModel):
    user: UserOut
    candidate: Optional[CandidateOut] = None
    profile: Optional[CandidateProfileOut] = None
    # Added for client-side RBAC gating
    role: Optional[str] = None
    permissions: Optional[list[str]] = None


class ProfileUpdatePayload(CandidateProfileUpdate):
    job_title: Optional[str] = None


class ProfileResponse(BaseModel):
    candidate: CandidateOut
    profile: CandidateProfileOut


class ProfileUploadResponse(BaseModel):
    candidate_id: int
    kind: str
    path: str


## ---------------------
## Simple payloads (messages/notes/status)
## ---------------------

class SimpleMessage(BaseModel):
    message: str


# Notes payloads
class NotesPayload(BaseModel):
    general_notes: Optional[str] = None
    interview_notes: Optional[str] = None


class NotesResponse(NotesPayload):
    pass


# Status update
class StatusUpdatePayload(BaseModel):
    status: str


class CandidateStatusResponse(BaseModel):
    id: int
    status: str


# Assessment payloads
class AssessmentPayload(BaseModel):
    assessment_date: Optional[str] = None
    interview_questions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    rejection_notes: Optional[str] = None
    role: Optional[str] = None
    employment_type: Optional[str] = None
    salary_slab: Optional[str] = None


class AssessmentResponse(AssessmentPayload):
    pass


# Reference verification
## ---------------------
## Reference verification and listing
## ---------------------

class ReferenceInvitePayload(BaseModel):
    referee_name: str
    referee_email: EmailStr


class ReferenceInviteResponse(BaseModel):
    token: str
    link: str
    message: str


class ReferenceVerifyInfo(BaseModel):
    candidate_name: str
    referee_name: str
    status: str


class ReferenceSubmissionPayload(BaseModel):
    token: str
    relationship: Optional[str] = None
    comments: Optional[str] = None
    recommend: Optional[bool] = None


class ReferenceSubmissionResponse(BaseModel):
    message: str


# Reference listing (admin)
class ReferenceEntry(BaseModel):
    token: str
    referee_name: str
    referee_email: EmailStr
    status: str
    submitted_at: Optional[int] = None
    relationship: Optional[str] = None
    comments: Optional[str] = None
    recommend: Optional[bool] = None


class ReferenceListResponse(BaseModel):
    references: list[ReferenceEntry]


# Account updates
## ---------------------
## Account update payloads
## ---------------------

class EmailChangePayload(BaseModel):
    new_email: EmailStr


class PasswordChangePayload(BaseModel):
    new_password: str
    confirm_password: str
