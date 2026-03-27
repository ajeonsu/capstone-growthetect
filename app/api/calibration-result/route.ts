import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CalibrationResult =
  | { status: 'idle' }
  | { status: 'tare_done'; timestamp: number }
  | { status: 'calib_done'; factor: number; timestamp: number }
  | { status: 'error'; message: string; timestamp: number };

let latestResult: CalibrationResult = { status: 'idle' };

// POST - Bridge reports the calibration outcome
// Body: { status: "tare_done" } | { status: "calib_done", factor: 2450.5 } | { status: "error", message: "..." }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, factor, message } = body;

    if (status === 'tare_done') {
      latestResult = { status: 'tare_done', timestamp: Date.now() };
    } else if (status === 'calib_done') {
      const f = parseFloat(factor);
      if (!f) return NextResponse.json({ success: false, message: 'factor required' }, { status: 400 });
      latestResult = { status: 'calib_done', factor: f, timestamp: Date.now() };
    } else if (status === 'error') {
      latestResult = { status: 'error', message: message || 'Unknown error', timestamp: Date.now() };
    } else {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Web UI polls for the latest calibration result
export async function GET() {
  return NextResponse.json({ success: true, result: latestResult });
}

// DELETE - Reset result to idle (UI uses this to clear old results before a new operation)
export async function DELETE() {
  latestResult = { status: 'idle' };
  return NextResponse.json({ success: true });
}
