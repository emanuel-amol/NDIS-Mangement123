from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.models.sil import (
    Home,
    HomeProfile,
    HomePropertyDetail,
    HomeSharedSpace,
    HomeFeature,
    Room,
    RoomDetail,
    RoomImage,
    Occupancy,
    MaintenanceRequest,
    MaintenanceAttachment,
    MaintenanceAudit,
    PreventiveSchedule,
    HomeNote,
    HomeNoteAttachment,
)
from app.schemas.sil import (
    HomeResponse,
    HomeSummary,
    HomeCreatePayload,
    HomeUpdatePayload,
    HomeStatsResponse,
    RoomCreate,
    RoomUpdate,
    RoomResponse,
    OccupancyCreate,
    OccupancyResponse,
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceAuditResponse,
    MaintenanceOverviewItem,
    PreventiveScheduleCreate,
    PreventiveScheduleResponse,
    NoteCreate,
    NoteResponse,
    AttachmentResponse,
)

router = APIRouter(prefix="/sil", tags=["sil"])


# ============================================================================
# HOMES - List & Summary
# ============================================================================


@router.get("/homes", response_model=List[HomeSummary])
def get_homes(db: Session = Depends(get_db)):
    """Get all SIL homes with summary information."""
    homes = db.query(Home).options(
        joinedload(Home.profile),
        joinedload(Home.property_detail),
        joinedload(Home.rooms),
    ).all()

    result = []
    for home in homes:
        rooms_total = len(home.rooms)
        rooms_available = sum(1 for r in home.rooms if (r.occupancy_status or "").lower() == "vacant")

        result.append(
            HomeSummary(
                id=home.id,
                displayName=home.profile.display_name if home.profile else home.address,
                address=home.address,
                state=home.state,
                postalCode=home.postal_code,
                propertyType=home.property_type,
                sdaType=home.sda_type,
                status=home.status,
                assignedManager=home.profile.assigned_manager if home.profile else None,
                roomsTotal=rooms_total,
                roomsAvailable=rooms_available,
                bathrooms=home.property_detail.bathrooms if home.property_detail else 0,
                updatedAt=home.updated_at,
            )
        )

    return result


