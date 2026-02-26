/*
 * GROWTHetect - Arduino Height + Weight (4 Load Cells - Alternating Polarity)
 * 
 * This version handles load cells with OPPOSITE POLARITIES
 * Common in bathroom scales where LC1+LC2 and LC3+LC4 have reversed signals
 * 
 * WIRING FOR ALTERNATING POLARITY LOAD CELLS:
 * 
 * Option A - All Blues to A+ (Parallel):
 *   E+ ← All WHITE wires (LC1, LC2, LC3, LC4)
 *   E- ← All BLACK wires (LC1, LC2, LC3, LC4)
 *   A+ ← All BLUE wires (LC1, LC2, LC3, LC4)
 *   A- ← Bridge to E- (use a jumper wire)
 * 
 * Option B - Diagonal Pairing:
 *   E+ ← All WHITE wires
 *   E- ← All BLACK wires
 *   A+ ← LC1 Blue + LC4 Blue (diagonal corners)
 *   A- ← LC2 Blue + LC3 Blue (opposite diagonal)
 * 
 * Option C - Front/Back Pairing:
 *   E+ ← All WHITE wires
 *   E- ← All BLACK wires
 *   A+ ← LC1 Blue + LC2 Blue (front)
 *   A- ← LC3 Blue + LC4 Blue (back)
 *   Then connect small resistor (1-10kΩ) between A+ and A-
 */

#include "HX711.h"

// ═══════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════

#define TRIG_PIN 9
#define ECHO_PIN 10
#define LOADCELL_DOUT_PIN 3
#define LOADCELL_SCK_PIN 2

// ═══════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════

// Try these different calibration factors based on wiring:
// Parallel config (all blues to A+): Try -21600.0 to -43200.0
// Diagonal config: Try -10800.0 to -21600.0
// Front/Back with resistor: Try -7200.0 to -14400.0

const float LOADCELL_CALIBRATION_FACTOR = -21600.0; // Start here for parallel config
const float SENSOR_HEIGHT_CM = 200.0;

const float MIN_VALID_WEIGHT = 5.0;
const float MAX_VALID_WEIGHT = 200.0;
const float MIN_VALID_HEIGHT = 50.0;
const float MAX_VALID_HEIGHT = 200.0;

const int NUM_READINGS = 5;

// ═══════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════

HX711 scale;
float weightReadings[NUM_READINGS];
float heightReadings[NUM_READINGS];
int readIndex = 0;

// ═══════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════

void setup() {
  Serial.begin(9600);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(LOADCELL_CALIBRATION_FACTOR);
  scale.tare();
  
  for (int i = 0; i < NUM_READINGS; i++) {
    weightReadings[i] = 0;
    heightReadings[i] = 0;
  }
  
  delay(1000);
  
  Serial.println("========================================");
  Serial.println("GROWTHetect - 4 Load Cells (All Working)");
  Serial.println("========================================");
  Serial.println("Configuration: Parallel (All blues to A+)");
  Serial.print("Sensor height: ");
  Serial.print(SENSOR_HEIGHT_CM);
  Serial.println(" cm");
  Serial.println("Bridge Mode: Active");
  Serial.println("========================================");
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════

void loop() {
  float weight = measureWeight();
  float height = measureHeight();
  
  weightReadings[readIndex] = weight;
  heightReadings[readIndex] = height;
  readIndex = (readIndex + 1) % NUM_READINGS;
  
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
  
  float outputWeight = 0.0;
  float outputHeight = 0.0;
  
  if (avgWeight >= MIN_VALID_WEIGHT && avgWeight <= MAX_VALID_WEIGHT) {
    outputWeight = avgWeight;
  }
  
  if (avgHeight >= MIN_VALID_HEIGHT && avgHeight <= MAX_VALID_HEIGHT) {
    outputHeight = avgHeight;
  }
  
  // Debug output
  Serial.print("Raw Distance: ");
  Serial.print(SENSOR_HEIGHT_CM - height, 1);
  Serial.print(" cm | Height: ");
  Serial.print(avgHeight, 1);
  Serial.print(" cm | Weight: ");
  Serial.print(avgWeight, 1);
  Serial.println(" kg");
  
  // Bridge output
  Serial.print("W:");
  Serial.print(outputWeight, 1);
  Serial.print(",H:");
  Serial.println(outputHeight, 1);
  
  if (outputWeight > 0 || outputHeight > 0) {
    Serial.println("✓ VALID MEASUREMENT");
  }
  
  Serial.println("---");
  
  delay(500);
}

// ═══════════════════════════════════════════════════════
// MEASUREMENT FUNCTIONS
// ═══════════════════════════════════════════════════════

float measureWeight() {
  if (!scale.is_ready()) {
    return 0;
  }
  
  float weight = scale.get_units(3);
  
  if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
    return weight;
  }
  
  return 0;
}

float measureHeight() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  if (duration == 0) {
    return 0;
  }
  
  float distance = duration * 0.034 / 2.0;
  float height = SENSOR_HEIGHT_CM - distance;
  
  if (height < MIN_VALID_HEIGHT || height > MAX_VALID_HEIGHT) {
    return 0;
  }
  
  return height;
}

/*
 * ═══════════════════════════════════════════════════════
 * TROUBLESHOOTING GUIDE
 * ═══════════════════════════════════════════════════════
 * 
 * SYMPTOM: Only LC1+LC2 work when connected to A+
 *          Only LC3+LC4 work when swapped
 * 
 * CAUSE: Alternating polarity in load cell bridge
 * 
 * SOLUTION: Connect ALL blue wires to A+ (parallel config)
 * 
 * WIRING:
 * 1. Twist all 4 WHITE wires → HX711 E+
 * 2. Twist all 4 BLACK wires → HX711 E-
 * 3. Twist all 4 BLUE wires → HX711 A+
 * 4. Use jumper wire: HX711 A- to HX711 E-
 * 
 * CALIBRATION:
 * - Start with factor: -21600 (4x the original)
 * - Test with your weight (77 kg)
 * - Adjust factor accordingly
 * 
 * If readings are still wrong, try diagonal pairing:
 * - A+ ← LC1 Blue + LC4 Blue
 * - A- ← LC2 Blue + LC3 Blue
 * 
 * ═══════════════════════════════════════════════════════
 */
