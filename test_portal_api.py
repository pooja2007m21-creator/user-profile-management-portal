import sys
import os
import json

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from fastapi.testclient import TestClient
from app.main import app
from seed_data import seed_database

def run_tests():
    print("==================================================")
    print("   RUNNING AUTOMATED TEST SUITE FOR PORTAL API    ")
    print("==================================================")
    
    # Reset database with seed data
    seed_database()
    
    client = TestClient(app)
    
    # 1. Health check
    print("\n[TEST 1] Checking API Health endpoint...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(" -> PASSED! Health status:", res.json())

    # 2. User Registration
    print("\n[TEST 2] Testing User Registration...")
    reg_payload = {
        "full_name": "Test User",
        "username": "testuser_99",
        "email": "testuser99@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123",
        "phone": "+1-555-0999",
        "city": "Chicago",
        "country": "United States"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    print(" -> PASSED! Registered user successfully:", res.json()["message"])

    # Duplicate registration test
    res_dup = client.post("/api/auth/register", json=reg_payload)
    assert res_dup.status_code == 409, f"Duplicate check failed: {res_dup.text}"
    print(" -> PASSED! Duplicate prevention properly returned 409 Conflict.")

    # 3. User Login
    print("\n[TEST 3] Testing User Login...")
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "testuser99@example.com",
        "password": "Password@123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    user_token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print(" -> PASSED! User logged in. JWT token acquired.")

    # Test inactive user login
    inactive_login = client.post("/api/auth/login", json={
        "username_or_email": "michael@example.com",
        "password": "User@123"
    })
    assert inactive_login.status_code == 403, f"Inactive check failed: {inactive_login.text}"
    print(" -> PASSED! Inactive user was denied login with 403 Forbidden.")

    # 4. Admin Login
    print("\n[TEST 4] Testing Admin Login...")
    admin_login_res = client.post("/api/auth/login", json={
        "username_or_email": "admin@portal.com",
        "password": "Admin@123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(" -> PASSED! Admin authenticated successfully with ADMIN role.")

    # 5. User Dashboard & Profile Completion
    print("\n[TEST 5] Testing User Dashboard endpoint...")
    dash_res = client.get("/api/dashboard/user", headers=user_headers)
    assert dash_res.status_code == 200, f"User dashboard failed: {dash_res.text}"
    dash_data = dash_res.json()
    print(" -> PASSED! Profile completion percentage:", dash_data["completion"]["percentage"], "%")
    print(" -> Suggestions:", dash_data["completion"]["suggestions"])

    # 6. Profile View & Edit
    print("\n[TEST 6] Testing Profile Update...")
    update_res = client.put("/api/profile", headers=user_headers, json={
        "full_name": "Test User Updated",
        "address": "456 Main Avenue",
        "postal_code": "60601"
    })
    assert update_res.status_code == 200, f"Profile update failed: {update_res.text}"
    assert update_res.json()["user"]["full_name"] == "Test User Updated"
    print(" -> PASSED! Profile updated and recalculated completion percentage:", update_res.json()["completion"]["percentage"], "%")

    # 7. Password Change
    print("\n[TEST 7] Testing Password Change...")
    pwd_res = client.put("/api/security/change-password", headers=user_headers, json={
        "current_password": "Password@123",
        "new_password": "NewSecurePassword@999",
        "confirm_new_password": "NewSecurePassword@999"
    })
    assert pwd_res.status_code == 200, f"Change password failed: {pwd_res.text}"
    print(" -> PASSED! Password changed successfully.")

    # 8. Forgot & Reset Password
    print("\n[TEST 8] Testing Forgot & Reset Password workflow...")
    forgot_res = client.post("/api/auth/forgot-password", json={"email": "sarah@example.com"})
    assert forgot_res.status_code == 200, f"Forgot password failed: {forgot_res.text}"
    reset_token = forgot_res.json()["data"]["reset_token"]
    print(" -> Reset token generated:", reset_token)

    reset_res = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "new_password": "SarahNewPass@2026",
        "confirm_new_password": "SarahNewPass@2026"
    })
    assert reset_res.status_code == 200, f"Reset password failed: {reset_res.text}"
    print(" -> PASSED! Password reset completed successfully.")

    # 9. Admin Dashboard Metrics
    print("\n[TEST 9] Testing Admin Dashboard Metrics...")
    admin_dash_res = client.get("/api/dashboard/admin", headers=admin_headers)
    assert admin_dash_res.status_code == 200, f"Admin dashboard failed: {admin_dash_res.text}"
    ad_data = admin_dash_res.json()
    print(" -> PASSED! Platform metrics: Total Users:", ad_data["total_users"], "| Active:", ad_data["active_users"], "| Inactive:", ad_data["inactive_users"])

    # 10. Role-Based Access Control (RBAC) Protection
    print("\n[TEST 10] Testing RBAC Security Protection (Standard user accessing admin route)...")
    rbac_res = client.get("/api/admin/users", headers=user_headers)
    assert rbac_res.status_code == 403, f"RBAC failed, expected 403 but got {rbac_res.status_code}"
    print(" -> PASSED! Standard user blocked from admin endpoint with 403 Forbidden.")

    # 11. Admin User Management CRUD
    print("\n[TEST 11] Testing Admin User Management (Search, Filter, Status Toggle, Delete)...")
    # Search
    search_res = client.get("/api/admin/users?search=sarah", headers=admin_headers)
    assert search_res.status_code == 200 and search_res.json()["total"] >= 1
    sarah_id = search_res.json()["users"][0]["id"]
    print(" -> PASSED! Search returned matching user:", search_res.json()["users"][0]["full_name"])

    # Status Toggle
    status_res = client.patch(f"/api/admin/users/{sarah_id}/status", headers=admin_headers, json={"status": "INACTIVE"})
    assert status_res.status_code == 200 and status_res.json()["status"] == "INACTIVE"
    print(" -> PASSED! Account status toggled to INACTIVE.")

    # Admin Edit User
    edit_res = client.put(f"/api/admin/users/{sarah_id}", headers=admin_headers, json={
        "full_name": "Sarah Connor AdminEdited",
        "city": "Los Angeles"
    })
    assert edit_res.status_code == 200 and edit_res.json()["city"] == "Los Angeles"
    print(" -> PASSED! Admin edited user details.")

    # Delete User
    del_res = client.delete(f"/api/admin/users/{sarah_id}", headers=admin_headers)
    assert del_res.status_code == 200
    print(" -> PASSED! Admin deleted user account permanently.")

    print("\n==================================================")
    print("   ALL 11 AUTOMATED TEST SUITES PASSED (100%)!    ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
