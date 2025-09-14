# backend/app/main.py - Updated with Dynamic Data Support
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging, traceback

# Database imports
from app.core.database import Base, engine
# Import API routers
from app.api.v1.api import api_router
from app.api.v1 import dynamic_data_enhanced

# Create FastAPI app
app = FastAPI(
    title="NDIS Management System",
    description="AI-Integrated NDIS Provider Management Platform with Dynamic Data Management",
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

# Startup event: create DB tables and initialize default data
@app.on_event("startup")
async def startup_event():
    # Import models so they're registered with SQLAlchemy Base.metadata
    from app.models import referral, dynamic_data, user, email_log
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize default dynamic data
    try:
        from app.core.database import SessionLocal
        from app.services.dynamic_data_service import DynamicDataService
        
        db = SessionLocal()
        try:
            # Check if we need to initialize default data
            existing_types = DynamicDataService.get_data_types(db, active_only=False)
            if not existing_types:
                logging.info("Initializing default dynamic data types...")
                DynamicDataService.initialize_default_data_types(db)
                logging.info("Default dynamic data initialized successfully")
            else:
                logging.info(f"Found {len(existing_types)} existing data types, skipping initialization")
        except Exception as e:
            logging.error(f"Error during startup initialization: {e}")
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        logging.error(f"Failed to initialize dynamic data: {e}")

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Include enhanced dynamic data routes
app.include_router(
    dynamic_data_enhanced.router, 
    prefix="/api/v1/dynamic-data", 
    tags=["dynamic-data"]
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "NDIS Management System API with Dynamic Data", 
        "status": "running",
        "features": [
            "Referral Management",
            "Dynamic Data Types",
            "Care Plan Management",
            "Risk Assessment",
            "Provider Management"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.now(),
        "database": "connected"
    }

# Debug endpoint to list all routes
@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to see all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'N/A'),
                "tags": getattr(route, 'tags', [])
            })
    return {"routes": routes}

# Dynamic data status endpoint
@app.get("/api/v1/dynamic-data/status")
async def dynamic_data_status():
    """Get status of dynamic data system"""
    try:
        from app.core.database import SessionLocal
        from app.services.dynamic_data_service import DynamicDataService
        
        db = SessionLocal()
        try:
            data_types = DynamicDataService.get_data_types(db, active_only=False)
            
            stats = {}
            total_points = 0
            
            for data_type in data_types:
                points = DynamicDataService.get_data_points_by_type_id(
                    db, str(data_type.id), active_only=False
                )
                stats[data_type.name] = {
                    "display_name": data_type.display_name,
                    "points_count": len(points),
                    "is_active": data_type.is_active
                }
                total_points += len(points)
            
            return {
                "status": "operational",
                "total_data_types": len(data_types),
                "total_data_points": total_points,
                "data_types": stats
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")