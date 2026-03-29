from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime, timedelta, date as Date
from typing import Optional, Callable
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
TIME_OUT_MP3 = os.path.join(_SOUNDS_DIR, "TimeOut.mp3")
_MCI_TIMEIN_ALIAS = "rfid_timein"
_MCI_TIMEOUT_ALIAS = "rfid_timeout"


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


def _play_timeout_sound() -> None:
    """Clock-out: play sounds/TimeOut.mp3 (Windows: MCI/winmm). Else playsound if installed."""

    def _run() -> None:
        if not os.path.isfile(TIME_OUT_MP3):
            _play_windows_alias("SystemAsterisk")
            return
        if sys.platform == "win32":
            buf = ctypes.create_unicode_buffer(512)
            mci = ctypes.windll.winmm.mciSendStringW
            try:
                mci(f"close {_MCI_TIMEOUT_ALIAS}", buf, 500, None)
                path = os.path.abspath(TIME_OUT_MP3).replace("\\", "/")
                if mci(f'open "{path}" type mpegvideo alias {_MCI_TIMEOUT_ALIAS}', buf, 500, None) != 0:
                    print(f"Warning: could not open TimeOut.mp3 (MCI): {buf.value!r}")
                    _play_windows_alias("SystemAsterisk")
                    return
                mci(f"play {_MCI_TIMEOUT_ALIAS} wait", buf, 500, None)
            except Exception as e:
                print(f"Warning: TimeOut.mp3 playback: {e}")
                _play_windows_alias("SystemAsterisk")
            finally:
                mci(f"close {_MCI_TIMEOUT_ALIAS}", buf, 500, None)
            return
        if PLAYSOUND_AVAILABLE and _playsound_file is not None:
            try:
                _playsound_file(TIME_OUT_MP3, block=True)
                return
            except Exception as e:
                print(f"Warning: playsound TimeOut.mp3: {e}")
        _play_windows_alias("SystemAsterisk")

    _play_sound_thread(_run)


def _play_clock_out_sound() -> None:
    """Short system sound on clock-out (MP3 optional later)."""

    def _run() -> None:
        _play_windows_alias("SystemAsterisk")

    _play_sound_thread(_run)


