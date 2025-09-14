# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .referral import Referral
from .email_log import EmailLog
# from .participant import Participant  # <-- Comment this out temporarily

__all__ = ["User", "Referral", "EmailLog"]  # Remove "Participant" from here too