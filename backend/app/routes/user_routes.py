from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserResponse, UserProfileUpdate, ChangePasswordRequest, MessageResponse
from app.models import User
from app.dependencies import get_current_user
from app.services.user_service import update_user_profile, change_user_password, delete_user_account
from app.services.profile_service import UPLOAD_DIR

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me", response_model=UserResponse, summary="Get current logged in user details")
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve full profile details for the authenticated user."""
    return current_user

@router.put("/me", response_model=UserResponse, summary="Update current user profile information")
def update_me(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile fields for the authenticated user."""
    updated_user = update_user_profile(db=db, user=current_user, update_data=update_data)
    return updated_user

@router.delete("/me", response_model=MessageResponse, summary="Permanently delete current user account")
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete authenticated user account and remove their data permanently."""
    delete_user_account(db=db, user=current_user, base_upload_dir=UPLOAD_DIR)
    return MessageResponse(
        message="Your account has been permanently deleted.",
        success=True
    )

# Security route for changing password
security_router = APIRouter(prefix="/api/security", tags=["Security"])

@security_router.put("/change-password", response_model=MessageResponse, summary="Change current user password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify current password and update to new secure hashed password."""
    change_user_password(db=db, user=current_user, password_data=password_data)
    return MessageResponse(
        message="Password changed successfully. Please keep your new credentials secure.",
        success=True
    )
