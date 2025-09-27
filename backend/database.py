# backend/check_user_model.py - Run this to see what's in your user.py file
import os

user_model_path = "app/models/user.py"

print("=== CHECKING USER MODEL FILE ===")
print(f"File path: {user_model_path}")
print(f"File exists: {os.path.exists(user_model_path)}")

if os.path.exists(user_model_path):
    with open(user_model_path, 'r') as f:
        content = f.read()
    
    print(f"File size: {len(content)} characters")
    print("\n=== FILE CONTENTS ===")
    print(content)
    
    print("\n=== CHECKING FOR USERSESSION ===")
    if "class UserSession" in content:
        print("✅ UserSession class found")
    else:
        print("❌ UserSession class NOT found")
    
    if "UserSession" in content:
        print("✅ UserSession mentioned in file")
    else:
        print("❌ UserSession NOT mentioned anywhere")
        
    print("\n=== CLASSES FOUND ===")
    import re
    classes = re.findall(r'class\s+(\w+)', content)
    for cls in classes:
        print(f"  - {cls}")
else:
    print("❌ User model file not found!")

print("\n=== DONE ===")