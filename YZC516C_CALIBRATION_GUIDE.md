# 🎯 YZC-516C 200kg Load Cell Calibration Guide

## 📋 **Your Load Cell:**

```
Model: YZC-516C
Manufacturer: Guang Ce (广测)
Capacity: 200kg (440 lbs)
Type: S-Type Load Cell
Output: 2.0±0.1 mV/V (typical)
Accuracy: ±0.02% F.S.
```

---

## 🔌 **Wiring to HX711:**

Your load cell has **4 wires:**

```
RED    (E+) → HX711 E+
BLACK  (E-) → HX711 E-
GREEN  (A-) → HX711 A-
WHITE  (A+) → HX711 A+
```

**HX711 to Arduino:**
```
HX711 VCC → Arduino 5V
HX711 GND → Arduino GND
HX711 DT  → Arduino Pin 3
HX711 SCK → Arduino Pin 2
```

---

## ⚙️ **Calibration Process:**

### **Step 1: Prepare**

1. **Mount load cell securely**
2. **Remove all weight** from scale
3. **Connect to Arduino**
4. **Upload Arduino sketch**

### **Step 2: Get Raw Reading**

1. **Temporarily change calibration factor to 1.0:**
   ```cpp
   const float LOADCELL_CALIBRATION_FACTOR = 1.0; // Temporary!
   ```

2. **Upload and open Serial Monitor** (9600 baud)

3. **Place known weight** (e.g., 10kg)
   - Use calibrated dumbbells
   - Or fill water bottles (1L = 1kg)
   - Or use bathroom scale to verify

4. **Note the raw reading**
   - Example: `-70500` for 10kg

### **Step 3: Calculate Your Factor**

```
CALIBRATION_FACTOR = raw_reading / known_weight

Example:
  Raw reading: -70500
  Known weight: 10 kg
  CALIBRATION_FACTOR = -70500 / 10 = -7050
```

### **Step 4: Update and Test**

1. **Update calibration factor:**
   ```cpp
   const float LOADCELL_CALIBRATION_FACTOR = -7050.0; // Your calculated value
   ```

2. **Upload again**

3. **Test with multiple weights:**
   - 10kg → Should read ~10.0
   - 20kg → Should read ~20.0
   - 50kg → Should read ~50.0

4. **Fine-tune if needed:**
   - Too high? Decrease factor (e.g., -7000)
   - Too low? Increase factor (e.g., -7100)

---

## 📊 **Expected Calibration Range:**

For YZC-516C 200kg load cells, typical calibration factors:

```
Common range: -6000 to -8000
Your starting point: -7050 (pre-configured)
```

**Factors vary based on:**
- Specific load cell tolerance
- HX711 module quality
- Temperature
- Installation method

---

## 🧪 **Testing Protocol:**

### **Test 1: Zero Reading**
```
1. Remove all weight
2. Wait 5 seconds
3. Serial should show: W:0.0,H:0.0 ✅
```

### **Test 2: Known Weights**
```
1. Place 10kg → Should read ~10.0 ✅
2. Place 20kg → Should read ~20.0 ✅
3. Place 50kg → Should read ~50.0 ✅
```

### **Test 3: Repeatability**
```
1. Place 20kg → Note reading
2. Remove weight → Wait 5 seconds
3. Place 20kg again → Should match ±0.1kg ✅
```

### **Test 4: Maximum Capacity**
```
1. Gradually add weight up to 150kg
2. Check readings are stable
3. Do NOT exceed 200kg! ⚠️
```

---

## ⚠️ **Safety Notes:**

```
✅ DO:
- Test with known weights
- Start with light weights
- Secure load cell properly
- Check wiring before power on

❌ DON'T:
- Exceed 200kg capacity
- Drop weights suddenly
- Pull wires while powered
- Use near water/moisture
```

---

## 🔧 **Troubleshooting:**

### **Problem: Always shows 0**
```
Solution:
1. Check all 4 wires connected
2. Verify HX711 has power (5V, GND)
3. Try swapping A+ and A- wires
4. Check solder joints on HX711
```

### **Problem: Negative readings**
```
Solution:
1. Swap RED and BLACK wires
2. Or change calibration sign (+7050 instead of -7050)
```

### **Problem: Unstable/jumping values**
```
Solution:
1. Increase NUM_READINGS to 10
2. Shield wires from electrical noise
3. Use shorter wires if possible
4. Keep away from motors/fans
```

### **Problem: Wrong values**
```
Solution:
1. Recalibrate with accurate known weight
2. Adjust calibration factor ±100 at a time
3. Verify HX711 is genuine (not fake)
```

---

## 📏 **Creating Test Weights:**

### **Water Bottle Method:**
```
1L water = 1.0 kg
2L bottle = 2.0 kg
5 x 2L bottles = 10.0 kg ✅
```

### **Sand/Rice Bag Method:**
```
Use bathroom scale to weigh:
- Bag of rice
- Bag of sand
- Paint buckets with water
```

### **Dumbbell Method (Best):**
```
Use gym dumbbells:
- Usually accurate to ±0.1 kg
- Various weights available
- Easy to stack
```

---

## 🎯 **Calibration Values for Common Test Weights:**

**If using 10kg test weight:**
```cpp
// Measure raw value with factor = 1.0
// If you see: -70500
const float LOADCELL_CALIBRATION_FACTOR = -7050.0;
```

**If using 20kg test weight:**
```cpp
// Measure raw value with factor = 1.0
// If you see: -141000
const float LOADCELL_CALIBRATION_FACTOR = -7050.0;
```

**If using 5kg test weight:**
```cpp
// Measure raw value with factor = 1.0
// If you see: -35250
const float LOADCELL_CALIBRATION_FACTOR = -7050.0;
```

---

## ✅ **Verification Checklist:**

After calibration, verify:

- [ ] Zero reading shows 0.0-0.5 kg
- [ ] 10kg shows 9.8-10.2 kg
- [ ] 20kg shows 19.8-20.2 kg
- [ ] 50kg shows 49.5-50.5 kg
- [ ] Removing weight returns to ~0 kg
- [ ] Readings are stable (±0.1 kg)
- [ ] No drift over 1 minute
- [ ] Repeatable within ±0.2 kg

---

## 🎓 **For School Use:**

### **Acceptable Accuracy:**
```
For student BMI measurements:
±0.5 kg is acceptable ✅
±1.0 kg is still usable ✓
±2.0 kg needs recalibration ⚠️
```

### **Maintenance:**
```
Daily: Visual inspection
Weekly: Zero check
Monthly: Calibration verification
Yearly: Full recalibration
```

---

## 📝 **Record Your Calibration:**

```
Load Cell: YZC-516C 200kg
Calibration Date: ___________
Test Weight Used: ___________ kg
Raw Reading: ___________
Calibration Factor: ___________
Verified By: ___________
Accuracy: ±___________ kg
Next Calibration: ___________
```

---

## 🚀 **Quick Start:**

**Already have known weight?**

```cpp
// 1. Set factor to 1.0 temporarily
const float LOADCELL_CALIBRATION_FACTOR = 1.0;

// 2. Upload and check Serial Monitor
// 3. Note raw reading with 10kg
// 4. Calculate: factor = raw / 10
// 5. Update factor and upload again
// 6. Test and verify!
```

**Your load cell is ready!** 🎉

---

## 💡 **Tips:**

- **Temperature:** Readings may drift ±0.5kg with temperature
- **Position:** Always place weight in center
- **Surface:** Use on stable, level surface
- **Break-in:** First 100 measurements may vary more
- **Tare:** Remove weight and call `scale.tare()` to reset zero

**Good luck with your calibration!** 📊
