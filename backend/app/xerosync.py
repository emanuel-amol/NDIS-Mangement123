from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Xero Sync API", version="1.0")

# --- Data Models ---

class XeroStatus(BaseModel):
    connected: bool
    last_sync: Optional[str] = None
    tenant_name: Optional[str] = None
    sync_status: str
    error_message: Optional[str] = None


class SyncItem(BaseModel):
    id: str
    type: str  # 'invoice' | 'payment' | 'contact'
    local_id: str
    xero_id: Optional[str] = None
    status: str  # 'pending' | 'synced' | 'error' | 'conflict'
    last_updated: str
    error_message: Optional[str] = None
    title: str
    amount: Optional[float] = None


class SyncStats(BaseModel):
    total_invoices: int
    synced_invoices: int
    pending_invoices: int
    failed_invoices: int
    total_payments: int
    synced_payments: int
    pending_payments: int
    failed_payments: int


class SyncResponse(BaseModel):
    synced: int
    failed: int


class SyncRequest(BaseModel):
    item_ids: Optional[List[str]] = None


# --- Mock Data ---

xero_status = XeroStatus(
    connected=True,
    last_sync="2025-01-19T14:30:00Z",
    tenant_name="NDIS Support Services Pty Ltd",
    sync_status="idle",
)

sync_items: List[SyncItem] = [
    SyncItem(
        id="1",
        type="invoice",
        local_id="INV-2025-001",
        xero_id="XERO-INV-123456",
        status="synced",
        last_updated="2025-01-19T10:30:00Z",
        title="Jordan Smith - January 2025",
        amount=269.50,
    ),
    SyncItem(
        id="2",
        type="invoice",
        local_id="INV-2025-002",
        xero_id=None,
        status="pending",
        last_updated="2025-01-19T12:15:00Z",
        title="Amrita Kumar - January 2025",
        amount=2035.00,
    ),
    SyncItem(
        id="3",
        type="invoice",
        local_id="INV-2025-003",
        xero_id=None,
        status="error",
        last_updated="2025-01-19T13:45:00Z",
        title="Linh Nguyen - January 2025",
        amount=3520.00,
        error_message="Contact not found in Xero",
    ),
    SyncItem(
        id="4",
        type="payment",
        local_id="PAY-2025-001",
        xero_id="XERO-PAY-789012",
        status="synced",
        last_updated="2025-01-18T16:20:00Z",
        title="Payment for INV-2025-003",
        amount=3520.00,
    ),
]

sync_stats = SyncStats(
    total_invoices=15,
    synced_invoices=12,
    pending_invoices=2,
    failed_invoices=1,
    total_payments=8,
    synced_payments=7,
    pending_payments=0,
    failed_payments=1,
)

# --- API Endpoints ---

@app.get("/api/v1/invoicing/xero/status", response_model=XeroStatus)
def get_xero_status():
    return xero_status


@app.get("/api/v1/invoicing/xero/sync-status")
def get_sync_status():
    return {"items": sync_items, "stats": sync_stats}


@app.post("/api/v1/invoicing/xero/connect")
def connect_xero():
    xero_status.connected = True
    xero_status.tenant_name = "NDIS Support Services Pty Ltd"
    xero_status.sync_status = "idle"
    return {"message": "Connected to Xero"}


@app.post("/api/v1/invoicing/xero/disconnect")
def disconnect_xero():
    xero_status.connected = False
    xero_status.tenant_name = None
    xero_status.last_sync = None
    xero_status.sync_status = "idle"
    return {"message": "Disconnected from Xero"}


@app.post("/api/v1/invoicing/xero/sync", response_model=SyncResponse)
def sync_xero(request: SyncRequest):
    if not xero_status.connected:
        raise HTTPException(status_code=400, detail="Not connected to Xero")

    xero_status.sync_status = "syncing"

    # Example sync logic: mark selected items as synced
    synced, failed = 0, 0
    item_ids = request.item_ids or [item.id for item in sync_items]

    for item in sync_items:
        if item.id in item_ids:
            if item.status in ["pending", "error"]:
                item.status = "synced"
                item.xero_id = f"XERO-{item.type.upper()}-{item.id}"
                item.last_updated = datetime.utcnow().isoformat()
                item.error_message = None
                synced += 1
            else:
                failed += 1

    xero_status.last_sync = datetime.utcnow().isoformat()
    xero_status.sync_status = "success"

    return SyncResponse(synced=synced, failed=failed)
