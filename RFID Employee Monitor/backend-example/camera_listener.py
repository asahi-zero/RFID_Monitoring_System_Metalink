from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

latest_photo = None


@router.post("/camera/capture")
def capture_photo(data: dict):
    global latest_photo

    latest_photo = {
        "employee_uid": data["uid"],
        "image": data["image"],
        "time": datetime.now().strftime("%H:%M:%S")
    }

    return {"status": "photo_received"}