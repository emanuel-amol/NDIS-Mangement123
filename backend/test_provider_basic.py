#!/usr/bin/env python3
import requests
import sys

API_BASE = "http://localhost:8000/api/v1"

def test_provider_login():
    print(" Testing provider login...")
    
    # Test provider login
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "physio@compass-clinic.com", 
            "password": "physio123"
        })
        
        if response.status_code == 200:
            print("✅ Provider login successful")
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test provider dashboard
            dashboard = requests.get(f"{API_BASE}/providers/dashboard", headers=headers)
            print(f" Provider dashboard: {dashboard.status_code}")
            
            if dashboard.status_code == 200:
                data = dashboard.json()
                print(f"   Total referrals: {data.get('total_referrals', 0)}")
            
            # Test provider referrals
            referrals = requests.get(f"{API_BASE}/providers/referrals", headers=headers)
            print(f"✅ Provider referrals: {referrals.status_code}")
            
            if referrals.status_code == 200:
                referrals_data = referrals.json()
                print(f"   Found {len(referrals_data)} referrals")
                
            return True
            
        else:
            print(f" Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(" Cannot connect to server. Make sure FastAPI is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f" Error: {e}")
        return False

if __name__ == "__main__":
    success = test_provider_login()
    if success:
        print(" Basic provider test passed!")
    else:
        print("❌ Test failed - check server and setup")
        sys.exit(1)
