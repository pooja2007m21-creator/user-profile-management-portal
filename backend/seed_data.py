import os
import sys
import datetime

# Ensure app package is findable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.models import User
from app.security import hash_password

def seed_database():
    print("Re-creating all database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Inserting Administrator and Sample Users...")

        # Admin
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
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=90),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(admin)

        # Normal User 1
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
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=60),
            updated_at=datetime.datetime.utcnow(),
            last_login=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(user1)

        # Normal User 2
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
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=45),
            updated_at=datetime.datetime.utcnow(),
            last_login=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        )
        db.add(user2)

        # Normal User 3
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
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=20),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(user3)

        # Normal User 4 (Inactive)
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
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=10),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(user4)

        db.commit()
        print("Database seeded successfully with test records!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
