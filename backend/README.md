# Backend - User Profile Management Portal API

FastAPI REST backend with SQLite and SQLAlchemy ORM.

## Setup & Running
```bash
# Install dependencies
pip install -r requirements.txt

# Seed database
python seed_data.py

# Run FastAPI Server
python -m uvicorn app.main:app --reload --port 8000
```

## API Documentation
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
