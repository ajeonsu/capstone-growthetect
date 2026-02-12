import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

// Store latest RFID scan in memory
let latestRFIDScan = {
  uid: '',
  timestamp: 0,
  student_id: null,
  student_name: ''
};

// POST - Receive RFID UID from Arduino bridge
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate data
    if (!data.uid) {
      return NextResponse.json({
        success: false,
        message: 'Missing RFID UID'
      }, { status: 400 });
    }
    
    const uid = data.uid.trim();
    
    console.log('📡 Received RFID scan:', uid);
    
    // Look up student by RFID UID
    const supabase = getSupabaseClient();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, middle_name, lrn, grade_level')
      .eq('rfid_uid', uid)
      .single();
    
    if (error || !student) {
      console.log('⚠️ RFID UID not found in database:', uid);
      
      // Store anyway for manual registration
      latestRFIDScan = {
        uid,
        timestamp: Date.now(),
        student_id: null,
        student_name: 'Unknown - Not Registered'
      };
      
      return NextResponse.json({
        success: true,
        found: false,
        message: 'RFID card not registered',
        data: latestRFIDScan
      });
    }
    
    // Student found!
    const studentName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
    
    latestRFIDScan = {
      uid,
      timestamp: Date.now(),
      student_id: student.id,
      student_name: studentName
    };
    
    console.log(`✅ Student found: ${studentName} (ID: ${student.id})`);
    
    return NextResponse.json({
      success: true,
      found: true,
      message: 'Student found',
      data: {
        ...latestRFIDScan,
        student
      }
    });
  } catch (error: any) {
    console.error('Error processing RFID scan:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

// GET - Retrieve latest RFID scan
export async function GET(request: NextRequest) {
  try {
    // Check if data is fresh (less than 10 seconds old)
    const age = Date.now() - latestRFIDScan.timestamp;
    const isFresh = age < 10000; // 10 seconds
    
    return NextResponse.json({
      success: true,
      data: latestRFIDScan,
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
