# backend/scripts/create_test_data.py
"""
Script to create test data for invoice generation testing
This creates sample participants, rosters (appointments), and completed services
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import date, time, datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.participant import Participant
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.user import User

def create_test_data():
    """Create sample data for testing invoice generation"""
    db = SessionLocal()

    try:
        print("Checking existing data...")

        # Check for existing users
        existing_users = db.query(User).all()
        print(f"Found {len(existing_users)} existing users")

        if len(existing_users) == 0:
            print("WARNING: No users found. Please create users first.")
            return

        # Use first user as support worker
        support_worker = existing_users[0]
        print(f"Using {support_worker.first_name} {support_worker.last_name} as support worker (ID: {support_worker.id})")

        # Create test participants
        print("\nCreating test participants...")

        participants_data = [
            {
                "first_name": "Jordan",
                "last_name": "Smith",
                "email": "jordan.smith@example.com",
                "phone": "0412345678",
                "date_of_birth": date(1995, 3, 15),
                "ndis_number": "NDIS000001",
                "status": "active"
            },
            {
                "first_name": "Amrita",
                "last_name": "Kumar",
                "email": "amrita.kumar@example.com",
                "phone": "0498765432",
                "date_of_birth": date(1988, 7, 22),
                "ndis_number": "NDIS000002",
                "status": "active"
            },
            {
                "first_name": "Michael",
                "last_name": "Chen",
                "email": "michael.chen@example.com",
                "phone": "0487654321",
                "date_of_birth": date(1992, 11, 8),
                "ndis_number": "NDIS000003",
                "status": "active"
            }
        ]

        created_participants = []
        for p_data in participants_data:
            # Check if participant already exists
            existing = db.query(Participant).filter(
                Participant.email == p_data["email"]
            ).first()

            if existing:
                print(f"  - Participant {p_data['first_name']} {p_data['last_name']} already exists (ID: {existing.id})")
                created_participants.append(existing)
            else:
                participant = Participant(**p_data)
                db.add(participant)
                db.flush()
                created_participants.append(participant)
                print(f"  + Created participant: {participant.first_name} {participant.last_name} (ID: {participant.id})")

        db.commit()

        # Create completed roster appointments for the past month
        print("\nCreating completed roster appointments (past month)...")

        today = date.today()
        start_date = today - timedelta(days=30)

        services = [
            {
                "service_type": "Personal Care",
                "hourly_rate": 35.00,
                "hours": 2,
                "start_time": time(9, 0),
                "end_time": time(11, 0)
            },
            {
                "service_type": "Community Access",
                "hourly_rate": 32.00,
                "hours": 3,
                "start_time": time(14, 0),
                "end_time": time(17, 0)
            },
            {
                "service_type": "Domestic Assistance",
                "hourly_rate": 30.00,
                "hours": 2,
                "start_time": time(10, 0),
                "end_time": time(12, 0)
            },
            {
                "service_type": "Social Participation",
                "hourly_rate": 32.00,
                "hours": 4,
                "start_time": time(13, 0),
                "end_time": time(17, 0)
            }
        ]

        roster_count = 0

        # Create 2-3 appointments per participant over the past month
        for participant in created_participants:
            # Create 3 appointments for each participant
            for i in range(3):
                service_date = start_date + timedelta(days=(i * 7) + (participant.id % 7))
                service = services[i % len(services)]

                roster = Roster(
                    worker_id=support_worker.id,
                    support_date=service_date,
                    start_time=service["start_time"],
                    end_time=service["end_time"],
                    eligibility=service["service_type"],
                    status=RosterStatus.completed,
                    notes=f"{service['service_type']} - Completed successfully",
                    created_by=support_worker.id
                )

                db.add(roster)
                db.flush()

                # Link participant to roster
                roster_participant = RosterParticipant(
                    roster_id=roster.id,
                    participant_id=participant.id
                )
                db.add(roster_participant)

                roster_count += 1
                print(f"  + Created completed appointment: {participant.first_name} {participant.last_name} - {service['service_type']} on {service_date}")

        db.commit()

        print(f"\nSUCCESS: Test data created successfully!")
        print(f"  - {len(created_participants)} participants")
        print(f"  - {roster_count} completed appointments")
        print(f"\nYou can now test invoice generation with real data!")

    except Exception as e:
        print(f"\nERROR: Failed to create test data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  NDIS Invoice Generation - Test Data Creator")
    print("=" * 60)
    create_test_data()
