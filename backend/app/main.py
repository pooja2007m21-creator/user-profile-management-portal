import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import User
from app.security import hash_password
from app.routes import auth_routes, user_routes, profile_routes, admin_routes, dashboard_routes
import datetime

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="User Profile Management Portal API",
    description="Full-stack REST API backend providing user authentication, profile management, role-based admin controls, and dashboard metrics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware to support frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory configurations
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

os.makedirs(os.path.join(UPLOAD_DIR, "profile_pictures"), exist_ok=True)

# Mount uploaded media files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(user_routes.security_router)
app.include_router(profile_routes.router)
app.include_router(admin_routes.router)
app.include_router(dashboard_routes.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "User Profile Management Portal",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# Mount frontend files at /frontend AND at root /
if os.path.exists(FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    # Mounting at root allows accessing /login.html, /dashboard.html, /admin/admin-dashboard.html directly
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static_root")

# Automatic Database Seeding on Application Startup
@app.on_event("startup")
def seed_initial_data():
    db = SessionLocal()
    try:
        admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if admin_count == 0:
            print("[INFO] Seeding initial admin and demo users...")
            
            # 1. Administrator Account
            admin = User(
                full_name="System Administrator",
                username="admin",
                email="admin@portal.com",
                phone="+1-800-555-0199",
                date_of_birth="1990-01-15",
                gender="Other",
                address="100 Enterprise Way, Suite 400",
                city="San Francisco",
                state="California",
                country="United States",
                postal_code="94105",
                profile_picture=None,
                password_hash=hash_password("Admin@123"),
                role="ADMIN",
                status="ACTIVE",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=90),
                updated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(admin)

            # 2. Demo User 1 - Sarah Connor
            user1 = User(
                full_name="Sarah Connor",
                username="sarah_c",
                email="sarah@example.com",
                phone="+1-555-0143",
                date_of_birth="1995-04-20",
                gender="Female",
                address="742 Evergreen Terrace",
                city="Springfield",
                state="Oregon",
                country="United States",
                postal_code="97477",
                profile_picture=None,
                password_hash=hash_password("User@123"),
                role="USER",
                status="ACTIVE",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=60),
                updated_at=datetime.datetime.now(datetime.timezone.utc),
                last_login=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
            )
            db.add(user1)

            # 3. Demo User 2 - John Miller
            user2 = User(
                full_name="John Miller",
                username="john_miller",
                email="john.miller@example.com",
                phone="+1-555-0188",
                date_of_birth="1992-08-11",
                gender="Male",
                address="456 Elm Street",
                city="Austin",
                state="Texas",
                country="United States",
                postal_code="73301",
                profile_picture=None,
                password_hash=hash_password("User@123"),
                role="USER",
                status="ACTIVE",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=45),
                updated_at=datetime.datetime.now(datetime.timezone.utc),
                last_login=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)
            )
            db.add(user2)

            # 4. Demo User 3 - Emily Watson
            user3 = User(
                full_name="Emily Watson",
                username="emily_w",
                email="emily@example.com",
                phone=None,
                date_of_birth="1998-12-05",
                gender="Female",
                address=None,
                city="Seattle",
                state="Washington",
                country="United States",
                postal_code=None,
                profile_picture=None,
                password_hash=hash_password("User@123"),
                role="USER",
                status="ACTIVE",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=20),
                updated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(user3)

            # 5. Demo User 4 - Michael Vance (Inactive)
            user4 = User(
                full_name="Michael Vance",
                username="michael_v",
                email="michael@example.com",
                phone="+1-555-0190",
                date_of_birth="1988-06-30",
                gender="Male",
                address="12 Baker Road",
                city="Boston",
                state="Massachusetts",
                country="United States",
                postal_code="02108",
                profile_picture=None,
                password_hash=hash_password("User@123"),
                role="USER",
                status="INACTIVE",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10),
                updated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(user4)

            db.commit()
            print("[INFO] Database successfully seeded with 1 Admin and 4 Sample Users.")
    finally:
        db.close()

# Custom exception handler for friendly JSON responses (applies to /api/* routes)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Only format as JSON for API routes
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected internal server error occurred. Please try again later.", "error_type": type(exc).__name__}
        )
    raise exc
