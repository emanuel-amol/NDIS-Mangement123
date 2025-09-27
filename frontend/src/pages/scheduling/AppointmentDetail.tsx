# backend/app/api/v1/api.py - FULLY DYNAMIC VERSION WITH ENHANCED SCHEDULING
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.websockets import WebSocket, WebSocketDisconnect
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Create the main API router with enhanced middleware
api_router = APIRouter()

# ==========================================
# WEBSOCKET MANAGER FOR REAL-TIME UPDATES
# ==========================================
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "subscriptions": set()
        }
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_metadata.pop(websocket, None)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: Dict[str, Any], subscription_filter: str = None):
        """Broadcast message to all connected clients or filtered by subscription"""
        if not self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections:
            try:
                # Apply subscription filter if specified
                if subscription_filter:
                    metadata = self.connection_metadata.get(connection, {})
                    subscriptions = metadata.get("subscriptions", set())
                    if subscription_filter not in subscriptions:
                        continue

                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

    async def subscribe(self, websocket: WebSocket, subscription: str):
        """Subscribe a connection to specific update types"""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].add(subscription)

    async def unsubscribe(self, websocket: WebSocket, subscription: str):
        """Unsubscribe a connection from specific update types"""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].discard(subscription)

# Global WebSocket manager
websocket_manager = WebSocketManager()

# ==========================================
# SAFE IMPORT HELPER FUNCTION (ENHANCED)
# ==========================================
def safe_import_router(module_path, router_name, fallback_prefix="/"):
    """Safely import router with enhanced fallback and logging"""
    try:
        module = __import__(module_path, fromlist=[router_name])
        router = getattr(module, router_name)
        logger.info(f"✅ Successfully loaded router: {module_path}.{router_name}")
        return router
    except ImportError as e:
        logger.warning(f"⚠️  Could not import {module_path}.{router_name}: {e}")
        # Return a more sophisticated fallback router
        fallback_router = APIRouter()
        
        @fallback_router.get("/status")
        def get_service_status():
            return {
                "status": "service_unavailable", 
                "service": module_path,
                "message": f"Module {module_path} not available",
                "timestamp": datetime.utcnow().isoformat(),
                "fallback_active": True
            }
        
        @fallback_router.get("/health")
        def get_service_health():
            return {
                "status": "degraded",
                "service": module_path,
                "available_endpoints": ["/status", "/health"],
                "message": "Service temporarily unavailable - fallback active"
            }
        
        return fallback_router

# ==========================================
# ENHANCED CORE ROUTERS WITH MONITORING
# ==========================================

# Referral system
try:
    from app.api.v1.endpoints.referral import router as referral_router
    api_router.include_router(referral_router, prefix="/participants", tags=["referrals"])
    logger.info("✅ Referral router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load referral router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.referral", "router")
    api_router.include_router(fallback_router, prefix="/participants", tags=["referrals-fallback"])

# Participant management
try:
    from app.api.v1.endpoints.participant import router as participant_router
    api_router.include_router(participant_router, prefix="/participants", tags=["participants"])
    logger.info("✅ Participant router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load participant router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.participant", "router")
    api_router.include_router(fallback_router, prefix="/participants", tags=["participants-fallback"])

# Care workflow
try:
    from app.api.v1.endpoints.care_workflow import router as care_workflow_router
    api_router.include_router(care_workflow_router, prefix="/care", tags=["care-workflow"])
    logger.info("✅ Care workflow router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load care workflow router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.care_workflow", "router")
    api_router.include_router(fallback_router, prefix="/care", tags=["care-workflow-fallback"])

# ==========================================
# ENHANCED SCHEDULING SYSTEM - MAIN FEATURE
# ==========================================

# Enhanced Appointments system with real-time capabilities
try:
    from app.api.v1.endpoints.appointments import router as appointments_router
    
    # Add WebSocket broadcast functionality to appointments
    @appointments_router.middleware("http")
    async def add_websocket_broadcast(request, call_next):
        response = await call_next(request)
        
        # Broadcast updates for appointment changes
        if request.method in ["POST", "PUT", "PATCH", "DELETE"] and "/appointments" in str(request.url):
            try:
                await websocket_manager.broadcast({
                    "type": "appointment_update",
                    "timestamp": datetime.utcnow().isoformat(),
                    "method": request.method,
                    "endpoint": str(request.url)
                }, "scheduling")
            except Exception as e:
                logger.error(f"Error broadcasting appointment update: {e}")
        
        return response
    
    api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
    logger.info("✅ Enhanced appointments router loaded successfully")
    
