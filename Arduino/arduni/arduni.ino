#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define SS_1 10
#define SS_2 9
#define SS_3 8
#define RST_PIN 5

MFRC522 rfid1(SS_1, RST_PIN);
MFRC522 rfid2(SS_2, RST_PIN);
MFRC522 rfid3(SS_3, RST_PIN);

LiquidCrystal_I2C lcd(0x27, 16, 2);

String waitForLCDResponse(unsigned long timeoutMs) {
  String line = "";
  unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    if (Serial.available()) {
      char c = (char)Serial.read();
      if (c == '\n') {
        line.trim();
        return line;
      }
      if (c != '\r') {
        line += c;
      }
    }
  }

  return "";
}

void setup() {
  Serial.begin(9600);
  SPI.begin();

  pinMode(SS_1, OUTPUT);
  pinMode(SS_2, OUTPUT);
  pinMode(SS_3, OUTPUT);

  digitalWrite(SS_1, HIGH);
  digitalWrite(SS_2, HIGH);
  digitalWrite(SS_3, HIGH);

  rfid1.PCD_Init();
  rfid2.PCD_Init();
  rfid3.PCD_Init();

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.setCursor(0, 1);
  lcd.print("Scan Card...");
}

void loop() {
  readRFID(rfid1, SS_1, "Assembly");
  readRFID(rfid2, SS_2, "Cutting");
  readRFID(rfid3, SS_3, "Warehouse");
}

void readRFID(MFRC522 &reader, int ssPin, String area) {

  // Disable all readers
  digitalWrite(SS_1, HIGH);
  digitalWrite(SS_2, HIGH);
  digitalWrite(SS_3, HIGH);

  // Enable only current reader
  digitalWrite(ssPin, LOW);

  if (!reader.PICC_IsNewCardPresent()) return;
  if (!reader.PICC_ReadCardSerial()) return;

  String uid = "";

  for (byte i = 0; i < reader.uid.size; i++) {
    uid += String(reader.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();

  Serial.print(area + " UID: ");
  Serial.println(uid);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(area);

  lcd.setCursor(0, 1);
  lcd.print("..."); // Waiting for backend lookup

  // Wait for rfid_bridge.py to respond with an LCD command
  // Example messages:
  //  - LCD_NAME:John Doe
  //  - LCD_MSG:UNREGISTERED / LCD_MSG:WRONG DEPT / LCD_MSG:API ERR
  String resp = waitForLCDResponse(6000);
  if (resp.startsWith("LCD_NAME:")) {
    String name = resp.substring(String("LCD_NAME:").length());
    if (name.length() > 16) name = name.substring(0, 16);
    lcd.setCursor(0, 1);
    lcd.print(name);
  } else if (resp.startsWith("LCD_MSG:")) {
    String msg = resp.substring(String("LCD_MSG:").length());
    if (msg.length() > 16) msg = msg.substring(0, 16);
    lcd.setCursor(0, 1);
    lcd.print(msg);
  } else {
    // Fallback: show UID if no response arrived in time.
    if (uid.length() > 16) {
      lcd.setCursor(0, 1);
      lcd.print(uid.substring(uid.length() - 16));
    } else {
      lcd.setCursor(0, 1);
      lcd.print(uid);
    }
  }

  delay(1500);

  lcd.clear();
  lcd.print("Scan Card...");

  reader.PICC_HaltA();
}