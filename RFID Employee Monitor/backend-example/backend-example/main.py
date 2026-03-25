from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from collections import defaultdict
import ctypes
import json
import os
import sys
import threading

try:
    import cv2
    CAMERA_AVAILABLE = True
except ImportError:
    CAMERA_AVAILABLE = False

try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False

try:
    from playsound import playsound as _playsound_file
    PLAYSOUND_AVAILABLE = True
except ImportError:
    PLAYSOUND_AVAILABLE = False
    _playsound_file = None  # type: ignore[misc, assignment]

# sounds/ lives next to backend-example/ (parent of this package)
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_SOUNDS_DIR = os.path.normpath(os.path.join(_BACKEND_DIR, "..", "sounds"))
TIME_IN_MP3 = os.path.join(_SOUNDS_DIR, "TimeIn.mp3")
_MCI_TIMEIN_ALIAS = "rfid_timein"


def _play_windows_alias(alias: str) -> None:
    if not WINSOUND_AVAILABLE:
        return
    try:
        winsound.PlaySound(alias, winsound.SND_ALIAS)
    except Exception:
        pass


def _play_sound_thread(target) -> None:
    threading.Thread(target=target, daemon=True).start()


def _play_time_in_sound() -> None:
    """Clock-in: play sounds/TimeIn.mp3 (Windows: MCI/winmm). Else playsound if installed."""

    def _run() -> None:
        if not os.path.isfile(TIME_IN_MP3):
            _play_windows_alias("SystemExclamation")
            return
        if sys.platform == "win32":
            buf = ctypes.create_unicode_buffer(512)
            mci = ctypes.windll.winmm.mciSendStringW
            try:
                mci(f"close {_MCI_TIMEIN_ALIAS}", buf, 500, None)
                path = os.path.abspath(TIME_IN_MP3).replace("\\", "/")
                if mci(f'open "{path}" type mpegvideo alias {_MCI_TIMEIN_ALIAS}', buf, 500, None) != 0:
                    print(f"Warning: could not open TimeIn.mp3 (MCI): {buf.value!r}")
                    _play_windows_alias("SystemExclamation")
                    return
                mci(f"play {_MCI_TIMEIN_ALIAS} wait", buf, 500, None)
            except Exception as e:
                print(f"Warning: TimeIn.mp3 playback: {e}")
                _play_windows_alias("SystemExclamation")
            finally:
                mci(f"close {_MCI_TIMEIN_ALIAS}", buf, 500, None)
            return
        if PLAYSOUND_AVAILABLE and _playsound_file is not None:
            try:
                _playsound_file(TIME_IN_MP3, block=True)
                return
            except Exception as e:
                print(f"Warning: playsound TimeIn.mp3: {e}")
        _play_windows_alias("SystemExclamation")

    _play_sound_thread(_run)


def _play_clock_out_sound() -> None:
    """Short system sound on clock-out (MP3 optional later)."""

    def _run() -> None:
        _play_windows_alias("SystemAsterisk")

    _play_sound_thread(_run)


from .employee_db import (
    get_all_employees,
    get_employee_by_uid,
    get_employee_by_id,
    is_uid_reserved,
    add_employee,
    delete_employee,
    edit_employee,
    update_employee_status,
    reset_all_employee_statuses,
)

# ================= FASTAPI =================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= SNAPSHOT FOLDER =================
SNAPSHOT_DIR = "snapshots"
os.makedirs(SNAPSHOT_DIR, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")

# ================= HISTORY FILE =================
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "scan_history.json")


def _load_history() -> list:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def _save_history(history: list) -> None:
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save scan history: {e}")


# Persisted full history (for reports) and a session-only history (for dashboard).
# Session history always starts empty after backend restart.
all_rfid_scan_history: list = _load_history()
rfid_scan_history: list = []
reset_all_employee_statuses("Absent")

# Track pending unregistered UIDs waiting for user confirmation
pending_uids: dict[str, str] = {}  # uid -> first_seen_time

# ================= CAMERA =================
if CAMERA_AVAILABLE:
    camera      = cv2.VideoCapture(0)
    camera_lock = threading.Lock()

    def grab_snapshot_frame():
        with camera_lock:
            for _ in range(5):
                camera.grab()
            success, frame = camera.read()
        return success, frame if success else None

    def generate_frames():
        while True:
            with camera_lock:
                success, frame = camera.read()
            if not success:
                import time
                time.sleep(0.05)
                continue
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
else:
    def grab_snapshot_frame():
        return False, None

    def generate_frames():
        import time
        while True:
            time.sleep(1)
            yield b''


@app.get("/api/camera")
def video_feed():
    return StreamingResponse(generate_frames(), media_type='multipart/x-mixed-replace; boundary=frame')


# ================= MODELS =================

class RFIDScan(BaseModel):
    rfidUid: str
    area: str = "main"   # kept for logging only — NOT used for access control


class NewEmployeeData(BaseModel):
    rfidUid: str
    name: str
    department: str


