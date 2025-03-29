from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload # Import selectinload
from typing import List
from sqlalchemy import func, update # Import func for max() and update for bulk updates
from ..db.database import get_db
from ..models.task import Task
from ..models.board import Board, BoardColumn # Import Board and BoardColumn models
from ..models.user import User # Import User model
from ..schemas.task import TaskCreate, Task as TaskSchema, TaskUpdate, TaskMove
from .auth import get_current_user # Import get_current_user dependency

router = APIRouter()

@router.post("/", response_model=TaskSchema)
async def create_task(task: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify the column exists and belongs to the current user's board
    column = db.query(BoardColumn).join(Board).filter(
        BoardColumn.id == task.column_id,
        Board.created_by == current_user.id
    ).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found or access denied")

    # Calculate the next order_index based on non-deleted tasks
    max_order = db.query(func.max(Task.order_index)).filter(
        Task.column_id == task.column_id,
        Task.is_deleted == False # Only consider non-deleted tasks
    ).scalar()
    next_order_index = 0 if max_order is None else max_order + 1
    
    db_task = Task(
        title=task.title,
        description=task.description,
        column_id=task.column_id,
        due_date=task.due_date,
        priority=task.priority,
        order_index=next_order_index
    )

    # Assign users if provided
    if task.assignee_ids:
        assignees = db.query(User).filter(User.id.in_(task.assignee_ids)).all()
        if len(assignees) != len(task.assignee_ids):
            # Handle case where some assignee IDs are invalid
            raise HTTPException(status_code=404, detail="One or more assignees not found")
        db_task.assignees = assignees

    db.add(db_task)
    db.commit()
    # Refresh with assignees loaded
    db.refresh(db_task, attribute_names=['assignees']) # Refresh specific relationship if needed
    
    # Eager load assignees for the response
    db_task_with_assignees = db.query(Task).options(selectinload(Task.assignees)).filter(Task.id == db_task.id).first()

    return db_task_with_assignees # Return the task with assignees loaded

@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(task_id: str, task_update: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Find the task and verify ownership via board, load current assignees
    db_task = db.query(Task).options(selectinload(Task.assignees)).join(BoardColumn).join(Board).filter(
        Task.id == task_id,
        Board.created_by == current_user.id,
        Task.is_deleted == False # Add this check
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    
    # Update allowed fields from the TaskUpdate schema
    update_data = task_update.dict(exclude_unset=True, exclude={'assignee_ids'}) # Exclude assignee_ids from direct attribute setting
    for key, value in update_data.items():
        setattr(db_task, key, value) 

    # Handle assignee update if provided
    if task_update.assignee_ids is not None: # Check if the field was provided (even if empty list)
        if not task_update.assignee_ids:
            # If empty list is provided, clear assignees
            db_task.assignees = []
        else:
            # Query for the new set of assignees
            assignees = db.query(User).filter(User.id.in_(task_update.assignee_ids)).all()
            if len(assignees) != len(task_update.assignee_ids):
                # Handle case where some assignee IDs are invalid
                raise HTTPException(status_code=404, detail="One or more assignees not found")
            # Replace the existing assignees with the new list
            db_task.assignees = assignees
    
    # Automatically update the updated_at timestamp if the model has it
    if hasattr(db_task, 'updated_at'):
      db_task.updated_at = func.now()

    db.commit()
    # Refresh the task object to reflect changes, including potentially updated assignees
    db.refresh(db_task, attribute_names=['assignees']) 
    
    # Re-query with eager loading to ensure the response model gets populated correctly
    # This is often necessary after manual relationship manipulation
    db_task_with_assignees = db.query(Task).options(selectinload(Task.assignees)).filter(Task.id == db_task.id).first()

    return db_task_with_assignees

@router.delete("/{task_id}")
async def delete_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Find the task and verify ownership via board
    db_task = db.query(Task).join(BoardColumn).join(Board).filter(
        Task.id == task_id,
        Board.created_by == current_user.id,
        Task.is_deleted == False # Ensure we don't try to delete an already deleted task
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found or already deleted")
    
    column_id = db_task.column_id
    deleted_index = db_task.order_index

    # --- Soft Delete: Set is_deleted = True --- 
    db_task.is_deleted = True
    db_task.updated_at = func.now() # Update timestamp
    # db.delete(db_task) # Remove actual deletion

    # Adjust order_index for subsequent non-deleted tasks in the same column
    db.execute(
        update(Task)
        .where(Task.column_id == column_id)
        .where(Task.order_index > deleted_index)
        .where(Task.is_deleted == False) # Only adjust non-deleted tasks
        .values(order_index=Task.order_index - 1)
    )

    db.commit()
    # Return a different message or status code if preferred for soft delete
    return {"message": "Task marked as deleted"}

@router.put("/{task_id}/move", response_model=TaskSchema)
async def move_task(
    task_id: str,
    move_data: TaskMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify task exists and belongs to the user (and is not deleted)
    db_task = db.query(Task).join(BoardColumn).join(Board).filter(
        Task.id == task_id,
        Board.created_by == current_user.id,
        Task.is_deleted == False # Ensure the task being moved isn't deleted
    ).first()
    if not db_task:
        # Adjusted error message for clarity
        raise HTTPException(status_code=404, detail="Task not found, access denied, or already deleted")

    # 2. Verify destination column exists and belongs to the user
    destination_column = db.query(BoardColumn).join(Board).filter(
        BoardColumn.id == move_data.column_id,
        Board.created_by == current_user.id
    ).first()
    if not destination_column:
        raise HTTPException(status_code=404, detail="Destination column not found or access denied")

    source_column_id = db_task.column_id
    original_index = db_task.order_index
    # Ensure new_index is valid (non-negative)
    new_index = max(0, move_data.order_index)
    destination_column_id = destination_column.id

    try:
        # --- Start Transaction --- 

        # 3. Adjust indices based on whether it's the same column or different
        if source_column_id == destination_column_id:
            # Moving within the same column
            if new_index > original_index:
                # Shift non-deleted tasks between old and new pos down
                db.execute(
                    update(Task)
                    .where(Task.column_id == source_column_id)
                    .where(Task.order_index > original_index)
                    .where(Task.order_index <= new_index)
                    .where(Task.is_deleted == False) # <<< Added filter
                    .values(order_index=Task.order_index - 1)
                )
            elif new_index < original_index:
                # Shift non-deleted tasks between new and old pos up
                db.execute(
                    update(Task)
                    .where(Task.column_id == source_column_id)
                    .where(Task.order_index >= new_index)
                    .where(Task.order_index < original_index)
                    .where(Task.is_deleted == False) # <<< Added filter
                    .values(order_index=Task.order_index + 1)
                )
        else:
            # Moving to a different column
            # Decrement non-deleted tasks in source column after original index
            db.execute(
                update(Task)
                .where(Task.column_id == source_column_id)
                .where(Task.order_index > original_index)
                .where(Task.is_deleted == False) # <<< Added filter
                .values(order_index=Task.order_index - 1)
            )
            # Increment non-deleted tasks in destination column at or after new index
            db.execute(
                update(Task)
                .where(Task.column_id == destination_column_id)
                .where(Task.order_index >= new_index)
                .where(Task.is_deleted == False) # <<< Added filter
                .values(order_index=Task.order_index + 1)
            )

        # 4. Update the moved task itself
        db_task.column_id = destination_column_id
        db_task.order_index = new_index
        db_task.updated_at = func.now() # Update timestamp

        db.commit() # Commit transaction
        db.refresh(db_task)
        return db_task
    except Exception as e:
        db.rollback()
        # Log the exception for debugging
        # logger.error(f"Error moving task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to move task") 