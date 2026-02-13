# 🚀 **Quick Start Guide - Adding the Weight Sensor**

## 📦 **What You Need to Buy**

If you don't have these yet:

1. **HX711 Load Cell Amplifier Module** (~$2-5 USD)
   - Search: "HX711 load cell amplifier Arduino"
   - Board with 4 screw terminals (E+, E-, A-, A+) and 4 pins (VCC, GND, DT, SCK)

2. **Platform for standing** (if not already made)
   - Plywood board: 30cm x 40cm x 2cm thick
   - Or use any sturdy flat surface

---

## ⚡ **Super Quick Setup (15 Minutes)**

### **Step 1: Install HX711 Library** (2 minutes)

1. Open **Arduino IDE**
2. Click: `Tools` → `Manage Libraries` (or press `Ctrl+Shift+I`)
3. Search: **"HX711"**
4. Install: **"HX711 Arduino Library"** by **Bogdan Necula**
5. Close the Library Manager

---

### **Step 2: Wire Everything** (8 minutes)

#### **A) Keep your existing HC-SR04 wiring:**
```
HC-SR04  →  Arduino
VCC      →  5V
GND      →  GND
TRIG     →  Pin 9
ECHO     →  Pin 10
```

#### **B) Add HX711 module:**
```
HX711    →  Arduino
VCC      →  5V  (share with HC-SR04)
GND      →  GND (share with HC-SR04)
DT       →  Pin 3
SCK      →  Pin 2
```

#### **C) Connect Load Cell to HX711:**
```
Load Cell Wire  →  HX711 Terminal
RED             →  E+
BLACK           →  E-
GREEN           →  A+
WHITE           →  A-
```

**⚠️ CRITICAL:** Screw terminals must be TIGHT! Loose = wrong readings!

---

### **Step 3: Upload New Code** (2 minutes)

1. **Close Arduino IDE Serial Monitor** if it's open
2. Open: `arduino_height_weight_sensor/arduino_height_weight_sensor.ino`
3. Click: **Upload** button (→)
4. Wait for "Done uploading"

---

### **Step 4: Test in Serial Monitor** (3 minutes)

1. Open: `Tools` → `Serial Monitor` (or `Ctrl+Shift+M`)
2. Set to: **9600 baud** (bottom right)
3. You should see:
   ```
   ========================================
   GROWTHetect HEIGHT + WEIGHT System
   ========================================
   Sensor Height: 200.00 cm from ground
   Calibration Factor: -7050.00
   Measuring height and weight...
   ========================================
   ```

4. **Test height:** Wave hand under HC-SR04 sensor
   - Should show height readings

