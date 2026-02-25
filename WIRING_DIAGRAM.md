# 🔌 **GROWTHetect Complete Wiring Diagram**

## 📦 **Components Needed**

| Component | Quantity | Purpose |
|-----------|----------|---------|
| Arduino Uno/Nano | 1 | Main controller |
| HC-SR04 Ultrasonic Sensor | 1 | Height measurement |
| YZC-516C 200kg Load Cell | 1 | Weight measurement |
| HX711 Load Cell Amplifier | 1 | Amplifies load cell signal |
| USB Cable | 1 | Arduino to computer |
| Jumper Wires | ~10 | Connections |
| Breadboard (optional) | 1 | For organizing connections |

---

## 🎨 **Complete Wiring Connections**

### **1️⃣ HC-SR04 Ultrasonic Sensor (Height)**

```
HC-SR04          Arduino Uno
────────────     ───────────
VCC       ────→  5V
GND       ────→  GND
TRIG      ────→  Pin 9
ECHO      ────→  Pin 10
```

**Color recommendations:**
- **RED** wire: VCC to 5V
- **BLACK** wire: GND to GND
- **YELLOW** wire: TRIG to Pin 9
- **GREEN** wire: ECHO to Pin 10

---

### **2️⃣ HX711 Load Cell Amplifier**

```
HX711            Arduino Uno
────────────     ───────────
VCC       ────→  5V
GND       ────→  GND
DT        ────→  Pin 3 (Digital pin 3)
SCK       ────→  Pin 2 (Digital pin 2)
```

**Color recommendations:**
- **RED** wire: VCC to 5V
- **BLACK** wire: GND to GND
- **WHITE** wire: DT to Pin 3
- **BLUE** wire: SCK to Pin 2

---

### **3️⃣ YZC-516C Load Cell to HX711**

```
Load Cell Wire   HX711 Terminal   Description
──────────────   ──────────────   ─────────────────────
RED       ────→  E+               Excitation Positive
BLACK     ────→  E-               Excitation Negative
GREEN     ────→  A+               Signal Positive
WHITE     ────→  A-               Signal Negative
```

**⚠️ CRITICAL: These wire colors are STANDARD for YZC-516C**
- If your load cell has different colors, check the datasheet!
- Wrong connections = damaged load cell or HX711!

---

## 🖼️ **Visual Wiring Diagram (ASCII Art)**

```
                    ┌─────────────────────┐
                    │   Arduino Uno       │
                    │                     │
          ┌─────────│  5V              13 │
          │    ┌────│  GND             12 │
          │    │ ┌──│  Pin 2           11 │  
          │    │ │┌─│  Pin 3           10 │───────┐
          │    │ ││ │                   9 │─────┐ │
          │    │ ││ │                     │     │ │
          │    │ ││ └─────────────────────┘     │ │
          │    │ ││                              │ │
          │    │ ││    HC-SR04                   │ │
          │    │ ││    ┌──────┐                  │ │
          │    │ ││    │ TRIG │──────────────────┘ │
          │    │ ││    │ ECHO │────────────────────┘
          │    │ ││    │ VCC  │─────┐
          │    │ ││    │ GND  │──┐  │
          │    │ ││    └──────┘  │  │
          │    │ ││               │  │
          │    │ ││    HX711      │  │
          │    │ ││    ┌──────┐  │  │
          │    │ ││────│ DT   │  │  │
          │    │ │└────│ SCK  │  │  │
          │    │ │     │ VCC  │──┼──┘
          │    │ └─────│ GND  │  │
          │    │       ├──────┤  │
          │    │       │ E+   │  │
          │    │       │ E-   │──┘
          │    │       │ A-   │
          │    │       │ A+   │
          │    │       └──┬───┘
          │    │          │
          │    │    Load Cell (YZC-516C 200kg)
          │    │      ┌───────────┐
          │    │      │   RED ────┼──→ E+
          │    └──────┼── BLACK ──┼──→ E-
          └───────────┼── WHITE ──┼──→ A-
                      └── GREEN ──┼──→ A+
                         └────────┘
```

---

## 📋 **Complete Pin Usage Summary**

| Arduino Pin | Connected To | Purpose |
|-------------|--------------|---------|
| **5V** | HC-SR04 VCC, HX711 VCC | Power supply (+5V) |
| **GND** | HC-SR04 GND, HX711 GND | Ground (0V) |
| **Pin 2** | HX711 SCK | Load cell clock signal |
| **Pin 3** | HX711 DT | Load cell data signal |
| **Pin 9** | HC-SR04 TRIG | Ultrasonic trigger |
| **Pin 10** | HC-SR04 ECHO | Ultrasonic echo |

---

## 🔧 **Physical Setup**

### **Height Sensor (HC-SR04) Mounting:**

```
         Ceiling/Fixed Mount
                │
                │ 200cm (adjust to your setup)
                │
         ┌──────▼──────┐
         │  HC-SR04    │  ← Mount pointing DOWN
         │   Sensor    │
         └─────────────┘
                │
                │  Measurement Zone
                │
         ┌──────▼──────┐
         │   Student   │  ← Student stands here
         │    Head     │
         └─────────────┘
                │
         ═══════╧═══════  ← Floor level
```

