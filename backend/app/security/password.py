from passlib.context import CryptContext
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(plain: str, hashed: str) -> bool: return pwd.verify(plain, hashed)
def hash_password(p: str) -> str: return pwd.hash(p)
