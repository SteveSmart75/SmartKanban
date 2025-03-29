from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from .user import UserSummary

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[int] = 0
    # order_index is managed by the backend, not provided by client on creation/update directly

class TaskCreate(TaskBase):
    column_id: UUID
    assignee_ids: Optional[List[UUID]] = None

class TaskUpdate(TaskBase):
    # Inherits title, description, due_date, priority from TaskBase
    assignee_ids: Optional[List[UUID]] = None
    # Removed column_id and assigned_to from here
    # Use the dedicated /move endpoint to change column_id/order_index
    pass # Inherits base fields

class Task(TaskBase):
    order_index: int # Include order_index in the response model
    id: UUID
    column_id: UUID
    assignees: List[UserSummary] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_deleted: bool # Add the is_deleted field

    class Config:
        from_attributes = True

# Schema for moving a task
class TaskMove(BaseModel):
    column_id: UUID # Destination column ID
    order_index: int # New index within the destination column 