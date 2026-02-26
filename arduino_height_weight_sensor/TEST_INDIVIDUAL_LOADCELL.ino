/*
 * Test Individual Load Cell
 * 
 * This code tests ONE load cell at a time to identify dead/faulty cells
 * 
 * Wiring for SINGLE load cell test:
 * 
 * Load Cell (Black/White/Blue):
 *   White -> HX711 E+
 *   Black -> HX711 E-
 *   Blue  -> HX711 A+
 *   (Leave A- disconnected OR connect to E-)
 * 
 * HX711 -> Arduino:
 *   VCC -> 5V
 *   GND -> GND
 *   DT  -> Pin 3
 *   SCK -> Pin 2
 */

#include "HX711.h"

#define LOADCELL_DOUT_PIN 3
#define LOADCELL_SCK_PIN 2

HX711 scale;

void setup() {
  Serial.begin(9600);
  Serial.println("========================================");
  Serial.println("Individual Load Cell Test");
  Serial.println("========================================");
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  if (scale.is_ready()) {
    Serial.println("✓ HX711 detected!");
    Serial.println("Taring... Please wait...");
    scale.set_scale(1.0); // Use factor of 1 for raw readings
    scale.tare();
    Serial.println("✓ Ready! Apply pressure to the load cell.");
    Serial.println("You should see numbers change.");
    Serial.println("========================================");
  } else {
    Serial.println("✗ HX711 NOT detected! Check wiring.");
  }
}

void loop() {
  if (scale.is_ready()) {
    long reading = scale.get_units(5); // Average of 5 readings
    
    Serial.print("Raw Reading: ");
    Serial.print(reading);
    
    if (abs(reading) > 1000) {
      Serial.println(" ← LOAD CELL IS WORKING! ✓");
    } else {
      Serial.println(" (No pressure detected)");
    }
  } else {
    Serial.println("HX711 not ready");
  }
  
  delay(500);
}

/*
 * HOW TO USE THIS TEST:
 * 
 * 1. Connect ONLY Load Cell 1:
 *    - White to E+
 *    - Black to E-
 *    - Blue to A+
 *    - Upload this code
 *    - Apply pressure to LC1
 *    - You should see numbers change
 * 
 * 2. If LC1 works, disconnect it and test LC2 the same way
 * 
 * 3. Test LC3 the same way
 * 
 * 4. Test LC4 the same way
 * 
 * RESULTS:
 * - If a load cell shows NO reading change when pressed → DEAD
 * - If a load cell shows numbers changing → WORKING
 * 
 * Once you identify which cells work, only use the working ones!
 */
