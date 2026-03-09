'use client';

import { useEffect, useState, useRef } from 'react';
import ModuleLoader from '@/components/ModuleLoader';
import LogoSplash from '@/components/LogoSplash';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { calculateBMI, getBMIStatus } from '@/lib/helpers';
import { AlertModal, ConfirmModal } from '@/components/ui/Modal';

export default function BMITrackingPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [bmiRecords, setBmiRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState('');
  const [hfaStatus, setHfaStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState('');
  const [formError, setFormError] = useState('');

  // Student history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPool, setHistoryPool] = useState<any[]>([]);
  const [deletingBmiId, setDeletingBmiId] = useState<number | null>(null);

  // Notification / confirmation modals
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; type: 'success'|'error'|'warning'|'info'|'delete'; title?: string }>({ open: false, message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; title?: string; onConfirm: () => void; danger?: boolean }>({ open: false, message: '', onConfirm: () => {} });
  const showAlert = (message: string, type: 'success'|'error'|'warning'|'info'|'delete' = 'info', title?: string) => setAlertModal({ open: true, message, type, title });
  const showConfirm = (message: string, onConfirm: () => void, title?: string, danger = false) => setConfirmModal({ open: true, message, title, onConfirm, danger });
  const itemsPerPage = 15;

  // Arduino sensor states
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [arduinoData, setArduinoData] = useState({ weight: 0, height: 0 });
  const [dataFresh, setDataFresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rolling median buffer for height stabilization (last 7 readings)
  const heightBufferRef = useRef<number[]>([]);
  const weightBufferRef = useRef<number[]>([]);
  const BUFFER_SIZE = 7;

  const rollingMedian = (buf: number[]): number => {
    if (buf.length === 0) return 0;
    const sorted = [...buf].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  
  // RFID scanning
  const [rfidInput, setRfidInput] = useState('');
  const [rfidStatus, setRfidStatus] = useState('');
  const rfidInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lockedSensorValuesRef = useRef<{ weight: number; height: number } | null>(null);
  // Debounce timer for filter changes
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Refs used by the global RFID keydown capture (avoid stale closures) ──
  // These mirror state and are updated every render so the document listener
  // always sees the latest values without being re-registered.
  const showModalRef        = useRef(false);
  const selectedStudentRef  = useRef('');
  const rfidInputValueRef   = useRef('');
  // Pointer to the latest handleRfidScan implementation (assigned after definition)
  const handleRfidScanRef   = useRef<(uid: string) => void>(() => {});

  // Success popup state
  const [successPopup, setSuccessPopup] = useState<{
    visible: boolean;
    studentName: string;
    weight: number;
    height: number;
    bmi: number;
  } | null>(null);
  const successAutoCloseRef = useRef<NodeJS.Timeout | null>(null);
  const [successCountdown, setSuccessCountdown] = useState(0);
  const successCountdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStudents();
    loadBMIRecords();
    loadHistoryPool();
  }, []);

  // Keep tracking refs in sync with state (used by global keydown capture)
  useEffect(() => { showModalRef.current = showModal; }, [showModal]);
  useEffect(() => { selectedStudentRef.current = selectedStudent; }, [selectedStudent]);
  useEffect(() => { rfidInputValueRef.current = rfidInput; }, [rfidInput]);

  // Auto-focus RFID input when modal opens
  useEffect(() => {
    if (showModal && rfidInputRef.current) {
      // Focus RFID input immediately when modal opens
      setTimeout(() => {
        rfidInputRef.current?.focus();
        setRfidStatus('Ready to scan RFID card...');
      }, 50);
    } else {
      // Clear RFID input when modal closes
      setRfidInput('');
      setRfidStatus('');
    }
  }, [showModal]);

  // Debounce filter changes — waits 350ms after the last change before fetching
  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
    loadBMIRecords();
    }, 350);
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [search, month, year, grade, status, hfaStatus]);

  // Check Arduino connection and get sensor data
  useEffect(() => {
    if (showModal) {
      checkArduinoConnection();
      // Poll Arduino data every 500ms when modal is open
      intervalRef.current = setInterval(() => {
        fetchArduinoData();
      }, 500);
    } else {
      // Clear interval when modal closes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Also cancel any in-progress autosave countdown
      if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      lockedSensorValuesRef.current = null;
      // Reset sensor buffers so next opening gets a fresh median
      heightBufferRef.current = [];
      weightBufferRef.current = [];
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showModal]);

  // Auto-fill weight and height when Arduino data changes — only after RFID scan
  useEffect(() => {
    // ⛔ Do NOT fill sensor data until a student has been identified via RFID
    if (showModal && arduinoConnected && dataFresh && selectedStudent) {
      const weightInput = document.getElementById('weight') as HTMLInputElement;
      const heightInput = document.getElementById('height') as HTMLInputElement;
      
      // Fill height from ultrasonic sensor
      if (heightInput && arduinoData.height > 0) {
        heightInput.value = arduinoData.height.toFixed(1);
        
        // Only fill weight and calculate BMI if load cell is working
        if (weightInput && arduinoData.weight > 0) {
          weightInput.value = Math.round(arduinoData.weight).toString();
          handleCalculateBMI(arduinoData.weight, arduinoData.height);
        }
      }
    }
  }, [arduinoData, showModal, arduinoConnected, dataFresh, selectedStudent]);

  // Helper to cancel any running countdown + save timer
  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    lockedSensorValuesRef.current = null;
    setAutoSaveCountdown(0);
  };

  // Auto-save when student is selected and Arduino data is ready
  useEffect(() => {
    // Don't interfere if already saving
    if (isSaving) return;

    const hasValidWeight = arduinoData.weight >= 5 && arduinoData.weight <= 200;
    const hasValidHeight = arduinoData.height >= 50 && arduinoData.height <= 200;

    if (
      showModal &&
      arduinoConnected &&
      dataFresh &&
      selectedStudent &&
      hasValidWeight &&
      hasValidHeight
    ) {
      // ── Countdown already running — check tolerance ────────────────────────
      // IMPORTANT: we do NOT use a `return () => cleanup` here because React
      // fires cleanup before every re-run, which would cancel the timer before
      // the tolerance check can protect it.  All timer management is manual via refs.
      if (lockedSensorValuesRef.current) {
        const weightDiff = Math.abs(arduinoData.weight - lockedSensorValuesRef.current.weight);
        const heightDiff = Math.abs(arduinoData.height - lockedSensorValuesRef.current.height);

        if (weightDiff <= 2 && heightDiff <= 4) {
          // Within tolerance — leave the running timer completely alone
          return;
        }

        // Readings shifted too much — cancel and fall through to restart
        if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        lockedSensorValuesRef.current = null;
      } else {
        // No countdown yet — clear any stale timers
        if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      }

      // ── Lock the current readings and start fresh countdown ────────────────
      lockedSensorValuesRef.current = {
        weight: arduinoData.weight,
        height: arduinoData.height,
      };

      let countdown = 3;
      setAutoSaveCountdown(countdown);

      // Tick every second
      countdownIntervalRef.current = setInterval(() => {
        countdown--;
        setAutoSaveCountdown(countdown);
        if (countdown <= 0) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        }
      }, 1000);

      // Fire the actual save after 3 s
      autoSaveTimerRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        autoSaveRecord();
        lockedSensorValuesRef.current = null;
      }, 3000);

      // ── NO return-cleanup here — we manage timers manually so React's
      //    cleanup cannot accidentally cancel a running countdown ─────────────
    } else {
      // Conditions not met — cancel everything cleanly
      if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      lockedSensorValuesRef.current = null;
      setAutoSaveCountdown(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, arduinoConnected, dataFresh, selectedStudent, arduinoData.weight, arduinoData.height, isSaving]);

  const autoSaveRecord = async () => {
    // Prefer locked values (stable reading) over live sensor state
    // Weight is rounded to whole number; height keeps 1 decimal
    const weight = Math.round(lockedSensorValuesRef.current?.weight ?? arduinoData.weight);
    const height = lockedSensorValuesRef.current?.height ?? arduinoData.height;

    if (!selectedStudent || !weight || !height) return;

    // Prevent multiple saves
    if (isSaving) return;

    setIsSaving(true);

    // Validate ranges (YZC-516C supports up to 200kg)
    if (weight < 5 || weight > 200 || height < 50 || height > 200) {
      setFormError('Invalid measurements detected');
      setIsSaving(false);
      return;
    }

    // Calculate BMI
    const bmi = calculateBMI(weight, height);
    if (bmi > 100 || bmi < 5) {
      setFormError(`Invalid BMI calculation (${bmi.toFixed(2)})`);
      setIsSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('student_id', selectedStudent);
      formData.append('weight', weight.toString());
      formData.append('height', height.toString());
      formData.append('source', 'manual'); // Database only accepts 'manual' for now

      const response = await fetch('/api/bmi-records', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Fix: coerce both sides to number so find() works correctly
        const found = students.find(s => Number(s.id) === Number(selectedStudent));
        const studentName = found
          ? [found.first_name, found.middle_name, found.last_name].filter(Boolean).join(' ')
          : 'Unknown';

        // Show custom success popup (auto-closes in 5s)
        setSuccessPopup({ visible: true, studentName, weight, height, bmi });
        setSuccessCountdown(5);

        // Countdown ticker
        let cd = 5;
        if (successCountdownRef.current) clearInterval(successCountdownRef.current);
        successCountdownRef.current = setInterval(() => {
          cd--;
          setSuccessCountdown(cd);
          if (cd <= 0) {
            if (successCountdownRef.current) clearInterval(successCountdownRef.current);
          }
        }, 1000);

        // Auto-close after 5s and re-focus RFID for next student
        if (successAutoCloseRef.current) clearTimeout(successAutoCloseRef.current);
        successAutoCloseRef.current = setTimeout(() => {
          setSuccessPopup(null);
          setSuccessCountdown(0);
          setTimeout(() => { rfidInputRef.current?.focus(); }, 50);
        }, 5000);

        // Clear student selection and form data (keep modal open for next student)
        setSelectedStudent('');
        setCalculatedBMI(null);
        setBmiStatus('');
        setAutoSaveCountdown(0);
        setRfidInput('');
        setRfidStatus('🎴 Ready to scan next RFID card...');
        setFormError('');
        setIsSaving(false);

        // Clear input fields
        const weightInput = document.getElementById('weight') as HTMLInputElement;
        const heightInput = document.getElementById('height') as HTMLInputElement;
        if (weightInput) weightInput.value = '';
        if (heightInput) heightInput.value = '';

        // Reload records in background
        loadBMIRecords();
        loadHistoryPool();
        
        // Refocus RFID input for next scan
        setTimeout(() => { rfidInputRef.current?.focus(); }, 50);
      } else {
        setFormError(data.message);
        setIsSaving(false);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setFormError('An error occurred. Please try again.');
      setIsSaving(false);
    }
  };

  // Push a raw sensor reading into the rolling buffer and return the median
  const pushAndSmooth = (rawHeight: number, rawWeight: number) => {
    // Height buffer
    heightBufferRef.current.push(rawHeight);
    if (heightBufferRef.current.length > BUFFER_SIZE) heightBufferRef.current.shift();
    // Weight buffer
    weightBufferRef.current.push(rawWeight);
    if (weightBufferRef.current.length > BUFFER_SIZE) weightBufferRef.current.shift();

    return {
      height: Math.round(rollingMedian(heightBufferRef.current) * 10) / 10, // 1 decimal
      weight: Math.round(rollingMedian(weightBufferRef.current)),            // whole number
    };
  };

  const checkArduinoConnection = async () => {
    try {
      const response = await fetch('/api/arduino-bridge');
      const data = await response.json();
      
      setArduinoConnected(data.connected);
      if (data.connected && data.data) {
        const smoothed = pushAndSmooth(data.data.height, data.data.weight);
        setArduinoData(smoothed);
        setDataFresh(data.dataFresh || data.isFresh);
      }
    } catch (error) {
      console.error('Error checking Arduino connection:', error);
      setArduinoConnected(false);
    }
  };

  const fetchArduinoData = async () => {
    try {
      const response = await fetch('/api/arduino-bridge');
      const data = await response.json();
      
      if (data.connected && data.data) {
        const smoothed = pushAndSmooth(data.data.height, data.data.weight);
        setArduinoData(smoothed);
        setDataFresh(data.dataFresh || data.isFresh);
        setArduinoConnected(true);
      } else {
        setArduinoConnected(false);
        // Clear buffers when disconnected so next connection starts fresh
        heightBufferRef.current = [];
        weightBufferRef.current = [];
      }
    } catch (error) {
      console.error('Error fetching Arduino data:', error);
    }
  };

  // Handle RFID scan input
  const handleRfidScan = async (uid: string) => {
    if (!uid || uid.length < 4) return;
    
    setRfidStatus('🔍 Looking up student...');
    
    try {
      // Look up student by RFID UID
      const response = await fetch(`/api/students`);
      const data = await response.json();
      
      if (data.success) {
        const student = data.students.find((s: any) => 
          s.rfid_uid && s.rfid_uid.toLowerCase() === uid.toLowerCase()
        );
        
        if (student) {
          // Student found!
          setSelectedStudent(student.id.toString());
          setRfidStatus(`✅ Student found: ${student.first_name} ${student.last_name} (Grade ${student.grade_level})`);
          
          // Clear status after 2 seconds and refocus for next scan
          setTimeout(() => {
            setRfidInput('');
            setRfidStatus('🎴 Ready to scan next RFID card...');
            rfidInputRef.current?.focus();
          }, 2000);
        } else {
          // Student not found - show error
          setRfidStatus(`❌ RFID card not registered! UID: ${uid}`);
          setFormError(`RFID card "${uid}" is not registered to any student. Please register this card first in Student Registration.`);
          
          // Play error sound (if browser supports it)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA');
            audio.play().catch(() => {});
          } catch (e) {}
          
          setTimeout(() => {
            setRfidInput('');
            setRfidStatus('🎴 Ready to scan RFID card...');
            setFormError('');
            rfidInputRef.current?.focus();
          }, 4000);
        }
      }
    } catch (error) {
      console.error('Error looking up RFID:', error);
      setRfidStatus('❌ Connection error - Could not look up student');
      setFormError('Network error. Please check your connection and try again.');
      
      setTimeout(() => {
        setRfidInput('');
        setRfidStatus('🎴 Ready to scan RFID card...');
        setFormError('');
        rfidInputRef.current?.focus();
      }, 4000);
    }
  };

  // Keep handleRfidScanRef pointing to the latest implementation after every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleRfidScanRef.current = handleRfidScan; });

  // ── Global keydown capture ─────────────────────────────────────────────────
  // USB RFID scanners act as a keyboard.  If the RFID input has lost focus
  // (e.g. success popup appeared, React re-render stole focus) the scanner's
  // keystrokes go to whichever element owns focus — or nowhere at all.
  // This listener intercepts every keydown on the document while we're waiting
  // for an RFID scan and pipes the characters directly into the RFID input,
  // so NO scan is ever lost regardless of focus state.
  useEffect(() => {
    const captureRfidKeys = (e: KeyboardEvent) => {
      // Only active while the modal is open AND no student is selected yet
      if (!showModalRef.current || selectedStudentRef.current) return;

      const target = e.target as HTMLElement;
      // Already typing inside the RFID input — normal React handler takes over
      if (target === rfidInputRef.current) return;
      // User is deliberately interacting with another text field — don't steal
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const uid = rfidInputValueRef.current.trim();
        if (uid.length > 0) {
          handleRfidScanRef.current(uid);
        }
        rfidInputRef.current?.focus();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Printable character — append to RFID input value
        e.preventDefault();
        const newVal = rfidInputValueRef.current + e.key;
        rfidInputValueRef.current = newVal;   // keep ref in sync immediately
        setRfidInput(newVal);
        rfidInputRef.current?.focus();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const newVal = rfidInputValueRef.current.slice(0, -1);
        rfidInputValueRef.current = newVal;
        setRfidInput(newVal);
        rfidInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', captureRfidKeys);
    return () => document.removeEventListener('keydown', captureRfidKeys);
  }, []); // Intentionally empty — uses refs so it never needs to re-register

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadHistoryPool = async () => {
    try {
      const response = await fetch('/api/bmi-records?all=true', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setHistoryPool(data.records);
      }
    } catch (error) {
      console.error('Error loading history pool:', error);
    }
  };

  const loadBMIRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month && year) {
        // Create a date string in YYYY-MM-DD format (first day of the month)
        const dateStr = `${year}-${month.padStart(2, '0')}-01`;
        params.append('date', dateStr);
      }
      if (grade) params.append('grade', grade);
      if (status) params.append('status', status);
      if (hfaStatus) params.append('hfaStatus', hfaStatus);

      const response = await fetch(`/api/bmi-records?${params}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        setBmiRecords(data.records);
        setCurrentPage(1);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading BMI records:', error);
      setLoading(false);
    }
  };

  const handleCalculateBMI = (weight: number, height: number) => {
    if (weight && height) {
      const bmi = calculateBMI(weight, height);
      const status = getBMIStatus(bmi);
      setCalculatedBMI(bmi);
      setBmiStatus(status);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const weight = parseFloat(formData.get('weight') as string);
    const height = parseFloat(formData.get('height') as string);

    if (!weight || !height) {
      setFormError('Weight and height are required');
      return;
    }

    // Validate weight range (5-200 kg for YZC-516C 200kg load cell)
    if (weight < 5 || weight > 200) {
      setFormError('Weight must be between 5 and 200 kg');
      return;
    }

    // Validate height range (50-200 cm for students)
    if (height < 50 || height > 200) {
      setFormError('Height must be between 50 and 200 cm for students');
      return;
    }

    // Calculate BMI to check if it's reasonable
    const bmi = calculateBMI(weight, height);
    if (bmi > 100 || bmi < 5) {
      setFormError(`Invalid BMI calculation (${bmi.toFixed(2)}). Please check weight and height values.`);
      return;
    }

    try {
      const response = await fetch('/api/bmi-records', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showAlert('BMI recorded successfully', 'success');
        setShowModal(false);
        setCalculatedBMI(null);
        setBmiStatus('');
        loadBMIRecords();
        loadHistoryPool();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Severely Wasted': 'bg-red-100 text-red-800',
      'Wasted': 'bg-orange-100 text-orange-800',
      'Normal': 'bg-green-100 text-green-800',
      'Overweight': 'bg-yellow-100 text-yellow-800',
      'Obese': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const fetchStudentHistory = async (record: any) => {
    setHistoryStudent(record);
    setHistoryRecords([]);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    // Filter from the already-loaded history pool by student_id
    const studentRecords = historyPool
      .filter((r: any) => String(r.student_id) === String(record.student_id))
      .sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
    if (studentRecords.length > 0) {
      setHistoryRecords(studentRecords);
      setHistoryStudent(studentRecords[0]);
    } else {
      // Fallback: fetch from API directly if pool didn't contain this student
      try {
        const response = await fetch(`/api/bmi-records?all=true`, { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          setHistoryPool(data.records);
          const fresh = data.records
            .filter((r: any) => String(r.student_id) === String(record.student_id))
            .sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
          if (fresh.length > 0) {
            setHistoryRecords(fresh);
            setHistoryStudent(fresh[0]);
          }
        }
      } catch (e) {
        console.error('Error fetching student history:', e);
      }
    }
    setHistoryLoading(false);
  };

  const handleDeleteBmiRecord = (recordId: number) => {
    showConfirm(
      'Delete this BMI record permanently? This cannot be undone.',
      async () => {
        setDeletingBmiId(recordId);
        try {
          const res = await fetch(`/api/bmi-records?id=${recordId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success) {
            setHistoryRecords(prev => prev.filter(r => r.id !== recordId));
            setHistoryPool(prev => prev.filter(r => r.id !== recordId));
          } else {
            showAlert(data.message || 'Failed to delete record.', 'error');
          }
        } catch {
          showAlert('Network error while deleting record.', 'error');
        } finally {
          setDeletingBmiId(null);
        }
      },
      'Delete Record',
      true
    );
  };

  const getHFAStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Severely Stunted': 'bg-red-100 text-red-800',
      'Stunted': 'bg-orange-100 text-orange-800',
      'Normal': 'bg-green-100 text-green-800',
      'Tall': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const paginatedRecords = bmiRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(bmiRecords.length / itemsPerPage);
  const startRecord = bmiRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, bmiRecords.length);

  if (loading) return <LogoSplash />;

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-60 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">BMI Tracking</h1>
            <p className="text-xs text-slate-500 mt-0.5">Body Mass Index &amp; Height-for-Age records</p>
          </div>
            <button
              onClick={() => {
                setShowModal(true);
                if (students.length === 0) loadStudents();
              }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition"
            style={{ background: '#16a34a' }}
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record BMI
            </button>
          </div>

        <div className="p-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Search Student</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    clearTimeout((window as any).searchTimeout);
                    (window as any).searchTimeout = setTimeout(() => setSearch(e.target.value), 500);
                  }}
                  placeholder="Search by name..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Grade Level</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  <option value="0">Kinder</option>
                  <option value="1">Grade 1</option>
                  <option value="2">Grade 2</option>
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                </select>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">BMI Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Severely Wasted">Severely Wasted</option>
                  <option value="Wasted">Wasted</option>
                  <option value="Normal">Normal</option>
                  <option value="Overweight">Overweight</option>
                  <option value="Obese">Obese</option>
                </select>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">HFA Status</label>
                <select
                  value={hfaStatus}
                  onChange={(e) => setHfaStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Severely Stunted">Severely Stunted</option>
                  <option value="Stunted">Stunted</option>
                  <option value="Normal">Normal</option>
                  <option value="Tall">Tall</option>
                </select>
              </div>
            </div>
          </div>

          {/* BMI Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#1a3a6c' }}>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Student</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Age</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">Height (cm)</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">BMI</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">BMI Status</th>
                    <th className="px-4 py-2.5 text-left text-sm font-semibold text-white uppercase tracking-wider">HFA Status</th>
                    <th className="px-4 py-2.5 text-center text-sm font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center">
                        <ModuleLoader text="Loading BMI records..." size="sm" />
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No BMI records found
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const recordDate = new Date(record.measured_at).toLocaleDateString();
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-base text-slate-700">{recordDate}</td>
                          <td className="px-4 py-2.5 text-base font-medium text-slate-800">
                            {record.first_name} {record.last_name}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-sm font-semibold rounded-full ${record.gender === 'M' || record.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                              {record.gender === 'M' || record.gender === 'Male' ? 'Male' : 'Female'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-base text-slate-700">{record.grade_level === 0 || record.grade_level === '0' ? 'Kinder' : `Grade ${record.grade_level}`}</td>
                          <td className="px-4 py-2.5 text-base text-slate-700">{record.age}</td>
                          <td className="px-4 py-2.5 text-base text-slate-700">{parseFloat(record.weight).toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-base text-slate-700">{parseFloat(record.height).toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-base font-semibold text-slate-800">{parseFloat(record.bmi).toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-sm font-semibold rounded-full ${getStatusColor(record.bmi_status)}`}>
                              {record.bmi_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-sm font-semibold rounded-full ${getHFAStatusColor(record.height_for_age_status)}`}>
                              {record.height_for_age_status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => fetchStudentHistory(record)}
                              className="px-3 py-1 text-xs font-semibold text-white rounded-lg transition hover:opacity-90"
                              style={{ background: '#1a3a6c' }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {bmiRecords.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700">{startRecord}</span> to <span className="font-medium text-slate-700">{endRecord}</span> of{' '}
                  <span className="font-medium text-slate-700">{bmiRecords.length}</span> records
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={currentPage !== 1 ? { background: '#1a3a6c' } : {}}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((i) => i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))
                    .map((i, idx, arr) => (
                      <div key={i} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-1 text-xs text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                            i === currentPage
                              ? 'text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          style={i === currentPage ? { background: '#1a3a6c' } : {}}
                        >
                          {i}
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                      currentPage === totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={currentPage !== totalPages ? { background: '#1a3a6c' } : {}}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student BMI History Modal */}
      {showHistoryModal && historyStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-auto flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200" style={{ background: '#1a3a6c', borderRadius: '0.75rem 0.75rem 0 0' }}>
              <h3 className="text-base font-bold text-white">Student BMI Details</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/70 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 flex-1">
              {/* Student Info Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
                <div>
                  <p className="text-xs text-slate-500">UID</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.rfid_uid || 'No UID'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.first_name} {historyStudent.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Age</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.age} years old</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gender</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.gender === 'M' || historyStudent.gender === 'Male' ? 'Male' : 'Female'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Grade Level</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.grade_level === 0 || historyStudent.grade_level === '0' ? 'Kinder' : `Grade ${historyStudent.grade_level}`}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Section</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.section || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Parent/Guardian</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.parent_guardian || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contact Number</p>
                  <p className="text-sm font-semibold text-slate-800">{historyStudent.contact_number || 'N/A'}</p>
                </div>
              </div>

              {/* BMI History Table */}
              <h4 className="text-sm font-bold text-slate-800 mb-3">BMI History</h4>
              {historyLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading history...</p>
              ) : historyRecords.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No records found.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">Weight</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">Height</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">BMI</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">BMI Status</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">HFA Status</th>
                        <th className="px-4 py-2 text-xs font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-700">{new Date(r.measured_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-slate-700">{parseFloat(r.weight).toFixed(1)} kg</td>
                          <td className="px-4 py-2 text-slate-700">{parseFloat(r.height).toFixed(1)} cm</td>
                          <td className="px-4 py-2 font-semibold text-slate-800">{parseFloat(r.bmi).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(r.bmi_status)}`}>
                              {r.bmi_status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getHFAStatusColor(r.height_for_age_status)}`}>
                              {r.height_for_age_status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteBmiRecord(r.id)}
                              disabled={deletingBmiId === r.id}
                              title="Delete record"
                              className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                            >
                              {deletingBmiId === r.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition hover:opacity-90"
                style={{ background: '#1a3a6c' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertModal.open} onClose={() => setAlertModal(m => ({ ...m, open: false }))} message={alertModal.message} type={alertModal.type} title={alertModal.title} />
      <ConfirmModal isOpen={confirmModal.open} onClose={() => setConfirmModal(m => ({ ...m, open: false }))} onConfirm={confirmModal.onConfirm} message={confirmModal.message} title={confirmModal.title} danger={confirmModal.danger} />

      {/* Record BMI Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">Record BMI Measurement</h3>
              
              {/* Arduino Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${arduinoConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className={`text-sm font-medium ${arduinoConnected ? 'text-green-600' : 'text-gray-500'}`}>
                  {arduinoConnected ? (dataFresh ? 'Arduino Connected' : 'Arduino Connected (No Data)') : 'Arduino Not Connected'}
                </span>
              </div>
            </div>

            {/* Arduino Info Banner */}
            {arduinoConnected && dataFresh && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-green-700 font-medium">
                    {arduinoData.weight > 0 ? 
                      '📡 Arduino sensors active - Weight and height will auto-fill from sensors' :
                      '📏 Ultrasonic sensor active - Height will auto-fill (Weight: manual entry)'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* RFID Status Banner */}
            {rfidStatus && (
              <div className={`border rounded-lg p-3 mb-4 ${
                rfidStatus.includes('✅') ? 'bg-green-50 border-green-200' :
                rfidStatus.includes('❌') ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎴</span>
                  <p className={`text-sm font-medium ${
                    rfidStatus.includes('✅') ? 'text-green-700' :
                    rfidStatus.includes('❌') ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {rfidStatus}
                  </p>
                </div>
              </div>
            )}

            {/* RFID Input — must be scanned first before weight/height unlock */}
            <div className={`mb-4 rounded-lg p-1 transition-all ${!selectedStudent ? 'ring-2 ring-blue-400 ring-offset-1 animate-pulse' : 'ring-1 ring-green-300'}`}>
              <input
                ref={rfidInputRef}
                type="text"
                value={rfidInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setRfidInput(value);
                  // When RFID scanner finishes (usually ends with Enter), trigger lookup
                  if (value.length > 4 && value.includes('\n')) {
                    const uid = value.replace(/[\r\n]/g, '').trim();
                    handleRfidScan(uid);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const uid = rfidInput.trim();
                    if (uid.length > 0) {
                      handleRfidScan(uid);
                    }
                  }
                }}
                onBlur={() => {
                  // If focus leaves the RFID input while we're still waiting for a scan,
                  // reclaim it after a short delay (lets button clicks register first).
                  setTimeout(() => {
                    if (showModalRef.current && !selectedStudentRef.current && rfidInputRef.current) {
                      rfidInputRef.current.focus();
                    }
                  }, 150);
                }}
                className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  !selectedStudent
                    ? 'border-blue-400 bg-blue-50 placeholder-blue-400 font-semibold'
                    : 'border-green-400 bg-green-50 placeholder-green-500'
                }`}
                placeholder={!selectedStudent ? '🎴 Step 1: Scan RFID card to begin...' : '🎴 Scan next RFID card...'}
              />
            </div>

            {/* Lock notice — shown while waiting for RFID scan */}
            {!selectedStudent && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <p className="text-sm font-medium text-amber-700">
                  Weight &amp; Height fields are locked — scan an RFID card first to unlock them.
                </p>
              </div>
            )}

            {!arduinoConnected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  💡 Connect Arduino to automatically measure weight and height
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="studentSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <select
                  id="studentSelect"
                  name="student_id"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Choose a student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} (Grade {s.grade_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weight" className={`block text-sm font-medium mb-1 ${!selectedStudent ? 'text-gray-400' : 'text-gray-700'}`}>
                    Weight (kg) * {!selectedStudent && <span className="text-xs font-normal">(scan RFID first)</span>}
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    step="0.1"
                    required
                    disabled={!selectedStudent}
                    onChange={(e) => {
                      const weight = parseFloat(e.target.value);
                      const heightInput = document.getElementById('height') as HTMLInputElement;
                      const height = parseFloat(heightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      !selectedStudent
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="height" className={`block text-sm font-medium mb-1 ${!selectedStudent ? 'text-gray-400' : 'text-gray-700'}`}>
                    Height (cm) * {!selectedStudent && <span className="text-xs font-normal">(scan RFID first)</span>}
                  </label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    step="0.1"
                    required
                    disabled={!selectedStudent}
                    onChange={(e) => {
                      const height = parseFloat(e.target.value);
                      const weightInput = document.getElementById('weight') as HTMLInputElement;
                      const weight = parseFloat(weightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                      !selectedStudent
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calculated BMI</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {calculatedBMI !== null ? calculatedBMI.toFixed(2) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-2xl font-bold ${
                      bmiStatus === 'Severely Wasted' ? 'text-red-600' :
                      bmiStatus === 'Wasted' ? 'text-orange-600' :
                      bmiStatus === 'Normal' ? 'text-green-600' :
                      bmiStatus === 'Overweight' ? 'text-yellow-600' :
                      bmiStatus === 'Obese' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {bmiStatus || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-save countdown indicator */}
              {arduinoConnected && selectedStudent && autoSaveCountdown > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <div>
                        <p className="font-bold text-lg">Auto-saving in {autoSaveCountdown}...</p>
                        <p className="text-sm text-green-100">Please keep student on scale</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold">{autoSaveCountdown}</div>
                  </div>
                </div>
              )}

              <input type="hidden" name="source" value="manual" />

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    cancelAutoSave();
                    setShowModal(false);
                    setCalculatedBMI(null);
                    setBmiStatus('');
                    setFormError('');
                    setSelectedStudent('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                {!arduinoConnected && (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Save Record
                  </button>
                )}
                {arduinoConnected && (
                  <div className="px-6 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Auto-save Active
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success Popup ──────────────────────────────────────────────────── */}
      {successPopup?.visible && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border-t-4 border-green-500 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">BMI Recorded!</h3>
                <p className="text-xs text-slate-500">Auto-closing in {successCountdown}s</p>
              </div>
              {/* Auto-close progress bar */}
              <div className="ml-auto w-8 h-8 relative flex-shrink-0">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="16" cy="16" r="13" fill="none"
                    stroke="#22c55e" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 13}`}
                    strokeDashoffset={`${2 * Math.PI * 13 * (1 - successCountdown / 5)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-600">{successCountdown}</span>
              </div>
            </div>

            {/* Data summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Student</span>
                <span className="text-slate-800 font-semibold">{successPopup.studentName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Weight</span>
                <span className="text-slate-800 font-semibold">{Math.round(successPopup.weight)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Height</span>
                <span className="text-slate-800 font-semibold">{successPopup.height.toFixed(1)} cm</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-500 font-medium">BMI</span>
                <span className="text-slate-800 font-bold text-base">{successPopup.bmi.toFixed(2)}</span>
              </div>
            </div>

            {/* Warning */}
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠️ If the data above looks wrong (bad IoT reading), tap <strong>Retry</strong> to discard and re-scan.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Discard: clear popup and let user scan again
                  if (successAutoCloseRef.current) clearTimeout(successAutoCloseRef.current);
                  if (successCountdownRef.current) clearInterval(successCountdownRef.current);
                  setSuccessPopup(null);
                  setSuccessCountdown(0);
                  setSelectedStudent('');
                  setCalculatedBMI(null);
                  setBmiStatus('');
                  setAutoSaveCountdown(0);
                  setRfidInput('');
                  setRfidStatus('🎴 Ready to scan RFID card...');
                  setFormError('');
                  const weightInput = document.getElementById('weight') as HTMLInputElement;
                  const heightInput = document.getElementById('height') as HTMLInputElement;
                  if (weightInput) weightInput.value = '';
                  if (heightInput) heightInput.value = '';
                  setTimeout(() => { rfidInputRef.current?.focus(); }, 50);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-amber-400 text-amber-700 font-semibold text-sm hover:bg-amber-50 transition"
              >
                🔄 Retry
              </button>
              <button
                onClick={() => {
                  if (successAutoCloseRef.current) clearTimeout(successAutoCloseRef.current);
                  if (successCountdownRef.current) clearInterval(successCountdownRef.current);
                  setSuccessPopup(null);
                  setSuccessCountdown(0);
                  // Re-focus RFID field for next student scan
                  setTimeout(() => { rfidInputRef.current?.focus(); }, 50);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-white font-semibold text-sm transition"
                style={{ background: '#1a3a6c' }}
              >
                ✓ OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
