# Xero OAuth2 Integration Guide

This guide explains how to set up and use the Xero OAuth2 integration in the NDIS system.

## Overview

The system uses the official `xero-python` SDK to integrate with Xero's Accounting API. This allows you to:
- Authenticate with Xero using OAuth2
- Create invoices in Xero
- Sync contacts (participants)
- Track payments

## Prerequisites

1. **Xero Developer Account**: Sign up at https://developer.xero.com
2. **Create a Xero App**:
   - Go to https://developer.xero.com/app/manage
   - Click "New App"
   - Fill in the details:
     - App name: NDIS System
     - Company or application URL: http://localhost:5173
     - Redirect URI: http://localhost:8000/api/v1/invoicing/xero/callback
   - Save the app
3. **Get Credentials**:
   - Copy the **Client ID**
   - Generate and copy the **Client Secret**

## Configuration

### 1. Update Environment Variables

Add the following to your `.env` file in the backend directory:

```env
# Xero OAuth2 Configuration
XERO_CLIENT_ID=your_xero_client_id_here
XERO_CLIENT_SECRET=your_xero_client_secret_here
XERO_REDIRECT_URI=http://localhost:8000/api/v1/invoicing/xero/callback
```

Replace `your_xero_client_id_here` and `your_xero_client_secret_here` with your actual credentials from the Xero developer portal.

### 2. Install Dependencies

Install the xero-python SDK:

```bash
cd backend
pip install -r requirements.txt
```

## API Endpoints

### Authentication Endpoints

#### 1. Connect to Xero
```
GET /api/v1/invoicing/xero/connect
```

Redirects the user to Xero's OAuth authorization page. After the user authorizes, Xero redirects back to the callback endpoint.

**Frontend Usage:**
```typescript
const connectToXero = () => {
  window.location.href = 'http://localhost:8000/api/v1/invoicing/xero/connect';
};
```

#### 2. OAuth Callback
```
GET /api/v1/invoicing/xero/callback?code=xxx&state=xxx
```

This endpoint is called by Xero after authorization. It:
- Exchanges the authorization code for access and refresh tokens
- Retrieves the tenant (organization) information
- Stores the tokens securely
- Redirects back to the frontend

**Response (Redirect):**
- Success: `http://localhost:5173/invoicing/xero?status=success&tenant=YourOrgName`
- Error: `http://localhost:5173/invoicing/xero?status=error&message=ErrorMessage`

#### 3. Get Connection Status
```
GET /api/v1/invoicing/xero/status
```

Returns the current Xero connection status.

**Response:**
```json
{
  "connected": true,
  "last_sync": "2025-01-19T14:30:00Z",
  "tenant_name": "NDIS Support Services Pty Ltd",
  "sync_status": "idle",
  "error_message": null
}
```

#### 4. Disconnect from Xero
```
POST /api/v1/invoicing/xero/disconnect
```

Disconnects from Xero and clears stored tokens.

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from Xero"
}
```

### Sync Endpoints

#### 5. Sync Invoices to Xero
```
POST /api/v1/invoicing/xero/sync
```

Syncs invoices to Xero. If no item_ids are provided, syncs all pending invoices.

**Request Body:**
```json
{
  "item_ids": ["1", "2", "3"]  // Optional: specific invoice IDs to sync
}
```

**Response:**
```json
{
  "synced": 3,
  "failed": 0
}
```

#### 6. Get Sync Status
```
GET /api/v1/invoicing/xero/sync-status
```

Returns the sync status of all items.

**Response:**
```json
{
  "items": [
    {
      "id": "1",
      "type": "invoice",
      "local_id": "1",
      "xero_id": "XERO-INV-123",
      "status": "synced",
      "last_updated": "2025-01-19T14:30:00Z",
      "title": "Invoice #INV-001",
      "amount": 450.00
    }
  ],
  "stats": {
    "total_invoices": 10,
    "synced_invoices": 8,
    "pending_invoices": 2,
    "failed_invoices": 0
  }
}
```

## Code Structure

### Configuration (lines 29-57)

```python
# Initialize Xero API Client
api_client = ApiClient(
    Configuration(
        debug=os.getenv("APP_ENV") == "development",
        oauth2_token=OAuth2Token(
            client_id=os.getenv("XERO_CLIENT_ID"),
            client_secret=os.getenv("XERO_CLIENT_SECRET")
        ),
    ),
    pool_threads=1,
)