5. **Test weight:** Press down on load cell
   - Should show weight readings (might be inaccurate - that's OK for now!)

---

## 🎯 **Calibration (10 Minutes)**

Your weight readings will be wrong at first. Let's fix that!

### **What You Need:**
- Known weight (10kg dumbbell, bag of rice, etc.)
- Digital scale to verify weight (optional but helpful)

### **Calibration Steps:**

1. **Remove ALL weight** from load cell
2. **Press RESET button** on Arduino (scale tares to 0)
3. **Place known weight** on the platform (e.g., 10.0 kg)
4. **Look at Serial Monitor** - note the weight reading

5. **Adjust `CALIBRATION_FACTOR` in code:**
   ```cpp
   // Line 60 in the .ino file
   const float CALIBRATION_FACTOR = -7050.0;  // Change this number
   ```

6. **Follow this logic:**
   - Reading **TOO HIGH** (shows 15kg when it's 10kg)?
     → Make more negative: `-8000` or `-9000`
   
   - Reading **TOO LOW** (shows 5kg when it's 10kg)?
     → Make less negative: `-6000` or `-5000`
   
   - Reading **NEGATIVE**?
     → Change sign: `+7050` instead of `-7050`

7. **Re-upload code** and test again

8. **Repeat** until accurate! 🎯

### **Calibration Tips:**
- Common range for YZC-516C: **-6000 to -8000**
- Test with multiple weights (10kg, 20kg, 50kg)
- Final accuracy should be ±0.5 kg

---

## ✅ **Verify Everything Works**

After calibration, test the complete system:

### **Test 1: Height Only**
- Remove weight from load cell
- Put object under HC-SR04
- Serial Monitor should show:
  ```
  W:0.0,H:165.2
  ⚠️  Height OK - Waiting for student to step on scale
  ```

### **Test 2: Weight Only**
- Stand on scale
- But not under height sensor
- Serial Monitor should show:
  ```
  W:65.3,H:0.0
  ⚠️  Weight OK - Waiting for student under sensor
  ```

### **Test 3: Both Together** ✨
- Stand on scale
- Under height sensor
- Serial Monitor should show:
  ```
  W:65.3,H:165.2
  ✓ VALID MEASUREMENT
  ```

**🎉 Perfect! Your hardware is ready!**

---

## 🌐 **Connect to Website**

Now let's send data to your Vercel website:

1. **Close Arduino IDE Serial Monitor** (IMPORTANT!)
   - Bridge and Serial Monitor can't both use COM port

2. **Run the bridge:**
   - Double-click: `START_ARDUINO_BRIDGE.bat`
   - You should see:
     ```
     🚀 Starting Arduino Bridge...
     ✅ Connected to Arduino on COM3
     📡 Sending data to API...
     ```

3. **Open your website:**
   - Go to: BMI Tracking page
   - Select a student
   - Arduino status should show: **🟢 Connected**

4. **Stand on scale under sensor:**
   - Height and weight fields should auto-fill! ✨
   - If auto-save is enabled, it saves automatically!

---

## 🐛 **Quick Troubleshooting**

### **Problem: "Scale not ready" in Serial Monitor**
- **Fix:** Check HX711 wiring (DT and SCK pins)
- Verify HX711 has power (5V and GND)

### **Problem: Weight always shows 0**
- **Fix:** Check load cell wires to HX711 terminals
- Make sure screws are TIGHT
- Verify load cell is not damaged

### **Problem: Negative weight readings**
- **Fix:** Change `CALIBRATION_FACTOR` from `-7050` to `+7050`
- Or swap A+ and A- wires

### **Problem: Erratic weight readings (jumping around)**
- **Fix:** Check for loose wires
- Make sure platform is stable
- Increase `NUM_READINGS` in code (line 65)

### **Problem: Height works but weight doesn't**
- **Fix:** Test load cell separately
- Check if HX711 LED is on (some models have indicator)
- Verify all 4 load cell wires are connected

### **Problem: Website shows "Arduino Not Connected"**
- **Fix:** Make sure bridge is running (`START_ARDUINO_BRIDGE.bat`)
- Verify Arduino is plugged in
- Check Windows Device Manager for COM port

---

## 📊 **Expected Output Format**

Your Arduino will send data in this format:

```
W:65.3,H:165.2    ← Bridge reads this
W:0.0,H:165.2     ← Height only
W:65.3,H:0.0      ← Weight only
W:0.0,H:0.0       ← Waiting for student
```

The bridge script parses this and sends to your website! 🌐

---

## 🎓 **Next Steps**

1. ✅ Wire everything
2. ✅ Upload code
3. ✅ Calibrate weight sensor
4. ✅ Test with Serial Monitor
5. ✅ Run bridge script
6. ✅ Test on website

**Then you're ready for RFID integration!** 🎴

---

## 📚 **Files Reference**

- `arduino_height_weight_sensor.ino` - Main Arduino code
- `WIRING_DIAGRAM.md` - Detailed wiring instructions
- `YZC516C_CALIBRATION_GUIDE.md` - In-depth calibration guide
- `START_ARDUINO_BRIDGE.bat` - Run this to connect to website

---

## 🆘 **Still Stuck?**

Check these files for more help:
- `WIRING_DIAGRAM.md` - Visual diagrams
- Arduino code comments - Detailed troubleshooting section
- `TESTING_LOCALHOST_AND_PRODUCTION.md` - Testing guide

**You've got this!** 💪🚀
