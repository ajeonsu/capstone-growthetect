/*
 * GROWTHetect - Arduino HEIGHT ONLY Sensor System
 * 
 * Hardware Required:
 * - Arduino Uno/Nano/Mega
 * - HC-SR04 Ultrasonic Sensor (for height measurement)
 * 
 * Connections:
 * 
 * HC-SR04 Ultrasonic Sensor:
 *   VCC  -> Arduino 5V pin
 *   GND  -> Arduino GND pin
 *   TRIG -> Pin 9
 *   ECHO -> Pin 10
 */

// Ultrasonic Sensor Pins
#define TRIG_PIN 9
#define ECHO_PIN 10

// Configuration
const float SENSOR_HEIGHT_CM = 200.0; // Height of ultrasonic sensor from ground in cm
                                       // Adjust this to match your actual setup!

// Smoothing - average last N readings
const int NUM_READINGS = 5;
float heightReadings[NUM_READINGS];
int readIndex = 0;

void setup() {
  Serial.begin(9600);
  
  // Initialize ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Initialize reading array
  for (int i = 0; i < NUM_READINGS; i++) {
    heightReadings[i] = 0;
  }
  
  delay(1000);
  Serial.println("========================================");
  Serial.println("GROWTHetect HEIGHT Sensor System Ready");
  Serial.println("========================================");
  Serial.print("Sensor mounted at: ");
  Serial.print(SENSOR_HEIGHT_CM);
  Serial.println(" cm from ground");
  Serial.println("Measuring heights...");
  Serial.println("Bridge Mode: Sending data to computer");
  Serial.println("========================================");
}

void loop() {
  // Measure height from ultrasonic sensor
  float height = measureHeight();
  
  // Apply smoothing
  heightReadings[readIndex] = height;
  readIndex = (readIndex + 1) % NUM_READINGS;
  
  // Calculate average
  float avgHeight = 0;
  int validReadings = 0;
  for (int i = 0; i < NUM_READINGS; i++) {
    if (heightReadings[i] > 0) {
      avgHeight += heightReadings[i];
      validReadings++;
    }
  }
  
  if (validReadings > 0) {
    avgHeight /= validReadings;
  }
  
  // Print debug information (you can see this in Serial Monitor)
  Serial.print("Raw Distance: ");
  Serial.print(SENSOR_HEIGHT_CM - height, 1);
  Serial.print(" cm | Height: ");
  
  if (avgHeight > 10.0 && avgHeight < SENSOR_HEIGHT_CM) {
    Serial.print(avgHeight, 1);
    Serial.println(" cm ✓");
    
    // Send to bridge in format: W:weight,H:height
    // Weight is 0.0 because we don't have load cell yet
    Serial.print("W:0.0,H:");
    Serial.println(avgHeight, 1);
    
  } else if (height == 0) {
    Serial.println("NO READING (Out of range or no object)");
    // Send zeros to bridge
    Serial.println("W:0.0,H:0.0");
    
  } else {
    Serial.print(avgHeight, 1);
    Serial.println(" cm (Invalid - check sensor position)");
    // Send zeros to bridge
    Serial.println("W:0.0,H:0.0");
  }
  
  Serial.println("---"); // Separator for readability
  
  delay(500); // Read every 500ms
}

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
  
  // Return height (validation done in main loop for better debugging)
  return height;
}

/*
 * SETUP INSTRUCTIONS:
 * 
 * 1. Mount the HC-SR04 ultrasonic sensor at a FIXED HEIGHT
 *    - Use a tripod, mount on ceiling, or attach to a fixed stand
 *    - Make sure it points straight DOWN
 * 
 * 2. Measure the distance from the sensor to the ground in centimeters
 *    - Use a measuring tape
 *    - Be accurate!
 * 
 * 3. Update SENSOR_HEIGHT_CM in the code above with your measurement
 *    - Example: If sensor is 200cm from ground, set SENSOR_HEIGHT_CM = 200.0
 * 
 * 4. Upload this sketch and open Serial Monitor (9600 baud)
 * 
 * 5. Test by placing objects of known height below the sensor
 * 
 * TROUBLESHOOTING:
 * 
 * - If you see "NO READING":
 *   → Check HC-SR04 wiring (VCC, GND, TRIG, ECHO)
 *   → Make sure sensor is powered (some modules have LED indicators)
 *   → Check if anything is blocking the sensor
 *   → Verify object is within range (4cm to 400cm for HC-SR04)
 * 
 * - If height readings are wrong:
 *   → Double-check your SENSOR_HEIGHT_CM value
 *   → Make sure sensor points straight down (not at an angle)
 *   → Avoid measuring shiny or angled surfaces (causes reflections)
 * 
 * - If readings are noisy/jumping:
 *   → Increase NUM_READINGS for more smoothing
 *   → Keep sensor away from other ultrasonic sources
 *   → Make sure USB cable doesn't interfere with sensor
 * 
 * BRIDGE MODE:
 * 
 * This code now sends data in TWO formats:
 * 1. Human-readable debug info (you can see in Serial Monitor)
 * 2. Bridge format: W:0.0,H:165.2 (for the bridge script to read)
 * 
 * When you run START_ARDUINO_BRIDGE.bat, it will read the "W:0.0,H:165.2" lines
 * and send them to your website!
 */
