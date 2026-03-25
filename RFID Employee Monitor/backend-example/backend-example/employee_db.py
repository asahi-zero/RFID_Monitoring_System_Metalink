import json
import os

DB_FILE       = os.path.join(os.path.dirname(__file__), "employees.json")
RESERVED_FILE = os.path.join(os.path.dirname(__file__), "reserved_uids.json")


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