# Xero OAuth2 Scopes
XERO_SCOPES = [
    "offline_access",  # Required for refresh tokens
    "openid",
    "profile",
    "email",
    "accounting.transactions",  # Create/read invoices
    "accounting.contacts"       # Create/read contacts
]
```

### Helper Functions

#### get_xero_client() (lines 63-107)
- Returns an authenticated Xero API client
- Automatically refreshes the access token if expired
- Raises HTTPException if not connected

#### get_tenant_id() (lines 109-116)
- Returns the Xero tenant (organization) ID
- Raises HTTPException if no tenant is selected

## OAuth2 Flow

### 1. User Initiates Connection
```
Frontend → GET /xero/connect → Redirect to Xero Login
```

### 2. User Authorizes App
```
User logs into Xero → Authorizes app → Xero redirects to callback
```

### 3. Backend Exchanges Code for Token
```
GET /xero/callback?code=xxx
→ Exchange code for access_token & refresh_token
→ Get tenant information
→ Store tokens
→ Redirect to frontend
```

### 4. Subsequent API Calls
```
Frontend → API call → get_xero_client()
→ Check if token expired
→ Refresh if needed
→ Make API call to Xero
```

## Token Management

### Token Storage
Currently, tokens are stored in memory in the global variables:
- `xero_tokens`: Dictionary containing access_token, refresh_token, expires_at, id_token
- `xero_tenant_id`: The selected Xero organization ID

**⚠️ Production Note:** In production, store tokens in a database or secure storage service instead of in-memory variables.

### Token Refresh
Access tokens expire after 30 minutes. The `get_xero_client()` function automatically:
1. Checks if the token is expired
2. Uses the refresh_token to get a new access_token
3. Updates the stored tokens

Refresh tokens are valid for 60 days.

## Frontend Integration

### 1. Handle OAuth Callback in Frontend

Create a route to handle the callback redirect:

```typescript
// In your router
{
  path: '/invoicing/xero',
  element: <XeroCallback />
}
```

```typescript
// XeroCallback.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const XeroCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    const tenant = searchParams.get('tenant');

    if (status === 'success') {
      // Show success message
      console.log(`Connected to ${tenant}`);
      // Redirect to invoicing dashboard
      navigate('/invoicing');
    } else {
      // Show error message
      console.error(`Connection failed: ${message}`);
      navigate('/invoicing');
    }
  }, [searchParams, navigate]);

  return <div>Connecting to Xero...</div>;
};
```

### 2. Connect Button

```typescript
const handleConnectXero = () => {
  window.location.href = 'http://localhost:8000/api/v1/invoicing/xero/connect';
};

<button onClick={handleConnectXero}>
  Connect to Xero
</button>
```

### 3. Check Connection Status

```typescript
const checkXeroStatus = async () => {
  const response = await fetch(
    'http://localhost:8000/api/v1/invoicing/xero/status',
    {
      headers: {
        'X-Admin-API-Key': 'admin-development-key-123'
      }
    }
  );
  const status = await response.json();
  return status;
};
```

### 4. Sync Invoices

```typescript
const syncInvoices = async (invoiceIds?: string[]) => {
  const response = await fetch(
    'http://localhost:8000/api/v1/invoicing/xero/sync',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-API-Key': 'admin-development-key-123'
      },
      body: JSON.stringify({
        item_ids: invoiceIds // Optional
      })
    }
  );
  const result = await response.json();
  console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
};
```

## Testing

### 1. Test Connection Flow

1. Start the backend server:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the frontend:
```bash
cd frontend
npm run dev
```

3. Navigate to the invoicing page
4. Click "Connect to Xero"
5. Log in with your Xero account
6. Authorize the app
7. You should be redirected back with a success message

### 2. Test Token Refresh

The token automatically refreshes after 30 minutes. To test:
1. Connect to Xero
2. Wait 30 minutes (or manually modify the `expires_at` in the code)
3. Make an API call
4. Check the logs - you should see "Access token expired, refreshing..."

## Troubleshooting

### Error: "Not connected to Xero"
- Make sure you've connected via the `/xero/connect` endpoint
- Check if tokens are stored in `xero_tokens`

### Error: "No Xero organization selected"
- After connecting, check if `xero_tenant_id` is set
- You may need to authorize the app again

### Error: "Failed to refresh token"
- The refresh token may have expired (60 days)
- Disconnect and reconnect to Xero

### Redirect URI Mismatch
- Make sure the redirect URI in your Xero app settings matches exactly:
  - Xero app: `http://localhost:8000/api/v1/invoicing/xero/callback`
  - .env: `XERO_REDIRECT_URI=http://localhost:8000/api/v1/invoicing/xero/callback`

## Next Steps

### Implementing Invoice Creation in Xero

Currently, the `/xero/sync` endpoint only assigns mock Xero IDs. To implement real invoice creation:

```python
from xero_python.accounting import AccountingApi, Invoice, LineItem, Contact

@router.post("/xero/sync")
def sync_xero(request: SyncRequest, db: Session = Depends(get_db)):
    # Get authenticated client
    client = get_xero_client()
    tenant_id = get_tenant_id()

    accounting_api = AccountingApi(client)

    # Get invoices to sync
    invoices = db.query(Invoice).filter(...).all()

    for invoice in invoices:
        # Create Xero invoice object
        xero_invoice = Invoice(
            type="ACCREC",  # Accounts Receivable
            contact=Contact(name=invoice.participant_name),
            date=invoice.issue_date,
            due_date=invoice.due_date,
            line_items=[
                LineItem(
                    description=item.service_type,
                    quantity=item.hours,
                    unit_amount=item.hourly_rate,
                    account_code="200"  # Your revenue account code
                )
                for item in invoice.items
            ],
            status="DRAFT"  # or "AUTHORISED" to send immediately
        )

        # Create invoice in Xero
        result = accounting_api.create_invoices(
            xero_tenant_id=tenant_id,
            invoices=Invoices(invoices=[xero_invoice])
        )

        # Update local invoice with Xero ID
        invoice.xero_invoice_id = result.invoices[0].invoice_id

    db.commit()
```

## Security Considerations

1. **Store tokens securely**: In production, use encrypted database storage or a secrets manager
2. **Use HTTPS**: Always use HTTPS in production for OAuth callbacks
3. **Validate state parameter**: Implement CSRF protection by validating the state parameter
4. **Rotate tokens**: Implement proper token rotation and expiry handling
5. **Limit scopes**: Only request the OAuth scopes you actually need
6. **Audit logs**: Log all Xero API interactions for audit purposes

## Resources

- [Xero Developer Portal](https://developer.xero.com)
- [xero-python SDK Documentation](https://github.com/XeroAPI/xero-python)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/auth-flow)
- [Xero API Reference](https://developer.xero.com/documentation/api/api-overview)
