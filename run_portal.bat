@echo off
title User Profile Management Portal
echo ===================================================
echo     USER PROFILE MANAGEMENT PORTAL - FULL-STACK
echo ===================================================
echo.

cd backend
echo [1/3] Initializing SQLite Database and Demo Data...
python seed_data.py
echo.

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
echo [3/3] Swagger Docs: http://127.0.0.1:8000/docs
echo.
echo ===================================================
echo   Access Portal in Browser:
echo   Landing Page:  http://127.0.0.1:8000/frontend/index.html
echo   User Login:    http://127.0.0.1:8000/frontend/login.html
echo   Admin Console: http://127.0.0.1:8000/frontend/admin/admin-login.html
echo ===================================================
echo.

python -m uvicorn app.main:app --reload --port 8000
pause
