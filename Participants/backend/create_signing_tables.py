# fix-onboarding-docs.py
import sys
sys.path.append('backend')

from app.core.database import SessionLocal
from app.models.document import Document
from sqlalchemy import update

def fix_onboarding_documents():
    db = SessionLocal()
    
    try:
        participant_id = 27
        
        # Step 1: Check current state
        print("=" * 50)
        print("CHECKING CURRENT STATE")
        print("=" * 50)
        
        all_docs = db.query(Document).filter(
            Document.participant_id == participant_id
        ).all()
        
        print(f"\n✅ Found {len(all_docs)} total documents for participant {participant_id}")
        print("\nCurrent documents:")
        for doc in all_docs:
            flag = doc.extra_metadata.get('onboarding_pack') if doc.extra_metadata else None
            print(f"  - ID {doc.id}: {doc.title}")
            print(f"    Document Type: {doc.document_type}")
            print(f"    Category: {doc.category}")
            print(f"    Onboarding Flag: {flag}")
            print()
        
        # Count documents with flag
        flagged_docs = [
            doc for doc in all_docs 
            if doc.extra_metadata and doc.extra_metadata.get('onboarding_pack') == True
        ]
        print(f"Documents with onboarding_pack=true: {len(flagged_docs)}")
        print()
        
        # Step 2: Find documents to fix
        print("=" * 50)
        print("FIXING DOCUMENTS")
        print("=" * 50)
        print()
        
        target_types = ['ndis_service_agreement', 'participant_handbook', 'medical_consent_form']
        target_titles = ['NDIS Service Agreement', 'Participant Handbook', 'Medical Consent Form']
        
        docs_to_fix = []
        for doc in all_docs:
            # Check if document matches by type or title
            matches = (
                doc.document_type in target_types or
                any(title.lower() in (doc.title or '').lower() for title in target_titles)
            )
            
            # Check if it doesn't already have the flag
            has_flag = doc.extra_metadata and doc.extra_metadata.get('onboarding_pack') == True
            
            if matches and not has_flag:
                docs_to_fix.append(doc)
        
        if not docs_to_fix:
            print("❌ No documents found to fix!")
            print("\nPossible reasons:")
            print("1. Documents don't exist - generate them first")
            print("2. Documents already have the flag")
            print("3. Document titles/types don't match expected values")
            return
        
        print(f"Found {len(docs_to_fix)} documents to fix:")
        for doc in docs_to_fix:
            print(f"  - {doc.title} (ID: {doc.id})")
        print()
        
        # Step 3: Apply the fix
        print("Applying fix...")
        for doc in docs_to_fix:
            if doc.extra_metadata is None:
                doc.extra_metadata = {}
            doc.extra_metadata['onboarding_pack'] = True
            doc.extra_metadata['generation_type'] = 'onboarding'
            print(f"  ✅ Fixed document ID {doc.id}: {doc.title}")
        
        db.commit()
        print(f"\n✅ Successfully updated {len(docs_to_fix)} documents!")
        
        # Step 4: Verify the fix
        print()
        print("=" * 50)
        print("VERIFICATION")
        print("=" * 50)
        print()
        
        all_docs_after = db.query(Document).filter(
            Document.participant_id == participant_id
        ).all()
        
        flagged_after = [
            doc for doc in all_docs_after 
            if doc.extra_metadata and doc.extra_metadata.get('onboarding_pack') == True
        ]
        
        print(f"Documents with onboarding_pack=true: {len(flagged_after)}")
        for doc in flagged_after:
            print(f"  ✅ {doc.title}")
        
        print()
        print("=" * 50)
        print("✅ FIX COMPLETE! Refresh your browser to see changes.")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_onboarding_documents()