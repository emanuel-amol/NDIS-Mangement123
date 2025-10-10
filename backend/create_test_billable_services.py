#!/usr/bin/env python3
"""
Create test completed appointments for invoice generation testing
"""

import sys
import os
from datetime import date, time, datetime, timedelta

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from app.models.user import User

def create_test_data():
    """Create test completed appointments for invoice generation"""
    db = SessionLocal()

    try:
        print("🚀 Creating test completed appointments for invoice generation...")

        # Check if we have participants and users
        participants = db.query(Participant).limit(3).all()
        users = db.query(User).limit(3).all()

        if not participants:
            print("❌ No participants found. Please create participants first.")
            return

        if not users:
            print("❌ No users found. Please create users/support workers first.")
            return

        print(f"✅ Found {len(participants)} participants and {len(users)} users")

        # Create completed roster entries for the last 30 days
        start_date = date.today() - timedelta(days=30)

        test_services = [
            {
                'participant': participants[0],
                'worker': users[0] if users else None,
                'date': start_date + timedelta(days=1),
                'start_time': time(9, 0),
                'end_time': time(11, 0),
                'service_type': 'Personal Care',
                'notes': 'Morning routine assistance - completed'
            },
            {
                'participant': participants[0],
                'worker': users[0] if users else None,
                'date': start_date + timedelta(days=3),
                'start_time': time(14, 0),
                'end_time': time(16, 0),
                'service_type': 'Community Access',
                'notes': 'Shopping assistance - completed'
            },
            {
                'participant': participants[1] if len(participants) > 1 else participants[0],
                'worker': users[1] if len(users) > 1 else users[0],
                'date': start_date + timedelta(days=5),
                'start_time': time(10, 0),
                'end_time': time(12, 0),
                'service_type': 'Domestic Assistance',
                'notes': 'House cleaning - completed'
            },
            {
                'participant': participants[2] if len(participants) > 2 else participants[0],
                'worker': users[2] if len(users) > 2 else users[0],
                'date': start_date + timedelta(days=7),
                'start_time': time(15, 0),
                'end_time': time(17, 0),
                'service_type': 'Social Participation',
                'notes': 'Community event attendance - completed'
            },
            {
                'participant': participants[0],
                'worker': users[0] if users else None,
                'date': start_date + timedelta(days=10),
                'start_time': time(9, 30),
                'end_time': time(11, 30),
                'service_type': 'Personal Care',
                'notes': 'Personal hygiene support - completed'
            }
        ]

        created_count = 0

        for service in test_services:
            # Create roster entry
            roster = Roster(
                support_date=service['date'],
                start_time=service['start_time'],
                end_time=service['end_time'],
                worker_id=service['worker'].id if service['worker'] else None,
                eligibility=service['service_type'],
                notes=service['notes'],
                status=RosterStatus.completed,  # Mark as completed
                created_at=datetime.utcnow()
            )

            db.add(roster)
            db.flush()  # Get the roster ID

            # Link participant to roster
            roster_participant = RosterParticipant(
                roster_id=roster.id,
                participant_id=service['participant'].id
            )

            db.add(roster_participant)
            created_count += 1

            print(f"✅ Created completed service: {service['service_type']} for {service['participant'].first_name} {service['participant'].last_name} on {service['date']}")

        db.commit()
        print(f"\n🎉 Successfully created {created_count} completed appointments!")
        print("\n📋 These services can now be used for invoice generation testing:")
        print("   1. Go to http://localhost:5173/invoicing/generate")
        print("   2. Select billing period that includes the created dates")
        print("   3. You should see the completed services as billable items")

    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def check_existing_data():
    """Check what data already exists"""
    db = SessionLocal()

    try:
        # Check completed rosters
        completed_rosters = db.query(Roster).filter(Roster.status == RosterStatus.completed).count()
        total_rosters = db.query(Roster).count()
        participants_count = db.query(Participant).count()
        users_count = db.query(User).count()

        print(f"📊 Current database state:")
        print(f"   - Total roster entries: {total_rosters}")
        print(f"   - Completed roster entries: {completed_rosters}")
        print(f"   - Participants: {participants_count}")
        print(f"   - Users: {users_count}")

        if completed_rosters > 0:
            print(f"\n✅ You already have {completed_rosters} completed appointments!")
            print("   These should appear in the invoice generation.")
        else:
            print(f"\n⚠️  No completed appointments found.")
            print("   Invoice generation will show 'No billable services found'")

    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("NDIS Invoice Generation Test Data Creator")
    print("=" * 60)

    check_existing_data()

    choice = input("\nDo you want to create test completed appointments? (y/n): ").lower().strip()

    if choice == 'y':
        create_test_data()
    else:
        print("No test data created.")

    print("\n" + "=" * 60)