from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.user import User
from app.security.password import verify_password
from app.security.jwt import create_access_token
from app.security.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == data.email).first()
    if not u or not verify_password(data.password, u.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(u.email, u.role.upper())
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def me(current: User = Depends(get_current_user)):
    return {
        "id": current.id, "email": current.email, "first_name": current.first_name,
        "last_name": current.last_name, "role": current.role.upper()
    }
