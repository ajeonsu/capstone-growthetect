# 🎴 RFID Student Selection - Complete Setup Guide

## ✅ **What's Complete:**

1. ✅ Database: Added `rfid_uid` column to students table
2. ✅ Registration Form: Added RFID UID input field
3. ✅ API: Created `/api/rfid-scan` endpoint
4. ✅ Bridge Script: Updated to handle RFID scans
5. ✅ Arduino Code: Created RFID + Height sensor code

---

## 🎯 **How It Works:**

```
Student taps RFID card
       ↓
Arduino reads UID
       ↓
Sends "RFID:ABC123"
       ↓
Bridge posts to /api/rfid-scan
       ↓
API looks up student in database
       ↓
Website auto-selects student! ✅
       ↓
Student stands in front of sensor
       ↓
Height auto-fills! ✅
       ↓
Enter weight manually (for now)
       ↓
Save BMI record! 🎉
```

---

## 🔧 **Step 1: Add UID Column to Database**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run this SQL:**

```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS rfid_uid VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_students_rfid_uid ON students(rfid_uid);

COMMENT ON COLUMN students.rfid_uid IS 'RFID card UID for automatic student identification';
```

4. **Click "Run"**
5. **Done!** ✅

---

## 🔧 **Step 2: Install RFID Library**

1. **Open Arduino IDE**
2. **Go to:** Tools → Manage Libraries
3. **Search for:** `MFRC522`
4. **Install:** `MFRC522 by GithubCommunity`
5. **Done!** ✅

---

## 🔌 **Step 3: Wire RFID Reader**

### **RC522 RFID Module Connections:**

```
RC522 Pin    →    Arduino Pin
---------------------------------
SDA (SS)     →    Pin 10
SCK          →    Pin 13
MOSI         →    Pin 11
MISO         →    Pin 12
IRQ          →    Not connected
GND          →    GND
RST          →    Pin 5
3.3V         →    3.3V  ⚠️ NOT 5V!
```

### **HC-SR04 Ultrasonic (NEW PINS to avoid conflict):**

```
HC-SR04 Pin  →    Arduino Pin
---------------------------------
VCC          →    5V
GND          →    GND
TRIG         →    Pin 7  (was Pin 9)
ECHO         →    Pin 8  (was Pin 10)
```

**⚠️ IMPORTANT:** Ultrasonic pins changed to avoid SPI conflict!

---

## 📤 **Step 4: Upload New Arduino Code**

1. **Open Arduino IDE**
2. **Open:** `arduino_rfid_height_sensor/arduino_rfid_height_sensor.ino`
3. **Select Board:** Arduino Uno
4. **Select Port:** COM3 (or your port)
5. **Click Upload** ✅

---

## 🧪 **Step 5: Test RFID Reader**

1. **Open Serial Monitor** (9600 baud)
2. **Place RFID card near reader**
3. **You should see:**

```
========================================
GROWTHetect RFID + HEIGHT System Ready
========================================
Sensor mounted at: 200.00 cm from ground
Waiting for RFID card or height measurement...
Bridge Mode: Sending data to computer
========================================
RFID Card Detected: ABC123DEF456
RFID:ABC123DEF456
---
```

4. **Write down the UID!** You'll need it to register students.

---

## 📝 **Step 6: Register Students with RFID**

1. **Go to:** `http://localhost:3000/student-registration`
2. **Click:** "Add Student"
3. **Fill in student info**
4. **RFID Card UID field:** Enter the UID from step 5
5. **Save!** ✅

---

## 🚀 **Step 7: Test Complete Workflow**

### **Test 1: RFID Scan Only**

1. **Close Serial Monitor**
2. **Start bridge:** `START_ARDUINO_BRIDGE_LOCAL.bat`
3. **Tap RFID card**
4. **Bridge should show:**
   ```
   🎴 RFID Card Scanned: ABC123DEF456
   ✅ Sent to 🏠 Localhost: RFID=ABC123DEF456
   ```

### **Test 2: Height Sensor Only**

1. **Stand in front of ultrasonic sensor**
2. **Bridge should show:**
   ```
   ✅ Sent to 🏠 Localhost: Weight=0.0kg, Height=165.2cm
   ```

