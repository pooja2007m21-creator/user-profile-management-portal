from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas import (
    UserResponse, UserListResponse, AdminUserUpdate,
    UserStatusUpdate, MessageResponse
)
from app.models import User
from app.dependencies import get_current_admin_user
from app.services.user_service import (
    get_user_by_id, get_admin_users_list, admin_update_user,
    admin_update_user_status, delete_user_account
)
from app.services.profile_service import UPLOAD_DIR

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

@router.get("/users", response_model=UserListResponse, summary="List users with search, filter, sort, and pagination")
def list_users(
    search: Optional[str] = Query(None, description="Search term for name, username, email, phone, city"),
    role: Optional[str] = Query(None, description="Filter by role: USER or ADMIN"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: ACTIVE or INACTIVE"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Field to sort by (created_at, full_name, username, email, status)"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to retrieve paginated list of registered users with dynamic search & filtering."""
    valid_sort_fields = ["created_at", "full_name", "username", "email", "status", "role", "last_login"]
    if sort_by not in valid_sort_fields:
        sort_by = "created_at"

    users, total, total_pages = get_admin_users_list(
        db=db,
        search=search,
        role=role,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return UserListResponse(
        users=[UserResponse.from_orm(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/users/{user_id}", response_model=UserResponse, summary="Get full user profile by ID")
def get_user_detail(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details of a specific user by their ID."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    return user

@router.put("/users/{user_id}", response_model=UserResponse, summary="Update any user profile details")
def update_user_by_admin(
    user_id: int,
    update_data: AdminUserUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update profile and settings for any user."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    updated = admin_update_user(db=db, user=user, update_data=update_data)
    return updated

@router.patch("/users/{user_id}/status", response_model=UserResponse, summary="Activate or Deactivate user account")
def update_status_by_admin(
    user_id: int,
    status_data: UserStatusUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Change account status to ACTIVE or INACTIVE."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    # Prevent admin from deactivating their own account
    if user.id == admin_user.id and status_data.status == "INACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own active administrator account."
        )
    
    updated = admin_update_user_status(db=db, user=user, new_status=status_data.status)
    return updated

@router.delete("/users/{user_id}", response_model=MessageResponse, summary="Permanently delete user account")
def delete_user_by_admin(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user account and associated media files permanently."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    # Prevent admin from deleting themselves
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own administrator account."
        )

    delete_user_account(db=db, user=user, base_upload_dir=UPLOAD_DIR)
    return MessageResponse(
        message=f"User '{user.username}' (ID: {user_id}) has been permanently deleted.",
        success=True
    )
