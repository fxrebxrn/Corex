from models.base import TimestampMixin, Base
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Note(TimestampMixin, Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=True, default="")
    is_pinned: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="notes")
    tags: Mapped[list["Tag"]] = relationship(secondary="note_tags", back_populates="notes")
