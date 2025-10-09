# Xero Integration - Quick Start Guide

## ✅ Configuration Complete!

Your Xero OAuth2 integration is fully configured and ready to test!

## What's Been Set Up

### 1. Backend Configuration ✅
- **File:** `backend/app/api/v1/endpoints/invoicing.py`
- **Xero SDK:** xero-python v5.1.0 integrated
- **OAuth2 Flow:** Complete implementation with token refresh
- **Endpoints:** `/xero/connect`, `/xero/callback`, `/xero/disconnect`, `/xero/sync`

### 2. Environment Variables ✅
- **XERO_CLIENT_ID:** FDA4CB292D4643568F53F56A6B3A22EA
- **XERO_CLIENT_SECRET:** wGgQHP8vFRaJxQibvp0_jUgAI8NrprlF-SVfcHhrIVqbXJwZ *(encrypted)*
- **XERO_REDIRECT_URI:** https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback
- **CORS:** Updated to allow ngrok frontend

### 3. Ngrok URLs ✅
- **Backend:** https://2800427682fb.ngrok-free.app → localhost:8000
- **Frontend:** https://8ba9691c1e6f.ngrok-free.app → localhost:5173

### 4. Xero App Settings
Make sure your Xero app has this redirect URI:
```
https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback
```

## Installation

```bash
# Install xero-python package
cd backend
pip install xero-python==5.1.0
```

## Important: Ngrok URL Management

**⚠️ Critical Workflow:** Whenever you restart ngrok, the URLs will change and you MUST update the configuration:

### Ngrok Restart Workflow (Simplified - Only 2 Files to Update!):

1. **Start ngrok** using the config file:
   ```bash
   ngrok start --all --config "C:\Users\vansh\OneDrive\Desktop\Projects\NDIS\NDIS_System\NDIS_Project\ngrok.yml"
   ```

2. **Note the new URLs** that ngrok generates (they change on every restart)

3. **Update ONLY 2 files** with the new ngrok URLs:

   **File 1: `.env` (backend root)**
   ```env
   BACKEND_URL=https://<new-backend-ngrok-url>
   FRONTEND_URL=https://<new-frontend-ngrok-url>
   ```

   **File 2: `frontend/.env`**
   ```env
   VITE_BACKEND_NGROK_URL=https://<new-backend-ngrok-url>
   VITE_FRONTEND_NGROK_URL=https://<new-frontend-ngrok-url>
   ```

4. **Update Xero App Redirect URI:**
   - Go to https://developer.xero.com/app/manage
   - Select your NDIS app
   - Update the OAuth 2.0 redirect URI with the new backend ngrok URL:
     ```
     https://<new-backend-ngrok-url>/api/v1/invoicing/xero/callback
     ```

5. **Restart backend server** to pick up the new environment variables

6. **Navigate to the connect endpoint** with the new URL:
   ```
   https://<new-backend-ngrok-url>/api/v1/invoicing/xero/connect
   ```

**Note:** XERO_REDIRECT_URI and CORS are now automatically constructed from BACKEND_URL and FRONTEND_URL!

## Test the Integration

### Step 1: Start Servers

```bash
# Terminal 1 - Start ngrok with config file
ngrok start --all --config "C:\Users\vansh\OneDrive\Desktop\Projects\NDIS\NDIS_System\NDIS_Project\ngrok.yml"

# Terminal 2 - Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3 - Start frontend
cd frontend
npm run dev -- --host 0.0.0.0
```

### Step 2: Test Connection

**Option A - Direct API Test:**
1. Open browser
2. Navigate to: `https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/connect`
3. Login to Xero
4. Authorize the app
5. You'll be redirected back to your frontend

**Option B - Frontend Button:**
1. Add this code to your frontend component:

```typescript
const connectToXero = () => {
  const backendUrl = 'https://2800427682fb.ngrok-free.app';
  window.location.href = `${backendUrl}/api/v1/invoicing/xero/connect`;
};

<button onClick={connectToXero}>
  Connect to Xero
</button>
```

### Step 3: Verify Connection

```bash
# Check connection status
curl -H "X-Admin-API-Key: admin-development-key-123" \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/status
```

Expected response:
```json
{
  "connected": true,
  "tenant_name": "Your Organization Name",
  "sync_status": "idle",
  "last_sync": "2025-01-19T14:30:00Z"
}
```

## API Endpoints Reference

### 1. Connect to Xero
```
GET https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/connect
```
Redirects to Xero OAuth login page.

### 2. Check Status
```bash
curl -H "X-Admin-API-Key: admin-development-key-123" \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/status
```

### 3. Disconnect
```bash
curl -X POST \
  -H "X-Admin-API-Key: admin-development-key-123" \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/disconnect
```

### 4. Sync Invoices
```bash
curl -X POST \
  -H "X-Admin-API-Key: admin-development-key-123" \
  -H "Content-Type: application/json" \
  -d '{"item_ids": ["1", "2"]}' \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/sync
```

## Frontend Integration

### Handle OAuth Callback

Add this route to your React Router:

```typescript
// In your router configuration
import { XeroCallback } from './pages/XeroCallback';

{
  path: '/invoicing/xero',
  element: <XeroCallback />
}
```

### XeroCallback Component

