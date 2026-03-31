'use client';

import { useState, useEffect, useRef } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { AlertModal } from '@/components/ui/Modal';

type CalibStatus = 'idle' | 'waiting' | 'tare_done' | 'calib_done' | 'error';

export default function MaintenancePage() {
  // Arduino connection state
  const [connected, setConnected] = useState(false);
  const [liveWeight, setLiveWeight] = useState<number | null>(null);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  // Tare state
  const [taring, setTaring] = useState(false);
  const [tareStatus, setTareStatus] = useState<'idle' | 'waiting' | 'done' | 'error'>('idle');

  // Calibration state
  const [knownWeight, setKnownWeight] = useState('');
  const [calibrating, setCalibrating] = useState(false);
  const [calibStatus, setCalibStatus] = useState<CalibStatus>('idle');
  const [calibFactor, setCalibFactor] = useState<number | null>(null);
  const [calibError, setCalibError] = useState('');

  // Alert modal
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' | 'delete'; title?: string }>({ open: false, message: '', type: 'info' });
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' | 'delete' = 'info', title?: string) =>
    setAlertModal({ open: true, message, type, title });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const resultPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll Arduino connection + live data every 2 s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/arduino-bridge', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setConnected(data.connected);
          if (data.isFresh) {
            setLiveWeight(data.data?.weight ?? null);
            setLiveHeight(data.data?.height ?? null);
            setLastSeen(data.data?.timestamp ?? null);
          } else {
            setLiveWeight(null);
            setLiveHeight(null);
          }
        }
      } catch { /* silent */ }
    };
    poll();
    pollingRef.current = setInterval(poll, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Poll calibration result while an operation is in progress
  useEffect(() => {
    if (!taring && calibStatus !== 'waiting') {
      if (resultPollingRef.current) clearInterval(resultPollingRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch('/api/calibration-result', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;
        const result = data.result;

        if (result.status === 'tare_done') {
          setTaring(false);
          setTareStatus('done');
          await fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
          if (resultPollingRef.current) clearInterval(resultPollingRef.current);
        } else if (result.status === 'calib_done') {
          setCalibrating(false);
          setCalibStatus('calib_done');
          setCalibFactor(result.factor);
          await fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
          if (resultPollingRef.current) clearInterval(resultPollingRef.current);
        } else if (result.status === 'error') {
          setTaring(false);
          setCalibrating(false);
          if (taring) setTareStatus('error');
          else setCalibStatus('error');
          setCalibError(result.message || 'Unknown error');
          await fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
          if (resultPollingRef.current) clearInterval(resultPollingRef.current);
        }
      } catch { /* silent */ }
    };

    resultPollingRef.current = setInterval(poll, 1000);
    return () => { if (resultPollingRef.current) clearInterval(resultPollingRef.current); };
  }, [taring, calibStatus]);

  const handleTare = async () => {
    if (!connected) { showAlert('Arduino is not connected. Please start the bridge and ensure the Arduino is plugged in.', 'warning'); return; }
    // Reset result store before sending command
    await fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
    setTareStatus('waiting');
    setTaring(true);

    const res = await fetch('/api/calibration-command', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'TARE' }),
    });
    const data = await res.json();
    if (!data.success) {
      setTaring(false);
      setTareStatus('error');
      setCalibError(data.message || 'Failed to queue tare command.');
    }
  };

  const handleCalibrate = async () => {
    const w = parseFloat(knownWeight);
    if (!w || w <= 0) { showAlert('Please enter a valid known weight in kg.', 'warning'); return; }
    if (!connected) { showAlert('Arduino is not connected. Please start the bridge and ensure the Arduino is plugged in.', 'warning'); return; }

    await fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
    setCalibStatus('waiting');
    setCalibrating(true);
    setCalibFactor(null);
    setCalibError('');

    const res = await fetch('/api/calibration-command', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: 'CALIBRATE', weight: w }),
    });
    const data = await res.json();
    if (!data.success) {
      setCalibrating(false);
      setCalibStatus('error');
      setCalibError(data.message || 'Failed to queue calibration command.');
    }
  };

  const resetCalibration = () => {
    setCalibStatus('idle');
    setCalibFactor(null);
    setCalibError('');
    setKnownWeight('');
    fetch('/api/calibration-command', { method: 'DELETE', credentials: 'include' });
    fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
  };

  const resetTare = () => {
    setTareStatus('idle');
    fetch('/api/calibration-command', { method: 'DELETE', credentials: 'include' });
    fetch('/api/calibration-result', { method: 'DELETE', credentials: 'include' });
  };

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <NutritionistSidebar />

      <main className="flex-1 flex flex-col md:ml-60 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Maintenance</h1>
            <p className="text-xs text-slate-500 mt-0.5">Arduino sensor calibration and system tools</p>
          </div>
        </div>

        <div className="p-6 space-y-6 max-w-3xl mx-auto w-full">

          {/* Connection Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Arduino Status
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${connected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Connected' : 'Disconnected'}
              </div>
              {connected && liveWeight !== null && (
                <div className="flex gap-3 text-sm text-slate-600">
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg">
                    Weight: <span className="font-bold text-slate-800">{liveWeight.toFixed(2)} kg</span>
                  </span>
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg">
                    Height: <span className="font-bold text-slate-800">{liveHeight?.toFixed(1)} cm</span>
                  </span>
                  {lastSeen && <span className="text-slate-400 text-xs self-center">{timeAgo(lastSeen)}</span>}
                </div>
              )}
              {!connected && (
                <p className="text-xs text-slate-500">Start the Arduino bridge script and ensure the device is plugged in via USB.</p>
              )}
            </div>
          </div>

          {/* Step 1 — Tare */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <h2 className="text-sm font-bold text-slate-700">Zero / Tare the Scale</h2>
                <p className="text-xs text-slate-500 mt-0.5">Remove all weight from the scale, then click "Zero the Scale". The Arduino will reset the baseline reading to 0.</p>
              </div>
            </div>

            {tareStatus === 'idle' && (
              <button
                onClick={handleTare}
                disabled={taring}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#1a3a6c' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Zero the Scale
              </button>
            )}

            {tareStatus === 'waiting' && (
              <div className="flex items-center gap-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending TARE command to Arduino... waiting for confirmation.
              </div>
            )}

            {tareStatus === 'done' && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Scale zeroed successfully! You can now proceed to calibration.
                </div>
                <button onClick={resetTare} className="text-xs text-green-600 hover:text-green-800 font-medium ml-4">Reset</button>
              </div>
            )}

            {tareStatus === 'error' && (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tare failed: {calibError || 'Unknown error'}
                </div>
                <button onClick={resetTare} className="text-xs text-red-600 hover:text-red-800 font-medium ml-4">Retry</button>
              </div>
            )}
          </div>

          {/* Step 2 — Calibrate */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <h2 className="text-sm font-bold text-slate-700">Calibrate Weight Sensor</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Place a known-weight object on the scale (e.g. a 5 kg weight), enter that value below, then click "Start Calibration". 
                  The Arduino will calculate and save the calibration factor to EEPROM automatically.
                </p>
              </div>
            </div>

            {calibStatus === 'idle' && (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Known Weight (kg)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="200"
                    value={knownWeight}
                    onChange={(e) => setKnownWeight(e.target.value)}
                    placeholder="e.g. 5.0"
                    className="w-36 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  onClick={handleCalibrate}
                  disabled={!knownWeight || parseFloat(knownWeight) <= 0}
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition disabled:opacity-40 flex items-center gap-2"
                  style={{ background: '#16a34a' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Start Calibration
                </button>
              </div>
            )}

            {calibStatus === 'waiting' && (
              <div className="flex items-center gap-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending CALIBRATE command to Arduino... waiting for confirmation.
              </div>
            )}

            {calibStatus === 'calib_done' && calibFactor !== null && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-semibold mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Calibration complete! Factor saved to Arduino EEPROM.
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    New calibration factor: <span className="font-bold font-mono">{calibFactor.toFixed(2)}</span>
                    <br />The scale will now use this factor for all future weight measurements.
                  </div>
                </div>
                <button onClick={resetCalibration} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                  Calibrate again
                </button>
              </div>
            )}

            {calibStatus === 'error' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Calibration failed: {calibError || 'Unknown error'}
                </div>
                <button onClick={resetCalibration} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* How-to Guide */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Calibrate the Scale
            </h2>
            <ol className="space-y-2 text-sm text-slate-600 list-none">
              {[
                'Make sure the Arduino bridge is running and the device shows "Connected" above.',
                'Remove everything from the scale platform so it is completely empty.',
                'Click "Zero the Scale" (Step 1) and wait for the "Scale zeroed successfully" confirmation.',
                'Place a known-weight object on the scale (a calibrated weight, a bag of rice with a known weight, etc.).',
                'Enter the exact weight of that object in the "Known Weight" field.',
                'Click "Start Calibration" (Step 2) and wait for the confirmation.',
                'The new calibration factor is saved directly to the Arduino EEPROM — it will persist even after power off.',
                'Remove the calibration object and verify the live weight reading shows 0 (or near 0) with nothing on the scale.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

          </div>


        </div>
      </main>

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal(m => ({ ...m, open: false }))}
        message={alertModal.message}
        type={alertModal.type}
        title={alertModal.title}
      />
    </div>
  );
}
