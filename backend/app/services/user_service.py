import datetime
import os
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException, status
from app.models import User
from app.schemas import UserCreate, UserProfileUpdate, AdminUserUpdate, ChangePasswordRequest
from app.security import hash_password, verify_password

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def update_user_profile(db: Session, user: User, update_data: UserProfileUpdate) -> User:
    """Update user's own profile fields."""
    # If email changed, check if already taken by another user
    if update_data.email and update_data.email.lower() != user.email.lower():
        existing = db.query(User).filter(User.email == update_data.email.lower(), User.id != user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already in use by another account."
            )
        user.email = update_data.email.lower()

    # Update other fields if provided
    for field, value in update_data.dict(exclude_unset=True).items():
        if field != "email" and value is not None:
            setattr(user, field, value)

    user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

def change_user_password(db: Session, user: User, password_data: ChangePasswordRequest) -> None:
    """Verify current password and set new hashed password."""
    if not verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect."
        )
    
    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match."
        )

    if verify_password(password_data.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be identical to the current password."
        )

    user.password_hash = hash_password(password_data.new_password)
    user.updated_at = datetime.datetime.utcnow()
    db.commit()

def delete_user_account(db: Session, user: User, base_upload_dir: str) -> None:
    """Delete a user account and associated stored files."""
    # Delete uploaded profile picture if not default
    if user.profile_picture and not user.profile_picture.startswith("http"):
        img_path = os.path.join(base_upload_dir, os.path.basename(user.profile_picture))
        if os.path.exists(img_path):
            try:
                os.remove(img_path)
            except Exception:
                pass

    db.delete(user)
    db.commit()

def get_admin_users_list(
    db: Session,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    per_page: int = 10,
    sort_by: str = "created_at",
    sort_order: str = "desc"
) -> Tuple[List[User], int, int]:
    """Query users for admin panel with search, filters, sorting, and pagination."""
    query = db.query(User)

    # Search filter across full_name, username, email, phone
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.phone.ilike(search_pattern),
                User.city.ilike(search_pattern)
            )
        )

    # Role filter
    if role and role.upper() in ["USER", "ADMIN"]:
        query = query.filter(User.role == role.upper())

    # Status filter
    if status_filter and status_filter.upper() in ["ACTIVE", "INACTIVE"]:
        query = query.filter(User.status == status_filter.upper())

    # Total count after filters
    total = query.count()

    # Sorting
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Pagination
    total_pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()

    return users, total, total_pages

def admin_update_user(db: Session, user: User, update_data: AdminUserUpdate) -> User:
    """Admin updates any user attributes."""
    if update_data.username and update_data.username.lower() != user.username.lower():
        existing = db.query(User).filter(User.username == update_data.username, User.id != user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken."
            )
        user.username = update_data.username

    if update_data.email and update_data.email.lower() != user.email.lower():
        existing = db.query(User).filter(User.email == update_data.email.lower(), User.id != user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already registered."
            )
        user.email = update_data.email.lower()

    for field, value in update_data.dict(exclude_unset=True).items():
        if field not in ["username", "email"] and value is not None:
            setattr(user, field, value)

    user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

def admin_update_user_status(db: Session, user: User, new_status: str) -> User:
    """Update user status to ACTIVE or INACTIVE."""
    if new_status not in ["ACTIVE", "INACTIVE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be ACTIVE or INACTIVE."
        )
    user.status = new_status
    user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user
