# 3-Wire Load Cell Calibration Guide

## Current Configuration: Full Wheatstone Bridge (4 Load Cells)

Based on video tutorial: https://youtu.be/LIuf2egMioA

---

## ✅ STEP 1: VERIFY YOUR WIRING

### Scale Layout (Top View - looking down):
```
    [LC1]────────[LC2]
      │            │
      │            │
    [LC3]────────[LC4]
```

### WHITE WIRE CONNECTIONS (Power Rails):
- LC1 White ↔ LC2 White (top rail - connected together)
- LC3 White ↔ LC4 White (bottom rail - connected together)

### BLACK WIRE CONNECTIONS (Ground Rails):
- LC1 Black ↔ LC3 Black (left rail - connected together)
- LC2 Black ↔ LC4 Black (right rail - connected together)

### BLUE WIRE CONNECTIONS (Signals to HX711):
- **LC1** (top-left) Blue → HX711 **E+**
- **LC2** (top-right) Blue → HX711 **A-**
- **LC3** (bottom-left) Blue → HX711 **A+**
- **LC4** (bottom-right) Blue → HX711 **E-**

### POWER CONNECTIONS:
- One White wire junction (LC1+LC2 or LC3+LC4) → HX711 **E+** power pad
- One Black wire junction (LC1+LC3 or LC2+LC4) → HX711 **E-** power pad

---

## 📋 STEP 2: UPLOAD CALIBRATION CODE

1. Open `arduino_height_weight_sensor.ino` in Arduino IDE
2. Make sure `CALIBRATION_FACTOR` is set to `-1000.0` (starting point)
3. Upload to Arduino
4. **CLOSE Serial Monitor** (important!)

---

## ⚖️ STEP 3: CALIBRATION PROCESS

### A. Tare (Zero) the Scale

1. **Remove ALL weight** from the scale
2. Open Serial Monitor (9600 baud)
3. Press Arduino **RESET** button
4. Wait for "Scale tared successfully!" message
5. Verify weight shows **0.0 kg** or close to it

### B. Find Your Calibration Factor

1. **Step on the scale** (or place a known weight)
2. Look at the Serial Monitor - note the weight reading
3. Use this formula:

```
NEW_CALIBRATION_FACTOR = CURRENT_FACTOR × (ACTUAL_WEIGHT / SHOWN_WEIGHT)
```

#### Example Calculation:
- Your actual weight: **76 kg**
- Current `CALIBRATION_FACTOR`: `-1000.0`
- Shown weight: **15.2 kg**

```
NEW_FACTOR = -1000.0 × (76 / 15.2)
NEW_FACTOR = -1000.0 × 5.0
NEW_FACTOR = -5000.0
```

4. Update `CALIBRATION_FACTOR` in the code to `-5000.0`
5. Re-upload the sketch
6. **Repeat Steps A and B** until reading is accurate!

---

## 🎯 STEP 4: FINE-TUNING

Once you're close to your actual weight:

### If reading is **TOO HIGH** (e.g., showing 80kg when you're 76kg):
```
Make factor MORE negative
Example: -5000 → -5200
```

### If reading is **TOO LOW** (e.g., showing 72kg when you're 76kg):
```
Make factor LESS negative
Example: -5000 → -4800
```

### Typical Range for 3-Wire Bathroom Scale Load Cells:
- Usually between **-3000** to **-8000**
- Depends on your specific load cells

---

## ✅ STEP 5: VERIFY CALIBRATION

Test with multiple weights:
1. Step on/off scale multiple times - readings should be consistent
2. Try different positions (center, slightly off-center)
3. All 4 load cells should work together smoothly

**Target Accuracy:** ±0.5 kg is excellent!

---

## 🔧 TROUBLESHOOTING

### Weight shows 0 even when standing on scale:
- Check BLUE wire connections to HX711 (E+, A-, A+, E-)
- Verify all 4 load cells have proper signal connections
- Check power connections (White/Black loops to E+/E-)

### Weight is negative or shows wrong sign:
- Change sign of `CALIBRATION_FACTOR` (negative ↔ positive)

### Weight is unstable (jumping around):
- Increase `NUM_READINGS` in code (currently 20)
- Increase `scale.get_units()` parameter (currently 20)
- Check for loose wire connections

### Only some load cells work:
- Verify the loop connections (White-to-White, Black-to-Black)
- Check each BLUE wire connection individually
- Make sure scale platform is level and stable

### Raw reading is 0 or not changing:
- HX711 not powered or faulty
- Check DT and SCK pin connections (Pins 3 and 2)
- Try different HX711 module

---

## 📝 QUICK REFERENCE

Your actual weight: **__________ kg**

| Test | Shown Weight | Calibration Factor | Notes |
|------|--------------|-------------------|-------|
| 1    |              | -1000.0          | Starting point |
| 2    |              |                  |       |
| 3    |              |                  |       |
| 4    |              |                  | ✓ Final |

**Final Calibration Factor:** `__________`

---

## 🚀 NEXT STEPS

Once calibration is accurate:
1. Close Serial Monitor
2. Test with Next.js app at `localhost:3000/bmi-tracking`
3. Verify data shows correctly in browser
4. Test RFID + auto-save feature

---

## 📌 REMEMBER

- **ALWAYS tare** (reset) before testing by pressing Arduino RESET button
- **Close Serial Monitor** before running the Next.js bridge
- Stand **centered** on scale for best accuracy
- Be patient - good calibration takes a few tries!

---

**Last Updated:** 2026-02-22
**Configuration:** 3-Wire Full Wheatstone Bridge (4 Load Cells)
**Tutorial Reference:** https://youtu.be/LIuf2egMioA
