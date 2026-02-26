# HX711_ADC Library Setup & Calibration Guide

## ✅ STEP 1: Install HX711_ADC Library

### Method 1: From the folder in your project (Recommended)

1. Open Arduino IDE
2. Go to: **Sketch** > **Include Library** > **Add .ZIP Library...**
3. Navigate to: `C:\4th year\next.js_capstone_convertion\HX711_ADC-master`
4. Select the **HX711_ADC-master** folder
5. Click **Choose** / **Select Folder**
6. Wait for "Library added to your libraries" message

### Method 2: Manual installation

1. Copy the entire `HX711_ADC-master` folder
2. Paste it into your Arduino libraries folder:
   - Windows: `Documents\Arduino\libraries\`
   - Create the folder if it doesn't exist
3. Restart Arduino IDE

### Verify Installation:

1. Go to: **Sketch** > **Include Library**
2. You should see **HX711_ADC** in the list

---

## 🔌 STEP 2: Verify Your Wiring

### 3-Wire Load Cell Full Wheatstone Bridge Configuration

**Scale Layout (Top View):**
```
    [LC1]────────[LC2]
      │            │
      │            │
    [LC3]────────[LC4]
```

**WHITE WIRE CONNECTIONS (Power Rails):**
- LC1 White ↔ LC2 White (connected together)
- LC3 White ↔ LC4 White (connected together)

**BLACK WIRE CONNECTIONS (Ground Rails):**
- LC1 Black ↔ LC3 Black (connected together)
- LC2 Black ↔ LC4 Black (connected together)

**BLUE WIRE CONNECTIONS (Signals to HX711):**
- **LC1** (top-left) Blue → HX711 **E+**
- **LC2** (top-right) Blue → HX711 **A-**
- **LC3** (bottom-left) Blue → HX711 **A+**
- **LC4** (bottom-right) Blue → HX711 **E-**

**POWER CONNECTIONS:**
- One White wire junction → HX711 **E+** power pad
- One Black wire junction → HX711 **E-** power pad

**Arduino to HX711:**
- HX711 VCC → Arduino 5V
- HX711 GND → Arduino GND
- HX711 DT → Arduino Pin 3
- HX711 SCK → Arduino Pin 2

---

## 📤 STEP 3: Upload the Code

1. Open `arduino_height_weight_sensor.ino` in Arduino IDE
2. Select your Arduino board: **Tools** > **Board** > **Arduino Uno** (or your model)
3. Select COM port: **Tools** > **Port** > **COM#** (where Arduino is connected)
4. Click **Upload** button (→)
5. Wait for "Done uploading" message

---

## ⚖️ STEP 4: Interactive Calibration Process

### A. Open Serial Monitor

1. Click **Tools** > **Serial Monitor** (or Ctrl+Shift+M)
2. Set baud rate to **9600** (bottom-right dropdown)
3. Set line ending to **Both NL & CR** or **Newline**

### B. Start Calibration

1. **Remove ALL weight** from the scale
2. In Serial Monitor, type: **r** and press Enter
3. Wait for prompt: "Send 't' to tare the scale"
4. Type: **t** and press Enter
5. Wait for "✓ Tare complete"

### C. Calibrate with Your Weight

1. **Step onto the scale** (or place known weight)
2. Serial Monitor will prompt: "Send your actual weight (e.g. 76.0)"
3. Type your **actual weight in kg** (e.g., **76.0**) and press Enter
4. Wait 2-3 seconds while it calculates...
5. New calibration value will be displayed!

### D. Save to EEPROM (Permanent Storage)

1. Serial Monitor will ask: "Save to EEPROM? (y/n)"
2. Type: **y** and press Enter
3. ✓ Calibration is now saved permanently!
4. Arduino will remember this value even after power off

---

## 📊 STEP 5: Test Your Calibration

### A. Verify Accuracy

1. **Step off** the scale
2. In Serial Monitor, type: **t** and press Enter (to tare/zero)
3. **Step back on** the scale
4. Check the weight reading in Serial Monitor
5. It should show your actual weight ±0.5 kg

### B. Test Multiple Times

1. Step on/off several times
2. Try different positions (center, slightly left/right)
3. All readings should be consistent

---

## 🎮 STEP 6: Serial Commands Reference

While Serial Monitor is open, you can use these commands:

| Command | Action |
|---------|--------|
| **t** | Tare (zero) the scale - removes offset |
| **r** | Start recalibration process |
| **c** | Manually change calibration factor |

**Example workflow:**
1. Type **t** → Tare the scale
2. Step on scale → Check weight
3. If wrong, type **r** → Recalibrate

---

## 🚀 STEP 7: Run with Next.js Bridge

Once calibration is accurate:

### A. Close Serial Monitor

**IMPORTANT:** You MUST close Arduino Serial Monitor before running the bridge!
- Only ONE program can access the COM port at a time

### B. Start the Bridge

1. Double-click: `START_ARDUINO_BRIDGE_LOCAL.bat`
2. OR run: `node arduino-bridge.js`

### C. Test in Browser

1. Open: `http://localhost:3000/bmi-tracking`
2. Scan RFID card
3. Stand on scale under sensor
4. Weight and height should display in real-time!

