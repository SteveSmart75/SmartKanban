from sqlalchemy import Column, String, UUID, ForeignKey, Integer, DateTime, Boolean
from sqlalchemy.orm import relationship
from uuid import uuid4
from .base import Base, TimestampMixin
from .association_tables import task_assignees_table

class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id = Column(UUID, primary_key=True, default=uuid4)
    title = Column(String, nullable=False)
    description = Column(String)
    column_id = Column(UUID, ForeignKey("board_columns.id"))
    due_date = Column(DateTime(timezone=True))
    priority = Column(Integer, default=0)
    order_index = Column(Integer, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    column = relationship("BoardColumn", back_populates="tasks")
    
    assignees = relationship(
        "User",
        secondary=task_assignees_table,
        back_populates="assigned_tasks"
    ) 