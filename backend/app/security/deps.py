from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.security.jwt import decode_token
from app.security.rbac import has_perm

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2)) -> User:
    try:
        payload = decode_token(token)
        email = payload.get("sub"); role = payload.get("role")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active: raise HTTPException(status_code=401, detail="Inactive user")
    user.role = role or user.role  # prefer token claim
    return user

def require_roles(*roles: str):
    roles_up = {r.upper() for r in roles}
    def _dep(u: User = Depends(get_current_user)) -> User:
        if u.role.upper() not in roles_up:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return u
    return _dep

def require_perm(perm: str):
    def _dep(u: User = Depends(get_current_user)) -> User:
        if not has_perm(u.role, perm):
            raise HTTPException(status_code=403, detail=f"Missing permission: {perm}")
        return u
    return _dep
