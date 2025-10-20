# Xero OAuth2 Setup Instructions - Quick Start

## Your Ngrok Configuration

**Backend (FastAPI):** https://2800427682fb.ngrok-free.app → http://localhost:8000
**Frontend (React):** https://8ba9691c1e6f.ngrok-free.app → http://localhost:5173

## Xero App Configuration

In your Xero Developer Portal (https://developer.xero.com/app/manage), configure:

### OAuth 2.0 Redirect URIs:
```
https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback
```

### Company or Application URL:
```
https://8ba9691c1e6f.ngrok-free.app
```

## Environment Variables ✅ (Already Configured)

Your `.env` file is already set up with:
- ✅ XERO_CLIENT_ID
- ✅ XERO_CLIENT_SECRET
- ✅ XERO_REDIRECT_URI
- ✅ BACKEND_URL
- ✅ FRONTEND_URL

## Setup Steps

### 1. Start Ngrok Tunnels

Make sure both ngrok tunnels are running:

```bash
# Terminal 1 - Backend tunnel
ngrok http 8000

# Terminal 2 - Frontend tunnel
ngrok http 5173
```

**Important:** If ngrok URLs change, update:
- `.env` (backend)
- `frontend/.env`
- Xero app redirect URI in developer portal

### 2. Install Python Dependencies

```bash
cd backend
pip install xero-python==5.1.0
```

Or install all dependencies:
```bash
pip install -r requirements.txt
```

### 3. Start Backend Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start Frontend Server

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

### 5. Test Xero Connection

#### Option 1: Direct API Test
Open in browser:
```
https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/connect
```

This will:
1. Redirect you to Xero login
2. Ask you to authorize the app
3. Redirect back to: `https://8ba9691c1e6f.ngrok-free.app/invoicing/xero?status=success&tenant=YourOrgName`

#### Option 2: Frontend Button
1. Navigate to: `https://8ba9691c1e6f.ngrok-free.app/invoicing/xero`
2. Click "Connect to Xero" button
3. Follow the OAuth flow

## API Endpoints

All endpoints require the admin API key header:
```
X-Admin-API-Key: admin-development-key-123
```

### Check Connection Status
```bash
curl -H "X-Admin-API-Key: admin-development-key-123" \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/status
```

### Connect to Xero
```bash
# Open in browser (will redirect to Xero)
https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/connect
```

### Disconnect from Xero
```bash
curl -X POST \
  -H "X-Admin-API-Key: admin-development-key-123" \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/disconnect
```

### Sync Invoices
```bash
curl -X POST \
  -H "X-Admin-API-Key: admin-development-key-123" \
  -H "Content-Type: application/json" \
  -d '{"item_ids": ["1", "2"]}' \
  https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/sync
```

## Frontend Integration Code

### Update API URL for Xero Endpoints

In your frontend code, when calling Xero endpoints through ngrok:

```typescript
// Use ngrok URL for Xero OAuth flow
const BACKEND_URL = import.meta.env.VITE_BACKEND_NGROK_URL || 'http://localhost:8000';

// Connect to Xero
const connectToXero = () => {
  window.location.href = `${BACKEND_URL}/api/v1/invoicing/xero/connect`;
};

// Check connection status
const checkXeroStatus = async () => {
  const response = await fetch(`${BACKEND_URL}/api/v1/invoicing/xero/status`, {
    headers: {
      'X-Admin-API-Key': 'admin-development-key-123'
    }
  });
  return await response.json();
};
```

### Handle OAuth Callback

Create a route handler for `/invoicing/xero`:

```typescript
// XeroCallback.tsx
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
      alert(`Successfully connected to ${tenant}!`);
      navigate('/invoicing');
    } else {
      alert(`Connection failed: ${message}`);
      navigate('/invoicing');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Connecting to Xero...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
};
```

## Testing Checklist

- [ ] Ngrok tunnels are running
- [ ] Backend server is running on port 8000
- [ ] Frontend server is running on port 5173
- [ ] Can access backend through ngrok: `https://2800427682fb.ngrok-free.app`
- [ ] Can access frontend through ngrok: `https://8ba9691c1e6f.ngrok-free.app`
- [ ] Xero app redirect URI is set correctly
- [ ] Click "Connect to Xero" button
- [ ] Successfully authorize on Xero
- [ ] Redirected back to frontend with success message
- [ ] Check `/xero/status` endpoint shows `connected: true`

## Troubleshooting

### Error: "Invalid redirect URI"
**Cause:** Redirect URI in Xero app doesn't match
**Fix:** Update Xero app settings to:
```
https://2800427682fb.ngrok-free.app/api/v1/invoicing/xero/callback
```

### Error: "Not connected to Xero"
**Cause:** OAuth flow not completed
**Fix:** Click "Connect to Xero" and complete authorization

### Ngrok URLs Changed
**Cause:** Ngrok generates new URLs on restart (unless using paid plan)
**Fix:**
1. Update `.env` files with new URLs
2. Update Xero app redirect URI
3. Restart backend server

### CORS Errors
**Cause:** Frontend can't call backend API
**Fix:** Add ngrok URL to CORS settings in backend:
```python
# In backend/app/main.py or similar
CORS_ORIGINS = [
    "http://localhost:5173",
    "https://8ba9691c1e6f.ngrok-free.app"
]
```

## Production Deployment

When deploying to production:

1. **Use real domain names** instead of ngrok:
   ```
   XERO_REDIRECT_URI=https://api.yourdomain.com/api/v1/invoicing/xero/callback
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   ```

2. **Store tokens in database** instead of in-memory variables

3. **Enable HTTPS** for all endpoints

4. **Implement CSRF protection** using the state parameter

5. **Add token encryption** when storing in database

6. **Set up monitoring** for OAuth failures

## Next Steps

After successful connection:

1. **Test invoice sync:**
   - Create an invoice in the NDIS system
   - Click "Sync to Xero"
   - Verify it appears in your Xero account

2. **Implement contact sync:**
   - Sync participants as contacts in Xero
   - Use these contacts when creating invoices

3. **Implement payment tracking:**
   - Sync payment status from Xero
   - Update invoice status in NDIS system

See `XERO_INTEGRATION_GUIDE.md` for detailed API documentation.
