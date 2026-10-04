import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import User
from app.schemas import UserCreate, LoginRequest, TokenResponse, UserResponse
from app.security import hash_password, verify_password, generate_reset_token
from app.auth import create_user_token

def register_user(
    db: Session,
    user_data: UserCreate,
    profile_picture: Optional[str] = None
) -> User:
    """Register a new user, ensuring uniqueness of username and email."""
    # Check if username exists
    existing_username = db.query(User).filter(User.username == user_data.username.strip()).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken. Please choose another username."
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email.strip().lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please login."
        )

    # Hash password
    pwd_hash = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name.strip(),
        username=user_data.username.strip(),
        email=user_data.email.strip().lower(),
        phone=user_data.phone.strip() if user_data.phone else None,
        date_of_birth=user_data.date_of_birth.strip() if user_data.date_of_birth else None,
        gender=user_data.gender.strip() if user_data.gender else None,
        address=user_data.address.strip() if user_data.address else None,
        city=user_data.city.strip() if user_data.city else None,
        state=user_data.state.strip() if user_data.state else None,
        country=user_data.country.strip() if user_data.country else None,
        postal_code=user_data.postal_code.strip() if user_data.postal_code else None,
        profile_picture=profile_picture,
        password_hash=pwd_hash,
        role="USER",
        status="ACTIVE",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def login_user(db: Session, login_data: LoginRequest) -> TokenResponse:
    """Validate user credentials, check active status, update last login, and return JWT token."""
    identifier = login_data.username_or_email.strip()
    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive or deactivated. Please contact the administrator."
        )

    # Update last login timestamp
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Generate JWT token
    token = create_user_token(user, remember_me=login_data.remember_me or False)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

def create_password_reset_token(db: Session, email: str) -> Tuple[User, str]:
    """Generate a password reset token for the given user email."""
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        # We raise 404 with helpful message
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address was found."
        )
    
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.commit()
    return user, token

def reset_user_password(db: Session, token: str, new_password: str) -> User:
    """Verify reset token and update password."""
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token."
        )
    
    if not user.reset_token_expiry or user.reset_token_expiry < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )
    
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user
