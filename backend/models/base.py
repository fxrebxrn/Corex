from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy import DateTime
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), 
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), 
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