### **Weight Sensor (Load Cell) Setup:**

```
         Student stands here
                │
         ┌──────▼──────┐
         │  Platform   │  ← Sturdy board (plywood, etc.)
         └─────────────┘
                │
         ┌──────▼──────┐
         │ Load Cell   │  ← YZC-516C sensor
         │  (Metal Bar)│
         └─────────────┘
                │
         ═══════╧═══════  ← Floor level (fixed)
```

**Platform Requirements:**
- Sturdy material (wood, metal, or thick plastic)
- Size: ~30cm x 40cm minimum (bigger = more stable)
- Flat surface for accurate measurements
- Weight: light enough not to affect readings

---

## 🔌 **Power Considerations**

### **Option 1: USB Power Only (Recommended for Testing)**
```
Computer USB Port ──→ Arduino ──→ Powers all components
```
- **Pros:** Simple, safe, easy to debug
- **Cons:** Arduino must stay connected to computer
- **Current draw:** ~200-300mA total (within USB limits ✓)

### **Option 2: External Power Supply (For Production)**
```
9V-12V DC Adapter ──→ Arduino Barrel Jack ──→ Powers all components
                      └──→ USB for data only
```
- **Pros:** Arduino can run standalone
- **Cons:** Requires separate power adapter
- **Recommended:** 9V 1A wall adapter

### **⚠️ WARNING: Do NOT use both USB and barrel jack simultaneously!**
- Arduino has automatic switching, but avoid it
- For production: Use barrel jack + USB for data

---

## ✅ **Wiring Checklist**

Before uploading code, verify:

- [ ] **Power connections:**
  - [ ] Both sensors get 5V from Arduino
  - [ ] All GND connections are secure
  - [ ] No shorts between 5V and GND

- [ ] **HC-SR04 connections:**
  - [ ] VCC → 5V
  - [ ] GND → GND
  - [ ] TRIG → Pin 9
  - [ ] ECHO → Pin 10

- [ ] **HX711 connections:**
  - [ ] VCC → 5V
  - [ ] GND → GND
  - [ ] DT → Pin 3
  - [ ] SCK → Pin 2

- [ ] **Load Cell to HX711:**
  - [ ] RED → E+
  - [ ] BLACK → E-
  - [ ] GREEN → A+
  - [ ] WHITE → A-

- [ ] **USB connection:**
  - [ ] Arduino connected to computer
  - [ ] Correct COM port selected in Arduino IDE

---

## 🧪 **Testing Each Component**

### **Test 1: Power Check**
1. Connect only power (5V, GND)
2. Arduino power LED should light up
3. No smoke, no hot components ✓

### **Test 2: HC-SR04 (Height Sensor)**
1. Connect HC-SR04 as shown
2. Upload height-only test code
3. Wave hand under sensor
4. Should see distance readings

### **Test 3: HX711 + Load Cell (Weight Sensor)**
1. Connect HX711 and load cell
2. Upload weight-only test code
3. Press down on load cell
4. Should see weight readings

### **Test 4: Combined System**
1. Connect everything
2. Upload complete code
3. Test height and weight together
4. Verify data format: `W:XX.X,H:YYY.Y`

---

## 🐛 **Common Wiring Mistakes**

### **❌ Problem: Arduino won't turn on**
- **Cause:** No power or USB cable issue
- **Fix:** Check USB cable, try different port

### **❌ Problem: HC-SR04 always shows 0 or weird values**
- **Cause:** TRIG/ECHO swapped, or loose connections
- **Fix:** Double-check Pin 9 (TRIG) and Pin 10 (ECHO)

### **❌ Problem: HX711 shows "Scale not ready"**
- **Cause:** DT/SCK not connected or wrong pins
- **Fix:** Verify Pin 2 (SCK) and Pin 3 (DT)

### **❌ Problem: Load cell shows negative or wrong values**
- **Cause:** A+/A- wires reversed
- **Fix:** Swap GREEN and WHITE wires on HX711

### **❌ Problem: Everything shows 0**
- **Cause:** GND not connected properly
- **Fix:** Ensure all GND pins share common ground

### **❌ Problem: Erratic readings, Arduino resets randomly**
- **Cause:** Insufficient power, bad USB cable
- **Fix:** Use good quality USB cable, try powered USB hub

---

## 📸 **Pro Tips**

1. **Use a breadboard** for cleaner wiring (optional but recommended)
2. **Label your wires** with tape to avoid confusion
3. **Secure all connections** - loose wires = frustrating bugs
4. **Keep wires short** to reduce interference
5. **Test one component at a time** before combining
6. **Take photos** of your wiring for future reference
7. **Use wire strippers** for clean, solid connections
8. **Avoid parallel runs** of sensor wires and power wires

---

## 🆘 **Need Help?**

If you're stuck:
1. ✅ Verify each connection against this diagram
2. 📸 Take clear photos of your wiring
3. 🔍 Check for loose connections
4. 🧪 Test components individually
5. 📖 Read the troubleshooting section in the Arduino code

---

**Good luck with your wiring! Take your time and double-check everything!** 🚀⚖️📏
