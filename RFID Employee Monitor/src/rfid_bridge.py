import serial
import requests

# 🔧 CHANGE THIS TO YOUR ACTUAL PORT
SERIAL_PORT = "COM5"

# ✅ FIX: Use one of your actual department names here so that if you ever
#    re-enable area-based access control it works out of the box.
#    For now the backend ignores the area for access control, but it is
#    still logged with each scan event.
#
#    Allowed values: "Cutting" | "Assembly" | "Warehouse"
#    Change to whichever area/reader this bridge is physically connected to.
SCAN_AREA = "Cutting"

ser = serial.Serial(SERIAL_PORT, 9600)

print("🚀 RFID Bridge Started...")

while True:
    try:
        line = ser.readline().decode(errors="ignore").strip()

        # DEBUG (optional but helpful)
        print("RAW:", line)

        if "UID:" in line:
            uid = line.replace("UID:", "").strip()

            # Clean UID (removes extra text like area or spaces)
            if " " in uid:
                uid = uid.split()[-1]

            print("✅ Clean UID:", uid)

            try:
                res = requests.post(
                    "http://127.0.0.1:8000/api/rfid/scan",
                    json={
                        "rfidUid": uid,
                        "area": SCAN_AREA
                    }
                )

                print("📡 API Response:", res.status_code)
                print("📨 Response Body:", res.text)

            except Exception as e:
                print("❌ API not reachable:", e)

    except Exception as e:
        print("⚠ Serial Error:", e)