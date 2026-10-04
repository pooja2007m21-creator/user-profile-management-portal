from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ProfileDetailResponse, UserProfileUpdate, UserResponse, MessageResponse
from app.models import User
from app.dependencies import get_current_user
from app.services.user_service import update_user_profile
from app.services.profile_service import save_profile_picture

router = APIRouter(prefix="/api/profile", tags=["Profile"])

@router.get("", response_model=ProfileDetailResponse, summary="Get full profile with completion statistics")
def get_profile(current_user: User = Depends(get_current_user)):
    """Fetch user profile information along with profile completion percentage and actionable tips."""
    completion_data = current_user.calculate_completion()
    return ProfileDetailResponse(
        user=UserResponse.from_orm(current_user),
        completion=completion_data
    )

@router.put("", response_model=ProfileDetailResponse, summary="Update profile details")
def update_profile(
    update_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile information and return updated profile with recalculation."""
    updated_user = update_user_profile(db=db, user=current_user, update_data=update_data)
    completion_data = updated_user.calculate_completion()
    return ProfileDetailResponse(
        user=UserResponse.from_orm(updated_user),
        completion=completion_data
    )

@router.post("/photo", response_model=MessageResponse, summary="Upload or replace profile picture")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload new profile picture (JPG, JPEG, PNG, WEBP, up to 5MB)."""
    pic_url = await save_profile_picture(file=file, user=current_user, db=db)
    completion_data = current_user.calculate_completion()
    return MessageResponse(
        message="Profile picture updated successfully.",
        success=True,
        data={
            "profile_picture": pic_url,
            "completion": completion_data
        }
    )
