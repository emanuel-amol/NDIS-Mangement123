from app.database import get_db
from app import models, crud


def promote(email: str) -> None:
    db = next(get_db())
    user = crud.get_user_by_email(db, email)
    if not user:
        print(f"User not found: {email}")
        return
    if getattr(user, "role", None) == "admin":
        print(f"User is already admin: {email}")
        return
    user.role = "admin"
    db.add(user)
    db.commit()
    print(f"Promoted to admin: {email}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python promote_user_admin.py <email>")
        raise SystemExit(1)
    promote(sys.argv[1])
