# test_ai.py - Run this in PowerShell: python test_ai.py

import requests
import json
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

BASE_URL = "http://localhost:8000/api/v1"

def test_ai_functionality():
    print("🔍 Testing AI Functionality")
    print("=" * 50)
    
    # Test 1: AI Status
    print("\n1️⃣ Testing AI Status...")
    try:
        response = requests.get(f"{BASE_URL}/ai/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ AI Status API working")
            print(f"   Available: {data.get('available', False)}")
            print(f"   Provider: {data.get('provider', 'none')}")
            print(f"   Features: {data.get('features', [])}")
            
            if data.get('available') and data.get('provider') == 'watsonx':
                print("✅ AI is properly configured")
            else:
                print("❌ AI is not working properly")
                print("   Configuration:", data.get('configuration', {}))
        else:
            print(f"❌ AI Status failed: {response.status_code}")
    except Exception as e:
        print(f"❌ AI Status error: {e}")
    
    # Test 2: Server Health
    print("\n2️⃣ Testing Server Health...")
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"❌ Server health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        return
    
    # Test 3: AI Care Plan Generation
    print("\n3️⃣ Testing AI Care Plan Generation...")
    participant_data = {
        "participantContext": {
            "id": 14,
            "name": "Ayayron",
            "age": 25,
            "disability_type": "autism-spectrum-disorder",
            "support_category": "capacity-building-support",
            "goals": ["improve social skills", "independent living"],
            "cultural_considerations": "Prefers quiet environments"
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/participants/14/ai/care-plan/suggest",
            json=participant_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ AI Care Plan generation successful!")
            print(f"   Suggestion ID: {data.get('suggestion_id')}")
            
            if 'data' in data and data['data']:
                if 'markdown' in data['data']:
                    print(f"   Generated content length: {len(data['data']['markdown'])} characters")
                    print("   📄 Sample output:")
                    print("   " + data['data']['markdown'][:200] + "...")
                    print("🎉 AI is working and generating real content!")
                else:
                    print("   ⚠️  No markdown content in response")
                    print(f"   Response data: {data['data']}")
            else:
                print("   ❌ No data in AI response")
        else:
            print(f"❌ AI Care Plan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ AI Care Plan error: {e}")
    
    # Test 4: Check Environment Variables
    print("\n4️⃣ Checking AI Configuration...")
    watsonx_vars = [
        "WATSONX_URL",
        "WATSONX_API_KEY", 
        "WATSONX_PROJECT_ID",
        "WATSONX_MODEL_ID"
    ]
    
    missing_vars = []
    for var in watsonx_vars:
        value = os.getenv(var)
        if value:
            if var == "WATSONX_API_KEY":
                print(f"   ✅ {var}: {'*' * len(value[-10:])}")  # Hide API key
            else:
                print(f"   ✅ {var}: {value}")
        else:
            print(f"   ❌ {var}: NOT SET")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {missing_vars}")
        print("   Check your .env file!")
    
    print("\n" + "=" * 50)
    print("🎯 Test Complete!")

if __name__ == "__main__":
    test_ai_functionality()