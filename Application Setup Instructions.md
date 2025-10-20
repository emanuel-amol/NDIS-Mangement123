# Application Setup Instructions

## To Run the Application

Three terminals are needed:

**Terminal 1 - Participants Backend:**
```bash
cd participants\backend
uvicorn app.main:app --port 8000
```

**Terminal 2 - HR Backend:**
```bash
cd HR\backend
uvicorn app.main:app --port 8001
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Logins

### HR
- **Username:** hr@demo.io
- **Password:** Test123!

### Provider
- **Username:** provider@demo.io
- **Password:** Test123!

### Manager
- **Username:** manager@demo.io
- **Password:** Test123!

## Admin Access

To access Admin panel:
```
http://127.0.0.1:5173/admin
```

## Important Notes

**NOTE:** You must use Supabase as your database because it also handles JWT/User Roles. These are already added to the ENV Files.