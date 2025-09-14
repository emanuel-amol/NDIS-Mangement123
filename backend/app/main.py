# backend/app/main.py - Updated with Complete Dynamic Data Support
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging, traceback

# Database imports
from app.core.database import Base, engine
# Import API routers
from app.api.v1.api_simple import api_router
from app.api.v1 import dynamic_data_complete

# Create FastAPI app
app = FastAPI(
    title="NDIS Management System",
    description="AI-Integrated NDIS Provider Management Platform with Complete Dynamic Data Management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=True,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",
        "http://localhost:8080",  # Alternative dev server
        "http://127.0.0.1:8080",
    ],
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
                
                # Log summary of what was created
                data_types = DynamicDataService.get_data_types(db, active_only=False)
                logging.info(f"Initialized {len(data_types)} data types:")
                
                for data_type in data_types:
                    points = DynamicDataService.get_data_points_by_type_id(
                        db, str(data_type.id), active_only=False
                    )
                    logging.info(f"  - {data_type.display_name}: {len(points)} points")
            else:
                logging.info(f"Found {len(existing_types)} existing data types, skipping initialization")
        except Exception as e:
            logging.error(f"Error during startup initialization: {e}")
            db.rollback()
        finally:
            db.close()
    except Exception as e:
        logging.error(f"Failed to initialize dynamic data: {e}")

# Include main API routes
app.include_router(api_router, prefix="/api/v1")

# Include complete dynamic data routes
app.include_router(
    dynamic_data_complete.router, 
    prefix="/api/v1/dynamic-data", 
    tags=["dynamic-data"]
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "NDIS Management System API with Complete Dynamic Data Support", 
        "status": "running",
        "version": "1.0.0",
        "features": [
            "Referral Management",
            "Complete Dynamic Data Types & Points",
            "Care Plan Management",
            "Risk Assessment",
            "Provider Management",
            "Email Notifications"
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "timestamp": datetime.now(),
        "database": "connected",
        "features": {
            "dynamic_data": "enabled",
            "referrals": "enabled",
            "email_service": "enabled"
        }
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
@app.get("/api/v1/dynamic-data-status")
async def dynamic_data_status():
    """Get comprehensive status of dynamic data system"""
    try:
        from app.core.database import SessionLocal
        from app.services.dynamic_data_service import DynamicDataService
        
        db = SessionLocal()
        try:
            data_types = DynamicDataService.get_data_types(db, active_only=False)
            
            stats = {}
            total_points = 0
            active_points = 0
            
            for data_type in data_types:
                points = DynamicDataService.get_data_points_by_type_id(
                    db, str(data_type.id), active_only=False
                )
                active_type_points = DynamicDataService.get_data_points_by_type_id(
                    db, str(data_type.id), active_only=True
                )
                
                stats[data_type.name] = {
                    "id": str(data_type.id),
                    "display_name": data_type.display_name,
                    "description": data_type.description,
                    "total_points": len(points),
                    "active_points": len(active_type_points),
                    "is_active": data_type.is_active,
                    "created_at": data_type.created_at.isoformat(),
                    "updated_at": data_type.updated_at.isoformat()
                }
                total_points += len(points)
                active_points += len(active_type_points)
            
            return {
                "status": "operational",
                "total_data_types": len(data_types),
                "active_data_types": len([dt for dt in data_types if dt.is_active]),
                "total_data_points": total_points,
                "active_data_points": active_points,
                "data_types": stats,
                "api_endpoints": {
                    "data_types": "/api/v1/dynamic-data/data-types",
                    "data_points": "/api/v1/dynamic-data/data-points",
                    "search": "/api/v1/dynamic-data/search",
                    "initialize": "/api/v1/dynamic-data/initialize",
                    "status": "/api/v1/dynamic-data/status"
                }
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to retrieve dynamic data status"
        }

# Test endpoint for dynamic data operations
@app.get("/api/v1/test-dynamic-data")
async def test_dynamic_data():
    """Test endpoint to verify dynamic data functionality"""
    try:
        from app.core.database import SessionLocal
        from app.services.dynamic_data_service import DynamicDataService
        
        db = SessionLocal()
        try:
            # Test getting data types
            data_types = DynamicDataService.get_data_types(db)
            
            # Test getting specific data points
            test_results = {
                "data_types_count": len(data_types),
                "sample_data_types": [dt.name for dt in data_types[:5]],
                "test_points": {}
            }
            
            # Test a few specific data types
            test_types = ['disability_types', 'contact_methods', 'service_types']
            for type_name in test_types:
                points = DynamicDataService.get_data_points_by_type_name(db, type_name)
                test_results["test_points"][type_name] = {
                    "count": len(points),
                    "samples": [{"name": p.name, "description": p.description} for p in points[:3]]
                }
            
            return {
                "status": "success",
                "message": "Dynamic data system is working correctly",
                "test_results": test_results
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Dynamic data test failed"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")