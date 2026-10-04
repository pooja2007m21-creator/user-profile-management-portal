from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models import User
from app.security import hash_password, verify_password, create_access_token, generate_reset_token, REMEMBER_ME_EXPIRE_DAYS

def authenticate_user(db: Session, username_or_email: str, password: str) -> Optional[User]:
    """Authenticate a user by matching username or email and verifying password."""
    user = db.query(User).filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
        
    return user

def create_user_token(user: User, remember_me: bool = False) -> str:
    """Generate access token for user."""
    expires = timedelta(days=REMEMBER_ME_EXPIRE_DAYS) if remember_me else None
    return create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role,
            "email": user.email,
        },
        expires_delta=expires
    )
