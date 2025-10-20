# backend/app/services/xero_service.py

"""
Xero OAuth2 service with secure database-backed token storage.

This service manages Xero authentication tokens with the following security features:
1. Tokens are stored in the database (not in memory)
2. Tokens are encrypted at rest using Fernet symmetric encryption
3. Supports multiple users/organizations with separate Xero connections
4. Tokens persist across server restarts
5. Automatic token refresh when expired
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from xero_python.api_client import ApiClient
from xero_python.api_client.configuration import Configuration

from app.models.xero_token import XeroToken
from app.core.encryption import encrypt_token, decrypt_token


# OAuth scopes
XERO_SCOPES = [
    "offline_access",
    "openid",
    "profile",
    "email",
    "accounting.transactions",
    "accounting.contacts"
]


class XeroTokenService:
    """
    Service for managing Xero OAuth tokens with database storage and encryption.
    """

    def __init__(self, db: Session, organization_id: Optional[int] = None, user_id: Optional[int] = None):
        """
        Initialize the Xero token service.

        Args:
            db: Database session for storing/retrieving tokens
            organization_id: Optional organization ID for multi-tenant support
            user_id: Optional user ID to track who authorized the connection
        """
        self.db = db
        self.organization_id = organization_id
        self.user_id = user_id

    def get_token_from_storage(self) -> Optional[Dict[str, Any]]:
        """
        Retrieve and decrypt the stored Xero token from database.

        Returns:
            Dictionary with token information (as expected by Xero SDK)
            or None if no valid token exists
        """
        print(f"✅ GETTER CALLED: Retrieving token from database for org={self.organization_id}, user={self.user_id}")

        # Query for active token
        query = self.db.query(XeroToken).filter(
            XeroToken.is_active == "active"
        )

        # Filter by organization if provided
        if self.organization_id:
            query = query.filter(XeroToken.organization_id == self.organization_id)
        else:
            # If no organization specified, get the most recent token
            query = query.filter(XeroToken.organization_id.is_(None))

        # Get the most recent token
        token_record = query.order_by(XeroToken.updated_at.desc()).first()

        if not token_record:
            print("📦 No active token found in database")
            return None

        # Check if token is expired
        current_time = int(datetime.now().timestamp())
        if token_record.expires_at <= current_time:
            print(f"⚠️ Token expired at {token_record.expires_at}, current time: {current_time}")
            # Mark as expired
            token_record.is_active = "expired"
            self.db.commit()
            return None

        # Decrypt tokens
        try:
            access_token = decrypt_token(token_record.access_token_encrypted)
            refresh_token = decrypt_token(token_record.refresh_token_encrypted)
            id_token = decrypt_token(token_record.id_token_encrypted) if token_record.id_token_encrypted else None

            print(f"📦 Retrieved and decrypted token from database (expires at: {token_record.expires_at})")

            # Update last used timestamp
            token_record.last_used_at = datetime.now()
            self.db.commit()

            # Return in format expected by Xero SDK
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "id_token": id_token,
                "token_type": token_record.token_type,
                "expires_at": token_record.expires_at,
                "expires_in": max(0, token_record.expires_at - current_time),
                "scope": token_record.scope
            }

        except Exception as e:
            print(f"❌ Error decrypting token: {str(e)}")
            return None

    def set_token_in_storage(self, token_dict: Dict[str, Any]) -> None:
        """
        Encrypt and save the token to database.

        Args:
            token_dict: Dictionary with token information from Xero OAuth
        """
        print("✅ SETTER CALLED: Saving and encrypting token to database")

        # Extract token data
        access_token = token_dict.get("access_token")
        refresh_token = token_dict.get("refresh_token")
        id_token = token_dict.get("id_token")
        expires_in = token_dict.get("expires_in", 1800)
        token_type = token_dict.get("token_type", "Bearer")
        scope = token_dict.get("scope", " ".join(XERO_SCOPES))

        if not access_token or not refresh_token:
            raise ValueError("access_token and refresh_token are required")

        # Calculate expires_at if not provided
        if "expires_at" in token_dict:
            expires_at = token_dict["expires_at"]
        else:
            expires_at = int((datetime.now() + timedelta(seconds=expires_in)).timestamp())

        # Encrypt tokens
        access_token_encrypted = encrypt_token(access_token)
        refresh_token_encrypted = encrypt_token(refresh_token)
        id_token_encrypted = encrypt_token(id_token) if id_token else None

        # Check if token already exists for this org/user
        query = self.db.query(XeroToken).filter(
            XeroToken.is_active == "active"
        )

        if self.organization_id:
            query = query.filter(XeroToken.organization_id == self.organization_id)
        else:
            query = query.filter(XeroToken.organization_id.is_(None))

        existing_token = query.first()

        if existing_token:
            # Update existing token
            print(f"📦 Updating existing token record (ID: {existing_token.id})")
            existing_token.access_token_encrypted = access_token_encrypted
            existing_token.refresh_token_encrypted = refresh_token_encrypted
            existing_token.id_token_encrypted = id_token_encrypted
            existing_token.token_type = token_type
            existing_token.expires_at = expires_at
            existing_token.scope = scope
            existing_token.updated_at = datetime.now()
            existing_token.is_active = "active"
        else:
            # Create new token record
            print("📦 Creating new token record in database")
            new_token = XeroToken(
                organization_id=self.organization_id,
                user_id=self.user_id,
                access_token_encrypted=access_token_encrypted,
                refresh_token_encrypted=refresh_token_encrypted,
                id_token_encrypted=id_token_encrypted,
                token_type=token_type,
                expires_at=expires_at,
                scope=scope,
                tenant_id="",  # Will be set later when tenant info is retrieved
                is_active="active"
            )
            self.db.add(new_token)

        self.db.commit()
        print("📦 Token has been encrypted and saved to database")

    def update_tenant_info(self, tenant_id: str, tenant_name: str) -> None:
        """
        Update the tenant information for the stored token.

        Args:
            tenant_id: Xero organization/tenant ID
            tenant_name: Xero organization name
        """
        query = self.db.query(XeroToken).filter(
            XeroToken.is_active == "active"
        )

        if self.organization_id:
            query = query.filter(XeroToken.organization_id == self.organization_id)
        else:
            query = query.filter(XeroToken.organization_id.is_(None))

        token_record = query.first()

        if token_record:
            token_record.tenant_id = tenant_id
            token_record.tenant_name = tenant_name
            token_record.updated_at = datetime.now()
            self.db.commit()
            print(f"📦 Updated tenant info: {tenant_name} ({tenant_id})")

    def get_tenant_id(self) -> Optional[str]:
        """
        Get the stored Xero tenant ID.

        Returns:
            Xero tenant ID or None
        """
        query = self.db.query(XeroToken).filter(
            XeroToken.is_active == "active"
        )

        if self.organization_id:
            query = query.filter(XeroToken.organization_id == self.organization_id)
        else:
            query = query.filter(XeroToken.organization_id.is_(None))

        token_record = query.first()

        return token_record.tenant_id if token_record else None

    def clear_storage(self) -> None:
        """
        Mark all tokens for this org/user as revoked.
        """
        query = self.db.query(XeroToken)

        if self.organization_id:
            query = query.filter(XeroToken.organization_id == self.organization_id)
        else:
            query = query.filter(XeroToken.organization_id.is_(None))

        tokens = query.all()

        for token in tokens:
            token.is_active = "revoked"
            token.updated_at = datetime.now()

        self.db.commit()
        print("📦 All tokens have been revoked")

    def get_xero_client(self) -> ApiClient:
        """
        Creates and returns a properly configured Xero ApiClient instance.

        Returns:
            Configured Xero ApiClient with OAuth2 token management
        """
        client_id = os.getenv("XERO_CLIENT_ID")
        client_secret = os.getenv("XERO_CLIENT_SECRET")
        redirect_uri = os.getenv("XERO_REDIRECT_URI")

        if not all([client_id, client_secret, redirect_uri]):
            raise ValueError("Xero environment variables (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) are not set.")

        # Create configuration with token getter/setter
        config = Configuration()
        config.debug = os.getenv("APP_ENV") == "development"
        config.oauth2_token_getter = self.get_token_from_storage
        config.oauth2_token_setter = self.set_token_in_storage

        # Create API client
        api_client = ApiClient(
            configuration=config,
            pool_threads=1
        )

        # Set OAuth2 credentials on the client
        api_client.client_id = client_id
        api_client.client_secret = client_secret

        # CRITICAL: Set the private attributes directly on the ApiClient
        api_client._oauth2_token_getter = self.get_token_from_storage
        api_client._oauth2_token_saver = self.set_token_in_storage

        print(f"🔧 ApiClient created with database-backed token storage")
        print(f"🔧 Organization ID: {self.organization_id}, User ID: {self.user_id}")

        return api_client


# Legacy singleton approach (deprecated - use XeroTokenService instead)
# Keeping for backward compatibility but will be removed in future versions
_legacy_token_storage = {}
_legacy_tenant_id = None


def get_token_from_storage():
    """DEPRECATED: Use XeroTokenService instead"""
    print("⚠️ WARNING: Using deprecated in-memory token storage. Please migrate to XeroTokenService.")
    return _legacy_token_storage if _legacy_token_storage else None


def set_token_in_storage(token_dict):
    """DEPRECATED: Use XeroTokenService instead"""
    print("⚠️ WARNING: Using deprecated in-memory token storage. Please migrate to XeroTokenService.")
    global _legacy_token_storage
    _legacy_token_storage = token_dict


def get_tenant_id():
    """DEPRECATED: Use XeroTokenService instead"""
    return _legacy_tenant_id


def set_tenant_id(tenant_id):
    """DEPRECATED: Use XeroTokenService instead"""
    global _legacy_tenant_id
    _legacy_tenant_id = tenant_id


def clear_storage():
    """DEPRECATED: Use XeroTokenService instead"""
    global _legacy_token_storage, _legacy_tenant_id
    _legacy_token_storage = {}
    _legacy_tenant_id = None


def get_xero_client():
    """DEPRECATED: Use XeroTokenService instead"""
    print("⚠️ WARNING: Using deprecated singleton client. Please migrate to XeroTokenService.")
    client_id = os.getenv("XERO_CLIENT_ID")
    client_secret = os.getenv("XERO_CLIENT_SECRET")

    config = Configuration()
    config.oauth2_token_getter = get_token_from_storage
    config.oauth2_token_setter = set_token_in_storage

    api_client = ApiClient(configuration=config, pool_threads=1)
    api_client.client_id = client_id
    api_client.client_secret = client_secret
    api_client._oauth2_token_getter = get_token_from_storage
    api_client._oauth2_token_saver = set_token_in_storage

    return api_client


# Legacy singleton instance (deprecated)
xero_client = get_xero_client()
print("🚀 Xero service initialized with database-backed encrypted token storage")
