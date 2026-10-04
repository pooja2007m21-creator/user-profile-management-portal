from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas import (
    UserCreate, LoginRequest, TokenResponse, MessageResponse,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse
)
from app.services.auth_service import (
    register_user, login_user, create_password_reset_token, reset_user_password
)
from app.services.profile_service import save_profile_picture
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Register a new user account")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with validation:
    - Unique email & username
    - Strong password policy
    - Full name, contact & address information
    """
    if user_data.confirm_password and user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    user = register_user(db=db, user_data=user_data)
    return MessageResponse(
        message="Registration successful! You can now log in to your account.",
        success=True,
        data={"user_id": user.id, "username": user.username, "email": user.email}
    )

@router.post("/register-with-photo", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Register with initial profile picture")
async def register_with_photo(
    full_name: str = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    postal_code: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Multipart registration endpoint to support uploading an avatar immediately."""
    if confirm_password and password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    user_create = UserCreate(
        full_name=full_name,
        username=username,
        email=email,
        password=password,
        confirm_password=confirm_password,
        phone=phone,
        date_of_birth=date_of_birth,
        gender=gender,
        address=address,
        city=city,
        state=state,
        country=country,
        postal_code=postal_code
    )

    pic_url = None
    if profile_picture and profile_picture.filename:
        pic_url = await save_profile_picture(profile_picture)

    user = register_user(db=db, user_data=user_create, profile_picture=pic_url)
    return MessageResponse(
        message="Registration successful! You can now log in to your account.",
        success=True,
        data={"user_id": user.id, "username": user.username, "email": user.email}
    )

@router.post("/login", response_model=TokenResponse, summary="Log in with email/username and password")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and generate Bearer JWT token.
    Checks password hash and active account status.
    """
    return login_user(db=db, login_data=login_data)

@router.post("/logout", response_model=MessageResponse, summary="Log out the current user")
def logout(current_user: User = Depends(get_current_user)):
    """
    Acknowledge user logout and invalidate frontend session.
    """
    return MessageResponse(
        message="Logged out successfully.",
        success=True
    )

@router.post("/forgot-password", response_model=MessageResponse, summary="Request password reset token")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generate a password reset token for local/production workflows.
    Returns the token and reset link.
    """
    user, token = create_password_reset_token(db, data.email)
    return MessageResponse(
        message=f"Password reset instructions and token generated successfully.",
        success=True,
        data={
            "email": user.email,
            "reset_token": token,
            "reset_url": f"/forgot-password.html?token={token}"
        }
    )

@router.post("/reset-password", response_model=MessageResponse, summary="Reset password with reset token")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using valid token.
    """
    if data.new_password != data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match."
        )

    reset_user_password(db=db, token=data.token, new_password=data.new_password)
    return MessageResponse(
        message="Password has been reset successfully. Please log in with your new password.",
        success=True
    )