class EditEmployeeData(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None


# ================= EMPLOYEES =================
# NOTE: /register must come BEFORE /{emp_id} wildcard routes

@app.post("/api/employees/register")
def register_new_employee(data: NewEmployeeData):   # ✅ FIX 1: restored Pydantic type annotation
    """Register a new employee from a pending unregistered RFID UID."""
    if data.department not in ("Cutting", "Assembly", "Warehouse"):
        raise HTTPException(status_code=400, detail="Invalid department.")

    existing = get_employee_by_uid(data.rfidUid)
    if existing:
        raise HTTPException(status_code=400, detail="RFID UID already registered to an employee.")

    employee = add_employee(data.name, data.department, data.rfidUid)
    pending_uids.pop(data.rfidUid, None)
    return {"message": "Employee registered successfully", "employee": employee}


@app.get("/api/employees")
def get_employees():
    return get_all_employees()


@app.patch("/api/employees/{emp_id}")
def edit_employee_route(emp_id: str, data: EditEmployeeData):   # ✅ FIX 1: restored type annotation
    """Edit an employee's name and/or department."""
    if data.department is not None and data.department not in ("Cutting", "Assembly", "Warehouse"):
        raise HTTPException(status_code=400, detail="Invalid department.")
    emp = edit_employee(emp_id, name=data.name, department=data.department)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee updated", "employee": emp}


@app.delete("/api/employees/{emp_id}")
def remove_employee(emp_id: str):
    """Delete an employee without auto-queuing the UID for re-registration."""
    deleted_employee = delete_employee(emp_id)
    if not deleted_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    deleted_id = deleted_employee.get("id")
    if deleted_id:
        # Remove stale rows from live dashboard/session history.
        global rfid_scan_history, all_rfid_scan_history
        rfid_scan_history = [entry for entry in rfid_scan_history if entry.get("id") != deleted_id]
        all_rfid_scan_history = [entry for entry in all_rfid_scan_history if entry.get("id") != deleted_id]
        _save_history(all_rfid_scan_history)

    return {"message": f"Employee {emp_id} deleted. Scan the card again to re-enroll its UID."}


# ================= PENDING UIDS =================

@app.get("/api/pending-uids")
def get_pending_uids():
    return [{"rfidUid": uid, "scannedAt": scanned_at} for uid, scanned_at in pending_uids.items()]


@app.delete("/api/pending-uids/{uid}")
def dismiss_pending_uid(uid: str):
    pending_uids.pop(uid, None)
    return {"message": "Dismissed"}


# ================= RFID SCAN =================

@app.post("/api/rfid/scan")
def rfid_scan(scan: RFIDScan):
    employee = get_employee_by_uid(scan.rfidUid)
    current_time = datetime.now().strftime("%H:%M:%S")
    current_date = datetime.now().strftime("%Y-%m-%d")

    # -- Unregistered card ----------------------------------------------------
    if not employee:
        if scan.rfidUid not in pending_uids:
            pending_uids[scan.rfidUid] = datetime.now().isoformat()
        if WINSOUND_AVAILABLE:
            try:
                winsound.PlaySound("SystemHand", winsound.SND_ALIAS)
            except Exception:
                pass
        raise HTTPException(
            status_code=404,
            detail={
                "code": "UNREGISTERED_UID",
                "rfidUid": scan.rfidUid,
                "message": "RFID UID not registered. Awaiting enrollment.",
            }
        )

    # -- Registered card — sounds play after we know clock-in vs clock-out --

    # ================= SNAPSHOT =================
    image_path = None
    success_snap, frame = grab_snapshot_frame()
    if CAMERA_AVAILABLE and success_snap and frame is not None:
        filename = f"{employee['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(SNAPSHOT_DIR, filename)
        cv2.imwrite(filepath, frame)
        image_path = f"/snapshots/{filename}"

    # ================= CLOCK IN / CLOCK OUT =================
    existing_scan = None
    for entry in reversed(all_rfid_scan_history):
        if entry["id"] == employee["id"] and entry.get("date") == current_date:
            if entry.get("timeOut") is None:
                existing_scan = entry
            break

    if existing_scan:
        # Second scan = Clock Out -> Off Duty
        existing_scan["timeOut"] = current_time
        time_in_dt  = datetime.strptime(existing_scan["timeIn"], "%H:%M:%S")
        time_out_dt = datetime.strptime(current_time, "%H:%M:%S")
        delta = time_out_dt - time_in_dt
        total_seconds = max(0, int(delta.total_seconds()))
        hours, remainder = divmod(total_seconds, 3600)
        minutes, _       = divmod(remainder, 60)
        existing_scan["totalWorkHours"] = f"{hours}h {minutes}m"
        existing_scan["status"] = "Off Duty"
        update_employee_status(employee["id"], "Off Duty")

        # Keep session list in sync if this clock-in happened this runtime.
        for session_entry in reversed(rfid_scan_history):
            if (
                session_entry.get("id") == existing_scan.get("id")
                and session_entry.get("date") == existing_scan.get("date")
                and session_entry.get("timeIn") == existing_scan.get("timeIn")
                and session_entry.get("timeOut") is None
            ):
                session_entry["timeOut"] = existing_scan["timeOut"]
                session_entry["totalWorkHours"] = existing_scan["totalWorkHours"]
                session_entry["status"] = "Off Duty"
                break

        _save_history(all_rfid_scan_history)
        _play_clock_out_sound()
        return {"message": "Clock-out recorded", "data": existing_scan}
    else:
        # First scan = Clock In -> On Duty
        scan_event = {
            "id":             employee["id"],
            "name":           employee["name"],
            "department":     employee["department"],
            "status":         "On Duty",
            "area":           scan.area,
            "date":           current_date,
            "timeIn":         current_time,
            "timeOut":        None,
            "totalWorkHours": None,
            "image":          image_path,
        }
        all_rfid_scan_history.append(scan_event)
        rfid_scan_history.append(scan_event.copy())
        update_employee_status(employee["id"], "On Duty")
        _save_history(all_rfid_scan_history)
        _play_time_in_sound()
        return {"message": "Clock-in recorded", "data": scan_event}


# ================= HISTORY =================

@app.get("/api/rfid/history")
def get_history():
    return rfid_scan_history


# ================= ACTIVITY (by scan area, today) =================

def _area_display_name(area: str | None) -> str:
    """Map stored scan area to card titles (matches UI: Cutting Area, …)."""
    if not area or not str(area).strip():
        return "Unknown Area"
    a = str(area).strip()
    mapping = {
        "Cutting": "Cutting Area",
        "Assembly": "Assembly Area",
        "Warehouse": "Warehouse Area",
    }
    return mapping.get(a, a if a.endswith("Area") else f"{a} Area")


@app.get("/api/activity/areas")
def get_activity_areas():
    """
    Employees currently On Duty today, grouped by last scan `area` (from RFID bridge).
    Uses persisted scan history so it survives backend restarts.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    full = _load_history()
    today_entries = [e for e in full if e.get("date") == today]
    today_entries.sort(key=lambda x: x.get("timeIn") or "")

    latest_by_emp: dict[str, dict] = {}
    for e in today_entries:
        eid = e.get("id")
        if eid:
            latest_by_emp[eid] = e

    groups: dict[str, list[str]] = defaultdict(list)
    for e in latest_by_emp.values():
        if e.get("timeOut") is not None:
            continue
        if e.get("status") != "On Duty":
            continue
        label = _area_display_name(e.get("area"))
        name = e.get("name") or str(e.get("id") or "—")
        if name not in groups[label]:
            groups[label].append(name)

    default_order = ["Cutting Area", "Assembly Area", "Warehouse Area"]
    seen_labels = set(groups.keys())
    out = []
    for label in default_order:
        names = sorted(groups.get(label, []))
        out.append({"area": label, "count": len(names), "employees": names})
        seen_labels.discard(label)
    for label in sorted(seen_labels):
        names = sorted(groups[label])
        out.append({"area": label, "count": len(names), "employees": names})

    return out


@app.get("/api/activity/areas/{area_name:path}")
def get_activity_by_area(area_name: str):
    """Single area detail (optional; used by clients that fetch one area)."""
    areas = get_activity_areas()
    for a in areas:
        if a["area"] == area_name or a["area"].replace(" ", "") == area_name.replace(" ", ""):
            return a
    raise HTTPException(status_code=404, detail="Area not found")


# ================= REPORTS =================

@app.get("/api/reports/daily")
def daily_report(report_date: Optional[str] = None):
    today = report_date or datetime.now().strftime("%Y-%m-%d")
    employees = get_all_employees()

    # For reports, read from the full history file (not just today's in-memory list)
    full_history = _load_history()

    seen: dict[str, dict] = {}
    for entry in full_history:
        if entry.get("date") == today:
            seen[entry["id"]] = entry

    details = []
    for emp in employees:
        rec = seen.get(emp["id"])
        details.append({
            "id":          emp["id"],
            "employee_id": emp["id"],
            "name":        emp["name"],
            "department":  emp["department"],
            "time_in":     rec["timeIn"]         if rec else None,
            "time_out":    rec["timeOut"]        if rec else None,
            "total_hours": rec["totalWorkHours"] if rec else None,
            "status":      rec["status"]         if rec else "Absent",
        })

    present_count = sum(1 for d in details if d["status"] in ("On Duty", "Off Duty"))
    absent_count  = sum(1 for d in details if d["status"] == "Absent")

    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    attendance_chart = [{"day": d, "present": 0, "absent": 0} for d in days]

    dept_counts: dict[str, int] = {}
    for emp in employees:
        dept_counts[emp["department"]] = dept_counts.get(emp["department"], 0) + 1

    dept_data = [{"name": k, "hours": v} for k, v in dept_counts.items()]
    if not dept_data:
        dept_data = [{"name": "No Data", "hours": 1}]

    return {
        "date":       today,
        "total":      len(employees),
        "present":    present_count,
        "absent":     absent_count,
        "details":    details,
        "attendance": attendance_chart,
        "areas":      dept_data,
    }


# ================= ROOT =================

@app.get("/")
def root():
    return {"message": "RFID SYSTEM RUNNING"}