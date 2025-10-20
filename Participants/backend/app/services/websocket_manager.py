# backend/app/services/websocket_manager.py
from fastapi import WebSocket
from typing import List, Dict, Any, Set
import json
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        """Connect a new WebSocket client"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "subscriptions": set()
        }
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_metadata.pop(websocket, None)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
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
        message_json = json.dumps(message, default=str)
        
        for connection in self.active_connections:
            try:
                # Apply subscription filter if specified
                if subscription_filter:
                    metadata = self.connection_metadata.get(connection, {})
                    subscriptions = metadata.get("subscriptions", set())
                    if subscription_filter not in subscriptions:
                        continue

                await connection.send_text(message_json)
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

# backend/app/services/notification_service.py
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.email_enabled = True  # This would come from settings
        self.sms_enabled = False   # This would come from settings

    async def send_roster_created_notification(
        self, 
        roster_id: int, 
        conflicts: List[Any] = None
    ):
        """Send notifications when a new roster entry is created"""
        try:
            message = f"New roster entry {roster_id} has been created"
            if conflicts:
                message += f" with {len(conflicts)} conflict(s) detected"
            
            # Here you would implement actual email/SMS sending
            logger.info(f"Notification sent: {message}")
            
        except Exception as e:
            logger.error(f"Error sending roster created notification: {e}")

    async def send_roster_updated_notification(
        self, 
        roster_id: int, 
        changes: Dict[str, Any]
    ):
        """Send notifications when a roster entry is updated"""
        try:
            change_summary = ", ".join(changes.keys())
            message = f"Roster entry {roster_id} has been updated. Changes: {change_summary}"
            
            # Here you would implement actual email/SMS sending
            logger.info(f"Notification sent: {message}")
            
        except Exception as e:
            logger.error(f"Error sending roster updated notification: {e}")

    async def send_roster_cancelled_notification(
        self, 
        roster_details: Dict[str, Any]
    ):
        """Send notifications when a roster entry is cancelled"""
        try:
            roster_id = roster_details.get("id", "unknown")
            message = f"Roster entry {roster_id} has been cancelled"
            
            # Here you would implement actual email/SMS sending
            logger.info(f"Notification sent: {message}")
            
        except Exception as e:
            logger.error(f"Error sending roster cancelled notification: {e}")

    async def send_conflict_alert(
        self, 
        conflict_info: Dict[str, Any]
    ):
        """Send alerts for scheduling conflicts"""
        try:
            conflict_type = conflict_info.get("type", "unknown")
            message = f"Scheduling conflict detected: {conflict_type}"
            
            # Here you would implement actual email/SMS sending
            logger.info(f"Conflict alert sent: {message}")
            
        except Exception as e:
            logger.error(f"Error sending conflict alert: {e}")

    async def send_reminder_notification(
        self, 
        roster_id: int, 
        reminder_type: str = "24h"
    ):
        """Send appointment reminders"""
        try:
            message = f"Reminder: Roster entry {roster_id} is scheduled for {reminder_type}"
            
            # Here you would implement actual email/SMS sending
            logger.info(f"Reminder sent: {message}")
            
        except Exception as e:
            logger.error(f"Error sending reminder notification: {e}")

    def _send_email(self, to_email: str, subject: str, body: str):
        """Helper method to send email (placeholder implementation)"""
        try:
            # This is a placeholder - implement actual email sending
            logger.info(f"Email would be sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    def _send_sms(self, phone_number: str, message: str):
        """Helper method to send SMS (placeholder implementation)"""
        try:
            # This is a placeholder - implement actual SMS sending
            logger.info(f"SMS would be sent to {phone_number}: {message}")
            return True
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False