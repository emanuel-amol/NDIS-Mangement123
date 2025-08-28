# backend/app/api/v1/sil_homes.py
from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime

from app.schemas.sil_home import (
    SILHomeCreate, 
    SILHomeResponse,
    RoomCreate,
    RoomResponse
)

router = APIRouter()

# In-memory storage (replace with database later)
sil_homes_db = {}
rooms_db = {}

@router.post("/", response_model=SILHomeResponse)
async def create_sil_home(home: SILHomeCreate):
    """Create a new SIL home"""
    home_id = str(uuid.uuid4())
    now = datetime.now()
    
    home_data = {
        "id": home_id,
        **home.dict(),
        "status": "available",
        "created_at": now,
        "updated_at": now
    }
    
    sil_homes_db[home_id] = home_data
    return SILHomeResponse(**home_data)

@router.get("/", response_model=List[SILHomeResponse])
async def get_sil_homes():
    """Get all SIL homes"""
    return list(sil_homes_db.values())

@router.get("/{home_id}", response_model=SILHomeResponse)
async def get_sil_home(home_id: str):
    """Get a specific SIL home"""
    if home_id not in sil_homes_db:
        raise HTTPException(status_code=404, detail="SIL home not found")
    return SILHomeResponse(**sil_homes_db[home_id])

@router.put("/{home_id}/status")
async def update_home_status(home_id: str, status: str):
    """Update home availability status"""
    if home_id not in sil_homes_db:
        raise HTTPException(status_code=404, detail="SIL home not found")
    
    if status not in ["available", "not_available"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    sil_homes_db[home_id]["status"] = status
    sil_homes_db[home_id]["updated_at"] = datetime.now()
    
    return {"message": "Status updated successfully", "status": status}

@router.post("/{home_id}/rooms", response_model=RoomResponse)
async def create_room(home_id: str, room: RoomCreate):
    """Add a room to a SIL home"""
    if home_id not in sil_homes_db:
        raise HTTPException(status_code=404, detail="SIL home not found")
    
    room_id = str(uuid.uuid4())
    now = datetime.now()
    
    room_data = {
        "id": room_id,
        "home_id": home_id,
        **room.dict(exclude={"home_id"}),
        "participant_id": None,
        "occupied": False,
        "created_at": now,
        "updated_at": now
    }
    
    rooms_db[room_id] = room_data
    return RoomResponse(**room_data)

@router.get("/{home_id}/rooms", response_model=List[RoomResponse])
async def get_home_rooms(home_id: str):
    """Get all rooms for a specific home"""
    if home_id not in sil_homes_db:
        raise HTTPException(status_code=404, detail="SIL home not found")
    
    rooms = [room for room in rooms_db.values() if room["home_id"] == home_id]
    return [RoomResponse(**room) for room in rooms]

@router.put("/rooms/{room_id}/assign")
async def assign_participant_to_room(room_id: str, participant_id: str):
    """Assign a participant to a room"""
    if room_id not in rooms_db:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms_db[room_id]
    if room["occupied"]:
        raise HTTPException(status_code=400, detail="Room is already occupied")
    
    rooms_db[room_id]["participant_id"] = participant_id
    rooms_db[room_id]["occupied"] = True
    rooms_db[room_id]["updated_at"] = datetime.now()
    
    return {"message": "Participant assigned to room successfully"}

@router.put("/rooms/{room_id}/unassign")
async def unassign_participant_from_room(room_id: str):
    """Remove participant assignment from a room"""
    if room_id not in rooms_db:
        raise HTTPException(status_code=404, detail="Room not found")
    
    rooms_db[room_id]["participant_id"] = None
    rooms_db[room_id]["occupied"] = False
    rooms_db[room_id]["updated_at"] = datetime.now()
    
    return {"message": "Participant unassigned from room successfully"}