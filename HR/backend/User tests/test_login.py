from app.database import get_db
from app import models, crud

db = next(get_db())

# Test with one of your existing users
test_email = 'Test@gmail.com'
user = crud.get_user_by_email(db, test_email)

if user:
    print(f'Found user: {user.username} ({user.email})')
    hash_method = crud.pwd_context.identify(user.hashed_password) or crud.legacy_ctx.identify(user.hashed_password)
    print(f'Hash method: {hash_method}')
    print(f'Hash starts with: {user.hashed_password[:20]}...')
    
    # Test password verification with common passwords
    print('Testing password verification...')
    test_passwords = ['password', 'test', 'Test', '123456', 'admin']
    for pwd in test_passwords:
        is_valid = crud.verify_password(pwd, user.hashed_password)
        print(f'  Password "{pwd}": {is_valid}')
else:
    print(f'User with email {test_email} not found')

# Also test the exact login process
print('\n--- Testing login process ---')
try:
    # Simulate what happens in auth.py login route
    test_email = 'Test@gmail.com'
    test_password = 'test'  # Try common password
    
    db_user = crud.get_user_by_email(db, email=test_email)
    print(f'get_user_by_email returned: {db_user is not None}')
    
    if db_user:
        password_valid = crud.verify_password(test_password, db_user.hashed_password)
        print(f'Password verification result: {password_valid}')
        
        if not db_user or not password_valid:
            print('Login would fail: Invalid credentials')
        else:
            print('Login would succeed')
    else:
        print('Login would fail: User not found')
        
except Exception as e:
    print(f'Error during login test: {e}')