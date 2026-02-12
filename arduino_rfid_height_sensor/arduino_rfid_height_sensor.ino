/*
 * GROWTHetect - Arduino RFID + Height Sensor System
 * 
 * Hardware Required:
 * - Arduino Uno/Nano/Mega
 * - HC-SR04 Ultrasonic Sensor (for height measurement)
 * - RC522 RFID Reader Module
 * 
 * Connections:
 * 
 * HC-SR04 Ultrasonic Sensor:
 *   VCC  -> Arduino 5V pin
 *   GND  -> Arduino GND pin
 *   TRIG -> Pin 9
 *   ECHO -> Pin 10
 * 
 * RC522 RFID Reader:
 *   SDA (SS)  -> Pin 10  (or Pin 53 for Mega)
 *   SCK       -> Pin 13
 *   MOSI      -> Pin 11
 *   MISO      -> Pin 12
 *   IRQ       -> Not connected
 *   GND       -> Arduino GND
 *   RST       -> Pin 5
 *   3.3V      -> Arduino 3.3V (NOT 5V!)
 */

#include <SPI.h>
#include <MFRC522.h>

// RFID Pins
#define RST_PIN 5
#define SS_PIN 10

// Ultrasonic Sensor Pins (moved to avoid conflict with SPI)
#define TRIG_PIN 7
#define ECHO_PIN 8

// Create RFID instance
MFRC522 rfid(SS_PIN, RST_PIN);

// Configuration
const float SENSOR_HEIGHT_CM = 200.0; // Height of ultrasonic sensor from ground in cm

// Smoothing - average last N readings
const int NUM_READINGS = 5;
float heightReadings[NUM_READINGS];
int readIndex = 0;

void setup() {
  Serial.begin(9600);
  
  // Initialize SPI bus for RFID
  SPI.begin();
  
  // Initialize RFID reader
  rfid.PCD_Init();
  
  // Initialize ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Initialize reading array
  for (int i = 0; i < NUM_READINGS; i++) {
    heightReadings[i] = 0;
  }
  
  delay(1000);
  Serial.println("========================================");
  Serial.println("GROWTHetect RFID + HEIGHT System Ready");
  Serial.println("========================================");
  Serial.print("Sensor mounted at: ");
  Serial.print(SENSOR_HEIGHT_CM);
  Serial.println(" cm from ground");
  Serial.println("Waiting for RFID card or height measurement...");
  Serial.println("Bridge Mode: Sending data to computer");
  Serial.println("========================================");
}

void loop() {
  // Check for RFID card
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    // Read UID
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) {
        uid += "0";
      }
      uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    
    // Print for debugging
    Serial.print("RFID Card Detected: ");
    Serial.println(uid);
    
    // Send to bridge
    Serial.print("RFID:");
    Serial.println(uid);
    
    // Halt PICC
    rfid.PICC_HaltA();
    // Stop encryption on PCD
    rfid.PCD_StopCrypto1();
    
    delay(1000); // Prevent multiple reads
  }
  
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
  
  // Print debug information
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
  float distance = duration * 0.034 / 2.0;
  
  // Calculate height: sensor height - distance to object
  float height = SENSOR_HEIGHT_CM - distance;
  
  // Return height
  return height;
}
