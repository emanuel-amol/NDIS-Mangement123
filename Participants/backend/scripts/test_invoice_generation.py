import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from sqlalchemy import and_
from datetime import date

db = SessionLocal()

# Test date range
start_date = date(2025, 10, 1)
end_date = date(2025, 10, 6)

print(f"Searching for completed rosters between {start_date} and {end_date}")
print("=" * 60)

# Query
query = db.query(Roster).filter(
    and_(
        Roster.status == RosterStatus.completed,
        Roster.support_date >= start_date,
        Roster.support_date <= end_date
    )
)

rosters = query.all()

print(f"Found {len(rosters)} completed rosters:")
for r in rosters:
    print(f"  - ID: {r.id}, Date: {r.support_date}, Status: {r.status}, Service: {r.eligibility}")
    if r.participants:
        p_id = r.participants[0].participant_id
        participant = db.query(Participant).filter(Participant.id == p_id).first()
        if participant:
            print(f"    Participant: {participant.first_name} {participant.last_name}")

db.close()
