from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from .task import Task as TaskSchema # Assuming Task schema is needed for response

class BoardColumnBase(BaseModel):
    name: str
    order_index: int

class BoardColumnCreate(BoardColumnBase):
    pass

class BoardColumn(BoardColumnBase):
    id: UUID
    board_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    tasks: List[TaskSchema] = [] # Include tasks in the response

    class Config:
        from_attributes = True

class BoardBase(BaseModel):
    name: str
    description: Optional[str] = None

class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    columns: List[BoardColumnCreate] = []

class Board(BoardBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    columns: List[BoardColumn] = [] # Use the detailed BoardColumn schema

    class Config:
        from_attributes = True

# Schema for request body when adding a column to an existing board
class AddColumnRequest(BaseModel):
    name: str = Field(..., min_length=1)

# New schema for request body when renaming a column
class RenameColumnRequest(BaseModel):
    name: str = Field(..., min_length=1)

# New schema for moving a column
class ColumnMoveRequest(BaseModel):
    new_order_index: int = Field(ge=0) # Ensure index is not negative 