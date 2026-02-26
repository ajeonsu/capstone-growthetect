'use client';

import { useEffect, useState, useRef } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { calculateBMI, getBMIStatus } from '@/lib/helpers';

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
  const itemsPerPage = 15;

  // Arduino sensor states
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [arduinoData, setArduinoData] = useState({ weight: 0, height: 0 });
  const [dataFresh, setDataFresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // RFID scanning
  const [rfidInput, setRfidInput] = useState('');
  const [rfidStatus, setRfidStatus] = useState('');
  const rfidInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lockedSensorValuesRef = useRef<{ weight: number; height: number } | null>(null);
  // Debounce timer for filter changes
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStudents();
    loadBMIRecords();
  }, []);

  // Auto-focus RFID input when modal opens
  useEffect(() => {
    if (showModal && rfidInputRef.current) {
      // Focus RFID input immediately when modal opens
      setTimeout(() => {
        rfidInputRef.current?.focus();
        setRfidStatus('Ready to scan RFID card...');
      }, 100);
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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showModal]);

  // Auto-fill weight and height when Arduino data changes
  useEffect(() => {
    if (showModal && arduinoConnected && dataFresh) {
      const weightInput = document.getElementById('weight') as HTMLInputElement;
      const heightInput = document.getElementById('height') as HTMLInputElement;
      
      // TESTING MODE: Fill height even if weight is 0 (ultrasonic-only testing)
      if (heightInput && arduinoData.height > 0) {
        heightInput.value = arduinoData.height.toFixed(1);
        
        // Only fill weight and calculate BMI if load cell is working
        if (weightInput && arduinoData.weight > 0) {
          weightInput.value = arduinoData.weight.toFixed(1);
          handleCalculateBMI(arduinoData.weight, arduinoData.height);
        }
      }
    }
  }, [arduinoData, showModal, arduinoConnected, dataFresh]);

  // Auto-save when student is selected and Arduino data is ready
  useEffect(() => {
    // Don't start countdown if already saving
    if (isSaving) {
      return;
    }
    
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Only auto-save if:
    // 1. Modal is open
    // 2. Arduino is connected with fresh data
    // 3. Student is selected (via RFID scan)
    // 4. Valid weight AND height from Arduino (both sensors working)
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
      // Check if we already have locked values (countdown in progress)
      if (lockedSensorValuesRef.current) {
        // Allow ±2kg for weight and ±4cm for height tolerance
        const weightDiff = Math.abs(arduinoData.weight - lockedSensorValuesRef.current.weight);
        const heightDiff = Math.abs(arduinoData.height - lockedSensorValuesRef.current.height);
        
        // If readings are within tolerance, don't restart countdown
        if (weightDiff <= 2 && heightDiff <= 4) {
          return;
        } else {
          // Readings changed significantly - restart countdown
          lockedSensorValuesRef.current = null;
        }
      }
      
      
      // Lock the current sensor values
      lockedSensorValuesRef.current = {
        weight: arduinoData.weight,
        height: arduinoData.height
      };
      
      // Start countdown from 2
      setAutoSaveCountdown(2);
      
      let countdown = 2;
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        countdown--;
        setAutoSaveCountdown(countdown);
        
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Auto-save after 2 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveRecord();
        clearInterval(countdownInterval);
        // Clear locked values after save
        lockedSensorValuesRef.current = null;
      }, 2000);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        clearInterval(countdownInterval);
      };
    } else {
      setAutoSaveCountdown(0);
      // Clear locked values if conditions aren't met
      lockedSensorValuesRef.current = null;
      
      // Debug: Show why auto-save didn't trigger
      if (selectedStudent && showModal) {
        if (!hasValidWeight) {
        }
        if (!hasValidHeight) {
        }
        if (!arduinoConnected) {
        }
        if (!dataFresh) {
        }
      }
    }
  }, [showModal, arduinoConnected, dataFresh, selectedStudent, arduinoData.weight, arduinoData.height, isSaving]);

  const autoSaveRecord = async () => {
    if (!selectedStudent || !arduinoData.weight || !arduinoData.height) {
      return;
    }
    
    // Prevent multiple saves
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);

    const weight = arduinoData.weight;
    const height = arduinoData.height;

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
        const studentName = students.find(s => s.id === selectedStudent)?.first_name + ' ' + students.find(s => s.id === selectedStudent)?.last_name || 'Unknown';
        
        
        // Success - show message
        alert(`✅ BMI recorded successfully!\n\nStudent: ${studentName}\nWeight: ${weight.toFixed(1)}kg\nHeight: ${height.toFixed(1)}cm\nBMI: ${bmi.toFixed(2)}`);
        
        // Clear student selection and form data (but KEEP modal open)
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
        const studentSelect = document.getElementById('student') as HTMLSelectElement;
        if (weightInput) weightInput.value = '';
        if (heightInput) heightInput.value = '';
        if (studentSelect) studentSelect.value = '';
        
        // Reload records in background
        loadBMIRecords();
        
        // Refocus RFID input for next scan
        setTimeout(() => {
          rfidInputRef.current?.focus();
        }, 100);
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

  const checkArduinoConnection = async () => {
    try {
      // Use bridge for Arduino data (works on Vercel)
      const response = await fetch('/api/arduino-bridge');
      const data = await response.json();
      
      setArduinoConnected(data.connected);
      if (data.connected && data.data) {
        setArduinoData(data.data);
        setDataFresh(data.dataFresh || data.isFresh);
      }
    } catch (error) {
      console.error('Error checking Arduino connection:', error);
      setArduinoConnected(false);
    }
  };

  const fetchArduinoData = async () => {
    try {
      // Use bridge for Arduino data (works on Vercel)
      const response = await fetch('/api/arduino-bridge');
      const data = await response.json();
      
      if (data.connected && data.data) {
        setArduinoData(data.data);
        setDataFresh(data.dataFresh || data.isFresh);
        setArduinoConnected(true);
      } else {
        setArduinoConnected(false);
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
        alert('BMI recorded successfully');
        setShowModal(false);
        setCalculatedBMI(null);
        setBmiStatus('');
        loadBMIRecords();
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

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 min-h-screen bg-slate-50">
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
            style={{ background: '#1a3a6c' }}
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
              <table className="data-table w-full">
                <thead>
                  <tr style={{ background: '#1a3a6c' }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Student</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Age</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Height (cm)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">BMI</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">BMI Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wider">HFA Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">
                        Loading BMI records...
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No BMI records found
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const recordDate = new Date(record.measured_at).toLocaleDateString();
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-sm text-slate-700">{recordDate}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                            {record.first_name} {record.last_name}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${record.gender === 'M' || record.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                              {record.gender === 'M' || record.gender === 'Male' ? 'Male' : 'Female'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{record.grade_level === 0 || record.grade_level === '0' ? 'Kinder' : `Grade ${record.grade_level}`}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{record.age}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{parseFloat(record.weight).toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-700">{parseFloat(record.height).toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">{parseFloat(record.bmi).toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(record.bmi_status)}`}>
                              {record.bmi_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getHFAStatusColor(record.height_for_age_status)}`}>
                              {record.height_for_age_status || 'N/A'}
                            </span>
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

            {/* Hidden RFID Input - Auto-focused */}
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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const uid = rfidInput.trim();
                  if (uid.length > 0) {
                    handleRfidScan(uid);
                  }
                }
              }}
              className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="🎴 Scan RFID card here (auto-focused)"
            />

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
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    step="0.1"
                    required
                    onChange={(e) => {
                      const weight = parseFloat(e.target.value);
                      const heightInput = document.getElementById('height') as HTMLInputElement;
                      const height = parseFloat(heightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm) *
                  </label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    step="0.1"
                    required
                    onChange={(e) => {
                      const height = parseFloat(e.target.value);
                      const weightInput = document.getElementById('weight') as HTMLInputElement;
                      const weight = parseFloat(weightInput?.value || '0');
                      if (weight && height) handleCalculateBMI(weight, height);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    setShowModal(false);
                    setCalculatedBMI(null);
                    setBmiStatus('');
                    setFormError('');
                    setSelectedStudent('');
                    setAutoSaveCountdown(0);
                    if (autoSaveTimerRef.current) {
                      clearTimeout(autoSaveTimerRef.current);
                    }
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
    </div>
  );
}
