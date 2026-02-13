/*
 * GROWTHetect - Arduino HEIGHT + WEIGHT Sensor System
 * 
 * Hardware Required:
 * - Arduino Uno/Nano/Mega
 * - HC-SR04 Ultrasonic Sensor (for height measurement)
 * - YZC-516C 200kg Load Cell (for weight measurement)
 * - HX711 Load Cell Amplifier Module
 * 
 * Wiring Connections:
 * 
 * HC-SR04 Ultrasonic Sensor:
 *   VCC  -> Arduino 5V pin
 *   GND  -> Arduino GND pin
 *   TRIG -> Pin 9
 *   ECHO -> Pin 10
 * 
 * HX711 Load Cell Amplifier:
 *   VCC  -> Arduino 5V pin
 *   GND  -> Arduino GND pin
 *   DT   -> Pin 3 (Data)
 *   SCK  -> Pin 2 (Clock)
 * 
 * YZC-516C Load Cell (4 wires):
 *   RED wire    -> HX711 E+ (Excitation +)
 *   BLACK wire  -> HX711 E- (Excitation -)
 *   WHITE wire  -> HX711 A- (Signal -)
 *   GREEN wire  -> HX711 A+ (Signal +)
 * 
 * NOTE: You MUST install the HX711 library first!
 * In Arduino IDE: Tools > Manage Libraries > Search "HX711" > Install "HX711 Arduino Library" by Bogdan Necula
 */

#include "HX711.h"

// ═══════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════

// Ultrasonic Sensor Pins
#define TRIG_PIN 9
#define ECHO_PIN 10

// HX711 Load Cell Amplifier Pins
#define LOADCELL_DOUT_PIN 3  // DT (Data)
#define LOADCELL_SCK_PIN 2   // SCK (Clock)

// ═══════════════════════════════════════════════════════
// CONFIGURATION - ADJUST THESE VALUES!
// ═══════════════════════════════════════════════════════

// Height sensor configuration
const float SENSOR_HEIGHT_CM = 200.0; // Height of ultrasonic sensor from ground in cm
                                       // ⚠️ ADJUST THIS TO YOUR ACTUAL SETUP!

// Load cell calibration
// ⚠️ YOU MUST CALIBRATE THIS! See calibration instructions at bottom of file
const float CALIBRATION_FACTOR = -7050.0; // Start with this, then calibrate!

// Smoothing - average last N readings
const int NUM_READINGS = 5;
float heightReadings[NUM_READINGS];
float weightReadings[NUM_READINGS];
int readIndex = 0;

// ═══════════════════════════════════════════════════════
// HARDWARE OBJECTS
// ═══════════════════════════════════════════════════════

HX711 scale;

// ═══════════════════════════════════════════════════════
// SETUP - Runs once on startup
// ═══════════════════════════════════════════════════════

