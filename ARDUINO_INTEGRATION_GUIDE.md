# Arduino Height & Weight Sensor Integration

## Overview

This system automatically measures student height and weight using Arduino sensors and sends the data directly to the GROWTHetect web application. No manual data entry required!

## Hardware Requirements

### Components Needed

1. **Arduino Board** (Uno/Nano/Mega) - $5-25
2. **HC-SR04 Ultrasonic Sensor** - $2-5
   - Measures distance/height accurately up to 4 meters
3. **HX711 Load Cell Amplifier** - $2-5
4. **Load Cell** (50kg or 100kg capacity) - $10-20
   - Choose capacity based on maximum expected weight
5. **USB Cable** (for Arduino connection)
6. **Jumper Wires**
7. **Breadboard** (optional, for prototyping)

**Total Cost: ~$25-60**

## Wiring Diagram

### HC-SR04 Ultrasonic Sensor (Height Measurement)
```
HC-SR04    ->    Arduino
----------------------------
VCC        ->    5V
GND        ->    GND
TRIG       ->    Pin 9
ECHO       ->    Pin 10
```

### HX711 Load Cell (Weight Measurement)
```
HX711      ->    Arduino
----------------------------
VCC        ->    5V
GND        ->    GND
DT (Data)  ->    Pin 3
SCK (Clock)->    Pin 2
```

### Load Cell Wires (to HX711)
```
Load Cell  ->    HX711
----------------------------
Red        ->    E+
Black      ->    E-
White      ->    A-
Green      ->    A+
```

## Software Setup

### Step 1: Install Arduino IDE

1. Download Arduino IDE from: https://www.arduino.cc/en/software
2. Install and open Arduino IDE

### Step 2: Install HX711 Library

1. In Arduino IDE, go to: **Sketch → Include Library → Manage Libraries**
2. Search for: **HX711**
3. Install: **HX711 Arduino Library** by Bogdan Necula

### Step 3: Upload Arduino Sketch

1. Open the file: `arduino_height_weight_sensor.ino`
2. Connect your Arduino to the computer via USB
3. Select your Arduino board: **Tools → Board → Arduino Uno** (or your model)
4. Select the COM port: **Tools → Port → COM3** (or your port)
5. Click **Upload** button (→)

## Calibration

### Calibrating the Load Cell (Weight)

**IMPORTANT: Must be calibrated for accurate weight measurements!**

1. **Initial Upload:**
   - Set `LOADCELL_CALIBRATION_FACTOR = 1.0` in the Arduino code
   - Upload the sketch

2. **Get Raw Reading:**
   - Open **Serial Monitor** (Tools → Serial Monitor, 9600 baud)
   - Place a known weight on the scale (e.g., 10 kg)
   - Note the raw reading shown (e.g., -70500)

3. **Calculate Calibration Factor:**
   ```
   CALIBRATION_FACTOR = raw_reading / known_weight
   
   Example: -70500 / 10 = -7050
   ```

4. **Update Code:**
   - Change `LOADCELL_CALIBRATION_FACTOR = -7050.0` (your calculated value)
   - Upload again

5. **Verify:**
   - Test with multiple known weights
   - Adjust if needed for better accuracy

### Setting Up Ultrasonic Sensor (Height)

1. **Mount Sensor:**
   - Install ultrasonic sensor at a fixed height above ground
   - Recommended: 200cm (2 meters) from floor
   - Must be stable and level

2. **Measure Height:**
   - Use a measuring tape to get exact distance from sensor to ground
   - Example: 200.0 cm

3. **Update Code:**
   - Change `SENSOR_HEIGHT_CM = 200.0` to your measured height
   - Upload again

4. **Test:**
   - Have a person of known height stand under sensor
   - Verify the reading matches their actual height

## Physical Setup

### Height Measurement Station

```
                 [Ultrasonic Sensor] ← Mount at 200cm
                         |
                         |
                    (measures
                     distance)
                         |
                         ↓
                    [Student's
                      Head]
                         |
                    [Student
                     Standing]
                         |
                    ===========  ← Ground (0cm)
```

### Weight Measurement

1. Place load cell under a platform or scale
2. Ensure it's stable and level
3. Student stands on platform
4. System reads weight automatically

## How It Works

### Data Flow

```
┌─────────────┐
│   Arduino   │
│             │
│ Ultrasonic  │ ──┐
│   Sensor    │   │
│             │   │ Reads sensors
│ Load Cell   │ ──┘ every 500ms
│  (HX711)    │
└──────┬──────┘
       │ USB Cable
       │ Sends: "W:45.5,H:165.2"
       ↓
┌─────────────┐
│   Laptop    │
│             │
│  Next.js    │ ← Auto-detects Arduino
│   Server    │   Reads serial data
│             │
└──────┬──────┘
       │ API
       ↓
┌─────────────┐
│  Browser    │
│             │
│ BMI Tracking│ ← Auto-fills weight
│    Page     │   and height fields
└─────────────┘
```

### Automatic Operation

1. **Connect Arduino**: Plug USB cable into laptop
2. **Open BMI Tracking**: Navigate to BMI Tracking page
3. **Click "Record BMI"**: Modal opens
4. **System Auto-Detects**: Green indicator shows "Arduino Connected"
5. **Student Steps On**: Student stands on scale and under sensor
6. **Auto-Fill**: Weight and height automatically populate
7. **Select Student**: Choose student from dropdown
8. **Save**: Click "Save Record" - Done!

## Using the System

### Daily Operation

1. **Start Your Day:**
   - Connect Arduino to laptop via USB
   - Open GROWTHetect application
   - Arduino auto-connects (no setup needed!)

