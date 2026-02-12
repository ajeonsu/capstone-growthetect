#!/usr/bin/env node

/**
 * Arduino Bridge Server - Localhost & Production Support
 * 
 * This script:
 * 1. Reads sensor data from Arduino via USB
 * 2. Posts data to localhost (dev) or Vercel (production)
 * 3. Supports AUTO mode (tries localhost first, then cloud)
 * 
 * Modes:
 * - AUTO: Tries localhost first, falls back to cloud (default)
 * - LOCAL: Only sends to http://localhost:3000
 * - PRODUCTION: Only sends to Vercel cloud
 * 
 * Usage:
 * - For testing: START_ARDUINO_BRIDGE_LOCAL.bat
 * - For production: START_ARDUINO_BRIDGE_PRODUCTION.bat
 * - For auto mode: START_ARDUINO_BRIDGE.bat
 * 
 * Setup:
 * 1. npm install serialport @serialport/parser-readline node-fetch
 * 2. Run appropriate batch file
 * 3. Keep running during measurement sessions
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fetch = require('node-fetch');

// Configuration
// Environment variable or defaults
const PRODUCTION_URL = 'https://capstone-growthetect.vercel.app/api/arduino-bridge';
const LOCALHOST_URL = 'http://localhost:3000/api/arduino-bridge';
const BAUD_RATE = 9600;

// Determine which URL to use (can set via environment variable)
// Usage: 
//   - For localhost: set API_MODE=local && node arduino-bridge.js
//   - For production: node arduino-bridge.js (default)
const API_MODE = process.env.API_MODE || 'auto'; // 'local', 'production', or 'auto'
let API_URL = PRODUCTION_URL;

// Auto-detect: Try localhost first, fallback to production
let useLocalhost = API_MODE === 'local';
let useProduction = API_MODE === 'production';

let currentData = {
  weight: 0,
  height: 0,
  timestamp: Date.now()
};

// Find Arduino port automatically
async function findArduinoPort() {
  const ports = await SerialPort.list();
  
  const arduinoPort = ports.find(port => 
    port.manufacturer?.toLowerCase().includes('arduino') ||
    port.manufacturer?.toLowerCase().includes('ch340') ||
    port.manufacturer?.toLowerCase().includes('ftdi') ||
    port.vendorId === '2341' ||
    port.vendorId === '1a86'
  );
  
  if (arduinoPort) {
    console.log(`✅ Found Arduino on port: ${arduinoPort.path}`);
    return arduinoPort.path;
  }
  
  console.log('\n📋 Available ports:');
  ports.forEach(port => {
    console.log(`  - ${port.path} (${port.manufacturer || 'Unknown'})`);
  });
  
  return null;
}

// Parse Arduino data format: "W:45.5,H:165.2" or "RFID:ABC123"
function parseArduinoData(data) {
  try {
    const trimmed = data.trim();
    
    // Check for RFID data
    if (trimmed.startsWith('RFID:')) {
      const uid = trimmed.split(':')[1];
      if (uid && uid.length > 0) {
        return { type: 'rfid', uid };
      }
    }
    
    // Check for weight/height data
    if (trimmed.startsWith('W:') && trimmed.includes('H:')) {
      const parts = trimmed.split(',');
      const weight = parseFloat(parts[0].split(':')[1]);
      const height = parseFloat(parts[1].split(':')[1]);
      
      if (!isNaN(weight) && !isNaN(height)) {
        return { type: 'sensor', weight, height };
      }
    }
  } catch (error) {
    // Ignore parse errors
  }
  
  return null;
}

// Send data to API (localhost or production)
async function sendToAPI(data) {
  // Determine URL based on data type
  let endpoint = '';
  let body = {};
  
  if (data.type === 'rfid') {
    // RFID data endpoint
    endpoint = API_MODE === 'local' 
      ? 'http://localhost:3000/api/rfid-scan'
      : 'https://capstone-growthetect.vercel.app/api/rfid-scan';
    body = {
      uid: data.uid,
      timestamp: Date.now(),
      source: 'arduino_bridge'
    };
  } else if (data.type === 'sensor') {
    // Sensor data endpoint
    endpoint = API_MODE === 'local'
      ? 'http://localhost:3000/api/arduino-bridge'
      : 'https://capstone-growthetect.vercel.app/api/arduino-bridge';
    body = {
      weight: data.weight,
      height: data.height,
      timestamp: Date.now(),
      source: 'arduino_bridge'
    };
  }
  
  // Try both localhost and production in auto mode
  const urlsToTry = [];
  
  if (API_MODE === 'local') {
    urlsToTry.push(endpoint);
  } else if (API_MODE === 'production') {
    urlsToTry.push(endpoint);
  } else {
    // Auto mode: Try localhost first, then production
    if (data.type === 'rfid') {
      urlsToTry.push(
        'http://localhost:3000/api/rfid-scan',
        'https://capstone-growthetect.vercel.app/api/rfid-scan'
      );
    } else {
      urlsToTry.push(
        'http://localhost:3000/api/arduino-bridge',
        'https://capstone-growthetect.vercel.app/api/arduino-bridge'
      );
    }
  }
  
  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        timeout: 3000 // 3 second timeout
      });
      
      if (response.ok) {
        const isLocal = url.includes('localhost');
        const location = isLocal ? '🏠 Localhost' : '☁️  Cloud';
        
        if (data.type === 'rfid') {
          console.log(`✅ Sent to ${location}: RFID=${data.uid}`);
        } else {
          console.log(`✅ Sent to ${location}: Weight=${data.weight}kg, Height=${data.height}cm`);
        }
        
        // Remember which one worked for next time
        API_URL = url;
        return true;
      }
    } catch (error) {
      // If localhost fails and we're in auto mode, try production
      if (url.includes('localhost') && urlsToTry.length > 1) {
        continue; // Try next URL
      }
      
      const isLocal = url.includes('localhost');
      const location = isLocal ? 'localhost' : 'cloud';
      console.log(`⚠️ Could not reach ${location}: ${error.message}`);
    }
  }
  
  console.log(`❌ Failed to send data to any endpoint`);
  return false;
}

// Main function
async function startBridge() {
  console.log('\n🌉 Arduino-to-API Bridge Server Starting...\n');
  
  // Show API mode
  if (API_MODE === 'local') {
    console.log('📍 Mode: LOCAL ONLY');
    console.log(`   Target: ${LOCALHOST_URL}\n`);
  } else if (API_MODE === 'production') {
    console.log('📍 Mode: PRODUCTION ONLY');
    console.log(`   Target: ${PRODUCTION_URL}\n`);
  } else {
    console.log('📍 Mode: AUTO (tries localhost first, then cloud)');
    console.log(`   Localhost: ${LOCALHOST_URL}`);
    console.log(`   Cloud: ${PRODUCTION_URL}\n`);
  }
  
  // Find Arduino
  const portPath = await findArduinoPort();
  
  if (!portPath) {
    console.log('\n❌ Arduino not found!');
    console.log('📌 Make sure:');
    console.log('   1. Arduino is plugged in via USB');
    console.log('   2. Arduino sketch is uploaded');
    console.log('   3. Arduino drivers are installed\n');
    process.exit(1);
  }
  
  // Open serial port
  const port = new SerialPort({
    path: portPath,
    baudRate: BAUD_RATE
  });
  
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  
  port.on('open', () => {
    console.log(`✅ Connected to Arduino on ${portPath}`);
    
    if (API_MODE === 'local') {
      console.log(`✅ Posting data to: ${LOCALHOST_URL} (LOCAL)`);
      console.log('\n📡 Bridge is running! Testing locally...');
      console.log('💡 Access your local site at:');
      console.log('   http://localhost:3000\n');
    } else if (API_MODE === 'production') {
      console.log(`✅ Posting data to: ${PRODUCTION_URL} (CLOUD)`);
      console.log('\n📡 Bridge is running! Data will be sent to cloud...');
      console.log('💡 Access your site from any device at:');
      console.log('   https://capstone-growthetect.vercel.app\n');
    } else {
      console.log(`✅ Posting data to: Localhost first, then cloud`);
      console.log('\n📡 Bridge is running! Will auto-detect...');
      console.log('💡 If localhost is running: http://localhost:3000');
      console.log('💡 Otherwise uses cloud: https://capstone-growthetect.vercel.app\n');
    }
    
    console.log('📊 Waiting for sensor data...\n');
  });
  
  // Listen for data from Arduino
  parser.on('data', (data) => {
    const parsedData = parseArduinoData(data);
    
    // TESTING MODE: Accept height-only data (weight can be 0 if no load cell)
    // Send if height is valid, weight is optional
    // Also handle RFID scans
    if (parsedData) {
      if (parsedData.type === 'rfid') {
        // RFID card scanned
        console.log(`🎴 RFID Card Scanned: ${parsedData.uid}`);
        sendToAPI(parsedData);
      } else if (parsedData.type === 'sensor' && parsedData.height > 0) {
        // Height sensor data
        currentData = {
          weight: parsedData.weight,
          height: parsedData.height,
          timestamp: Date.now()
        };
        sendToAPI(parsedData);
      }
    }
  });
  
  port.on('error', (err) => {
    console.error('❌ Serial port error:', err.message);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down bridge...');
    port.close(() => {
      console.log('✅ Bridge stopped. Goodbye!\n');
      process.exit(0);
    });
  });
}

// Start the bridge
startBridge().catch(error => {
  console.error('❌ Failed to start bridge:', error);
  process.exit(1);
});
