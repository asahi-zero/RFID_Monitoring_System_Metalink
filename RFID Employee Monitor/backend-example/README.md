# Python Backend - RFID Employee Monitoring System

This is the backend API for the RFID Employee Monitoring System, built with FastAPI.

## Quick Start

### 1. Install Python
Make sure you have Python 3.8+ installed:
```bash
python --version
```

### 2. Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python main.py
```

Server will start at: http://localhost:8000

## API Documentation

Once the server is running, you can access:

- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
  - Test all endpoints here!
  - Try out requests
  - See request/response formats

- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── venv/               # Virtual environment (created by you)
└── (future files)
    ├── database.py     # Database connection
    ├── models.py       # Database models
    ├── schemas.py      # Pydantic schemas
    └── crud.py         # Database operations
```

## Available Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/{id}` - Get employee by ID
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record

### Activity Monitoring
- `GET /api/activity/areas` - Get all area activities
- `GET /api/activity/areas/{area}` - Get specific area activity

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### RFID
- `POST /api/rfid/scan` - Process RFID card scan
- `GET /api/rfid/history` - Get scan history

### Reports
- `GET /api/reports/daily` - Get daily report
- `GET /api/reports/monthly` - Get monthly report

## Testing the API

### Using Browser
```
http://localhost:8000/api/employees
```

### Using curl
```bash
# Get all employees
curl http://localhost:8000/api/employees

# Create employee
curl -X POST http://localhost:8000/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "department": "Production",
    "rfidUid": "RFID999"
  }'
```

### Using Python
```python
import requests

# Get employees
response = requests.get('http://localhost:8000/api/employees')
print(response.json())

# Create employee
data = {
    "name": "John Doe",
    "department": "Production",
    "rfidUid": "RFID999"
}
response = requests.post('http://localhost:8000/api/employees', json=data)
print(response.json())
```

## Database Integration

Currently using **mock data** (Python list). To add a real database:

### Option 1: SQLite (for local/desktop app)
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./rfid_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### Option 2: MySQL (for production)
```python
SQLALCHEMY_DATABASE_URL = "mysql://username:password@localhost/rfid_system"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
```

## CORS Configuration

CORS is already configured to allow requests from:
- http://localhost:5173 (React dev server)
- http://localhost:3000 (alternative React port)

To add more allowed origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://your-production-domain.com"
    ],
    # ...
)
```

## Environment Variables

Create a `.env` file for configuration:

```bash
# .env
DATABASE_URL=sqlite:///./rfid_system.db
SECRET_KEY=your-secret-key-here
API_PORT=8000
DEBUG=True
```

Load with python-dotenv:
```python
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
```

## Development Tips

### Auto-reload on code changes
```bash
uvicorn main:app --reload --port 8000
```

### Run on different port
```bash
uvicorn main:app --port 8080
```

### Enable debug logging
```bash
uvicorn main:app --log-level debug
```

## Next Steps

1. ✅ Get the basic server running
2. 🔲 Replace mock data with real database (SQLite)
3. 🔲 Add JWT authentication
4. 🔲 Connect to RFID hardware
5. 🔲 Add data validation and error handling
6. 🔲 Implement reports generation
7. 🔲 Add unit tests
8. 🔲 Deploy to production

## Common Issues

### Port already in use
```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 8000 (Mac/Linux)
lsof -ti:8000 | xargs kill
```

### ModuleNotFoundError
```bash
# Make sure virtual environment is activated
# Make sure dependencies are installed
pip install -r requirements.txt
```

### CORS errors in React
Make sure the backend CORS middleware includes your React app's URL.

## Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **Pydantic Documentation**: https://docs.pydantic.dev/

## Support

For questions about integrating with the React frontend, see:
- `/BACKEND_INTEGRATION_GUIDE.md`
- `/QUICK_START.md`