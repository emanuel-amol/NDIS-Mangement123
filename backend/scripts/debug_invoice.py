import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Check roster
print("=== ROSTER ===")
result = db.execute(text('SELECT * FROM rosters WHERE id=1'))
row = result.fetchone()
if row:
    print(f"Roster ID: {row.id}")
    print(f"Date: {row.support_date}")
    print(f"Status: {row.status}")
    print(f"Service: {row.eligibility}")
    print(f"Worker ID: {row.worker_id}")
    print(f"Start: {row.start_time}, End: {row.end_time}")
else:
    print("No roster found")

# Check roster participants
print("\n=== ROSTER PARTICIPANTS ===")
result = db.execute(text('SELECT * FROM roster_participants WHERE roster_id=1'))
for row in result:
    print(f"Roster ID: {row.roster_id}, Participant ID: {row.participant_id}")

# Check participant
print("\n=== PARTICIPANT ===")
result = db.execute(text('SELECT id, first_name, last_name, ndis_number FROM participants'))
for row in result:
    print(f"ID: {row.id}, Name: {row.first_name} {row.last_name}, NDIS: {row.ndis_number}")

# Check users (support workers)
print("\n=== USERS (Support Workers) ===")
result = db.execute(text('SELECT id, first_name, last_name FROM users'))
for row in result:
    print(f"ID: {row.id}, Name: {row.first_name} {row.last_name}")

db.close()
