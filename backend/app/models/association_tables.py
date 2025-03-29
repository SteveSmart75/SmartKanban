from sqlalchemy import Table, Column, UUID, ForeignKey
from .base import Base

task_assignees_table = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", UUID, ForeignKey("tasks.id"), primary_key=True),
    Column("user_id", UUID, ForeignKey("users.id"), primary_key=True),
) 