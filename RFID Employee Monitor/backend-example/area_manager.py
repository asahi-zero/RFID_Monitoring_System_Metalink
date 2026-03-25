employee_locations = {}


def update_employee_area(uid, area):
    employee_locations[uid] = area


def get_employee_area(uid):
    return employee_locations.get(uid, "Unknown")