from sqlalchemy import Column, String, UUID, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from uuid import uuid4
from .base import Base, TimestampMixin
from .task import Task # Import Task model

class Board(Base, TimestampMixin):
    __tablename__ = "boards"

    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String, nullable=False)
    description = Column(String)
    created_by = Column(UUID, ForeignKey("users.id"))
    
    # Modified columns relationship to filter is_deleted and order by order_index
    columns = relationship(
        "BoardColumn", 
        primaryjoin="and_(Board.id == BoardColumn.board_id, BoardColumn.is_deleted == False)",
        order_by="BoardColumn.order_index",
        back_populates="board", 
        cascade="all, delete-orphan"
    )
    owner = relationship("User")

class BoardColumn(Base, TimestampMixin):
    __tablename__ = "board_columns"

    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    board_id = Column(UUID, ForeignKey("boards.id"))
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # Modified board relationship to use the filtered columns relationship defined in Board
    board = relationship("Board", back_populates="columns")
    tasks = relationship(
        "Task", 
        primaryjoin="and_(BoardColumn.id == Task.column_id, Task.is_deleted == False)",
        order_by="Task.order_index",
        back_populates="column", 
        cascade="all, delete-orphan"
    ) 