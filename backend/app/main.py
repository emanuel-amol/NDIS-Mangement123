# backend/app/main.py
from datetime import datetime
import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# DB base/engine
from app.core.database import Base, engine

# Routers
from app.api.v1.api import api_router
from app.api.v1 import dynamic_data

# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(
    title="NDIS Management System",
    description="AI-Integrated NDIS Provider Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=True,
)

# -----------------------------------------------------------------------------
# CORS (adjust origins as needed)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG if app.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)

# -----------------------------------------------------------------------------
# Error logging middleware
# -----------------------------------------------------------------------------
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logging.error("UNHANDLED ERROR: %s", e, exc_info=True)
        traceback.print_exc()
        # Re-raise so FastAPI returns a proper 500 response
        raise

# -----------------------------------------------------------------------------
# Startup: create tables
# -----------------------------------------------------------------------------
@app.on_event("startup")
def create_tables() -> None:
    # Import models so SQLAlchemy registers them on Base.metadata
    # (avoid local circulars by importing inside the function)
    from app.models import referral, dynamic_data as dynamic_data_model  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logging.info("Database tables ensured/created.")

# -----------------------------------------------------------------------------
# Routers
# -----------------------------------------------------------------------------
app.include_router(api_router, prefix="/api/v1")
app.include_router(dynamic_data.router, prefix="/api/v1/dynamic-data", tags=["dynamic-data"])

# -----------------------------------------------------------------------------
# Health / root
# -----------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "NDIS Management System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}

# -----------------------------------------------------------------------------
# Dev entrypoint
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug",
    )
