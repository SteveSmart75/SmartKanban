from sqlalchemy import Column, String, UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from .base import Base, TimestampMixin
from .association_tables import task_assignees_table

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True, default=uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)

    # Relationship to tasks assigned to this user
    assigned_tasks = relationship(
        "Task",
        secondary=task_assignees_table,
        back_populates="assignees"
    ) 