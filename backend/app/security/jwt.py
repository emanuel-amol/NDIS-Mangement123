from datetime import datetime, timedelta, timezone
from typing import Dict
from jose import jwt
import os

SECRET = os.getenv("AUTH_SECRET_KEY", "dev-change-me")
ALG = os.getenv("AUTH_ALGORITHM", "HS256")
TTL = int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(email: str, role: str) -> str:
    now = datetime.now(tz=timezone.utc)
    payload: Dict = {"sub": email, "role": role, "iat": int(now.timestamp()),
                     "exp": int((now + timedelta(minutes=TTL)).timestamp())}
    return jwt.encode(payload, SECRET, algorithm=ALG)

def decode_token(token: str) -> Dict:
    return jwt.decode(token, SECRET, algorithms=[ALG])
