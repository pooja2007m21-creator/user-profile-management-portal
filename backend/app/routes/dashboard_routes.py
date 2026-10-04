import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.schemas import UserDashboardResponse, AdminDashboardResponse, UserResponse
from app.models import User
from app.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/user", response_model=UserDashboardResponse, summary="Get metrics and profile summary for user dashboard")
def get_user_dashboard(current_user: User = Depends(get_current_user)):
    """Fetch personalized dashboard data for the logged in user."""
    completion_data = current_user.calculate_completion()
    
    # Calculate security status
    security_status = "Secure (Strong Password Protected)"
    if completion_data["percentage"] < 60:
        security_status = "Basic (Profile Incomplete)"

    member_since = current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "Recently"

    return UserDashboardResponse(
        user=UserResponse.from_orm(current_user),
        completion=completion_data,
        account_status=current_user.status,
        security_status=security_status,
        last_login=current_user.last_login,
        member_since=member_since,
        profile_picture_url=current_user.profile_picture
    )

@router.get("/admin", response_model=AdminDashboardResponse, summary="Get system metrics and statistics for admin dashboard")
def get_admin_dashboard(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Fetch high-level platform statistics, user distributions, and recent registrations."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.status == "ACTIVE").count()
    inactive_users = db.query(User).filter(User.status == "INACTIVE").count()
    admin_users = db.query(User).filter(User.role == "ADMIN").count()

    # New users created in current month
    now = datetime.datetime.utcnow()
    month_start = datetime.datetime(now.year, now.month, 1)
    new_users_month = db.query(User).filter(User.created_at >= month_start).count()

    # Recent 5 users
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()

    # Role breakdown
    role_dist = {
        "USER": db.query(User).filter(User.role == "USER").count(),
        "ADMIN": admin_users
    }

    # Status breakdown
    status_dist = {
        "ACTIVE": active_users,
        "INACTIVE": inactive_users
    }

    # Monthly registrations (last 6 months overview)
    monthly_registrations = []
    for i in range(5, -1, -1):
        # approximate month offsets
        m_date = now - datetime.timedelta(days=i * 30)
        m_name = m_date.strftime("%b %Y")
        start_m = datetime.datetime(m_date.year, m_date.month, 1)
        if m_date.month == 12:
            end_m = datetime.datetime(m_date.year + 1, 1, 1)
        else:
            end_m = datetime.datetime(m_date.year, m_date.month + 1, 1)
            
        count = db.query(User).filter(User.created_at >= start_m, User.created_at < end_m).count()
        monthly_registrations.append({
            "month": m_name,
            "count": count
        })

    return AdminDashboardResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        admin_users=admin_users,
        new_users_month=new_users_month,
        recent_users=[UserResponse.from_orm(u) for u in recent_users],
        role_distribution=role_dist,
        status_distribution=status_dist,
        monthly_registrations=monthly_registrations
    )