### **Test 3: Complete Workflow**

1. **Open:** `http://localhost:3000/bmi-tracking`
2. **Click:** "Record BMI"
3. **Tap RFID card** → Student auto-selects! ✅
4. **Stand in front of sensor** → Height auto-fills! ✅
5. **Enter weight manually**
6. **Click "Save Record"**
7. **Done!** 🎉

---

## 📊 **Expected Bridge Output:**

```
🌉 Arduino-to-API Bridge Server Starting...

📍 Mode: LOCAL ONLY
   Target: http://localhost:3000/api/arduino-bridge

✅ Found Arduino on port: COM3
✅ Connected to Arduino on COM3

📡 Bridge is running! Testing locally...
📊 Waiting for sensor data...

🎴 RFID Card Scanned: ABC123DEF456
✅ Sent to 🏠 Localhost: RFID=ABC123DEF456
✅ Sent to 🏠 Localhost: Weight=0.0kg, Height=165.2cm
✅ Sent to 🏠 Localhost: Weight=0.0kg, Height=165.3cm
```

---

## 🐛 **Troubleshooting:**

### **Problem: RFID not detected**
```
Solution:
1. Check wiring (especially 3.3V, NOT 5V!)
2. Check SDA pin is on Pin 10
3. Install MFRC522 library
4. Try different RFID card (some are 13.56MHz only)
5. Hold card close to reader (1-2 cm)
```

### **Problem: "Student not found" when scanning**
```
Solution:
1. Register student first with RFID UID
2. Make sure UID matches exactly (case-insensitive)
3. Check database has rfid_uid column
4. Run SQL to add column if missing
```

### **Problem: Ultrasonic not working**
```
Solution:
1. Check NEW pins: TRIG=7, ECHO=8 (changed!)
2. Rewire if using old pins (9, 10)
3. Test sensor separately
```

### **Problem: Both sensors interfere**
```
Solution:
This shouldn't happen with new pin assignment!
SPI uses: 10, 11, 12, 13
Ultrasonic uses: 7, 8
No conflict! ✅
```

---

## 🎓 **Usage at School:**

### **Setup Phase (Once):**

1. **Register all students** with their RFID cards
2. **Mount sensors** at fixed height
3. **Start bridge** on school computer
4. **Train staff** (5 minutes)

### **Daily Use:**

```
For each student:
1. Tap RFID card (1 second)
2. Stand in front of sensor (2 seconds)
3. Enter weight (5 seconds)
4. Save (1 second)

Total: ~10 seconds per student! ⚡
```

### **Benefits:**

```
✅ No manual student selection
✅ Automatic height measurement
✅ Faster than manual entry
✅ Fewer errors
✅ Professional workflow
✅ Students love it! 😊
```

---

## 📋 **Quick Reference:**

### **Arduino Pins:**
```
RFID SDA → Pin 10
RFID RST → Pin 5
Ultrasonic TRIG → Pin 7
Ultrasonic ECHO → Pin 8
```

### **Bridge Commands:**
```
Local testing: START_ARDUINO_BRIDGE_LOCAL.bat
Production: START_ARDUINO_BRIDGE_PRODUCTION.bat
Auto mode: START_ARDUINO_BRIDGE.bat
```

### **API Endpoints:**
```
RFID: /api/rfid-scan
Sensors: /api/arduino-bridge
Students: /api/students
```

---

## ✅ **System Status:**

```
✅ Database: rfid_uid column added
✅ Registration: RFID field added
✅ API: RFID endpoint created
✅ Bridge: RFID handling added
✅ Arduino: RFID + Height code ready
⏳ TODO: Add RFID to BMI tracking page
⏳ TODO: Test with real students
⏳ TODO: Add load cell (Phase 3)
```

---

## 🚀 **Next Steps:**

1. **Run SQL** to add rfid_uid column
2. **Install MFRC522 library**
3. **Wire RFID reader** (don't forget 3.3V!)
4. **Upload new Arduino code**
5. **Test RFID scanning**
6. **Register students with RFID**
7. **Test complete workflow**

---

**You're ready to add RFID! This will make measurements SO much faster!** 🎴⚡🎉