---

## 🔧 TROUBLESHOOTING

### Library Not Found

**Error:** `HX711_ADC.h: No such file or directory`

**Fix:**
1. Verify library installation (Step 1)
2. Restart Arduino IDE
3. Check: **Sketch** > **Include Library** - should see HX711_ADC

### Timeout Error on Startup

**Error:** `Timeout, check MCU>HX711 wiring`

**Fix:**
1. Check DT (DOUT) wire → Pin 3
2. Check SCK wire → Pin 2
3. Check HX711 power: VCC → 5V, GND → GND
4. Verify HX711 board is not damaged

### Weight Always Shows 0

**Possible Causes:**
1. **Load cells not connected properly**
   - Check all BLUE wire connections (LC1→E+, LC2→A-, LC3→A+, LC4→E-)
   - Check White-to-White and Black-to-Black loops
2. **Need to calibrate**
   - Type **r** in Serial Monitor and follow calibration
3. **Weight below threshold**
   - Code ignores weight < 2kg as noise

### Weight is Negative

**Fix:**
1. The library can handle this automatically
2. Or recalibrate with command **r**

### Weight Jumps Around / Unstable

**Fix:**
1. Check for loose wire connections
2. Make sure scale platform is stable and level
3. Ensure all 4 load cells are making good contact
4. Increase sampling in `config.h` (already optimized in library)

### Calibration Value Seems Wrong

**Manual Override:**
1. Type **c** in Serial Monitor
2. Enter new calibration value
3. For 3-wire bathroom scales, typical range: **400 - 1000**
4. Test and adjust until accurate

### Can't Save to EEPROM

**Issue:** Arduino Uno has limited EEPROM writes (~100,000 cycles)

**Solution:**
- Once calibrated correctly, it's saved permanently
- You don't need to recalibrate every time
- Calibration survives power off/on

---

## 📝 CALIBRATION LOG

Keep track of your calibration attempts:

| Date | Your Weight (kg) | Calibration Value | Notes |
|------|------------------|-------------------|-------|
|      |                  |                   |       |
|      |                  |                   |       |
|      |                  |                   |       |

**Final Working Calibration:** `__________`

**Date Completed:** `__________`

---

## ✨ Key Features of HX711_ADC Library

Compared to the basic HX711 library, HX711_ADC provides:

1. **Better Accuracy** - Advanced filtering and smoothing
2. **Faster Stabilization** - Optimized startup routine
3. **Interactive Calibration** - Easy calibration via Serial Monitor
4. **EEPROM Storage** - Permanently saves calibration value
5. **Non-blocking Operations** - Uses `update()` for continuous reading
6. **Better Error Handling** - Timeout detection for wiring issues
7. **Professional Grade** - Used in commercial scales

---

## 📞 Need Help?

1. Check wiring diagram in code comments
2. Review video tutorial: https://youtu.be/LIuf2egMioA
3. Test each load cell individually if issues persist
4. Use multimeter to verify connections

---

**Last Updated:** 2026-02-22  
**Library:** HX711_ADC by Olav Kallhovd  
**Configuration:** 3-Wire Full Wheatstone Bridge (4 Load Cells)
