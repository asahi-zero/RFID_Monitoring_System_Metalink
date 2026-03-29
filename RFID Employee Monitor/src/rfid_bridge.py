import time

import requests
import serial
from serial.tools import list_ports

# 🔧 CHANGE THIS TO YOUR ACTUAL PORT
SERIAL_PORT = "COM5"
BAUD_RATE = 9600
RETRY_SECONDS = 2

# Fallback area if we can't parse the incoming serial line.
# Allowed values: "Cutting" | "Assembly" | "Warehouse"
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

def send_lcd_message(message: str) -> None:
    """Send a one-line command to the Arduino LCD via the same serial link."""
    try:
        ser.write((message.strip() + "\n").encode("utf-8"))
    except Exception as e:
        print(f"⚠ Failed to send LCD message: {e}")

while True:
    try:
        line = ser.readline().decode(errors="ignore").strip()

        # DEBUG (optional but helpful)
        print("RAW:", line)

        if "UID:" in line:
            # Arduino prints lines like: "<Area> UID: <UID>"
            # Example: "Cutting UID: D7F13A25"
            try:
                before_uid, after_uid = line.split("UID:", 1)
                parsed_area = before_uid.strip().replace("UID", "").strip()
                uid = after_uid.strip()
            except ValueError:
                parsed_area = ""
                uid = line.replace("UID:", "").strip()

            # Clean UID (remove any extra trailing tokens/spaces)
            if " " in uid:
                uid = uid.split()[-1]

            # Normalize area to expected department names; fall back if unknown.
            scan_area = parsed_area
            if scan_area.lower().startswith("assem"):
                scan_area = "Assembly"
            elif scan_area.lower().startswith("cut"):
                scan_area = "Cutting"
            elif scan_area.lower().startswith("ware"):
                scan_area = "Warehouse"
            else:
                scan_area = SCAN_AREA

            print("✅ Clean UID:", uid)
            print("✅ Parsed Area:", scan_area)

            try:
                res = requests.post(
                    "http://127.0.0.1:8000/api/rfid/scan",
                    json={
                        "rfidUid": uid,
                        "area": scan_area
                    }
                )

                print("📡 API Response:", res.status_code)
                print("📨 Response Body:", res.text)

                lcd_message = ""
                if res.ok:
                    try:
                        payload = res.json()
                    except Exception:
                        payload = None

                    name = None
                    if isinstance(payload, dict):
                        data = payload.get("data")
                        if isinstance(data, dict):
                            name = data.get("name")

                    if name:
                        lcd_message = f"LCD_NAME:{name}"
                    else:
                        lcd_message = "LCD_MSG:RECORDED"
                else:
                    try:
                        payload = res.json()
                    except Exception:
                        payload = None

                    code = None
                    if isinstance(payload, dict) and isinstance(payload.get("detail"), dict):
                        code = payload["detail"].get("code")

                    if code == "UNREGISTERED_UID":
                        lcd_message = "LCD_MSG:UNREGISTERED"
                    elif code == "UNAUTHORIZED_AREA":
                        lcd_message = "LCD_MSG:Unauthorized Access"
                    else:
                        lcd_message = "LCD_MSG:ERROR"

                if lcd_message:
                    send_lcd_message(lcd_message)

            except Exception as e:
                print("❌ API not reachable:", e)
                send_lcd_message("LCD_MSG:API ERR")

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