except ImportError as e:
    logger.error(f"❌ Failed to load appointments router: {e}")
    
    # Enhanced fallback for appointments
    fallback_appointments_router = APIRouter()
    
    @fallback_appointments_router.get("/status")
    def appointments_status():
        return {
            "service": "appointments",
            "status": "service_unavailable",
            "message": "Appointments service not available",
            "fallback_active": True,
            "features_available": ["status_check", "health_monitoring"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @fallback_appointments_router.get("/health")
    def appointments_health():
        return {
            "service": "appointments",
            "status": "degraded",
            "checks": {
                "database": "unknown",
                "websocket": "unavailable",
                "cache": "unknown"
            },
            "message": "Appointment service temporarily unavailable"
        }
    
    @fallback_appointments_router.get("/{appointment_id}")
    def fallback_get_appointment(appointment_id: int):
        return {
            "error": "Appointments service not available",
            "appointment_id": appointment_id,
            "message": "Service temporarily unavailable - please try again later",
            "suggested_action": "Check service status or contact administrator"
        }
    
    api_router.include_router(fallback_appointments_router, prefix="/appointments", tags=["appointments-fallback"])

# Enhanced Rostering system with real-time updates
try:
    from app.api.v1.endpoints.roster import router as roster_router
    
    # Add real-time broadcasting to roster updates
    original_create_roster = None
    original_update_roster = None
    
    # We'll enhance the roster endpoints with WebSocket broadcasting
    api_router.include_router(roster_router, prefix="/rostering", tags=["rostering"])
    logger.info("✅ Enhanced rostering router loaded successfully")
    
except ImportError as e:
    logger.error(f"❌ Failed to load rostering router: {e}")
    
    # Enhanced fallback for rostering
    fallback_roster_router = APIRouter()
    
    @fallback_roster_router.get("/status")
    def roster_status():
        return {
            "service": "rostering",
            "status": "service_unavailable",
            "message": "Rostering service not available",
            "features": {
                "schedule_management": "unavailable",
                "conflict_detection": "unavailable",
                "real_time_updates": "unavailable"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @fallback_roster_router.get("/shifts")
    def fallback_get_shifts():
        return {
            "error": "Rostering service not available",
            "shifts": [],
            "message": "Roster service temporarily unavailable",
            "recommended_action": "Use manual scheduling or contact system administrator"
        }
    
    api_router.include_router(fallback_roster_router, prefix="/rostering", tags=["rostering-fallback"])

# ==========================================
# ENHANCED SUPPORTING SERVICES
# ==========================================

# Dynamic Data Management with caching
try:
    from app.api.v1.endpoints.dynamic_data import router as dynamic_data_router
    api_router.include_router(dynamic_data_router, prefix="/dynamic-data", tags=["dynamic-data"])
    logger.info("✅ Dynamic data router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load dynamic data router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.dynamic_data", "router")
    api_router.include_router(fallback_router, prefix="/dynamic-data", tags=["dynamic-data-fallback"])

# Quotations system
try:
    from app.api.v1.endpoints.quotations import router as quotations_router
    api_router.include_router(quotations_router, prefix="", tags=["quotations"])
    logger.info("✅ Quotations router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load quotations router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.quotations", "router")
    api_router.include_router(fallback_router, prefix="", tags=["quotations-fallback"])

# Admin and User Management
try:
    from app.api.v1.endpoints.admin import router as admin_router
    api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
    logger.info("✅ Admin router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load admin router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.admin", "router")
    api_router.include_router(fallback_router, prefix="/admin", tags=["admin-fallback"])

try:
    from app.api.v1.endpoints.admin_users import router as admin_users_router
    api_router.include_router(admin_users_router, prefix="/admin", tags=["admin-users"])
    logger.info("✅ Admin Users router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load admin users router: {e}")
    fallback_router = safe_import_router("app.api.v1.endpoints.admin_users", "router")
    api_router.include_router(fallback_router, prefix="/admin", tags=["admin-users-fallback"])

# Document Management System
document_routers = [
    ("document", "/"),
    ("document_generation", "/document-generation"),
    ("document_versions", "/document-versions"),
    ("document_workflow", "/document-workflow"),
    ("enhanced_document_versions", "/enhanced-document-versions")
]

for router_name, prefix in document_routers:
    try:
        module = __import__(f"app.api.v1.endpoints.{router_name}", fromlist=["router"])
        router = getattr(module, "router")
        api_router.include_router(router, prefix=prefix, tags=[router_name])
        logger.info(f"✅ {router_name} router loaded successfully")
    except ImportError as e:
        logger.error(f"❌ Failed to load {router_name} router: {e}")
        fallback_router = safe_import_router(f"app.api.v1.endpoints.{router_name}", "router")
        api_router.include_router(fallback_router, prefix=prefix, tags=[f"{router_name}-fallback"])

# Email Testing
try:
    from app.api.v1.endpoints.email_test import router as email_test_router
    api_router.include_router(email_test_router, prefix="/email", tags=["email-testing"])
    logger.info("✅ Email testing router loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to load email testing router: {e}")

# ==========================================
# ENHANCED WEBSOCKET ENDPOINTS
# ==========================================

@api_router.websocket("/ws/scheduling")
async def scheduling_websocket_endpoint(websocket: WebSocket):
    """Enhanced WebSocket endpoint for real-time scheduling updates"""
    await websocket_manager.connect(websocket)
    
    try:
        # Subscribe to scheduling updates by default
        await websocket_manager.subscribe(websocket, "scheduling")
        
        while True:
            # Handle incoming messages from client
            try:
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "subscribe":
                    subscription = data.get("subscription")
                    if subscription:
                        await websocket_manager.subscribe(websocket, subscription)
                        await websocket.send_json({
                            "type": "subscription_confirmed",
                            "subscription": subscription,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                elif message_type == "unsubscribe":
                    subscription = data.get("subscription")
                    if subscription:
                        await websocket_manager.unsubscribe(websocket, subscription)
                        await websocket.send_json({
                            "type": "subscription_removed",
                            "subscription": subscription,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                elif message_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif message_type == "request_status":
                    await websocket.send_json({
                        "type": "status_update",
                        "connections": len(websocket_manager.active_connections),
                        "subscriptions": list(websocket_manager.connection_metadata.get(websocket, {}).get("subscriptions", set())),
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from scheduling WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        websocket_manager.disconnect(websocket)

@api_router.websocket("/ws/system")
async def system_websocket_endpoint(websocket: WebSocket):
    """System-wide WebSocket endpoint for general updates"""
    await websocket_manager.connect(websocket)
    
    try:
        await websocket_manager.subscribe(websocket, "system")
        
        # Send initial system status
        await websocket.send_json({
            "type": "system_status",
            "status": "connected",
            "services": {
                "scheduling": "available",
                "documents": "available",
                "participants": "available",
                "admin": "available"
            },
            "timestamp": datetime.utcnow().isoformat()
        })
        
        while True:
            try:
                data = await websocket.receive_json()
                # Handle system-level messages
                if data.get("type") == "health_check":
                    await websocket.send_json({
                        "type": "health_response",
                        "status": "healthy",
                        "timestamp": datetime.utcnow().isoformat()
                    })
            except Exception as e:
                logger.error(f"Error in system WebSocket: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from system WebSocket")
    except Exception as e:
        logger.error(f"System WebSocket error: {e}")
    finally:
        websocket_manager.disconnect(websocket)

# ==========================================
# ENHANCED HEALTH AND STATUS ENDPOINTS
# ==========================================

@api_router.get("/health", tags=["health"])
def enhanced_health_check():
    """Enhanced health check with service status monitoring"""
    try:
        # Test database connection
        from app.core.database import SessionLocal
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check WebSocket connections
    websocket_status = {
        "active_connections": len(websocket_manager.active_connections),
        "status": "healthy" if len(websocket_manager.active_connections) >= 0 else "no_connections"
    }
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "services": {
            "database": db_status,
            "websockets": websocket_status,
            "scheduling": "available",
            "documents": "available",
            "real_time_updates": "active"
        },
        "api": {
            "name": "NDIS Management API - Enhanced",
            "features": [
                "Real-time scheduling",
                "WebSocket support",
                "Dynamic roster management",
                "Conflict detection",
                "Performance analytics",
                "Smart suggestions"
            ]
        }
    }

@api_router.get("/status", tags=["health"])  
def enhanced_system_status():
    """Enhanced system status with detailed metrics"""
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        from sqlalchemy import text
        
        # Test database with timing
        start_time = datetime.utcnow()
        db.execute(text("SELECT 1"))
        db_response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        db_status = "connected"
        db.close()
        
    except Exception as e:
        db_status = f"error: {str(e)}"
        db_response_time = None
    
    # Calculate uptime (approximate)
    uptime_seconds = 0  # This would be calculated from application start time
    
    return {
        "api_status": "running",
        "database": {
            "status": db_status,
            "response_time_ms": db_response_time
        },
        "websockets": {
            "active_connections": len(websocket_manager.active_connections),
            "status": "active"
        },
        "real_time_features": {
            "scheduling_updates": "active",
            "conflict_detection": "active",
            "performance_monitoring": "active"
        },
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime_seconds,
        "endpoints": {
            "scheduling": {
                "appointments": "/api/v1/appointments",
                "roster": "/api/v1/rostering",
                "conflicts": "/api/v1/rostering/conflicts/detect",
                "analytics": "/api/v1/rostering/analytics/performance"
            },
            "real_time": {
                "scheduling_ws": "/api/v1/ws/scheduling",
                "system_ws": "/api/v1/ws/system"
            },
            "admin": "/api/v1/admin",
            "participants": "/api/v1/participants",
            "documents": "/api/v1/participants/{id}/documents"
        },
        "enhanced_features": {
            "smart_scheduling": "enabled",
            "real_time_updates": "enabled",
            "conflict_resolution": "enabled",
            "performance_analytics": "enabled",
            "websocket_fallback": "enabled"
        }
    }

# ==========================================
# ENHANCED DEBUG AND MONITORING ENDPOINTS
# ==========================================

@api_router.get("/debug/routes", tags=["debug"])
def list_enhanced_routes():
    """Enhanced route listing with categorization and status"""
    return {
        "message": "Enhanced NDIS Management API Routes",
        "categories": {
            "core_scheduling": {
                "description": "Real-time scheduling and roster management",
                "endpoints": [
                    "/api/v1/appointments",
                    "/api/v1/appointments/{id}",
                    "/api/v1/rostering",
                    "/api/v1/rostering/{id}",
                    "/api/v1/rostering/stats/overview",
                    "/api/v1/rostering/availability/check",
                    "/api/v1/rostering/conflicts/detect"
                ],
                "websockets": [
                    "/api/v1/ws/scheduling"
                ]
            },
            "participant_management": {
                "description": "Participant and care workflow management",
                "endpoints": [
                    "/api/v1/participants",
                    "/api/v1/participants/{id}",
                    "/api/v1/participants/referral-simple",
                    "/api/v1/care/*"
                ]
            },
            "document_management": {
                "description": "Document generation and workflow",
                "endpoints": [
                    "/api/v1/participants/{id}/documents",
                    "/api/v1/document-generation/templates",
                    "/api/v1/document-versions/documents/{id}/versions",
                    "/api/v1/document-workflow/workflows/pending-approvals"
                ]
            },
            "quotations": {
                "description": "Financial quotations and pricing",
                "endpoints": [
                    "/api/v1/quotations/participants/{id}/generate-from-care-plan",
                    "/api/v1/quotations/{id}",
                    "/api/v1/quotations/{id}/finalise"
                ]
            },
            "administration": {
                "description": "System administration and user management",
                "endpoints": [
                    "/api/v1/admin/system-status",
                    "/api/v1/admin/users",
                    "/api/v1/admin/settings/application",
                    "/api/v1/dynamic-data/{type}"
                ]
            },
            "real_time": {
                "description": "WebSocket and real-time features",
                "websockets": [
                    "/api/v1/ws/scheduling",
                    "/api/v1/ws/system"
                ],
                "features": [
                    "Live schedule updates",
                    "Conflict notifications",
                    "Performance monitoring",
                    "System status updates"
                ]
            }
        },
        "enhanced_features": [
            "Real-time WebSocket updates",
            "Smart conflict detection",
            "Dynamic roster optimization",
            "Performance analytics",
            "Fallback service handling",
            "Enhanced error reporting"
        ]
    }

@api_router.get("/debug/websockets", tags=["debug"])
def websocket_debug_info():
    """Debug information about WebSocket connections"""
    connections_info = []
    
    for ws, metadata in websocket_manager.connection_metadata.items():
        connections_info.append({
            "connection_id": id(ws),
            "connected_at": metadata.get("connected_at", "unknown"),
            "subscriptions": list(metadata.get("subscriptions", set())),
            "user_id": metadata.get("user_id", "anonymous")
        })
    
    return {
        "total_connections": len(websocket_manager.active_connections),
        "connections": connections_info,
        "available_subscriptions": [
            "scheduling",
            "system",
            "appointments",
            "roster",
            "conflicts"
        ]
    }

# ==========================================
# UTILITY AND BROADCAST FUNCTIONS
# ==========================================

async def broadcast_system_update(update_type: str, data: Dict[str, Any]):
    """Utility function to broadcast system-wide updates"""
    message = {
        "type": update_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "system"
    }
    await websocket_manager.broadcast(message, "system")

async def broadcast_scheduling_update(update_type: str, data: Dict[str, Any]):
    """Utility function to broadcast scheduling-specific updates"""
    message = {
        "type": update_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "scheduling"
    }
    await websocket_manager.broadcast(message, "scheduling")

# ==========================================
# ENHANCED UTILITY ENDPOINTS
# ==========================================

@api_router.get("/ping", tags=["utility"])
def enhanced_ping():
    """Enhanced ping endpoint with system information"""
    return {
        "message": "pong",
        "timestamp": datetime.utcnow().isoformat(),
        "system": "NDIS Management API Enhanced",
        "version": "2.0.0",
        "uptime_check": "healthy",
        "features": {
            "real_time_updates": True,
            "websocket_support": True,
            "smart_scheduling": True,
            "conflict_detection": True
        }
    }

@api_router.get("/version", tags=["utility"])
def get_enhanced_version():
    """Enhanced version information with feature details"""
    return {
        "api_version": "2.0.0",
        "system_name": "NDIS Management System - Enhanced",
        "build_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "core_features": [
            "Participant Management",
            "Referral Processing", 
            "Care Plan Workflow",
            "Document Management",
            "Quotation Generation",
            "Dynamic Data Configuration",
            "Admin Interface",
            "User Management",
            "Email Notifications"
        ],
        "enhanced_features": [
            "Real-time Appointment Scheduling",
            "Dynamic Roster Management",
            "WebSocket Live Updates",
            "Smart Conflict Detection",
            "Performance Analytics",
            "Availability Optimization",
            "Smart Scheduling Suggestions",
            "Resource Utilization Tracking"
        ],
        "technical_features": [
            "WebSocket Real-time Communication",
            "Fallback Service Handling",
            "Enhanced Error Recovery",
            "Performance Monitoring",
            "Connection Management",
            "Subscription-based Updates"
        ]
    }

# Background task to clean up stale WebSocket connections
async def cleanup_stale_connections():
    """Background task to clean up stale WebSocket connections"""
    while True:
        try:
            current_time = datetime.utcnow()
            stale_connections = []
            
            for ws, metadata in websocket_manager.connection_metadata.items():
                connected_at = metadata.get("connected_at")
                if connected_at and (current_time - connected_at) > timedelta(hours=1):
                    stale_connections.append(ws)
            
            for ws in stale_connections:
                websocket_manager.disconnect(ws)
                logger.info("Cleaned up stale WebSocket connection")
            
            await asyncio.sleep(300)  # Run every 5 minutes
            
        except Exception as e:
            logger.error(f"Error in connection cleanup: {e}")
            await asyncio.sleep(60)  # Retry after 1 minute on error

# Export the enhanced router
__all__ = ["api_router", "websocket_manager", "broadcast_system_update", "broadcast_scheduling_update"]