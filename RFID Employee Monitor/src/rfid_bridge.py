import time

import requests
import serial
from serial.tools import list_ports

# 🔧 CHANGE THIS TO YOUR ACTUAL PORT
SERIAL_PORT = "COM5"
BAUD_RATE = 9600
RETRY_SECONDS = 2

# ✅ FIX: Use one of your actual department names here so that if you ever
#    re-enable area-based access control it works out of the box.
#    For now the backend ignores the area for access control, but it is
#    still logged with each scan event.
#
#    Allowed values: "Cutting" | "Assembly" | "Warehouse"
#    Change to whichever area/reader this bridge is physically connected to.
SCAN_AREA = "Cutting"

def print_available_ports():
    ports = list(list_ports.comports())
    if not ports:
        print("⚠ No COM ports detected.")
        return
    print("🔌 Available COM ports:")
    for p in ports:
        print(f"   - {p.device} | {p.description}")


def open_serial_with_retry():
    while True:
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
            print(f"✅ Connected to {SERIAL_PORT} @ {BAUD_RATE} baud")
            return ser
        except serial.SerialException as e:
            print(f"❌ Cannot open {SERIAL_PORT}: {e}")
            print("   Close Arduino Serial Monitor/Plotter or any app using this COM port.")
            print_available_ports()
            print(f"   Retrying in {RETRY_SECONDS}s...\n")
            time.sleep(RETRY_SECONDS)


ser = open_serial_with_retry()
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

    except serial.SerialException as e:
        print(f"⚠ Serial disconnected: {e}")
        print("🔁 Reconnecting...")
        try:
            ser.close()
        except Exception:
            pass
        ser = open_serial_with_retry()
    except Exception as e:
        print("⚠ Serial Error:", e)