import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory pending command store
// The bridge polls GET to consume it; the UI posts via POST to set it.
let pendingCommand: { cmd: string; setAt: number } | null = null;

// POST - Web UI sets a calibration command
// Body: { cmd: "TARE" } or { cmd: "CALIBRATE", weight: 50.0 }
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();
    const { cmd, weight } = body;

    if (!cmd || !['TARE', 'CALIBRATE'].includes(cmd)) {
      return NextResponse.json({ success: false, message: 'Invalid command. Use TARE or CALIBRATE.' }, { status: 400 });
    }

    if (cmd === 'CALIBRATE') {
      const w = parseFloat(weight);
      if (!w || w <= 0 || w > 500) {
        return NextResponse.json({ success: false, message: 'Weight must be a positive number up to 500 kg.' }, { status: 400 });
      }
      pendingCommand = { cmd: `CALIBRATE:${w.toFixed(3)}`, setAt: Date.now() };
    } else {
      pendingCommand = { cmd: 'TARE', setAt: Date.now() };
    }

    return NextResponse.json({ success: true, message: 'Command queued.', cmd: pendingCommand.cmd });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Bridge polls for a pending command (consumes it atomically)
export async function GET() {
  if (!pendingCommand) {
    return NextResponse.json({ success: true, pending: false });
  }

  // Auto-expire commands older than 30 seconds to avoid stale execution
  if (Date.now() - pendingCommand.setAt > 30000) {
    pendingCommand = null;
    return NextResponse.json({ success: true, pending: false });
  }

  const cmd = pendingCommand.cmd;
  pendingCommand = null; // Consume — execute only once
  return NextResponse.json({ success: true, pending: true, cmd });
}

// DELETE - Cancel any pending command (used by UI reset)
export async function DELETE() {
  pendingCommand = null;
  return NextResponse.json({ success: true, message: 'Pending command cleared.' });
}
