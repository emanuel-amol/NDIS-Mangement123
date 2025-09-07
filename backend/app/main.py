# backend/app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging, traceback

# Database imports
from app.core.database import Base, engine
# Import API routers
from app.api.v1.api import api_router

# Create FastAPI app
app = FastAPI(
    title="NDIS Management System",
    description="AI-Integrated NDIS Provider Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=True,   # ensure debug mode is on
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to log unhandled exceptions (prints tracebacks in uvicorn console)
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logging.error("UNHANDLED ERROR: %s", e, exc_info=True)
        traceback.print_exc()
        raise

# Startup event: create DB tables if they don’t exist
@app.on_event("startup")
def create_tables():
    # Import models so they’re registered with SQLAlchemy Base.metadata
    from app.models import referral   # <-- ensures Referral model is loaded
    Base.metadata.create_all(bind=engine)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "NDIS Management System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
