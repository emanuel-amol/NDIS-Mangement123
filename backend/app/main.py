# backend/app/main.py - FIXED VERSION
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging, traceback

# Database imports
from app.core.database import Base, engine
# Import API routers - USE THE FIXED VERSION
from app.api.v1.api import api_router  # This now includes referrals_simple with correct endpoints
from app.api.v1 import dynamic_data

# Create FastAPI app
app = FastAPI(
    title="NDIS Management System",
    description="AI-Integrated NDIS Provider Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=True,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to log unhandled exceptions
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logging.error("UNHANDLED ERROR: %s", e, exc_info=True)
        traceback.print_exc()
        raise

# Startup event: create DB tables if they don't exist
@app.on_event("startup")
def create_tables():
    # Import models so they're registered with SQLAlchemy Base.metadata
    from app.models import referral, dynamic_data
    Base.metadata.create_all(bind=engine)

# Include API routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(dynamic_data.router, prefix="/api/v1/dynamic-data", tags=["dynamic-data"])

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "NDIS Management System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Debug endpoint to list all routes
@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to see all available routes"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": getattr(route, 'path', 'N/A'),
            "methods": getattr(route, 'methods', 'N/A'),
            "name": getattr(route, 'name', 'N/A')
        })
    return {"routes": routes}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")