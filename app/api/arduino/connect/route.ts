import { NextRequest, NextResponse } from 'next/server';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

let port: SerialPort | null = null;
let parser: ReadlineParser | null = null;
let latestData = {
  weight: 0,
  height: 0,
  timestamp: Date.now()
};

// Function to find Arduino port
async function findArduinoPort() {
  const ports = await SerialPort.list();
  
  // Look for common Arduino identifiers
  const arduinoPort = ports.find(port => 
    port.manufacturer?.toLowerCase().includes('arduino') ||
    port.manufacturer?.toLowerCase().includes('ch340') ||
    port.manufacturer?.toLowerCase().includes('ftdi') ||
    port.vendorId === '2341' || // Official Arduino
    port.vendorId === '1a86'    // CH340 chip (common in clones)
  );
  
  return arduinoPort?.path;
}

// Initialize serial connection
async function initializeSerialPort() {
  try {
    if (port && port.isOpen) {
      return { success: true, message: 'Already connected' };
    }

    const portPath = await findArduinoPort();
    
    if (!portPath) {
      // List all available ports for debugging
      const allPorts = await SerialPort.list();
      console.log('Available ports:', allPorts);
      return { 
        success: false, 
        message: 'Arduino not found. Please connect your Arduino.',
        availablePorts: allPorts.map(p => ({ path: p.path, manufacturer: p.manufacturer }))
      };
    }

    port = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: false
    });

    return new Promise((resolve) => {
      port!.open((err) => {
        if (err) {
          console.error('Error opening port:', err);
          resolve({ success: false, message: `Error: ${err.message}` });
          return;
        }

        parser = port!.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        // Listen for data from Arduino
        parser.on('data', (data: string) => {
          try {
            const trimmedData = data.trim();
            console.log('Raw Arduino data:', trimmedData);
            
            // Expected format: "W:45.5,H:165.2"
            if (trimmedData.startsWith('W:') && trimmedData.includes('H:')) {
              const parts = trimmedData.split(',');
              const weight = parseFloat(parts[0].split(':')[1]);
              const height = parseFloat(parts[1].split(':')[1]);
              
              if (!isNaN(weight) && !isNaN(height)) {
                latestData = {
                  weight: Math.round(weight * 10) / 10,
                  height: Math.round(height * 10) / 10,
                  timestamp: Date.now()
                };
                console.log('Updated sensor data:', latestData);
              }
            }
          } catch (error) {
            console.error('Error parsing Arduino data:', error);
          }
        });

        parser.on('error', (err) => {
          console.error('Parser error:', err);
        });

        port!.on('error', (err) => {
          console.error('Serial port error:', err);
        });

        console.log(`Arduino connected on ${portPath}`);
        resolve({ success: true, message: `Connected to Arduino on ${portPath}` });
      });
    });
  } catch (error: any) {
    console.error('Error initializing serial port:', error);
    return { success: false, message: error.message };
  }
}

// GET - Check connection status and get latest data
export async function GET(request: NextRequest) {
  try {
    const isConnected = port && port.isOpen;
    
    if (!isConnected) {
      // Try to auto-connect
      const result = await initializeSerialPort();
      if (!result.success) {
        return NextResponse.json({
          connected: false,
          message: result.message,
          availablePorts: result.availablePorts || []
        });
      }
    }

    // Check if data is stale (older than 5 seconds)
    const isDataFresh = (Date.now() - latestData.timestamp) < 5000;

    return NextResponse.json({
      connected: true,
      data: latestData,
      dataFresh: isDataFresh,
      message: isDataFresh ? 'Receiving data' : 'Connected but no recent data'
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      message: error.message
    }, { status: 500 });
  }
}

// POST - Manually connect to Arduino
export async function POST(request: NextRequest) {
  try {
    const result = await initializeSerialPort();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

// DELETE - Disconnect from Arduino
export async function DELETE(request: NextRequest) {
  try {
    if (port && port.isOpen) {
      await new Promise<void>((resolve) => {
        port!.close(() => {
          port = null;
          parser = null;
          resolve();
        });
      });
      return NextResponse.json({ success: true, message: 'Disconnected from Arduino' });
    }
    return NextResponse.json({ success: true, message: 'Already disconnected' });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
