# backend/app/core/encryption.py

"""
Encryption utility for securely storing sensitive data like OAuth tokens.

Uses Fernet symmetric encryption from the cryptography library.
The encryption key is derived from the SECRET_KEY in .env file.
"""

import os
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend


class TokenEncryption:
    """
    Handles encryption and decryption of OAuth tokens.

    The encryption key is derived from the application's SECRET_KEY environment variable.
    This ensures that tokens are encrypted at rest in the database.
    """

    def __init__(self):
        """
        Initialize the encryption handler with a key derived from SECRET_KEY.
        """
        # Get secret key from environment
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError(
                "SECRET_KEY environment variable is required for token encryption. "
                "Please add SECRET_KEY to your .env file."
            )

        # Derive a 32-byte encryption key from the secret key using PBKDF2HMAC
        # This ensures we have a proper Fernet-compatible key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'xero_token_salt',  # Static salt for consistency
            iterations=100000,
            backend=default_backend()
        )
        key_bytes = kdf.derive(secret_key.encode())

        # Encode as base64 for Fernet
        self.fernet_key = base64.urlsafe_b64encode(key_bytes)
        self.cipher = Fernet(self.fernet_key)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string.

        Args:
            plaintext: The string to encrypt (e.g., access token)

        Returns:
            Base64-encoded encrypted string safe for database storage
        """
        if not plaintext:
            return ""

        # Encrypt the plaintext
        encrypted_bytes = self.cipher.encrypt(plaintext.encode())

        # Return as string for database storage
        return encrypted_bytes.decode()

    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt an encrypted string.

        Args:
            encrypted_text: The encrypted string from database

        Returns:
            Decrypted plaintext string
        """
        if not encrypted_text:
            return ""

        # Decrypt the encrypted text
        decrypted_bytes = self.cipher.decrypt(encrypted_text.encode())

        # Return as string
        return decrypted_bytes.decode()


# Global instance for use throughout the application
token_encryptor = TokenEncryption()


def encrypt_token(plaintext: str) -> str:
    """
    Convenience function to encrypt a token.

    Usage:
        encrypted = encrypt_token("my_access_token_here")
    """
    return token_encryptor.encrypt(plaintext)


def decrypt_token(encrypted_text: str) -> str:
    """
    Convenience function to decrypt a token.

    Usage:
        plaintext = decrypt_token(encrypted_from_db)
    """
    return token_encryptor.decrypt(encrypted_text)