void setup() {
  Serial.begin(9600);
  
  // Initialize ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Initialize HX711 load cell amplifier
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // Reset scale to 0
  
  // Initialize reading arrays
  for (int i = 0; i < NUM_READINGS; i++) {
    heightReadings[i] = 0;
    weightReadings[i] = 0;
  }
  
  delay(1000);
  
  // Display startup banner
  Serial.println("========================================");
  Serial.println("GROWTHetect HEIGHT + WEIGHT System");
  Serial.println("========================================");
  Serial.print("Sensor Height: ");
  Serial.print(SENSOR_HEIGHT_CM);
  Serial.println(" cm from ground");
  Serial.print("Calibration Factor: ");
  Serial.println(CALIBRATION_FACTOR);
  Serial.println("Measuring height and weight...");
  Serial.println("Bridge Mode: Sending data to computer");
  Serial.println("========================================");
  
  // Wait for sensors to stabilize
  Serial.println("Stabilizing sensors (3 seconds)...");
  delay(3000);
  Serial.println("Ready!");
  Serial.println("========================================");
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP - Runs continuously
// ═══════════════════════════════════════════════════════

void loop() {
  // Measure height from ultrasonic sensor
  float height = measureHeight();
  
  // Measure weight from load cell
  float weight = measureWeight();
  
  // Apply smoothing
  heightReadings[readIndex] = height;
  weightReadings[readIndex] = weight;
  readIndex = (readIndex + 1) % NUM_READINGS;
  
  // Calculate averages
  float avgHeight = 0;
  float avgWeight = 0;
  int validHeightReadings = 0;
  int validWeightReadings = 0;
  
  for (int i = 0; i < NUM_READINGS; i++) {
    if (heightReadings[i] > 0) {
      avgHeight += heightReadings[i];
      validHeightReadings++;
    }
    if (weightReadings[i] > 0) {
      avgWeight += weightReadings[i];
      validWeightReadings++;
    }
  }
  
  if (validHeightReadings > 0) {
    avgHeight /= validHeightReadings;
  }
  if (validWeightReadings > 0) {
    avgWeight /= validWeightReadings;
  }
  
  // Print debug information (visible in Serial Monitor)
  Serial.print("Raw Distance: ");
  Serial.print(SENSOR_HEIGHT_CM - height, 1);
  Serial.print(" cm | Height: ");
  Serial.print(avgHeight, 1);
  Serial.print(" cm | Weight: ");
  Serial.print(avgWeight, 1);
  Serial.println(" kg");
  
  // Validate and send data to bridge
  // Only send if both height and weight are valid
  if (avgHeight >= 50.0 && avgHeight <= 200.0 && avgWeight >= 5.0 && avgWeight <= 200.0) {
    // Valid student measurement
    Serial.print("W:");
    Serial.print(avgWeight, 1);
    Serial.print(",H:");
    Serial.println(avgHeight, 1);
    Serial.println("✓ VALID MEASUREMENT");
  } else if (avgHeight >= 50.0 && avgHeight <= 200.0) {
    // Valid height but no/low weight (student not on scale)
    Serial.print("W:0.0,H:");
    Serial.println(avgHeight, 1);
    Serial.println("⚠️  Height OK - Waiting for student to step on scale");
  } else if (avgWeight >= 5.0 && avgWeight <= 200.0) {
    // Valid weight but no valid height (student not under sensor)
    Serial.print("W:");
    Serial.print(avgWeight, 1);
    Serial.println(",H:0.0");
    Serial.println("⚠️  Weight OK - Waiting for student under sensor");
  } else {
    // No valid measurements
    Serial.println("W:0.0,H:0.0");
    Serial.println("⚠️  Waiting for student...");
  }
  
  Serial.println("---"); // Separator for readability
  
  delay(500); // Read every 500ms
}

// ═══════════════════════════════════════════════════════
// MEASURE HEIGHT (Ultrasonic Sensor)
// ═══════════════════════════════════════════════════════

float measureHeight() {
  // Clear trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send 10 microsecond pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read echo pulse (timeout after 30ms = ~5 meters max range)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  if (duration == 0) {
    return 0; // No measurement - sensor didn't receive echo
  }
  
  // Calculate distance in cm
  // Speed of sound = 343 m/s = 0.0343 cm/µs
  // Distance = (duration * 0.0343) / 2
  float distance = duration * 0.034 / 2.0;
  
  // Calculate height: sensor height - distance to object
  float height = SENSOR_HEIGHT_CM - distance;
  
  // Return height (validation done in main loop)
  return height;
}

// ═══════════════════════════════════════════════════════
// MEASURE WEIGHT (Load Cell)
// ═══════════════════════════════════════════════════════

float measureWeight() {
  if (scale.is_ready()) {
    float weight = scale.get_units(3); // Average of 3 readings
    
    // Ensure weight is positive
    if (weight < 0) {
      weight = 0;
    }
    
    // Ignore very small values (noise)
    if (weight < 2.0) {
      weight = 0;
    }
    
    return weight;
  } else {
    return 0; // Scale not ready
  }
}

/*
 * ═══════════════════════════════════════════════════════════════
 * SETUP INSTRUCTIONS
 * ═══════════════════════════════════════════════════════════════
 * 
 * PART 1: INSTALL HX711 LIBRARY
 * ───────────────────────────────────────────────────────────────
 * 1. Open Arduino IDE
 * 2. Go to: Tools > Manage Libraries (or Ctrl+Shift+I)
 * 3. Search for: "HX711"
 * 4. Install: "HX711 Arduino Library" by Bogdan Necula
 * 5. Wait for installation to complete
 * 
 * PART 2: WIRE THE COMPONENTS
 * ───────────────────────────────────────────────────────────────
 * 
 * HC-SR04 Ultrasonic Sensor:
 *   VCC  -> Arduino 5V
 *   GND  -> Arduino GND
 *   TRIG -> Arduino Pin 9
 *   ECHO -> Arduino Pin 10
 * 
 * HX711 Load Cell Amplifier:
 *   VCC  -> Arduino 5V
 *   GND  -> Arduino GND
 *   DT   -> Arduino Pin 3
 *   SCK  -> Arduino Pin 2
 * 
 * YZC-516C Load Cell (4-wire connection to HX711):
 *   RED wire    -> HX711 E+ (Excitation Positive)
 *   BLACK wire  -> HX711 E- (Excitation Negative)
 *   WHITE wire  -> HX711 A- (Signal Negative)
 *   GREEN wire  -> HX711 A+ (Signal Positive)
 * 
 * PART 3: MOUNT THE SENSORS
 * ───────────────────────────────────────────────────────────────
 * 1. Mount HC-SR04 at a FIXED HEIGHT pointing DOWN
 *    - Use tripod, ceiling mount, or fixed stand
 *    - Measure height from sensor to floor (e.g., 200cm)
 *    - Update SENSOR_HEIGHT_CM in code
 * 
 * 2. Place load cell on the floor
 *    - Put a sturdy platform on top (wood board, etc.)
 *    - Make sure it's stable and level
 *    - Student will stand on this platform
 * 
 * PART 4: CALIBRATE THE LOAD CELL ⚠️ IMPORTANT!
 * ───────────────────────────────────────────────────────────────
 * The load cell MUST be calibrated for accurate weight readings!
 * 
 * 1. Upload this code with the default CALIBRATION_FACTOR (-7050.0)
 * 2. Open Serial Monitor (9600 baud)
 * 3. Remove ALL weight from the load cell
 * 4. Press the RESET button on Arduino (scale will tare to 0)
 * 5. Place a KNOWN weight on the scale (e.g., 10kg dumbbell, or bag of rice)
 * 6. Look at the "Weight" reading in Serial Monitor
 * 7. Adjust CALIBRATION_FACTOR:
 *    - If reading is TOO HIGH: make factor more negative (e.g., -8000)
 *    - If reading is TOO LOW: make factor less negative (e.g., -6000)
 * 8. Re-upload code and test again
 * 9. Repeat until readings are accurate!
 * 
 * Calibration Tips:
 *   - Use multiple known weights to verify (10kg, 20kg, 50kg)
 *   - Common range for YZC-516C: -6000 to -8000
 *   - Be patient! Good calibration = accurate measurements
 * 
 * PART 5: TEST THE SYSTEM
 * ───────────────────────────────────────────────────────────────
 * 1. Upload the calibrated code
 * 2. Open Serial Monitor (9600 baud)
 * 3. You should see:
 *    - Height readings when object is under sensor
 *    - Weight readings when weight is on scale
 *    - Bridge format: "W:65.3,H:165.2" for valid measurements
 * 
 * PART 6: RUN THE BRIDGE SCRIPT
 * ───────────────────────────────────────────────────────────────
 * 1. Close Arduino IDE Serial Monitor (IMPORTANT!)
 * 2. Double-click START_ARDUINO_BRIDGE.bat
 * 3. The script will read Arduino data and send to your website
 * 4. Open your website and test!
 * 
 * ═══════════════════════════════════════════════════════════════
 * TROUBLESHOOTING
 * ═══════════════════════════════════════════════════════════════
 * 
 * Height Sensor Issues:
 *   - "NO READING" → Check wiring, sensor power, obstructions
 *   - Wrong readings → Verify SENSOR_HEIGHT_CM value
 *   - Noisy readings → Increase NUM_READINGS, check for interference
 * 
 * Weight Sensor Issues:
 *   - Always shows 0 → Check HX711 wiring (especially DT and SCK)
 *   - Negative weights → Adjust CALIBRATION_FACTOR, check tare
 *   - Wrong readings → Recalibrate with known weights
 *   - Drifting values → Re-tare (reset Arduino), check load cell mounting
 *   - "Scale not ready" → Check HX711 power and wiring
 * 
 * Bridge Issues:
 *   - No data on website → Make sure Arduino Serial Monitor is CLOSED
 *   - Bridge not connecting → Check COM port, restart bridge script
 * 
 * ═══════════════════════════════════════════════════════════════
 */
