'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

interface Program {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  total_beneficiaries: number;
}

interface Beneficiary {
  id: number;
  student_id: number;
  enrollment_date: string;
  student?: any;
  bmi?: number;
  bmi_status?: string;
  bmi_at_enrollment?: number;
  bmi_status_at_enrollment?: string;
  height_for_age_status?: string;
  height_for_age_status_at_enrollment?: string;
  attendance_rate?: number;
  total_attendance?: number;
  days_present?: number;
}

export default function FeedingProgramPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNeedsSupportModal, setShowNeedsSupportModal] = useState(false);
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [needsSupportStudents, setNeedsSupportStudents] = useState<any[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState('');
  const [needsSupportCount, setNeedsSupportCount] = useState(0);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Map<number, string>>(new Map());
  const [selectedProgramForStudent, setSelectedProgramForStudent] = useState<Map<number, number>>(new Map());
  const [enrollingStudent, setEnrollingStudent] = useState<number | null>(null);

  useEffect(() => {
    loadPrograms();
    loadOverallEligibleCount();
  }, []);

  const loadPrograms = async () => {
    try {
      const response = await fetch('/api/feeding-program?type=programs', {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        setPrograms(data.programs);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading programs:', error);
      setLoading(false);
    }
  };

    const loadOverallEligibleCount = async () => {
      try {
        const response = await fetch(`/api/feeding-program?type=eligible_students&program_id=0&t=${Date.now()}`, {
          credentials: 'include', // Include cookies for authentication
        });
        const data = await response.json();
        if (data.success) {
          setNeedsSupportCount(data.eligible_students?.length || 0);
          setNeedsSupportStudents(data.eligible_students || []);
        }
      } catch (error) {
        console.error('Error loading eligible count:', error);
      }
    };

  const loadStudents = async () => {
    try {
      const [studentsRes, bmiRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/bmi-records', { credentials: 'include' }),
      ]);
      const studentsData = await studentsRes.json();
      const bmiData = await bmiRes.json();

      if (studentsData.success) {
        let studentsList = studentsData.students;
        if (bmiData.success && bmiData.records) {
          const latestBMI = new Map();
          bmiData.records.forEach((record: any) => {
            const studentId = record.student_id;
            const existing = latestBMI.get(studentId);
            if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
              latestBMI.set(studentId, record);
            }
          });

            studentsList = studentsList.map((student: any) => {
              const bmiRecord = latestBMI.get(student.id);
              const hasPoorBMI = bmiRecord && (bmiRecord.bmi_status === 'Severely Wasted' || bmiRecord.bmi_status === 'Wasted');
              const hasPoorHFA = bmiRecord && (bmiRecord.height_for_age_status === 'Severely Stunted' || bmiRecord.height_for_age_status === 'Stunted');
              
              return {
                ...student,
                bmi_status: bmiRecord?.bmi_status || null,
                height_for_age_status: bmiRecord?.height_for_age_status || null,
                isPriority: hasPoorBMI || hasPoorHFA,
              };
            });
        }
        setStudents(studentsList);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadEligibleStudents = async (programId: number) => {
    try {
      const response = await fetch(`/api/feeding-program?type=eligible_students&program_id=${programId}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        setEligibleStudents(data.eligible_students || []);
      }
    } catch (error) {
      console.error('Error loading eligible students:', error);
    }
  };

  const loadEnrolledStudents = async (programId: number) => {
    try {
      const response = await fetch(`/api/feeding-program?type=beneficiaries&program_id=${programId}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        setBeneficiaries(data.beneficiaries || []);
        const enrolledIds = new Set<number>((data.beneficiaries || []).map((b: any) => b.student_id));
        setEnrolledStudentIds(enrolledIds);
      }
    } catch (error) {
      console.error('Error loading enrolled students:', error);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    formData.append('action', 'create_program');

    try {
      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowProgramModal(false);
        loadPrograms();
        loadOverallEligibleCount();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    formData.append('action', 'add_beneficiary');

    try {
      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowBeneficiaryModal(false);
        if (currentProgramId) {
          loadEnrolledStudents(currentProgramId);
            loadPrograms();
          }
          loadOverallEligibleCount(); // Refresh the alert count
        } else {
          setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleRemoveBeneficiary = async (beneficiaryId: number) => {
    if (!confirm('Are you sure you want to remove this student from the program?')) return;

    try {
      const formData = new FormData();
      formData.append('action', 'remove_beneficiary');
      formData.append('beneficiary_id', beneficiaryId.toString());

      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        if (currentProgramId) {
          loadEnrolledStudents(currentProgramId);
            loadPrograms();
          }
          loadOverallEligibleCount(); // Refresh the alert count
        } else {
          alert(data.message);
      }
    } catch (error) {
      alert('Error removing beneficiary');
    }
  };

  const openAddBeneficiaryModal = async (programId: number) => {
    setCurrentProgramId(programId);
    setShowBeneficiaryModal(true);
    await loadEnrolledStudents(programId);
    await loadStudents();
    await loadEligibleStudents(programId);
    await loadAllStudentEnrollments();
  };

  const loadAllStudentEnrollments = async () => {
    try {
      // Get all active programs
      const programsRes = await fetch('/api/feeding-program?type=programs', {
        credentials: 'include',
      });
      const programsData = await programsRes.json();
      
      if (!programsData.success) return;
      
      const activePrograms = programsData.programs.filter((p: any) => p.status === 'active');
      
      // Get all beneficiaries from all active programs
      const enrollmentMap = new Map<number, string>();
      
      for (const program of activePrograms) {
        const beneficiariesRes = await fetch(`/api/feeding-program?type=beneficiaries&program_id=${program.id}`, {
          credentials: 'include',
        });
        const beneficiariesData = await beneficiariesRes.json();
        
        if (beneficiariesData.success && beneficiariesData.beneficiaries) {
          beneficiariesData.beneficiaries.forEach((b: any) => {
            // Only add if not already in the map (prioritize first enrollment found)
            if (!enrollmentMap.has(b.student_id)) {
              enrollmentMap.set(b.student_id, program.name);
            }
          });
        }
      }
      
      setStudentEnrollments(enrollmentMap);
    } catch (error) {
      console.error('Error loading student enrollments:', error);
    }
  };

  const viewBeneficiaries = async (programId: number) => {
    setCurrentProgramId(programId);
    setShowViewModal(true);
    await loadEnrolledStudents(programId);
  };

  const getGrowthStatus = (baselineBmiStatus: string, currentBmiStatus: string, currentBmi: number): string => {
    // If current BMI status is obese or overweight, it's overdone
    if (currentBmiStatus === 'Obese' || currentBmiStatus === 'Overweight') {
      return 'Overdone';
    }

    // Define severity levels (lower number = worse condition)
    const statusLevels: Record<string, number> = {
      'Severely Wasted': 1,
      'Wasted': 2,
      'Underweight': 3,
      'Normal': 4,
      'Overweight': 5,
      'Obese': 6,
      'N/A': 0,
    };

    const baselineLevel = statusLevels[baselineBmiStatus] || 0;
    const currentLevel = statusLevels[currentBmiStatus] || 0;

    // If improved towards normal
    if (currentLevel > baselineLevel && currentLevel <= 4) {
      return 'Improve';
    }

    // If no improvement or declined
    if (currentLevel <= baselineLevel) {
      return 'No/Decline Improvement';
    }

    // If became overweight/obese from a wasted state
    if (currentLevel > 4) {
      return 'Overdone';
    }

    return 'No Change';
  };

  const generateReport = async (programId: number, programName: string, startDate: string, endDate: string) => {
    if (!confirm(`Generate report for "${programName}"? This will create a pending report that will be sent for approval.`)) {
      return;
    }

    try {
      // Create the report entry directly
      const reportFormData = new FormData();
      reportFormData.append('action', 'generate');
      reportFormData.append('title', `Feeding Program: ${programName}`);
      reportFormData.append('report_type', 'feeding_program');
      reportFormData.append('description', `Feeding program report for ${programName} covering the period from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`);
      reportFormData.append('data', JSON.stringify({
        program_id: programId,
        program_name: programName,
        start_date: startDate,
        end_date: endDate,
        created_date: new Date().toISOString(),
        school_name: 'SCIENCE CITY OF MUNOZ',
        school_year: '2025-2026',
        pdf_ready: true,
      }));

      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include',
        body: reportFormData,
      });

      const data = await response.json();

      if (data.success) {
        alert('Report generated successfully! It has been submitted as pending and will appear in the Reports page.');
      } else {
        alert('Failed to generate report: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report. Please try again.');
    }
  };

  const handleDeleteProgram = async (programId: number, programName: string) => {
    if (!confirm(`Are you sure you want to delete "${programName}"? This will permanently delete the program and all its beneficiaries and attendance records. This action cannot be undone.`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'delete_program');
      formData.append('program_id', programId.toString());

      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadPrograms();
        loadOverallEligibleCount();
      } else {
        alert('Failed to delete program: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('An error occurred while deleting the program. Please try again.');
    }
  };

  const handleEnrollStudentFromModal = async (studentId: number, studentName: string) => {
    const programId = selectedProgramForStudent.get(studentId);
    
    if (!programId) {
      alert('Please select a feeding program first');
      return;
    }

    const program = programs.find(p => p.id === programId);
    if (!program) return;

    if (!confirm(`Enroll ${studentName} in "${program.name}"?`)) {
      return;
    }

    setEnrollingStudent(studentId);

    try {
      const formData = new FormData();
      formData.append('action', 'add_beneficiary');
      formData.append('program_id', programId.toString());
      formData.append('student_id', studentId.toString());
      formData.append('enrollment_date', new Date().toISOString().split('T')[0]);

      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert(`${studentName} has been successfully enrolled in ${program.name}!`);
        // Refresh data
        await loadPrograms();
        await loadOverallEligibleCount();
        // Clear selection
        setSelectedProgramForStudent(prev => {
          const newMap = new Map(prev);
          newMap.delete(studentId);
          return newMap;
        });
      } else {
        alert('Failed to enroll student: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      alert('An error occurred while enrolling the student. Please try again.');
    } finally {
      setEnrollingStudent(null);
    }
  };

  // Filter available students (not enrolled)
  const availableStudents = students.filter((s) => !enrolledStudentIds.has(s.id));
  const priorityStudents = availableStudents.filter((s) => s.isPriority);
  const regularStudents = availableStudents.filter((s) => !s.isPriority);

  // Sort priority students
  priorityStudents.sort((a, b) => {
    if (a.bmi_status === 'Severely Wasted' && b.bmi_status !== 'Severely Wasted') return -1;
    if (a.bmi_status !== 'Severely Wasted' && b.bmi_status === 'Severely Wasted') return 1;
    return 0;
  });

  // Filter students based on search
  const filteredStudents = availableStudents.filter((student) => {
    if (!searchStudent) return true;
    const searchLower = searchStudent.toLowerCase();
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const grade = `grade ${student.grade_level}`.toLowerCase();
    return fullName.includes(searchLower) || grade.includes(searchLower);
  });

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Feeding Programs</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage nutrition support programs and beneficiaries</p>
          </div>
          <button
            onClick={() => setShowProgramModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition"
            style={{ background: '#1a3a6c' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Program
          </button>
        </div>

        <div className="p-5">
           {/* Alert for students needing feeding support */}
          {needsSupportCount > 0 && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-bold text-red-700">Students Need Feeding Support</h3>
                  <p className="text-xs text-red-600 mt-0.5">
                    {needsSupportCount} {needsSupportCount === 1 ? 'student has' : 'students have'} poor nutritional status and should be enrolled in feeding programs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNeedsSupportModal(true)}
                className="px-3 py-1.5 text-xs text-white rounded-lg transition flex-shrink-0 font-medium" style={{ background: '#b91c1c' }}
              >
                View
              </button>
            </div>
          )}

          {/* Programs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm">Loading programs...</div>
            ) : programs.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm">No programs found. Create your first program!</div>
            ) : (
              programs.map((program) => {
                const startDate = new Date(program.start_date).toLocaleDateString();
                const endDate = new Date(program.end_date).toLocaleDateString();
                const isEnded = program.status === 'ended';
                const statusColor = program.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 
                                   program.status === 'ended' ? 'bg-slate-200 text-slate-700' : 
                                   'bg-slate-100 text-slate-600';

                return (
                  <div key={program.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
                      <h3 className="text-sm font-bold text-white truncate">{program.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusColor}`}>
                        {program.status}
                      </span>
                    </div>
                    <div className="p-4">
                    <p className="text-slate-500 text-xs mb-3">{program.description || 'No description'}</p>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {startDate} — {endDate}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium text-slate-700">{program.total_beneficiaries}</span> Beneficiaries
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewBeneficiaries(program.id)}
                          className="flex-1 text-xs text-white px-3 py-1.5 rounded-lg transition font-medium"
                          style={{ background: '#1a3a6c' }}
                        >
                          View
                        </button>
                        {!isEnded && (
                        <button
                          onClick={() => openAddBeneficiaryModal(program.id)}
                          className="flex-1 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium" style={{ background: '#2a5a9a' }}
                        >
                          Add Student
                        </button>
                        )}
                      </div>
                      {isEnded && (
                      <button
                        onClick={() => generateReport(program.id, program.name, program.start_date, program.end_date)}
                        className="w-full bg-violet-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-violet-700 transition font-semibold"
                      >
                        📄 Generate Report
                      </button>
                      )}
                      <button
                        onClick={() => handleDeleteProgram(program.id, program.name)}
                        className="w-full text-white text-xs px-4 py-1.5 rounded-lg transition font-semibold" style={{ background: '#b91c1c' }}
                      >
                        🗑️ Delete Program
                      </button>
                    </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Create Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Create Feeding Program</h3>
              <button onClick={() => { setShowProgramModal(false); setFormError(''); }} className="text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-5 space-y-3">
              <div>
                <label htmlFor="programName" className="block text-xs font-medium text-slate-600 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  id="programName"
                  name="name"
                  required
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-medium text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-medium text-slate-600 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="start_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-xs font-medium text-slate-600 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="end_date"
                    required
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProgramModal(false);
                    setFormError('');
                  }}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white rounded-lg transition font-medium"
                  style={{ background: '#1a3a6c' }}
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Beneficiary Modal */}
      {showBeneficiaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Add Beneficiary</h3>
              <button
                onClick={() => { setShowBeneficiaryModal(false); setFormError(''); setSearchStudent(''); }}
                className="text-white/70 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 pt-3 pb-2 border-b border-slate-100">

              {/* Search Bar */}
              <div>
                <label htmlFor="searchStudent" className="block text-xs font-medium text-slate-600 mb-1">
                  Search Student
                </label>
                <input
                  type="text"
                  id="searchStudent"
                  placeholder="Search by name or grade level..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleAddBeneficiary}>
                <input type="hidden" name="program_id" value={currentProgramId || ''} />
                <input type="hidden" name="student_id" value={selectedStudent || ''} />
                <input type="hidden" name="enrollment_date" value={new Date().toISOString().split('T')[0]} />

                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Select Student *
                </label>

                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      {searchStudent ? 'No students found matching your search' : 'All students are already enrolled in this program'}
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const hasPoorBMI = student.bmi_status === 'Severely Wasted' || student.bmi_status === 'Wasted';
                      const hasPoorHFA = student.height_for_age_status === 'Severely Stunted' || student.height_for_age_status === 'Stunted';
                      const isPriority = hasPoorBMI || hasPoorHFA;
                      const enrolledInProgram = studentEnrollments.get(student.id);
                      const isEnrolledInOtherProgram = enrolledInProgram && !enrolledStudentIds.has(student.id);

                      return (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudent(student.id)}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                            selectedStudent === student.id
                              ? 'border-blue-500 bg-blue-50'
                              : isPriority
                              ? 'border-red-300 bg-red-50 hover:border-red-400'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="student_radio"
                                  value={student.id}
                                  checked={selectedStudent === student.id}
                                  onChange={() => setSelectedStudent(student.id)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <h4 className="font-semibold text-slate-800 text-sm">
                                  {student.first_name} {student.last_name}
                                </h4>
                                {isPriority && (
                                  <span className="text-red-500 font-bold">⚠️</span>
                                )}
                                {isEnrolledInOtherProgram && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    📋 Enrolled in: {enrolledInProgram}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 ml-6 mt-0.5">
                                Grade {student.grade_level} • Age: {student.age}
                              </p>
                              <div className="flex gap-2 ml-6 mt-1.5">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  student.bmi_status === 'Severely Wasted' || student.bmi_status === 'Wasted'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  BMI: {student.bmi_status || 'Normal'}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  student.height_for_age_status === 'Severely Stunted' || student.height_for_age_status === 'Stunted'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  HFA: {student.height_for_age_status || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                  🔴 Highlighted students have Wasted/Severely Wasted BMI or Stunted/Severely Stunted Height For Age status and need immediate feeding support
                </p>

                {formError && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs mt-3">
                    {formError}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBeneficiaryModal(false);
                      setFormError('');
                      setSearchStudent('');
                      setSelectedStudent(null);
                    }}
                    className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStudent}
                    className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                      selectedStudent
                        ? 'text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    style={selectedStudent ? { background: '#1a3a6c' } : {}}
                  >
                    Add Beneficiary
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Beneficiaries Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full mx-4 my-8 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">
                {programs.find((p) => p.id === currentProgramId)?.name} — Beneficiaries
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setBeneficiaries([]);
                }}
                className="text-white/70 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto p-5">
              <table className="w-full text-sm">
                <thead style={{ background: '#1a3a6c' }} className="text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Age</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Program Initiation</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Baseline BMI</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Baseline HFA</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Current BMI</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Current HFA</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      {programs.find((p) => p.id === currentProgramId)?.status === 'ended' ? 'Growth' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {beneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No beneficiaries added yet
                      </td>
                    </tr>
                  ) : (
                    beneficiaries.map((beneficiary) => {
                      const student = beneficiary.student || {};
                      const currentProgram = programs.find((p) => p.id === currentProgramId);
                      const isEnded = currentProgram?.status === 'ended';
                      const growthStatus = isEnded ? getGrowthStatus(
                        beneficiary.bmi_status_at_enrollment || 'N/A',
                        beneficiary.bmi_status || 'N/A',
                        beneficiary.bmi || 0
                      ) : '';

                      return (
                        <tr key={beneficiary.id} className="hover:bg-slate-50 text-slate-700">
                          <td className="px-4 py-3 text-sm">
                            {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                          </td>
                          <td className="px-4 py-3 text-sm">Grade {student.grade_level}</td>
                          <td className="px-4 py-3 text-sm">{student.age}</td>
                          <td className="px-4 py-3 text-sm">{new Date(beneficiary.enrollment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            {beneficiary.bmi_at_enrollment ? (
                              <div>
                                <div className="font-medium">{beneficiary.bmi_at_enrollment.toFixed(2)}</div>
                                <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 font-medium ${
                                  beneficiary.bmi_status_at_enrollment === 'Severely Wasted' ? 'bg-red-100 text-red-700' :
                                  beneficiary.bmi_status_at_enrollment === 'Wasted' ? 'bg-orange-100 text-orange-700' :
                                  beneficiary.bmi_status_at_enrollment === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                  beneficiary.bmi_status_at_enrollment === 'Overweight' ? 'bg-yellow-100 text-yellow-700' :
                                  beneficiary.bmi_status_at_enrollment === 'Obese' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {beneficiary.bmi_status_at_enrollment}
                                </span>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {beneficiary.height_for_age_status_at_enrollment ? (
                              <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
                                beneficiary.height_for_age_status_at_enrollment === 'Severely Stunted' ? 'bg-red-100 text-red-700' :
                                beneficiary.height_for_age_status_at_enrollment === 'Stunted' ? 'bg-orange-100 text-orange-700' :
                                beneficiary.height_for_age_status_at_enrollment === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                beneficiary.height_for_age_status_at_enrollment === 'Tall' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {beneficiary.height_for_age_status_at_enrollment}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {beneficiary.bmi ? (
                              <div>
                                <div className="font-medium">{beneficiary.bmi.toFixed(2)}</div>
                                <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 font-medium ${
                                  beneficiary.bmi_status === 'Severely Wasted' ? 'bg-red-100 text-red-700' :
                                  beneficiary.bmi_status === 'Wasted' ? 'bg-orange-100 text-orange-700' :
                                  beneficiary.bmi_status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                  beneficiary.bmi_status === 'Overweight' ? 'bg-yellow-100 text-yellow-700' :
                                  beneficiary.bmi_status === 'Obese' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {beneficiary.bmi_status}
                                </span>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {beneficiary.height_for_age_status ? (
                              <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
                                beneficiary.height_for_age_status === 'Severely Stunted' ? 'bg-red-100 text-red-700' :
                                beneficiary.height_for_age_status === 'Stunted' ? 'bg-orange-100 text-orange-700' :
                                beneficiary.height_for_age_status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                beneficiary.height_for_age_status === 'Tall' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {beneficiary.height_for_age_status}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEnded ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                growthStatus === 'Improve' ? 'bg-emerald-100 text-emerald-700' :
                                growthStatus === 'Overdone' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {growthStatus}
                              </span>
                            ) : (
                            <button
                              onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                              className="text-white px-3 py-1 rounded text-xs font-medium transition" style={{ background: '#b91c1c' }}
                            >
                              Remove
                            </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Students Needing Support Modal */}
      {showNeedsSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h2 className="text-sm font-bold text-white">Students Needing Feeding Support</h2>
              <button
                onClick={() => setShowNeedsSupportModal(false)}
                className="text-white/70 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
                ℹ️ These students have poor nutritional status and should be enrolled in feeding programs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: '#1a3a6c' }} className="text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">LRN</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Grade</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">BMI Status</th>
                      <th className="px-4 py-3 text-left">HFA Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {needsSupportStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      needsSupportStudents.map((student) => {
                        const activePrograms = programs.filter(p => p.status === 'active');
                        const studentFullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
                        
                        return (
                          <tr key={student.id} className="hover:bg-slate-50 text-slate-700">
                            <td className="px-4 py-3">{student.lrn}</td>
                            <td className="px-4 py-3">
                              {studentFullName}
                            </td>
                            <td className="px-4 py-3">
                              {student.grade_level === 0 ? 'Kinder' : `Grade ${student.grade_level}`}
                            </td>
                            <td className="px-4 py-3">{student.gender}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                student.bmi_status === 'Severely Wasted' ? 'bg-red-100 text-red-700' :
                                student.bmi_status === 'Wasted' ? 'bg-orange-100 text-orange-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {student.bmi_status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                student.height_for_age_status === 'Severely Stunted' ? 'bg-red-100 text-red-700' :
                                student.height_for_age_status === 'Stunted' ? 'bg-orange-100 text-orange-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {student.height_for_age_status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {activePrograms.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No active programs</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedProgramForStudent.get(student.id) || ''}
                                    onChange={(e) => {
                                      setSelectedProgramForStudent(prev => {
                                        const newMap = new Map(prev);
                                        if (e.target.value) {
                                          newMap.set(student.id, parseInt(e.target.value));
                                        } else {
                                          newMap.delete(student.id);
                                        }
                                        return newMap;
                                      });
                                    }}
                                    className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={enrollingStudent === student.id}
                                  >
                                    <option value="">Select Program</option>
                                    {activePrograms.map(program => (
                                      <option key={program.id} value={program.id}>
                                        {program.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleEnrollStudentFromModal(student.id, studentFullName)}
                                    disabled={!selectedProgramForStudent.get(student.id) || enrollingStudent === student.id}
                                    className={`text-xs px-3 py-1 rounded transition font-medium ${
                                      selectedProgramForStudent.get(student.id) && enrollingStudent !== student.id
                                        ? 'text-white'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                    style={selectedProgramForStudent.get(student.id) && enrollingStudent !== student.id ? { background: '#1a3a6c' } : {}}
                                  >
                                    {enrollingStudent === student.id ? 'Adding...' : 'Add'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowNeedsSupportModal(false)}
                className="px-5 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
