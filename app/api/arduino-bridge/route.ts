import { NextRequest, NextResponse } from 'next/server';

// Store latest Arduino data in memory
// Note: This is a simple in-memory store. In production, you might want Redis or similar
let latestArduinoData = {
  weight: 0,
  height: 0,
  timestamp: 0,
  source: 'arduino_bridge'
};

// POST - Receive data from bridge
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate data
    if (data.height === undefined || data.height === null) {
      return NextResponse.json({
        success: false,
        message: 'Missing height'
      }, { status: 400 });
    }
    
    // Validate ranges
    // TESTING MODE: Allow weight = 0 for ultrasonic-only testing
    if (data.weight !== undefined && data.weight !== null && (data.weight < 0 || data.weight > 200)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid weight range (0-200 kg)'
      }, { status: 400 });
    }
    
    if (data.height < 50 || data.height > 200) {
      return NextResponse.json({
        success: false,
        message: 'Invalid height range (50-200 cm)'
      }, { status: 400 });
    }
    
    // Store data
    latestArduinoData = {
      weight: parseFloat(data.weight),
      height: parseFloat(data.height),
      timestamp: Date.now(),
      source: data.source || 'arduino_bridge'
    };
    
    console.log('📡 Received Arduino data:', latestArduinoData);
    
    return NextResponse.json({
      success: true,
      message: 'Data received',
      data: latestArduinoData
    });
  } catch (error: any) {
    console.error('Error receiving Arduino data:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

// GET - Retrieve latest data
export async function GET(request: NextRequest) {
  try {
    // Check if data is fresh (less than 5 seconds old)
    const age = Date.now() - latestArduinoData.timestamp;
    const isFresh = age < 5000;
    
    return NextResponse.json({
      success: true,
      data: latestArduinoData,
      dataAge: age,
      isFresh,
      connected: isFresh
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