2. **Measure Students:**
   - Go to BMI Tracking page
   - Click "+ Record BMI"
   - Student stands on scale and under sensor
   - Wait 1-2 seconds for readings to stabilize
   - Select student from dropdown
   - Weight and height are already filled!
   - Click "Save Record"

3. **Indicators:**
   - 🟢 **Green Dot (Pulsing)**: Arduino connected and receiving data
   - ⚪ **Gray Dot**: Arduino not connected
   - **"Arduino Connected"**: System active
   - **"Arduino Not Connected"**: Plug in Arduino

## Troubleshooting

### Arduino Not Detected

**Problem**: Gray dot, "Arduino Not Connected"

**Solutions**:
1. Check USB cable is plugged in
2. Make sure Arduino sketch is uploaded
3. Try different USB port
4. Install CH340 drivers if using clone Arduino
5. Check Windows Device Manager for COM port

### Weight Always Shows 0

**Problem**: Height works but weight is 0

**Solutions**:
1. Check HX711 wiring (especially DT and SCK pins)
2. Verify load cell is connected to HX711
3. Check load cell wire colors match diagram
4. Recalibrate load cell
5. Open Serial Monitor to see raw readings

### Height Always Shows 0

**Problem**: Weight works but height is 0

**Solutions**:
1. Check ultrasonic sensor wiring (TRIG and ECHO)
2. Make sure sensor has clear line of sight
3. Adjust `SENSOR_HEIGHT_CM` value
4. Sensor may be too far (max ~4 meters)
5. Check for obstacles in front of sensor

### Readings Are Jumpy/Noisy

**Problem**: Values keep changing rapidly

**Solutions**:
1. Increase `NUM_READINGS` in Arduino code (e.g., from 5 to 10)
2. Make sure scale platform is stable
3. Remove sources of vibration
4. For ultrasonic: ensure no moving objects nearby

### Wrong Weight Values

**Problem**: Weight shows but incorrect

**Solutions**:
1. **Recalibrate**: Follow calibration steps again
2. Check load cell capacity (50kg vs 100kg)
3. Make sure tare was called (scale reset to 0)
4. Verify known weight used for calibration

### Wrong Height Values

**Problem**: Height shows but incorrect

**Solutions**:
1. Re-measure `SENSOR_HEIGHT_CM` carefully
2. Update value in Arduino code
3. Make sure sensor is level and stable
4. Account for sensor position (facing down)

## Advanced Configuration

### Adjusting Smoothing

Edit Arduino code:
```cpp
const int NUM_READINGS = 5; // Increase for smoother readings (e.g., 10)
```

More readings = smoother but slower response

### Changing Update Rate

Edit Arduino code:
```cpp
delay(500); // Change to 1000 for 1 second updates
```

### Different Sensor Heights

For sensors at different heights:
```cpp
const float SENSOR_HEIGHT_CM = 250.0; // If sensor is at 2.5 meters
```

## Safety & Maintenance

### Safety

- Ensure scale platform is sturdy and non-slip
- Weight limit: Don't exceed load cell capacity
- Keep electronics dry
- Secure wiring to prevent tripping hazards

### Maintenance

- **Weekly**: Check connections for loose wires
- **Monthly**: Clean ultrasonic sensor lens
- **As Needed**: Recalibrate if readings seem off
- **Annually**: Replace load cell if damaged

## Technical Specifications

### Ultrasonic Sensor (HC-SR04)
- **Range**: 2cm - 400cm
- **Accuracy**: ±3mm
- **Angle**: 15 degrees
- **Frequency**: 40KHz

### Load Cell
- **Capacity**: 50kg or 100kg (depending on model)
- **Accuracy**: ±0.1% (after calibration)
- **Material**: Aluminum alloy
- **Output**: 1-2 mV/V

### System Accuracy
- **Height**: ±0.5 cm
- **Weight**: ±0.1 kg (after proper calibration)

## FAQ

**Q: Do I need to keep Arduino IDE open?**
A: No! Once uploaded, Arduino runs independently. Just plug it in.

**Q: Can I use a different Arduino model?**
A: Yes! Works with Uno, Nano, Mega, and most Arduino-compatible boards.

**Q: Can multiple computers use the same Arduino?**
A: No, one computer at a time. Unplug from one before connecting to another.

**Q: What if I don't have Arduino?**
A: System still works! Just manually enter weight and height.

**Q: Can I use a different weight sensor?**
A: Yes, but you'll need to modify the Arduino code for that sensor.

**Q: How do I know if my load cell is working?**
A: Open Serial Monitor after uploading sketch - you'll see readings.

**Q: Can students see their measurements?**
A: Only nutritionists/admin can record. Students see their data in their portal.

## Support

For issues or questions:
1. Check troubleshooting section above
2. Verify wiring matches diagrams
3. Test each component individually
4. Check Serial Monitor for error messages

## Replacement Parts

If components fail:
- **Arduino Uno**: $5-25 (AliExpress to official)
- **HC-SR04**: $2-5 (common and cheap)
- **HX711**: $2-5 (very reliable)
- **Load Cell**: $10-20 (most durable part)

All parts available on:
- Amazon
- AliExpress
- Local electronics stores
- Arduino official store

## Summary

✅ **Easy Setup**: One-time configuration
✅ **Automatic**: Just plug in and go
✅ **Accurate**: Calibrated measurements
✅ **Fast**: Real-time data in browser
✅ **Affordable**: Under $60 total cost
✅ **Reliable**: Industrial-grade sensors

Perfect for schools tracking student growth!