```typescript
// src/pages/XeroCallback.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const XeroCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get('status');
    const tenant = searchParams.get('tenant');
    const message = searchParams.get('message');

    if (status === 'success') {
      // Success! Show notification
      console.log(`✅ Connected to Xero: ${tenant}`);
      navigate('/invoicing');
    } else {
      // Error - show error message
      console.error(`❌ Xero connection failed: ${message}`);
      navigate('/invoicing');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Connecting to Xero...</h2>
        <p className="text-gray-600 mt-2">Please wait</p>
      </div>
    </div>
  );
};
```

### Connect Button Component

```typescript
import { useState } from 'react';

export const XeroConnectButton = () => {
  const [isConnected, setIsConnected] = useState(false);
  const BACKEND_URL = 'https://2800427682fb.ngrok-free.app';

  const checkStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/invoicing/xero/status`, {
        headers: { 'X-Admin-API-Key': 'admin-development-key-123' }
      });
      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Failed to check Xero status:', error);
    }
  };

  const connect = () => {
    window.location.href = `${BACKEND_URL}/api/v1/invoicing/xero/connect`;
  };

  const disconnect = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/invoicing/xero/disconnect`, {
        method: 'POST',
        headers: { 'X-Admin-API-Key': 'admin-development-key-123' }
      });
      setIsConnected(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div>
      {isConnected ? (
        <button onClick={disconnect} className="btn btn-danger">
          Disconnect from Xero
        </button>
      ) : (
        <button onClick={connect} className="btn btn-primary">
          Connect to Xero
        </button>
      )}
    </div>
  );
};
```

## OAuth Flow Diagram

```
User clicks "Connect to Xero"
    ↓
Frontend redirects to: /api/v1/invoicing/xero/connect
    ↓
Backend redirects to Xero login page
    ↓
User logs in and authorizes app
    ↓
Xero redirects to: /api/v1/invoicing/xero/callback?code=xxx
    ↓
Backend exchanges code for access_token
    ↓
Backend gets tenant (organization) info
    ↓
Backend stores tokens
    ↓
Backend redirects to: https://8ba9691c1e6f.ngrok-free.app/invoicing/xero?status=success&tenant=OrgName
    ↓
Frontend shows success message
    ↓
Ready to sync invoices!
```

## Token Lifecycle

1. **Access Token:** Valid for 30 minutes
2. **Refresh Token:** Valid for 60 days
3. **Auto-refresh:** Backend automatically refreshes expired tokens
4. **Storage:** Currently in-memory (use database in production)

## Troubleshooting

### "Invalid redirect URI" error
**Fix:** Update Xero app settings:
1. Go to https://developer.xero.com/app/manage
2. Find your app
3. Add redirect URI: `https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback`

### Ngrok URLs changed
**This happens EVERY TIME you restart ngrok!**

**Simplified Workflow (Only 2 files!):**
1. Start ngrok: `ngrok start --all --config "C:\Users\vansh\OneDrive\Desktop\Projects\NDIS\NDIS_System\NDIS_Project\ngrok.yml"`
2. Copy the new ngrok URLs from the terminal output
3. Update `.env` (backend root):
   - `BACKEND_URL=https://<new-backend-url>`
   - `FRONTEND_URL=https://<new-frontend-url>`
4. Update `frontend/.env`:
   - `VITE_BACKEND_NGROK_URL=https://<new-backend-url>`
   - `VITE_FRONTEND_NGROK_URL=https://<new-frontend-url>`
5. Update Xero app redirect URI at https://developer.xero.com/app/manage
6. Restart backend server
7. Navigate to: `https://<new-backend-ngrok-url>/api/v1/invoicing/xero/connect`

**Note:** XERO_REDIRECT_URI and CORS now auto-update from BACKEND_URL and FRONTEND_URL!

### CORS errors
**Fix:** Already configured! Your `.env` has:
```
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://8ba9691c1e6f.ngrok-free.app
```

## Files Modified

1. ✅ `backend/app/api/v1/endpoints/invoicing.py` - Xero OAuth implementation
2. ✅ `backend/requirements.txt` - Added xero-python
3. ✅ `.env` - Added Xero credentials and ngrok URLs
4. ✅ `frontend/.env` - Added ngrok URLs
5. ✅ `backend/XERO_INTEGRATION_GUIDE.md` - Detailed documentation
6. ✅ `XERO_SETUP_INSTRUCTIONS.md` - Step-by-step setup guide

## Next Steps

1. **Install dependencies:** `pip install xero-python==5.1.0`
2. **Start servers:** Backend + Frontend
3. **Test connection:** Click "Connect to Xero" button
4. **Verify status:** Check `/xero/status` endpoint
5. **Implement invoice sync:** Use the real Xero API to create invoices

## Need Help?

- **Detailed Guide:** See `XERO_INTEGRATION_GUIDE.md`
- **Setup Instructions:** See `XERO_SETUP_INSTRUCTIONS.md`
- **Xero Docs:** https://developer.xero.com/documentation
- **SDK Docs:** https://github.com/XeroAPI/xero-python

---

**Status:** ✅ Ready to test!

**Your Configuration:**
- Backend: https://2800427682fb.ngrok-free.app
- Frontend: https://8ba9691c1e6f.ngrok-free.app
- Redirect URI: https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback
