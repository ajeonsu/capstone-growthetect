/*
 * GROWTHetect - Arduino Height + Weight (2 Load Cells)
 * 
 * This version uses ONLY 2 LOAD CELLS (LC1 + LC2)
 * Perfect for when LC3 and LC4 are damaged/not working
 * 
 * Hardware:
 * - Arduino Uno/Nano/Mega
 * - HC-SR04 Ultrasonic Sensor
 * - 2x Load Cells (from bathroom scale)
 * - HX711 Amplifier Module
 * 
 * Wiring for 2 Load Cells (Black/White/Blue wires):
 * 
 * Load Cell 1 + Load Cell 2:
 *   All WHITE wires together -> HX711 E+
 *   All BLACK wires together -> HX711 E-
 *   All BLUE wires together  -> HX711 A+
 *   (Leave A- empty OR connect to E-)
 * 
 * HX711 -> Arduino:
 *   VCC -> 5V
 *   GND -> GND
 *   DT  -> Pin 3
 *   SCK -> Pin 2
 * 
 * HC-SR04 -> Arduino:
 *   VCC  -> 5V
 *   GND  -> GND
 *   TRIG -> Pin 9
 *   ECHO -> Pin 10
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

// Load Cell Calibration (for 2 load cells instead of 4)
// Start with this value, then recalibrate with your actual weight
const float LOADCELL_CALIBRATION_FACTOR = -5400.0; // Half of original since only 2 cells

// Ultrasonic Sensor Height (distance from sensor to ground in cm)
const float SENSOR_HEIGHT_CM = 200.0; // Adjust to your actual setup

// Valid measurement ranges
const float MIN_VALID_WEIGHT = 5.0;   // Minimum weight in kg
const float MAX_VALID_WEIGHT = 150.0; // Maximum weight for 2 cells (2x50kg capacity)
const float MIN_VALID_HEIGHT = 50.0;  // Minimum height in cm
const float MAX_VALID_HEIGHT = 200.0; // Maximum height in cm

// Smoothing configuration
const int NUM_READINGS = 5; // Average last N readings

// ═══════════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════

HX711 scale;

// Smoothing arrays
float weightReadings[NUM_READINGS];
float heightReadings[NUM_READINGS];
int readIndex = 0;

// ═══════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════

void setup() {
  Serial.begin(9600);
  
  // Initialize ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Initialize load cell
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(LOADCELL_CALIBRATION_FACTOR);
  scale.tare(); // Reset scale to 0
  
  // Initialize reading arrays
  for (int i = 0; i < NUM_READINGS; i++) {
    weightReadings[i] = 0;
    heightReadings[i] = 0;
  }
  
  delay(1000);
  
  Serial.println("========================================");
  Serial.println("GROWTHetect Sensor System Ready");
  Serial.println("Using 2 Load Cells (LC1 + LC2)");
  Serial.println("========================================");
  Serial.print("Sensor mounted at: ");
  Serial.print(SENSOR_HEIGHT_CM);
  Serial.println(" cm from ground");
  Serial.println("Measuring heights and weights...");
  Serial.println("Bridge Mode: Sending data to computer");
  Serial.println("========================================");
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════

void loop() {
  // Measure weight from load cells
  float weight = measureWeight();
  
  // Measure height from ultrasonic sensor
  float height = measureHeight();
  
  // Apply smoothing
  weightReadings[readIndex] = weight;
  heightReadings[readIndex] = height;
  readIndex = (readIndex + 1) % NUM_READINGS;
  
  // Calculate averages
  float avgWeight = 0;
  float avgHeight = 0;
  int validWeightReadings = 0;
  int validHeightReadings = 0;
  
  for (int i = 0; i < NUM_READINGS; i++) {
    if (weightReadings[i] > 0) {
      avgWeight += weightReadings[i];
      validWeightReadings++;
    }
    if (heightReadings[i] > 0) {
      avgHeight += heightReadings[i];
      validHeightReadings++;
    }
  }
  
  if (validWeightReadings > 0) avgWeight /= validWeightReadings;
  if (validHeightReadings > 0) avgHeight /= validHeightReadings;
  
  // Determine output values
  float outputWeight = 0.0;
  float outputHeight = 0.0;
  
  if (avgWeight >= MIN_VALID_WEIGHT && avgWeight <= MAX_VALID_WEIGHT) {
    outputWeight = avgWeight;
  }
  
  if (avgHeight >= MIN_VALID_HEIGHT && avgHeight <= MAX_VALID_HEIGHT) {
    outputHeight = avgHeight;
  }
  
  // Print debug info (human-readable)
  Serial.print("Raw Distance: ");
  Serial.print(SENSOR_HEIGHT_CM - height, 1);
  Serial.print(" cm | Height: ");
  Serial.print(avgHeight, 1);
  Serial.print(" cm | Weight: ");
  Serial.print(avgWeight, 1);
  Serial.println(" kg");
  
  // Send data to bridge (machine-readable format)
  Serial.print("W:");
  Serial.print(outputWeight, 1);
  Serial.print(",H:");
  Serial.println(outputHeight, 1);
  
  // Validation marker
  if ((outputWeight > 0 || outputHeight > 0)) {
    Serial.println("✓ VALID MEASUREMENT");
  }
  
  Serial.println("---");
  
  delay(500); // Read every 500ms
}

// ═══════════════════════════════════════════════════════
// WEIGHT MEASUREMENT (2 Load Cells)
// ═══════════════════════════════════════════════════════

float measureWeight() {
  if (!scale.is_ready()) {
    return 0;
  }
  
  float weight = scale.get_units(3); // Average of 3 readings
  
  // Only return valid weights
  if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
    return weight;
  }
  
  return 0;
}

// ═══════════════════════════════════════════════════════
// HEIGHT MEASUREMENT (Ultrasonic Sensor)
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
    return 0; // No measurement
  }
  
  // Calculate distance in cm
  // Speed of sound = 343 m/s = 0.0343 cm/µs
  float distance = duration * 0.034 / 2.0;
  
  // Calculate height: sensor height - distance to head
  float height = SENSOR_HEIGHT_CM - distance;
  
  // Validate range
  if (height < MIN_VALID_HEIGHT || height > MAX_VALID_HEIGHT) {
    return 0;
  }
  
  return height;
}

/*
 * ═══════════════════════════════════════════════════════
 * CALIBRATION INSTRUCTIONS FOR 2 LOAD CELLS
 * ═══════════════════════════════════════════════════════
 * 
 * Since you're using only 2 load cells instead of 4,
 * the calibration factor will be approximately HALF
 * of what you'd use with 4 cells.
 * 
 * STEPS:
 * 
 * 1. Upload this sketch with LOADCELL_CALIBRATION_FACTOR = -5400.0
 * 
 * 2. Open Serial Monitor (9600 baud)
 * 
 * 3. Note the weight reading when scale is empty (should be ~0)
 * 
 * 4. Stand on the scale (your actual weight = 77 kg)
 * 
 * 5. Note the displayed weight (let's call it "X kg")
 * 
 * 6. Calculate new calibration factor:
 *    New Factor = (X / 77) * (-5400)
 * 
 *    Example: If it shows 40 kg when you're actually 77 kg:
 *    New Factor = (40 / 77) * (-5400) = -2805
 * 
 * 7. Update LOADCELL_CALIBRATION_FACTOR in the code
 * 
 * 8. Re-upload and test again
 * 
 * ═══════════════════════════════════════════════════════
 * NOTES FOR 2-CELL SETUP:
 * ═══════════════════════════════════════════════════════
 * 
 * - Maximum capacity: ~100-150 kg (2x50kg cells)
 * - Less stable than 4 cells (person must stand centered)
 * - Cheaper and simpler wiring
 * - Good enough for BMI measurement system
 * 
 * POSITION THE 2 LOAD CELLS:
 * - Front left and front right (best for forward-facing)
 * - OR left and right on same horizontal line
 * - Person should stand with feet centered over the cells
 * 
 */
