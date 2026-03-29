import json
import os

DB_FILE       = os.path.join(os.path.dirname(__file__), "employees.json")
RESERVED_FILE = os.path.join(os.path.dirname(__file__), "reserved_uids.json")
DAY_OFFS_FILE = os.path.join(os.path.dirname(__file__), "day_offs.json")


# ── reserved_uids: persisted to disk so deletes survive restarts ─────────────

def _load_reserved() -> set:
    if not os.path.exists(RESERVED_FILE):
        return set()
    try:
        with open(RESERVED_FILE, "r") as f:
            return set(json.load(f))
    except Exception:
        return set()


def _save_reserved(uids: set) -> None:
    with open(RESERVED_FILE, "w") as f:
        json.dump(list(uids), f, indent=2)


# In-memory cache — always in sync with disk
reserved_uids: set = _load_reserved()


# ── employees.json helpers ────────────────────────────────────────────────────

def _load() -> list[dict]:
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        return json.load(f)


def _save(data: list[dict]) -> None:
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _load_day_offs() -> dict[str, list[str]]:
    if not os.path.exists(DAY_OFFS_FILE):
        return {}
    try:
        with open(DAY_OFFS_FILE, "r") as f:
            raw = json.load(f)
    except Exception:
        return {}

    if not isinstance(raw, dict):
        return {}

    sanitized: dict[str, list[str]] = {}
    for emp_id, dates in raw.items():
        if not isinstance(emp_id, str):
            continue
        if not isinstance(dates, list):
            continue
        cleaned_dates = sorted({str(d).strip() for d in dates if str(d).strip()})
        if cleaned_dates:
            sanitized[emp_id] = cleaned_dates
    return sanitized


def _save_day_offs(data: dict[str, list[str]]) -> None:
    with open(DAY_OFFS_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ── public API ────────────────────────────────────────────────────────────────

def get_all_employees() -> list[dict]:
    return _load()


def get_employee_by_uid(uid: str):
    return next((e for e in _load() if e["rfidUid"] == uid), None)


def get_employee_by_id(emp_id: str):
    return next((e for e in _load() if e["id"] == emp_id), None)


def is_uid_reserved(uid: str) -> bool:
    return uid in reserved_uids


def add_employee(name: str, department: str, rfid_uid: str) -> dict:
    employees = _load()
    existing_ids = {e["id"] for e in employees}
    counter = len(employees) + 1
    new_id = f"EMP{str(counter).zfill(3)}"
    while new_id in existing_ids:
        counter += 1
        new_id = f"EMP{str(counter).zfill(3)}"

    employee = {
        "id":         new_id,
        "name":       name,
        "department": department,
        "status":     "Absent",
        "rfidUid":    rfid_uid,
    }
    employees.append(employee)
    _save(employees)

    # ✅ Remove from reserved list and persist
    reserved_uids.discard(rfid_uid)
    _save_reserved(reserved_uids)

    return employee


def delete_employee(emp_id: str) -> dict | None:
    employees = _load()
    target = next((e for e in employees if e["id"] == emp_id), None)
    if not target:
        return None

    # ✅ Add to reserved list and persist so the UID stays blocked after restart
    reserved_uids.add(target["rfidUid"])
    _save_reserved(reserved_uids)

    day_offs = _load_day_offs()
    if emp_id in day_offs:
        day_offs.pop(emp_id, None)
        _save_day_offs(day_offs)

    _save([e for e in employees if e["id"] != emp_id])
    return target


def edit_employee(emp_id: str, name: str | None, department: str | None) -> dict | None:
    employees = _load()
    for emp in employees:
        if emp["id"] == emp_id:
            if name is not None:
                emp["name"] = name.strip()
            if department is not None:
                emp["department"] = department
            _save(employees)
            return emp
    return None


def update_employee_status(emp_id: str, status: str) -> bool:
    """Persist an employee's live status (On Duty / Off Duty / Absent) to the JSON file."""
    employees = _load()
    for emp in employees:
        if emp["id"] == emp_id:
            emp["status"] = status
            _save(employees)
            return True
    return False


def reset_all_employee_statuses(status: str = "Absent") -> None:
    employees = _load()
    changed = False
    for emp in employees:
        if emp.get("status") != status:
            emp["status"] = status
            changed = True
    if changed:
        _save(employees)


def get_employee_day_offs(emp_id: str) -> list[str]:
    day_offs = _load_day_offs()
    return day_offs.get(emp_id, [])


def add_employee_day_off(emp_id: str, day_off_date: str) -> list[str]:
    day_offs = _load_day_offs()
    emp_dates = set(day_offs.get(emp_id, []))
    emp_dates.add(day_off_date)
    day_offs[emp_id] = sorted(emp_dates)
    _save_day_offs(day_offs)
    return day_offs[emp_id]


def remove_employee_day_off(emp_id: str, day_off_date: str) -> list[str]:
    day_offs = _load_day_offs()
    emp_dates = set(day_offs.get(emp_id, []))
    if day_off_date in emp_dates:
        emp_dates.remove(day_off_date)
    if emp_dates:
        day_offs[emp_id] = sorted(emp_dates)
    else:
        day_offs.pop(emp_id, None)
    _save_day_offs(day_offs)
    return day_offs.get(emp_id, [])