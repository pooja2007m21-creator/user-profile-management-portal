import os
import uuid
import shutil
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.models import User

# Upload configurations
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "profile_pictures")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Megabytes

async def save_profile_picture(file: UploadFile, user: Optional[User] = None, db: Optional[Session] = None) -> str:
    """Validate, sanitize, and save an uploaded profile picture."""
    # Check filename extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format: '{ext}'. Allowed formats are JPG, JPEG, PNG, and WEBP."
        )

    # Check content type header
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file MIME type '{file.content_type}'. Please upload a valid image."
        )

    # Read contents and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum limit of 5MB ({len(contents) // (1024 * 1024)}MB uploaded)."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty."
        )

    # Generate unique, unguessable filename
    new_filename = f"avatar_{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(UPLOAD_DIR, new_filename)

    with open(target_path, "wb") as buffer:
        buffer.write(contents)

    relative_url = f"/uploads/profile_pictures/{new_filename}"

    # If user provided, remove their old picture if it was a custom upload
    if user and db:
        if user.profile_picture and user.profile_picture.startswith("/uploads/profile_pictures/"):
            old_filename = os.path.basename(user.profile_picture)
            old_file_path = os.path.join(UPLOAD_DIR, old_filename)
            if os.path.exists(old_file_path) and old_filename != new_filename:
                try:
                    os.remove(old_file_path)
                except Exception:
                    pass
        
        user.profile_picture = relative_url
        db.commit()
        db.refresh(user)

    return relative_url