@router.get("/homes/summary/stats", response_model=HomeStatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Get portfolio-wide statistics."""
    total_homes = db.query(func.count(Home.id)).scalar() or 0

    rooms = db.query(Room).all()
    available_rooms = sum(1 for r in rooms if (r.occupancy_status or "").lower() == "vacant")
    occupied_rooms = sum(1 for r in rooms if (r.occupancy_status or "").lower() == "occupied")

    pending_maintenance = (
        db.query(func.count(MaintenanceRequest.id))
        .filter(MaintenanceRequest.status.notin_(["Completed", "Cancelled"]))
        .scalar()
        or 0
    )

    return HomeStatsResponse(
        totalHomes=total_homes,
        availableRooms=available_rooms,
        occupiedRooms=occupied_rooms,
        pendingMaintenance=pending_maintenance,
    )


# ============================================================================
# HOMES - CRUD
# ============================================================================


@router.get("/homes/{home_id}", response_model=HomeResponse)
def get_home(home_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific home."""
    home = (
        db.query(Home)
        .options(
            joinedload(Home.profile),
            joinedload(Home.property_detail),
            joinedload(Home.shared_spaces),
            joinedload(Home.features),
            joinedload(Home.rooms).joinedload(Room.detail),
            joinedload(Home.rooms).joinedload(Room.images),
            joinedload(Home.rooms).joinedload(Room.occupancies),
            joinedload(Home.notes).joinedload(HomeNote.attachments),
            joinedload(Home.maintenance_requests).joinedload(MaintenanceRequest.attachments),
        )
        .filter(Home.id == home_id)
        .first()
    )

    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    return HomeResponse.model_validate(home)


@router.post("/homes", response_model=HomeResponse, status_code=201)
def create_home(payload: HomeCreatePayload, db: Session = Depends(get_db)):
    """Create a new SIL home."""
    # Create home
    home = Home(
        address=payload.home.address,
        state=payload.home.state,
        postal_code=payload.home.postal_code,
        property_type=payload.home.property_type,
        sda_type=payload.home.sda_type,
        status=payload.home.status,
        description=payload.home.description,
    )
    db.add(home)
    db.flush()

    # Create profile
    profile = HomeProfile(
        home_id=home.id,
        display_name=payload.profile.display_name,
        assigned_manager=payload.profile.assigned_manager,
        latitude=payload.profile.latitude,
        longitude=payload.profile.longitude,
    )
    db.add(profile)

    # Create property detail
    detail = HomePropertyDetail(
        home_id=home.id,
        total_rooms=payload.property_detail.total_rooms,
        bathrooms=payload.property_detail.bathrooms,
        kitchens=payload.property_detail.kitchens,
        parking_spaces=payload.property_detail.parking_spaces,
    )
    db.add(detail)

    # Create shared spaces
    for space_data in payload.shared_spaces:
        space = HomeSharedSpace(home_id=home.id, name=space_data.name)
        db.add(space)

    # Create features
    for feature_data in payload.features:
        feature = HomeFeature(
            home_id=home.id,
            feature_name=feature_data.feature_name,
            is_available=feature_data.is_available,
        )
        db.add(feature)

    db.commit()
    db.refresh(home)

    return get_home(home.id, db)


@router.put("/homes/{home_id}", response_model=HomeResponse)
def update_home(home_id: int, payload: HomeUpdatePayload, db: Session = Depends(get_db)):
    """Update an existing SIL home."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    # Update home fields
    home.address = payload.home.address
    home.state = payload.home.state
    home.postal_code = payload.home.postal_code
    home.property_type = payload.home.property_type
    home.sda_type = payload.home.sda_type
    home.status = payload.home.status
    home.description = payload.home.description

    # Update profile
    if home.profile:
        home.profile.display_name = payload.profile.display_name
        home.profile.assigned_manager = payload.profile.assigned_manager
        home.profile.latitude = payload.profile.latitude
        home.profile.longitude = payload.profile.longitude
    else:
        profile = HomeProfile(
            home_id=home.id,
            display_name=payload.profile.display_name,
            assigned_manager=payload.profile.assigned_manager,
            latitude=payload.profile.latitude,
            longitude=payload.profile.longitude,
        )
        db.add(profile)

    # Update property detail
    if home.property_detail:
        home.property_detail.total_rooms = payload.property_detail.total_rooms
        home.property_detail.bathrooms = payload.property_detail.bathrooms
        home.property_detail.kitchens = payload.property_detail.kitchens
        home.property_detail.parking_spaces = payload.property_detail.parking_spaces
    else:
        detail = HomePropertyDetail(
            home_id=home.id,
            total_rooms=payload.property_detail.total_rooms,
            bathrooms=payload.property_detail.bathrooms,
            kitchens=payload.property_detail.kitchens,
            parking_spaces=payload.property_detail.parking_spaces,
        )
        db.add(detail)

    # Replace shared spaces
    db.query(HomeSharedSpace).filter(HomeSharedSpace.home_id == home_id).delete()
    for space_data in payload.shared_spaces:
        space = HomeSharedSpace(home_id=home.id, name=space_data.name)
        db.add(space)

    # Replace features
    db.query(HomeFeature).filter(HomeFeature.home_id == home_id).delete()
    for feature_data in payload.features:
        feature = HomeFeature(
            home_id=home.id,
            feature_name=feature_data.feature_name,
            is_available=feature_data.is_available,
        )
        db.add(feature)

    db.commit()
    db.refresh(home)

    return get_home(home.id, db)


@router.delete("/homes/{home_id}", status_code=204)
def delete_home(home_id: int, db: Session = Depends(get_db)):
    """Delete a SIL home."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    db.delete(home)
    db.commit()
    return None


# ============================================================================
# ROOMS
# ============================================================================


@router.get("/homes/{home_id}/rooms", response_model=List[RoomResponse])
def get_rooms(home_id: int, db: Session = Depends(get_db)):
    """Get all rooms for a home."""
    rooms = (
        db.query(Room)
        .options(
            joinedload(Room.detail),
            joinedload(Room.images),
            joinedload(Room.occupancies),
        )
        .filter(Room.home_id == home_id)
        .all()
    )

    return [RoomResponse.model_validate(room) for room in rooms]


@router.post("/homes/{home_id}/rooms", response_model=RoomResponse, status_code=201)
def create_room(home_id: int, payload: RoomCreate, db: Session = Depends(get_db)):
    """Create a new room in a home."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    room = Room(
        home_id=home_id,
        bed_type=payload.bed_type,
        rent_amount=payload.rent_amount,
        rent_frequency=payload.rent_frequency,
        ensuite=payload.ensuite,
        furnishings=payload.furnishings,
        occupancy_status=payload.occupancy_status,
    )
    db.add(room)
    db.flush()

    detail = RoomDetail(
        room_id=room.id,
        name=payload.detail.name,
        bed_height=payload.detail.bed_height,
        sofas=payload.detail.sofas,
        cupboard=payload.detail.cupboard,
        tv=payload.detail.tv,
        tables=payload.detail.tables,
        door_width=payload.detail.door_width,
        description=payload.detail.description,
    )
    db.add(detail)

    db.commit()
    db.refresh(room)

    return RoomResponse.model_validate(room)


@router.put("/rooms/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, payload: RoomUpdate, db: Session = Depends(get_db)):
    """Update a room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room.bed_type = payload.bed_type
    room.rent_amount = payload.rent_amount
    room.rent_frequency = payload.rent_frequency
    room.ensuite = payload.ensuite
    room.furnishings = payload.furnishings
    room.occupancy_status = payload.occupancy_status

    if room.detail:
        room.detail.name = payload.detail.name
        room.detail.bed_height = payload.detail.bed_height
        room.detail.sofas = payload.detail.sofas
        room.detail.cupboard = payload.detail.cupboard
        room.detail.tv = payload.detail.tv
        room.detail.tables = payload.detail.tables
        room.detail.door_width = payload.detail.door_width
        room.detail.description = payload.detail.description
    else:
        detail = RoomDetail(
            room_id=room.id,
            name=payload.detail.name,
            bed_height=payload.detail.bed_height,
            sofas=payload.detail.sofas,
            cupboard=payload.detail.cupboard,
            tv=payload.detail.tv,
            tables=payload.detail.tables,
            door_width=payload.detail.door_width,
            description=payload.detail.description,
        )
        db.add(detail)

    db.commit()
    db.refresh(room)

    return RoomResponse.model_validate(room)


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    """Delete a room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    db.delete(room)
    db.commit()
    return None


# ============================================================================
# OCCUPANCY
# ============================================================================


@router.post("/rooms/{room_id}/occupancies", response_model=OccupancyResponse, status_code=201)
def assign_occupancy(room_id: int, payload: OccupancyCreate, db: Session = Depends(get_db)):
    """Assign a participant to a room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    occupancy = Occupancy(
        room_id=room_id,
        participant_id=payload.participant_id,
        move_in_date=payload.move_in_date,
        move_out_date=payload.move_out_date,
    )
    db.add(occupancy)

    # Update room status
    if not payload.move_out_date:
        room.occupancy_status = "Occupied"

    db.commit()
    db.refresh(occupancy)

    return OccupancyResponse.model_validate(occupancy)


@router.patch("/occupancies/{occupancy_id}", response_model=OccupancyResponse)
def update_occupancy(occupancy_id: int, payload: OccupancyCreate, db: Session = Depends(get_db)):
    """Update occupancy details."""
    occupancy = db.query(Occupancy).filter(Occupancy.id == occupancy_id).first()
    if not occupancy:
        raise HTTPException(status_code=404, detail="Occupancy not found")

    occupancy.participant_id = payload.participant_id
    occupancy.move_in_date = payload.move_in_date
    occupancy.move_out_date = payload.move_out_date

    # Update room status
    if occupancy.room:
        if payload.move_out_date:
            occupancy.room.occupancy_status = "Vacant"
        else:
            occupancy.room.occupancy_status = "Occupied"

    db.commit()
    db.refresh(occupancy)

    return OccupancyResponse.model_validate(occupancy)


# ============================================================================
# MAINTENANCE
# ============================================================================


@router.get("/homes/{home_id}/maintenance", response_model=List[MaintenanceResponse])
def get_maintenance(home_id: int, db: Session = Depends(get_db)):
    """Get all maintenance requests for a home."""
    requests = (
        db.query(MaintenanceRequest)
        .options(joinedload(MaintenanceRequest.attachments))
        .filter(MaintenanceRequest.home_id == home_id)
        .all()
    )

    return [MaintenanceResponse.model_validate(req) for req in requests]


@router.post("/homes/{home_id}/maintenance", response_model=MaintenanceResponse, status_code=201)
async def create_maintenance(
    home_id: int,
    description: str = Form(...),
    status: str = Form("Open"),
    priority: str = Form("Medium"),
    category: Optional[str] = Form(None),
    assigned_to: Optional[str] = Form(None),
    scheduled_date: Optional[str] = Form(None),
    completed_date: Optional[str] = Form(None),
    cost: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
):
    """Create a maintenance request with optional file attachments."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    request = MaintenanceRequest(
        home_id=home_id,
        description=description,
        status=status,
        priority=priority,
        category=category,
        assigned_to=assigned_to,
        scheduled_date=date.fromisoformat(scheduled_date) if scheduled_date else None,
        completed_date=date.fromisoformat(completed_date) if completed_date else None,
        cost=cost,
        notes=notes,
    )
    db.add(request)
    db.flush()

    # Create audit entry
    audit = MaintenanceAudit(
        maintenance_request_id=request.id,
        action="Created",
        to_status=status,
    )
    db.add(audit)

    # Handle file uploads (simplified - you'd want to use S3 or similar)
    for file in files:
        attachment = MaintenanceAttachment(
            maintenance_request_id=request.id,
            file_name=file.filename,
            object_key=f"maintenance/{request.id}/{file.filename}",
            content_type=file.content_type,
        )
        db.add(attachment)

    db.commit()
    db.refresh(request)

    return MaintenanceResponse.model_validate(request)


@router.patch("/maintenance/{request_id}", response_model=MaintenanceResponse)
def update_maintenance(
    request_id: int,
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
):
    """Update a maintenance request."""
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    old_status = request.status

    request.description = payload.description
    request.status = payload.status
    request.priority = payload.priority
    request.category = payload.category
    request.assigned_to = payload.assigned_to
    request.scheduled_date = payload.scheduled_date
    request.completed_date = payload.completed_date
    request.cost = payload.cost
    request.notes = payload.notes

    # Create audit entry if status changed
    if old_status != payload.status:
        audit = MaintenanceAudit(
            maintenance_request_id=request.id,
            action="StatusChanged",
            from_status=old_status,
            to_status=payload.status,
        )
        db.add(audit)

    db.commit()
    db.refresh(request)

    return MaintenanceResponse.model_validate(request)


@router.get("/maintenance/{request_id}/audits", response_model=List[MaintenanceAuditResponse])
def get_maintenance_audits(request_id: int, db: Session = Depends(get_db)):
    """Get audit trail for a maintenance request."""
    audits = (
        db.query(MaintenanceAudit)
        .filter(MaintenanceAudit.maintenance_request_id == request_id)
        .order_by(MaintenanceAudit.created_at.desc())
        .all()
    )

    return [MaintenanceAuditResponse.model_validate(audit) for audit in audits]


@router.get("/maintenance/search", response_model=List[MaintenanceResponse])
def search_maintenance(
    q: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    home_id: Optional[int] = None,
    assigned_to: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Search maintenance requests with filters."""
    query = db.query(MaintenanceRequest).options(
        joinedload(MaintenanceRequest.attachments)
    )

    if q:
        query = query.filter(
            or_(
                MaintenanceRequest.description.ilike(f"%{q}%"),
                MaintenanceRequest.category.ilike(f"%{q}%"),
                MaintenanceRequest.assigned_to.ilike(f"%{q}%"),
            )
        )

    if status:
        query = query.filter(MaintenanceRequest.status == status)

    if priority:
        query = query.filter(MaintenanceRequest.priority == priority)

    if home_id:
        query = query.filter(MaintenanceRequest.home_id == home_id)

    if assigned_to:
        query = query.filter(MaintenanceRequest.assigned_to.ilike(f"%{assigned_to}%"))

    if start_date:
        query = query.filter(MaintenanceRequest.scheduled_date >= date.fromisoformat(start_date))

    if end_date:
        query = query.filter(MaintenanceRequest.scheduled_date <= date.fromisoformat(end_date))

    results = query.all()
    return [MaintenanceResponse.model_validate(req) for req in results]


@router.get("/maintenance/overview", response_model=List[MaintenanceOverviewItem])
def get_maintenance_overview(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Get maintenance overview grouped by home."""
    homes_query = db.query(Home).options(
        joinedload(Home.profile),
        joinedload(Home.property_detail),
        joinedload(Home.rooms),
        joinedload(Home.maintenance_requests).joinedload(MaintenanceRequest.attachments),
    )

    if search:
        homes_query = homes_query.filter(
            or_(
                Home.address.ilike(f"%{search}%"),
                Home.postal_code.ilike(f"%{search}%"),
                HomeProfile.display_name.ilike(f"%{search}%"),
            )
        ).join(HomeProfile, Home.id == HomeProfile.home_id, isouter=True)

    homes = homes_query.all()

    result = []
    for home in homes:
        open_count = sum(
            1 for req in home.maintenance_requests if (req.status or "").lower() == "open"
        )
        in_progress_count = sum(
            1 for req in home.maintenance_requests if (req.status or "").lower() == "in progress"
        )

        # Get latest 3 requests
        latest = sorted(
            [req for req in home.maintenance_requests if req.status not in ["Completed", "Cancelled"]],
            key=lambda x: x.created_at or datetime.min,
            reverse=True,
        )[:3]

        rooms_total = len(home.rooms)
        rooms_available = sum(1 for r in home.rooms if (r.occupancy_status or "").lower() == "vacant")

        result.append(
            MaintenanceOverviewItem(
                home=HomeSummary(
                    id=home.id,
                    displayName=home.profile.display_name if home.profile else home.address,
                    address=home.address,
                    state=home.state,
                    postalCode=home.postal_code,
                    propertyType=home.property_type,
                    sdaType=home.sda_type,
                    status=home.status,
                    assignedManager=home.profile.assigned_manager if home.profile else None,
                    roomsTotal=rooms_total,
                    roomsAvailable=rooms_available,
                    bathrooms=home.property_detail.bathrooms if home.property_detail else 0,
                    updatedAt=home.updated_at,
                ),
                openRequests=open_count,
                inProgressRequests=in_progress_count,
                latestRequests=[MaintenanceResponse.model_validate(req) for req in latest],
            )
        )

    return result


# ============================================================================
# PREVENTIVE MAINTENANCE SCHEDULES
# ============================================================================


@router.get("/homes/{home_id}/preventive-schedules", response_model=List[PreventiveScheduleResponse])
def list_preventive_schedules(home_id: int, db: Session = Depends(get_db)):
    """List all preventive maintenance schedules for a home."""
    schedules = (
        db.query(PreventiveSchedule)
        .filter(PreventiveSchedule.home_id == home_id)
        .all()
    )

    return [PreventiveScheduleResponse.model_validate(s) for s in schedules]


@router.post("/homes/{home_id}/preventive-schedules", response_model=PreventiveScheduleResponse, status_code=201)
def create_preventive_schedule(
    home_id: int,
    payload: PreventiveScheduleCreate,
    db: Session = Depends(get_db),
):
    """Create a new preventive maintenance schedule."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    schedule = PreventiveSchedule(
        home_id=home_id,
        description=payload.description,
        frequency=payload.frequency,
        interval_days=payload.interval_days,
        assigned_to=payload.assigned_to,
        category=payload.category,
        estimated_cost=payload.estimated_cost,
        next_due_date=payload.next_due_date,
        active=payload.active,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return PreventiveScheduleResponse.model_validate(schedule)


@router.post("/preventive-schedules/{schedule_id}/generate", response_model=MaintenanceResponse, status_code=201)
def generate_from_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Generate a maintenance request from a preventive schedule."""
    schedule = db.query(PreventiveSchedule).filter(PreventiveSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Create maintenance request
    request = MaintenanceRequest(
        home_id=schedule.home_id,
        description=f"[Scheduled] {schedule.description}",
        status="Open",
        priority="Medium",
        category=schedule.category,
        assigned_to=schedule.assigned_to,
        scheduled_date=schedule.next_due_date,
        cost=schedule.estimated_cost,
    )
    db.add(request)

    # Update next due date based on frequency
    if schedule.frequency == "Monthly":
        schedule.next_due_date = schedule.next_due_date + timedelta(days=30)
    elif schedule.frequency == "Quarterly":
        schedule.next_due_date = schedule.next_due_date + timedelta(days=90)
    elif schedule.frequency == "SemiAnnual":
        schedule.next_due_date = schedule.next_due_date + timedelta(days=180)
    elif schedule.frequency == "Annual":
        schedule.next_due_date = schedule.next_due_date + timedelta(days=365)
    elif schedule.frequency == "CustomDays" and schedule.interval_days:
        schedule.next_due_date = schedule.next_due_date + timedelta(days=schedule.interval_days)

    db.commit()
    db.refresh(request)

    return MaintenanceResponse.model_validate(request)


# ============================================================================
# NOTES
# ============================================================================


@router.get("/homes/{home_id}/notes", response_model=List[NoteResponse])
def get_notes(home_id: int, db: Session = Depends(get_db)):
    """Get all notes for a home."""
    notes = (
        db.query(HomeNote)
        .options(joinedload(HomeNote.attachments))
        .filter(HomeNote.home_id == home_id)
        .all()
    )

    return [NoteResponse.model_validate(note) for note in notes]


@router.post("/homes/{home_id}/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    home_id: int,
    note: str = Form(...),
    created_by: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
):
    """Create a note with optional file attachments."""
    home = db.query(Home).filter(Home.id == home_id).first()
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    note_obj = HomeNote(
        home_id=home_id,
        note=note,
        created_by=created_by,
    )
    db.add(note_obj)
    db.flush()

    # Handle file uploads (simplified)
    for file in files:
        attachment = HomeNoteAttachment(
            note_id=note_obj.id,
            file_name=file.filename,
            object_key=f"notes/{note_obj.id}/{file.filename}",
            content_type=file.content_type,
        )
        db.add(attachment)

    db.commit()
    db.refresh(note_obj)

    return NoteResponse.model_validate(note_obj)


# ============================================================================
# ROOM IMAGES
# ============================================================================


@router.post("/rooms/{room_id}/images", response_model=AttachmentResponse, status_code=201)
async def upload_room_image(
    room_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an image for a room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Handle file upload (simplified - you'd want to use S3)
    image = RoomImage(
        room_id=room_id,
        file_name=file.filename,
        object_key=f"rooms/{room_id}/{file.filename}",
        content_type=file.content_type,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return AttachmentResponse(
        id=image.id,
        fileName=image.file_name,
        objectKey=image.object_key,
        url=image.url,
        contentType=image.content_type,
        fileSize=image.file_size,
        createdAt=image.created_at,
    )