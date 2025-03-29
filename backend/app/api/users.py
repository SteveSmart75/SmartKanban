from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models.user import User as UserModel
from ..schemas.user import UserSummary # Use the summary schema
# from .auth import get_current_user # Add auth later if needed

router = APIRouter()

@router.get("/assignable", response_model=List[UserSummary])
async def get_assignable_users(db: Session = Depends(get_db)):
    """Fetches users who can be assigned to tasks."""
    # For now, return all users. Could add filtering later.
    users = db.query(UserModel).all()
    return users 