from employee_db import (
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
    camera = None
    camera_lock = threading.Lock()

    def _init_camera():
        """
        Lazily initialize the camera and auto-detect a working index.
        This avoids being stuck on an index that is not available
        (e.g. when switching from a USB camera back to a laptop camera).
        """
        global camera, CAMERA_AVAILABLE

        # If we already have an open camera, keep using it.
        if camera is not None and camera.isOpened():
            return

        # Try a few common indices to find an available camera.
        for idx in range(3):
            try:
                cap = cv2.VideoCapture(idx)
            except Exception:
                cap = None

            if cap is not None and cap.isOpened():
                camera = cap
                print(f"[CAMERA] Using device index {idx}")
                return

        # If we get here, no camera was found.
        print("[CAMERA] No available camera devices found. Disabling camera features.")
        CAMERA_AVAILABLE = False
        camera = None

    def grab_snapshot_frame():
        # Ensure camera is initialized before attempting to read.
        if not CAMERA_AVAILABLE:
            return False, None

        _init_camera()
        if not CAMERA_AVAILABLE or camera is None:
            return False, None

        with camera_lock:
            # Grab a couple of frames to reduce stale buffering and improve snapshot timeliness.
            camera.grab()
            success, frame = camera.read()
            if not success:
                camera.grab()
                success, frame = camera.read()
                if not success:
                    import time
                    time.sleep(0.03)
                    success, frame = camera.read()
        return success, frame if success else None

    def generate_frames():
        import time
        while True:
            if not CAMERA_AVAILABLE:
                time.sleep(0.5)
                yield b""
                continue

            _init_camera()
            if not CAMERA_AVAILABLE or camera is None:
                time.sleep(0.5)
                yield b""
                continue

            with camera_lock:
                success, frame = camera.read()

            if not success:
                time.sleep(0.05)
                continue

            _, buffer = cv2.imencode(".jpg", frame)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
else:
    def grab_snapshot_frame():
        return False, None

    def generate_frames():
        import time
        while True:
            time.sleep(1)
            yield b""


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
    # NOTE: We intentionally allow scanning in ANY area/department so employees can
    # time-in/out across multiple departments in a single day.

    # ================= SNAPSHOT =================
    image_path = None
    if CAMERA_AVAILABLE:
        success_snap, frame = grab_snapshot_frame()
        print(f"[RFID_SCAN] image capture success={success_snap}, frame_present={frame is not None}")
        if success_snap and frame is not None:
            try:
                filename = f"{employee['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                filepath = os.path.join(SNAPSHOT_DIR, filename)
                cv2.imwrite(filepath, frame)
                image_path = f"/snapshots/{filename}"
                print(f"[RFID_SCAN] snapshot saved: {image_path}")
            except Exception as e:
                print(f"Warning: Failed to save snapshot: {e}")
        else:
            print(f"Warning: Could not capture snapshot for UID {scan.rfidUid} at {datetime.now()}")
    else:
        print("Warning: CAMERA_AVAILABLE is False, cannot capture snapshot.")

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
        _play_timeout_sound()
        return {"message": "Clock-out recorded", "data": existing_scan}
    else:
        # First scan = Clock In -> On Duty
        scan_event = {
            "id":             employee["id"],
            "name":           employee["name"],
            "department":     employee["department"],
            "workArea":       (scan.area or "").strip() or employee["department"],
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

    entries_by_emp: dict[str, list[dict]] = {}
    for entry in full_history:
        if entry.get("date") != today:
            continue
        emp_id = entry.get("id")
        if not emp_id:
            continue
        entries_by_emp.setdefault(emp_id, []).append(entry)

    def _entry_sort_key(e: dict):
        t_str = e.get("timeIn") or "00:00:00"
        try:
            t = datetime.strptime(t_str, "%H:%M:%S").time()
        except Exception:
            t = datetime.strptime("00:00:00", "%H:%M:%S").time()
        return t

    details = []
    for emp in employees:
        emp_id = emp["id"]
        emp_entries = entries_by_emp.get(emp_id, [])
        emp_entries_sorted = sorted(emp_entries, key=_entry_sort_key) if emp_entries else []
        earliest = emp_entries_sorted[0] if emp_entries_sorted else None
        latest = emp_entries_sorted[-1] if emp_entries_sorted else None

        total_minutes = 0
        has_any_total = False
        for e in emp_entries:
            mins, has = _parse_total_work_minutes(e.get("totalWorkHours"))
            if has:
                total_minutes += mins
                has_any_total = True
        total_hours = _format_minutes_to_hours(total_minutes) if has_any_total else None

        status = "Absent"
        if latest is not None:
            status = "On Duty" if latest.get("timeOut") is None else "Off Duty"

        details.append({
            "id":          emp_id,
            "employee_id": emp_id,
            "name":        emp["name"],
            "department":  _derive_work_department(emp_entries, emp.get("department")),
            "time_in":     earliest.get("timeIn") if earliest else None,
            "time_out":    latest.get("timeOut") if latest else None,
            "total_hours": total_hours,
            "status":      status,
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


def _parse_total_work_minutes(total_work_hours: str | None) -> tuple[int, bool]:
    """
    Convert strings like "2h 15m" into minutes.
    Returns (minutes, has_value).
    """
    if total_work_hours is None:
        return 0, False
    s = str(total_work_hours).strip()
    if not s:
        return 0, False

    hours = 0
    minutes = 0
    try:
        if "h" in s:
            h_str = s.split("h", 1)[0].strip()
            hours = int(h_str) if h_str else 0
    except Exception:
        hours = 0

    try:
        if "m" in s:
            if "h" in s:
                after_h = s.split("h", 1)[1]
                m_str = after_h.split("m", 1)[0].strip()
            else:
                m_str = s.split("m", 1)[0].strip()
            minutes = int(m_str) if m_str else 0
    except Exception:
        minutes = 0

    return hours * 60 + minutes, True


def _format_minutes_to_hours(total_minutes: int) -> str:
    hours, remainder = divmod(max(0, int(total_minutes)), 60)
    minutes = remainder
    return f"{hours}h {minutes}m"


def _derive_work_department(entries: list[dict], fallback_department: str | None) -> str | None:
    """
    Determine the department/area to display in reports based on where scans occurred.
    - If there are any workArea/area values, prefer those.
    - If all scans are in a single area, return that area.
    - If multiple distinct areas exist, return a comma-separated list.
    - If no scan areas are found, fall back to the employee's home department.
    """
    if not entries:
        return fallback_department

    areas: set[str] = set()
    for e in entries:
        area = (e.get("workArea") or e.get("area") or "").strip()
        if area:
            areas.add(area)

    if not areas:
        return fallback_department

    if len(areas) == 1:
        return next(iter(areas))

    return ", ".join(sorted(areas))


def _build_range_report(
    *,
    start_date: Date,
    end_date: Date,
    attendance_days: list[Date] | None,
    attendance_bucket_label: Callable[..., str] | None,
):
    employees = get_all_employees()
    full_history = _load_history()

    filtered: list[dict] = []
    for entry in full_history:
        entry_date = entry.get("date")
        if not entry_date:
            continue
        try:
            d = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except Exception:
            continue
        if start_date <= d <= end_date:
            filtered.append(entry)

    entries_by_emp: dict[str, list[dict]] = {}
    for e in filtered:
        emp_id = e.get("id")
        if not emp_id:
            continue
        entries_by_emp.setdefault(emp_id, []).append(e)

    def _entry_sort_key(e: dict):
        # Used only for ordering; if timeIn is missing, treat as minimal.
        d = datetime.strptime(e["date"], "%Y-%m-%d").date() if e.get("date") else start_date
        t_str = e.get("timeIn") or "00:00:00"
        try:
            t = datetime.strptime(t_str, "%H:%M:%S").time()
        except Exception:
            t = datetime.strptime("00:00:00", "%H:%M:%S").time()
        return datetime.combine(d, t)

    details = []
    present_count = 0
    for emp in employees:
        emp_id = emp["id"]
        emp_entries = entries_by_emp.get(emp_id, [])
        if not emp_entries:
            details.append({
                "id": emp_id,
                "employee_id": emp_id,
                "name": emp.get("name"),
                "department": emp.get("department"),
                "time_in": None,
                "time_out": None,
                "total_hours": None,
                "status": "Absent",
            })
            continue

        # Sort entries to find earliest time-in and latest scan.
        emp_entries_sorted = sorted(emp_entries, key=_entry_sort_key)
        earliest = emp_entries_sorted[0]
        latest = emp_entries_sorted[-1]

        total_minutes = 0
        has_any_total = False
        for e in emp_entries:
            mins, has = _parse_total_work_minutes(e.get("totalWorkHours"))
            if has:
                total_minutes += mins
                has_any_total = True

        total_hours = _format_minutes_to_hours(total_minutes) if has_any_total else None

        latest_time_out = latest.get("timeOut")
        status = "On Duty" if latest_time_out is None else "Off Duty"

        details.append({
            "id": emp_id,
            "employee_id": emp_id,
            "name": emp.get("name"),
            "department": _derive_work_department(emp_entries, emp.get("department")),
            "time_in": earliest.get("timeIn"),
            "time_out": latest_time_out,
            "total_hours": total_hours,
            "status": status,
        })
        present_count += 1

    absent_count = len(employees) - present_count

    if attendance_days is None:
        # Fallback attendance: one bucket for whole range.
        label = attendance_bucket_label(start_date, end_date) if attendance_bucket_label else "Range"
        attendance_chart = [{"day": label, "present": present_count, "absent": absent_count}]
    else:
        attendance_chart = []
        for d in attendance_days:
            ids_on_day = {
                e.get("id")
                for e in filtered
                if e.get("date") == d.strftime("%Y-%m-%d")
            }
            present = len([emp for emp in employees if emp["id"] in ids_on_day])
            absent = len(employees) - present
            label = attendance_bucket_label(d) if attendance_bucket_label else d.strftime("%a")
            attendance_chart.append({"day": label, "present": present, "absent": absent})

    dept_counts: dict[str, int] = {}
    for emp in employees:
        dept_counts[emp["department"]] = dept_counts.get(emp["department"], 0) + 1
    dept_data = [{"name": k, "hours": v} for k, v in dept_counts.items()]
    if not dept_data:
        dept_data = [{"name": "No Data", "hours": 1}]

    return {
        "date": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "startDate": start_date.strftime("%Y-%m-%d"),
        "endDate": end_date.strftime("%Y-%m-%d"),
        "total": len(employees),
        "present": present_count,
        "absent": absent_count,
        "details": details,
        "attendance": attendance_chart,
        "areas": dept_data,
    }


@app.get("/api/reports/weekly")
def weekly_report(report_date: Optional[str] = None):
    base = report_date or datetime.now().strftime("%Y-%m-%d")
    report_dt = datetime.strptime(base, "%Y-%m-%d").date()
    week_start = report_dt - timedelta(days=report_dt.weekday())  # Monday
    week_end = week_start + timedelta(days=6)  # Sunday

    attendance_days = [week_start + timedelta(days=i) for i in range(7)]
    report = _build_range_report(
        start_date=week_start,
        end_date=week_end,
        attendance_days=attendance_days,
        attendance_bucket_label=lambda d: d.strftime("%a"),
    )
    report["date"] = f"Week of {report_dt.strftime('%Y-%m-%d')}"
    return report


@app.get("/api/reports/monthly")
def monthly_report(year: int, month: int):
    start_date = Date(year, month, 1)
    next_month_start = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
    end_date = next_month_start - timedelta(days=1)

    # Weekly buckets within the month (helps keep chart readable).
    buckets: list[tuple[Date, Date]] = []
    cursor = start_date
    while cursor <= end_date:
        # Bucket starts on Monday.
        bucket_start = cursor - timedelta(days=cursor.weekday())
        if bucket_start < start_date:
            bucket_start = start_date
        bucket_end = min(bucket_start + timedelta(days=6), end_date)
        buckets.append((bucket_start, bucket_end))
        cursor = bucket_end + timedelta(days=1)

    # Build a list of "representative days" to reuse the daily attendance builder,
    # but label each bucket with "Wk N".
    attendance_days: list[Date] = []
    for i, (b_start, _b_end) in enumerate(buckets, start=1):
        attendance_days.append(b_start)

    def bucket_label(_d: Date) -> str:
        # Map each representative day to "Week 1..N".
        idx = next(
            (i for i, (b_start, _b_end) in enumerate(buckets, start=1) if b_start == _d),
            1,
        )
        return f"Week {idx}"

    # We need present/absent per bucket; implement directly:
    employees = get_all_employees()
    full_history = _load_history()
    filtered: list[dict] = []
    for entry in full_history:
        entry_date = entry.get("date")
        if not entry_date:
            continue
        try:
            d = datetime.strptime(entry_date, "%Y-%m-%d").date()
        except Exception:
            continue
        if start_date <= d <= end_date:
            filtered.append(entry)

    attendance_chart = []
    for i, (b_start, b_end) in enumerate(buckets, start=1):
        ids_in_bucket = {
            e.get("id")
            for e in filtered
            if e.get("date")
            and b_start <= datetime.strptime(e.get("date"), "%Y-%m-%d").date() <= b_end
        }
        present = len([emp for emp in employees if emp["id"] in ids_in_bucket])
        absent = len(employees) - present
        attendance_chart.append({"day": f"Week {i}", "present": present, "absent": absent})

    report = _build_range_report(
        start_date=start_date,
        end_date=end_date,
        attendance_days=None,
        attendance_bucket_label=lambda _s, _e: "Month",
    )
    report["attendance"] = attendance_chart
    report["date"] = f"{year:04d}-{month:02d}"
    return report


# ================= ROOT =================

@app.get("/")
def root():
    return {"message": "RFID SYSTEM RUNNING"}