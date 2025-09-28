# fix_enum_data.py - Fix the enum data issue
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:CyberSecurityGroup1@localhost:5432/ndis_db"

def fix_enum_data():
    """Fix the referral status enum data issue"""
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.begin() as conn:
            print("🔧 Fixing referral status enum data...")
            
            # Check what invalid statuses exist
            result = conn.execute(text("""
                SELECT status, COUNT(*) 
                FROM referrals 
                WHERE status NOT IN ('submitted', 'pending', 'under_review', 'approved', 'rejected', 'converted')
                GROUP BY status
            """))
            
            invalid_statuses = result.fetchall()
            if invalid_statuses:
                print(f"Found invalid statuses: {invalid_statuses}")
                
                # Fix the invalid status
                conn.execute(text("""
                    UPDATE referrals 
                    SET status = 'converted' 
                    WHERE status = 'converted_to_participant'
                """))
                
                print("✅ Fixed converted_to_participant -> converted")
            else:
                print("No invalid statuses found")
            
            print("✅ Enum data fix completed!")
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Fixing enum data issue...")
    
    if fix_enum_data():
        print("\n🎉 Fixed! Restart your server.")
    else:
        print("\n❌ Fix failed.")