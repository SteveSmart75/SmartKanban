from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List
from sqlalchemy import func, update # Import func and update
from ..db.database import get_db
from ..models.board import Board, BoardColumn
from ..models.task import Task 
# Import the new request schema and the column response schema
from ..schemas.board import BoardCreate, Board as BoardSchema, BoardColumn as BoardColumnSchema, AddColumnRequest, RenameColumnRequest, ColumnMoveRequest
from ..schemas.board import BoardCreate, Board as BoardSchema, BoardColumn as BoardColumnSchema, AddColumnRequest, RenameColumnRequest
from .auth import get_current_user
from ..models.user import User

router = APIRouter()

@router.post("/", response_model=BoardSchema)
async def create_board(board: BoardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_board = Board(
        name=board.name,
        description=board.description,
        created_by=current_user.id
    )
    try:
        # Create columns after board is committed and ID is available
        db_columns = []
        for idx, column in enumerate(board.columns):
            db_column = BoardColumn(
                name=column.name,
                order_index=idx,
                # board_id will be handled by SQLAlchemy relationship
            )
            db_columns.append(db_column)
        
        # Associate columns with the board using the relationship
        db_board.columns = db_columns

        # Add the board (which cascades to columns) and commit once
        db.add(db_board)
        db.commit()
        db.refresh(db_board) # Refresh to load the board and its columns (incl. generated IDs)
    except Exception:
        db.rollback() # Rollback the entire transaction (board + columns) if column creation fails
        raise # Re-raise the exception
    return db_board

@router.get("/", response_model=List[BoardSchema])
async def get_boards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Reverted: Simple query, filtering happens in the BoardColumn.tasks relationship
    # Eager load columns, tasks, and task assignees
    boards = db.query(Board).options(
        selectinload(Board.columns)
        .selectinload(BoardColumn.tasks)
        .selectinload(Task.assignees) # Eager load assignees within tasks
    ).filter(Board.created_by == current_user.id).all()
    return boards

@router.get("/{board_id}", response_model=BoardSchema)
async def get_board(board_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Reverted: Simple query, filtering happens in the BoardColumn.tasks relationship
    # Eager load columns, tasks, and task assignees
    board = db.query(Board).options(
        selectinload(Board.columns)
        .selectinload(BoardColumn.tasks)
        .selectinload(Task.assignees) # Eager load assignees within tasks
    ).filter(Board.id == board_id, Board.created_by == current_user.id).first()
    
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board 

# --- Endpoint: Add Column to Board --- 
@router.post("/{board_id}/columns", response_model=BoardColumnSchema)
async def add_column_to_board(
    board_id: str,
    column_data: AddColumnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify board exists and belongs to the user
    board = db.query(Board).filter(Board.id == board_id, Board.created_by == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found or access denied")

    # 2. Calculate the next order_index based on non-deleted columns
    max_order = db.query(func.max(BoardColumn.order_index)).filter(
        BoardColumn.board_id == board_id,
        BoardColumn.is_deleted == False # << Added filter for non-deleted columns
    ).scalar()
    next_order_index = 0 if max_order is None else max_order + 1

    # 3. Create the new column
    db_column = BoardColumn(
        name=column_data.name,
        board_id=board_id,
        order_index=next_order_index,
        is_deleted=False # Ensure new columns are not deleted by default
    )
    
    try:
        db.add(db_column)
        db.commit()
        db.refresh(db_column) 
    except Exception as e:
        db.rollback()
        # Log the exception e
        raise HTTPException(status_code=500, detail=f"Failed to create column: {e}")

    return db_column 

# --- New Endpoint: Rename Column --- 
@router.put("/{board_id}/columns/{column_id}", response_model=BoardColumnSchema)
async def rename_column(
    board_id: str,
    column_id: str,
    column_data: RenameColumnRequest, # Use the new schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify the column exists, belongs to the board, belongs to the user, and is not deleted
    db_column = db.query(BoardColumn).join(Board).filter(
        BoardColumn.id == column_id,
        BoardColumn.board_id == board_id,
        Board.created_by == current_user.id,
        BoardColumn.is_deleted == False
    ).first()
    
    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found, access denied, or deleted")

    # 2. Update the name and timestamp
    db_column.name = column_data.name
    db_column.updated_at = func.now()

    try:
        db.commit()
        db.refresh(db_column)
    except Exception as e:
        db.rollback()
        # Log exception e
        raise HTTPException(status_code=500, detail=f"Failed to rename column: {e}")

    return db_column

# --- New Endpoint: Move Column --- 
@router.put("/{board_id}/columns/{column_id}/move", response_model=BoardColumnSchema)
async def move_column(
    board_id: str,
    column_id: str,
    move_data: ColumnMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify board and column exist, belong to user, and column is not deleted
    db_column = db.query(BoardColumn).join(Board).filter(
        BoardColumn.id == column_id,
        BoardColumn.board_id == board_id,
        Board.created_by == current_user.id,
        BoardColumn.is_deleted == False
    ).first()

    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found, access denied, or deleted")

    original_index = db_column.order_index
    # Use max(0, ...) to ensure new_index is not negative
    new_index = max(0, move_data.new_order_index)

    # Prevent moving to the same index
    if original_index == new_index:
        return db_column # No change needed

    try:
        # --- Adjust indices of other non-deleted columns --- 
        if new_index > original_index:
            # Shift columns between old and new pos down
            db.execute(
                update(BoardColumn)
                .where(BoardColumn.board_id == board_id)
                .where(BoardColumn.is_deleted == False)
                .where(BoardColumn.order_index > original_index)
                .where(BoardColumn.order_index <= new_index)
                .values(order_index=BoardColumn.order_index - 1)
            )
        elif new_index < original_index:
            # Shift columns between new and old pos up
            db.execute(
                update(BoardColumn)
                .where(BoardColumn.board_id == board_id)
                .where(BoardColumn.is_deleted == False)
                .where(BoardColumn.order_index >= new_index)
                .where(BoardColumn.order_index < original_index)
                .values(order_index=BoardColumn.order_index + 1)
            )

        # --- Update the moved column --- 
        db_column.order_index = new_index
        db_column.updated_at = func.now()

        db.commit() # Commit transaction
        db.refresh(db_column)
        return db_column
    except Exception as e:
        db.rollback()
        # Log exception e
        raise HTTPException(status_code=500, detail="Failed to move column")

# --- Endpoint: Delete Column from Board --- 
@router.delete("/{board_id}/columns/{column_id}")
async def delete_column_from_board(
    board_id: str,
    column_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify the column exists, belongs to the board, belongs to the user, and is not already deleted
    db_column = db.query(BoardColumn).join(Board).filter(
        BoardColumn.id == column_id,
        BoardColumn.board_id == board_id,
        Board.created_by == current_user.id,
        BoardColumn.is_deleted == False
    ).first()
    
    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found, access denied, or already deleted")

    # --- Optional: Check if column has non-deleted tasks --- 
    # Depending on requirements, you might prevent deletion if tasks exist,
    # or soft-delete tasks within the column as well.
    # For now, we'll allow deleting a column even if it has tasks.
    # non_deleted_tasks = db.query(Task).filter(Task.column_id == column_id, Task.is_deleted == False).count()
    # if non_deleted_tasks > 0:
    #     raise HTTPException(status_code=400, detail="Cannot delete column with active tasks")
    
    board_id_for_reorder = db_column.board_id # Store for reordering
    deleted_index = db_column.order_index

    # --- Soft Delete: Set is_deleted = True --- 
    db_column.is_deleted = True
    db_column.updated_at = func.now() # Update timestamp

    # --- Soft Delete Tasks within the Column (Recommended) ---
    # To prevent orphaned tasks from reappearing if column is undeleted later
    db.execute(
        update(Task)
        .where(Task.column_id == column_id)
        .where(Task.is_deleted == False)
        .values(is_deleted=True, updated_at=func.now()) 
    )

    # --- Adjust order_index for subsequent non-deleted columns --- 
    db.execute(
        update(BoardColumn)
        .where(BoardColumn.board_id == board_id_for_reorder)
        .where(BoardColumn.order_index > deleted_index)
        .where(BoardColumn.is_deleted == False)
        .values(order_index=BoardColumn.order_index - 1)
    )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Log exception e
        raise HTTPException(status_code=500, detail=f"Failed to delete column: {e}")

    return {"message": "Column marked as deleted"} 