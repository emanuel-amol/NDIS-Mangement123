from typing import Optional
from datetime import datetime

class ReferralOut(BaseModel):
    # ...
    id: str
    # a bunch of Optional[str] fields already exist
    created_at: datetime
    updated_at: Optional[datetime] = None   # ← make this optional
