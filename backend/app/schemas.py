import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

# Base User Schema
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=25)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    gender: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)

# Schema for User Registration
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

# Schema for User Login
class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    remember_me: Optional[bool] = False

# Schema for User Response
class UserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    profile_picture: Optional[str] = None
    role: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_login: Optional[datetime.datetime] = None

    model_config = {"from_attributes": True}

# Schema for Auth Token Response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Schema for User Profile Update (by User)
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=25)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    gender: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)

# Schema for Password Change
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

# Schema for Password Reset Request
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

# Schema for Admin updating User
class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(USER|ADMIN)$")
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE)$")

# Schema for updating Status only
class UserStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|INACTIVE)$")

# Schema for User with Profile Completion info
class ProfileDetailResponse(BaseModel):
    user: UserResponse
    completion: Dict[str, Any]

# Generic Message Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None

# Paginated User List for Admin
class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# User Dashboard Stats Response
class UserDashboardResponse(BaseModel):
    user: UserResponse
    completion: Dict[str, Any]
    account_status: str
    security_status: str
    last_login: Optional[datetime.datetime]
    member_since: str
    profile_picture_url: Optional[str]

# Admin Dashboard Stats Response
class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    admin_users: int
    new_users_month: int
    recent_users: List[UserResponse]
    role_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    monthly_registrations: List[Dict[str, Any]]
