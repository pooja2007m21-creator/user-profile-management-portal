import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(25), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    profile_picture = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="USER", nullable=False)  # "USER", "ADMIN"
    status = Column(String(20), default="ACTIVE", nullable=False)  # "ACTIVE", "INACTIVE"
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Password Reset flow fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Indexes for frequently queried / filtered fields
    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_status", "status"),
        Index("ix_users_created_at", "created_at"),
    )

    def calculate_completion(self) -> dict:
        fields = [
            ("full_name", self.full_name, "Add your full name"),
            ("username", self.username, "Choose a username"),
            ("email", self.email, "Verify your email address"),
            ("phone", self.phone, "Add your phone number to complete your profile"),
            ("date_of_birth", self.date_of_birth, "Add your date of birth"),
            ("gender", self.gender, "Specify your gender"),
            ("address", self.address, "Add your street address"),
            ("city", self.city, "Specify your city"),
            ("state", self.state, "Specify your state/province"),
            ("country", self.country, "Specify your country"),
            ("postal_code", self.postal_code, "Add your postal/zip code"),
            ("profile_picture", self.profile_picture, "Upload a profile picture to personalize your account"),
        ]
        
        filled = sum(1 for _, val, _ in fields if val and str(val).strip())
        total = len(fields)
        percentage = int(round((filled / total) * 100))
        suggestions = [tip for _, val, tip in fields if not val or not str(val).strip()]
        
        return {
            "percentage": percentage,
            "filled_fields": filled,
            "total_fields": total,
            "suggestions": suggestions
        }
