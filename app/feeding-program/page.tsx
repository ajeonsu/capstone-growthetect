'use client';

import { useEffect, useState } from 'react';
import ModuleLoader from '@/components/ModuleLoader';
import NutritionistSidebar from '@/components/NutritionistSidebar';
import { AlertModal, ConfirmModal } from '@/components/ui/Modal';

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
  const [needsSupportPage, setNeedsSupportPage] = useState(1);
  const NEEDS_SUPPORT_PAGE_SIZE = 10;
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [needsSupportStudents, setNeedsSupportStudents] = useState<any[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState('');
  const [needsSupportCount, setNeedsSupportCount] = useState(0);
  const [searchStudent, setSearchStudent] = useState('');
  const [searchNeedsSupport, setSearchNeedsSupport] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [studentEnrollments, setStudentEnrollments] = useState<Map<number, string>>(new Map());
  const [selectedProgramForStudent, setSelectedProgramForStudent] = useState<Map<number, number>>(new Map());
  const [enrollingStudent, setEnrollingStudent] = useState<number | null>(null);
  const [viewCurrentPage, setViewCurrentPage] = useState(1);
  const [benCurrentPage, setBenCurrentPage] = useState(1);
  const [searchViewBeneficiary, setSearchViewBeneficiary] = useState('');
  const VIEW_PAGE_SIZE = 10;
  const BEN_PAGE_SIZE = 10;

  // Edit program modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Notification / confirmation modals
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string; type: 'success'|'error'|'warning'|'info'|'delete'; title?: string }>({ open: false, message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; title?: string; onConfirm: () => void; danger?: boolean }>({ open: false, message: '', onConfirm: () => {} });
  const showAlert = (message: string, type: 'success'|'error'|'warning'|'info'|'delete' = 'info', title?: string) => setAlertModal({ open: true, message, type, title });
  const showConfirm = (message: string, onConfirm: () => void, title?: string, danger = false) => setConfirmModal({ open: true, message, title, onConfirm, danger });

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
                measured_at: bmiRecord?.measured_at || null,
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
        showAlert(data.message, 'success');
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

    if (selectedStudents.size === 0) {
      setFormError('Please select at least one student.');
      return;
    }

    const selectedStudentIds = Array.from(selectedStudents);
    const blockedStudents = selectedStudentIds.filter((studentId) =>
      studentEnrollments.has(studentId) && !enrolledStudentIds.has(studentId)
    );
    if (blockedStudents.length > 0) {
      setFormError('One or more selected students are already enrolled in another feeding program.');
      return;
    }

    const enrollmentDate = new Date().toISOString().split('T')[0];
    let successCount = 0;
    let errorMsg = '';

    // Add each selected student one by one
    for (const studentId of selectedStudentIds) {
      const formData = new FormData();
      formData.append('action', 'add_beneficiary');
      formData.append('program_id', String(currentProgramId));
      formData.append('student_id', String(studentId));
      formData.append('enrollment_date', enrollmentDate);

      try {
        const response = await fetch('/api/feeding-program', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          errorMsg = data.message;
        }
      } catch {
        errorMsg = 'An error occurred. Please try again.';
      }
    }

    if (successCount > 0) {
      const message = successCount === 1
        ? 'Successfully added 1 beneficiary to the program!'
        : `Successfully added ${successCount} beneficiaries to the program!`;
      showAlert(message, 'success');
      setShowBeneficiaryModal(false);
      setSelectedStudents(new Set());
      setSearchStudent('');
      if (currentProgramId) {
        loadEnrolledStudents(currentProgramId);
        loadPrograms();
      }
      loadOverallEligibleCount();
    } else {
      setFormError(errorMsg || 'Failed to add students.');
    }

  };

  const handleRemoveBeneficiary = (beneficiaryId: number) => {
    showConfirm(
      'Are you sure you want to remove this student from the program?',
      async () => {
        try {
          const formData = new FormData();
          formData.append('action', 'remove_beneficiary');
          formData.append('beneficiary_id', beneficiaryId.toString());

          const response = await fetch('/api/feeding-program', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            showAlert(data.message, 'success');
            if (currentProgramId) {
              loadEnrolledStudents(currentProgramId);
              loadPrograms();
            }
            loadOverallEligibleCount();
          } else {
            showAlert(data.message, 'error');
          }
        } catch (error) {
          showAlert('Error removing beneficiary', 'error');
        }
      },
      'Remove Student',
      true
    );
  };

  const handleRemoveAllBeneficiaries = () => {
    if (beneficiaries.length === 0) {
      showAlert('No beneficiaries to remove', 'error');
      return;
    }

    showConfirm(
      `Are you sure you want to remove ALL ${beneficiaries.length} beneficiaries from this program? This action cannot be undone.`,
      async () => {
        try {
          let successCount = 0;
          let errorCount = 0;

          for (const beneficiary of beneficiaries) {
            try {
              const formData = new FormData();
              formData.append('action', 'remove_beneficiary');
              formData.append('beneficiary_id', beneficiary.id.toString());

              const response = await fetch('/api/feeding-program', {
                method: 'POST',
                credentials: 'include',
                body: formData,
              });

              const data = await response.json();
              if (data.success) {
                successCount++;
              } else {
                errorCount++;
              }
            } catch {
              errorCount++;
            }
          }

          if (successCount > 0) {
            showAlert(`Successfully removed ${successCount} beneficiaries${errorCount > 0 ? `, ${errorCount} failed` : ''}`, errorCount > 0 ? 'error' : 'success');
            if (currentProgramId) {
              loadEnrolledStudents(currentProgramId);
              loadPrograms();
            }
            loadOverallEligibleCount();
          } else {
            showAlert('Failed to remove beneficiaries', 'error');
          }
        } catch (error) {
          showAlert('Error removing beneficiaries', 'error');
        }
      },
      'Remove All Beneficiaries',
      true
    );
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
    setViewCurrentPage(1);
    setShowViewModal(true);
    await loadEnrolledStudents(programId);
  };

  const getGrowthStatus = (baselineBmiStatus: string, currentBmiStatus: string, currentBmi: number): string => {
    const statusLevels: Record<string, number> = {
      'Severely Wasted': 1,
      'Wasted': 2,
      'Underweight': 3,
      'Normal': 4,
      'Overweight': 5,
      'Obese': 6,
    };

    const baselineLevel = statusLevels[baselineBmiStatus] ?? 0;
    const currentLevel  = statusLevels[currentBmiStatus]  ?? 0;

    if (baselineLevel === 0 || currentLevel === 0) return 'N/A';
    if (currentLevel > 4)                             return 'Overdone';
    if (currentLevel === 4 && baselineLevel < 4)      return 'Recovered';
    if (currentLevel > baselineLevel)                 return 'Improved';
    if (currentLevel === baselineLevel)               return 'Maintained';
    return 'Not Improved';
  };

  const generateReport = (programId: number, programName: string, startDate: string, endDate: string) => {
    showConfirm(
      `Generate report for "${programName}"? This will create a pending report and remove the program from this page.`,
      async () => {
        try {
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
            // Delete the ended program now that its report has been generated
            const deleteFormData = new FormData();
            deleteFormData.append('action', 'delete_program');
            deleteFormData.append('program_id', programId.toString());

            const deleteResponse = await fetch('/api/feeding-program', {
              method: 'POST',
              credentials: 'include',
              body: deleteFormData,
            });

            const deleteData = await deleteResponse.json();

            if (deleteData.success) {
              showAlert('Report generated successfully! The program has been removed and the report is pending approval in the Reports page.', 'success');
            } else {
              showAlert('Report generated but could not remove the program: ' + (deleteData.message || 'Unknown error'), 'warning');
            }

            loadPrograms();
            loadOverallEligibleCount();
          } else {
            showAlert('Failed to generate report: ' + (data.message || 'Unknown error'), 'error');
          }
        } catch (error) {
          console.error('Error generating report:', error);
          showAlert('An error occurred while generating the report. Please try again.', 'error');
        }
      },
      'Generate Report'
    );
  };

  const handleDeleteProgram = (programId: number, programName: string) => {
    showConfirm(
      `Are you sure you want to delete "${programName}"? This will permanently delete the program and all its beneficiaries and attendance records. This action cannot be undone.`,
      async () => {
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
            showAlert(data.message, 'success');
            loadPrograms();
            loadOverallEligibleCount();
          } else {
            showAlert('Failed to delete program: ' + (data.message || 'Unknown error'), 'error');
          }
        } catch (error) {
          console.error('Error deleting program:', error);
          showAlert('An error occurred while deleting the program. Please try again.', 'error');
        }
      },
      'Delete Program',
      true
    );
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    formData.append('action', 'update_program');
    formData.append('program_id', editingProgram.id.toString());

    try {
      const response = await fetch('/api/feeding-program', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        showAlert(data.message, 'success');
        setShowEditModal(false);
        setEditingProgram(null);
        loadPrograms();
      } else {
        setFormError(data.message);
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleEnrollStudentFromModal = (studentId: number, studentName: string) => {
    const programId = selectedProgramForStudent.get(studentId);

    if (!programId) {
      showAlert('Please select a feeding program first', 'warning');
      return;
    }

    const program = programs.find(p => p.id === programId);
    if (!program) return;

    showConfirm(
      `Enroll ${studentName} in "${program.name}"?`,
      async () => {
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
            showAlert(`${studentName} has been successfully enrolled in ${program.name}!`, 'success');
            await loadPrograms();
            await loadOverallEligibleCount();
            setSelectedProgramForStudent(prev => {
              const newMap = new Map(prev);
              newMap.delete(studentId);
              return newMap;
            });
          } else {
            showAlert('Failed to enroll student: ' + (data.message || 'Unknown error'), 'error');
          }
        } catch (error) {
          console.error('Error enrolling student:', error);
          showAlert('An error occurred while enrolling the student. Please try again.', 'error');
        } finally {
          setEnrollingStudent(null);
        }
      },
      'Enroll Student'
    );
  };

  const isPriorityStudent = (student: any) => {
    const hasPoorBMI = student.bmi_status === 'Severely Wasted' || student.bmi_status === 'Wasted';
    const hasPoorHFA = student.height_for_age_status === 'Severely Stunted' || student.height_for_age_status === 'Stunted';
    return hasPoorBMI || hasPoorHFA;
  };

  const getPriorityRank = (student: any) => {
    if (student.bmi_status === 'Severely Wasted') return 1;
    if (student.height_for_age_status === 'Severely Stunted') return 2;
    if (student.bmi_status === 'Wasted') return 3;
    if (student.height_for_age_status === 'Stunted') return 4;
    return 5;
  };

  const getStudentName = (student: any) =>
    [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ').toLowerCase();

  // Filter available students (not yet enrolled in the currently opened program)
  const availableStudents = students.filter((s) => !enrolledStudentIds.has(s.id));

  // Keep ordering deterministic: all priority first, then non-priority, then by grade level, then alphabetically by name.
  const filteredStudents = [...availableStudents]
    .filter((student) => {
      // Only show students with Severely Wasted or Wasted BMI
      if (student.bmi_status !== 'Severely Wasted' && student.bmi_status !== 'Wasted') return false;
      if (!searchStudent) return true;
      const searchLower = searchStudent.toLowerCase();
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const grade = `grade ${student.grade_level}`.toLowerCase();
      return fullName.includes(searchLower) || grade.includes(searchLower);
    })
    .sort((a, b) => {
      const priorityDiff = getPriorityRank(a) - getPriorityRank(b);
      if (priorityDiff !== 0) return priorityDiff;

      // Sort by grade level (ascending)
      const gradeDiff = (a.grade_level || 0) - (b.grade_level || 0);
      if (gradeDiff !== 0) return gradeDiff;

      // Sort alphabetically by name within same grade level
      return getStudentName(a).localeCompare(getStudentName(b));
    });

  const selectableFilteredStudents = filteredStudents.filter(
    (student) => !(studentEnrollments.has(student.id) && !enrolledStudentIds.has(student.id))
  );

  const selectablePriorityStudents = selectableFilteredStudents.filter((student) => isPriorityStudent(student));

  if (loading) return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-60 min-h-screen bg-slate-50 flex items-center justify-center">
        <ModuleLoader text="Loading..." />
      </main>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-60 min-h-screen bg-slate-50">
        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Feeding Programs</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage nutrition support programs and beneficiaries</p>
          </div>
          <button
            onClick={() => setShowProgramModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition"
            style={{ background: '#16a34a' }}
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
                onClick={() => { setShowNeedsSupportModal(true); setNeedsSupportPage(1); }}
                className="px-3 py-1.5 text-xs text-white rounded-lg transition flex-shrink-0 font-medium" style={{ background: '#b91c1c' }}
              >
                View
              </button>
            </div>
          )}

          {/* Programs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full"><ModuleLoader text="Loading programs..." /></div>
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
                        {!isEnded ? (
                          <button
                            onClick={() => viewBeneficiaries(program.id)}
                            className="flex-1 text-xs text-white px-3 py-1.5 rounded-lg transition font-medium"
                            style={{ background: '#1a3a6c' }}
                          >
                            View Beneficiaries
                          </button>
                        ) : (
                          <button
                            onClick={() => viewBeneficiaries(program.id)}
                            className="flex-1 text-xs text-white px-3 py-1.5 rounded-lg transition font-medium"
                            style={{ background: '#1a3a6c' }}
                          >
                            View Report
                          </button>
                        )}
                        {!isEnded && (
                        <button
                          onClick={() => openAddBeneficiaryModal(program.id)}
                          className="flex-1 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium" style={{ background: '#2a5a9a' }}
                        >
                          Add Beneficiaries
                        </button>
                        )}
                      </div>
                      {!isEnded && (
                        <button
                          onClick={() => { setEditingProgram(program); setShowEditModal(true); setFormError(''); }}
                          className="w-full text-white text-xs px-4 py-1.5 rounded-lg transition font-semibold" style={{ background: '#2563eb' }}
                        >
                          ✏️ Edit Program
                        </button>
                      )}
                      {isEnded && (
                      <button
                        onClick={() => generateReport(program.id, program.name, program.start_date, program.end_date)}
                        className="w-full bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-green-700 transition font-semibold"
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
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Add Beneficiary</h3>
              <button
                onClick={() => { setShowBeneficiaryModal(false); setFormError(''); setSearchStudent(''); setSelectedStudents(new Set()); setBenCurrentPage(1); }}
                className="text-white/70 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search + Select-all controls (non-scrolling) */}
            <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex-shrink-0 space-y-3">
              <div>
                <label htmlFor="searchStudent" className="block text-xs font-medium text-slate-600 mb-1">
                  Search Student
                </label>
                <input
                  type="text"
                  id="searchStudent"
                  placeholder="Search by name or grade level..."
                  value={searchStudent}
                  onChange={(e) => { setSearchStudent(e.target.value); setBenCurrentPage(1); }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Students *
                  {selectedStudents.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {selectedStudents.size} selected
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  {selectablePriorityStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const priorityIds = selectablePriorityStudents.map(s => s.id);
                        setSelectedStudents(prev => {
                          const next = new Set(prev);
                          priorityIds.forEach(id => next.add(id));
                          return next;
                        });
                      }}
                      className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition font-medium"
                    >
                      ⚠️ Select All Priority
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable student list */}
            <form id="add-beneficiary-form" onSubmit={handleAddBeneficiary} className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
              {(() => {
                const benTotalPages = Math.max(1, Math.ceil(filteredStudents.length / BEN_PAGE_SIZE));
                const pagedStudents = filteredStudents.slice(
                  (benCurrentPage - 1) * BEN_PAGE_SIZE,
                  benCurrentPage * BEN_PAGE_SIZE
                );
                return (
                  <>
                    <div className="space-y-2">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          {searchStudent ? 'No students found matching your search' : 'All Severely Wasted / Wasted students are already enrolled in this program'}
                        </div>
                      ) : (
                        pagedStudents.map((student) => {
                          const hasPoorBMI = student.bmi_status === 'Severely Wasted' || student.bmi_status === 'Wasted';
                          const hasPoorHFA = student.height_for_age_status === 'Severely Stunted' || student.height_for_age_status === 'Stunted';
                          const isPriority = hasPoorBMI || hasPoorHFA;
                          const isChecked = selectedStudents.has(student.id);
                          const enrolledInProgram = studentEnrollments.get(student.id);
                          const isEnrolledInOtherProgram = Boolean(enrolledInProgram && !enrolledStudentIds.has(student.id));

                          return (
                            <div
                              key={student.id}
                              onClick={() => {
                                if (isEnrolledInOtherProgram) return;
                                setSelectedStudents(prev => {
                                  const next = new Set(prev);
                                  if (next.has(student.id)) next.delete(student.id);
                                  else next.add(student.id);
                                  return next;
                                });
                              }}
                              className={`border-2 rounded-lg p-3 cursor-pointer transition select-none ${
                                isEnrolledInOtherProgram
                                  ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
                                  : isChecked
                                  ? 'border-blue-500 bg-blue-50'
                                  : isPriority
                                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isEnrolledInOtherProgram}
                                  onChange={() => {}}
                                  onClick={e => e.stopPropagation()}
                                  className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-slate-800 text-sm">
                                      {[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                                    </h4>
                                    {isPriority && <span className="text-red-500 font-bold text-xs">⚠️ Priority</span>}
                                    {isEnrolledInOtherProgram && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        Already in: {enrolledInProgram}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Grade {student.grade_level === 0 ? 'Kinder' : student.grade_level} • Age: {student.age}
                                  </p>
                                  <div className="flex gap-2 mt-1.5">
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      hasPoorBMI ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      BMI: {student.bmi_status || 'Normal'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      hasPoorHFA ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
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

                    {/* Pagination */}
                    {filteredStudents.length > BEN_PAGE_SIZE && (
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {filteredStudents.length} students &bull; Page {benCurrentPage} of {benTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setBenCurrentPage(1)} disabled={benCurrentPage === 1} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed">«</button>
                          <button type="button" onClick={() => setBenCurrentPage(p => Math.max(1, p - 1))} disabled={benCurrentPage === 1} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed">‹</button>
                          {Array.from({ length: benTotalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === benTotalPages || Math.abs(p - benCurrentPage) <= 1)
                            .reduce<(number | string)[]>((acc, p, i, arr) => {
                              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, i) =>
                              p === '…' ? (
                                <span key={`ell-${i}`} className="px-1 text-slate-400">…</span>
                              ) : (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => setBenCurrentPage(p as number)}
                                  className={`px-2.5 py-1 rounded border transition ${
                                    benCurrentPage === p ? 'text-white border-transparent' : 'border-slate-300 hover:bg-slate-100'
                                  }`}
                                  style={benCurrentPage === p ? { background: '#1a3a6c' } : {}}
                                >{p}</button>
                              )
                            )}
                          <button type="button" onClick={() => setBenCurrentPage(p => Math.min(benTotalPages, p + 1))} disabled={benCurrentPage === benTotalPages} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed">›</button>
                          <button type="button" onClick={() => setBenCurrentPage(benTotalPages)} disabled={benCurrentPage === benTotalPages} className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed">»</button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      ⚠️ Priority students have Wasted/Severely Wasted BMI or Stunted/Severely Stunted HFA and need immediate feeding support
                    </p>

                    {formError && (
                      <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs mt-3">
                        {formError}
                      </div>
                    )}
                  </>
                );
              })()}
            </form>

            {/* Footer — always visible outside the scroll area */}
            <div className="px-5 py-3 border-t border-slate-200 flex-shrink-0 flex justify-end gap-2 bg-white rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowBeneficiaryModal(false);
                  setFormError('');
                  setSearchStudent('');
                  setSelectedStudents(new Set());
                  setBenCurrentPage(1);
                }}
                className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-beneficiary-form"
                disabled={selectedStudents.size === 0}
                className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                  selectedStudents.size > 0
                    ? 'text-white hover:opacity-90'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                style={selectedStudents.size > 0 ? { background: '#1a3a6c' } : {}}
              >
                {selectedStudents.size > 1
                  ? `Add ${selectedStudents.size} Students`
                  : selectedStudents.size === 1
                  ? 'Add 1 Student'
                  : 'Add Beneficiary'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* View Beneficiaries Modal */}
      {showViewModal && (() => {
        const currentProgram = programs.find((p) => p.id === currentProgramId);
        const isEnded = currentProgram?.status === 'ended';

        // Filter beneficiaries based on search
        const filteredBeneficiaries = beneficiaries
          .filter((beneficiary) => {
            if (!searchViewBeneficiary) return true;
            const student = beneficiary.student || {};
            const searchLower = searchViewBeneficiary.toLowerCase();
            const fullName = `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.toLowerCase();
            const grade = student.grade_level === 0 ? 'kinder' : `grade ${student.grade_level}`.toLowerCase();
            return fullName.includes(searchLower) || grade.includes(searchLower);
          })
          .sort((a, b) => {
            const studentA = a.student || {};
            const studentB = b.student || {};

            // Sort by grade level (ascending)
            const gradeDiff = (studentA.grade_level || 0) - (studentB.grade_level || 0);
            if (gradeDiff !== 0) return gradeDiff;

            // Sort alphabetically by name within same grade level
            const nameA = `${studentA.first_name || ''} ${studentA.middle_name || ''} ${studentA.last_name || ''}`.trim();
            const nameB = `${studentB.first_name || ''} ${studentB.middle_name || ''} ${studentB.last_name || ''}`.trim();
            return nameA.localeCompare(nameB);
          });

        const totalPages = Math.max(1, Math.ceil(filteredBeneficiaries.length / VIEW_PAGE_SIZE));
        const pagedBeneficiaries = filteredBeneficiaries.slice(
          (viewCurrentPage - 1) * VIEW_PAGE_SIZE,
          viewCurrentPage * VIEW_PAGE_SIZE
        );
        return (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-auto my-4 flex flex-col max-h-[95vh]">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-t-xl" style={{ background: '#1a3a6c' }}>
                <h3 className="text-sm font-bold text-white truncate pr-2">
                  {currentProgram?.name} — Beneficiaries
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setBeneficiaries([]);
                    setSearchViewBeneficiary('');
                    setViewCurrentPage(1);
                  }}
                  className="text-white/70 hover:text-white flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary bar */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span><span className="font-semibold text-slate-800">{beneficiaries.length}</span> total beneficiaries</span>
                {filteredBeneficiaries.length > 0 && (
                  <span>Showing <span className="font-semibold text-slate-800">{(viewCurrentPage - 1) * VIEW_PAGE_SIZE + 1}–{Math.min(viewCurrentPage * VIEW_PAGE_SIZE, filteredBeneficiaries.length)}</span> of <span className="font-semibold text-slate-800">{filteredBeneficiaries.length}</span></span>
                )}
              </div>

              {/* Search Filter */}
              <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
                <label htmlFor="searchViewBeneficiary" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Search Beneficiary
                </label>
                <input
                  type="text"
                  id="searchViewBeneficiary"
                  placeholder="Search by name or grade level..."
                  value={searchViewBeneficiary}
                  onChange={(e) => { setSearchViewBeneficiary(e.target.value); setViewCurrentPage(1); }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!isEnded && beneficiaries.length > 0 && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleRemoveAllBeneficiaries}
                      className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition font-medium"
                    >
                      Remove All
                    </button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs min-w-[700px]">
                  <thead style={{ background: '#1a3a6c' }} className="text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-center font-semibold w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-center font-semibold">Grade</th>
                      <th className="px-3 py-2 text-center font-semibold">Age</th>
                      <th className="px-3 py-2 text-center font-semibold">Feeding Start Date</th>
                      <th className="px-3 py-2 text-center font-semibold">Feeding End Date</th>
                      <th className="px-3 py-2 text-center font-semibold">Baseline BMI</th>
                      <th className="px-3 py-2 text-center font-semibold">Baseline HFA</th>
                      <th className="px-3 py-2 text-center font-semibold">Current BMI</th>
                      <th className="px-3 py-2 text-center font-semibold">Current HFA</th>
                      <th className="px-3 py-2 text-center font-semibold">{isEnded ? 'Growth' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredBeneficiaries.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">
                          {searchViewBeneficiary ? 'No beneficiaries found matching your search' : 'No beneficiaries added yet'}
                        </td>
                      </tr>
                    ) : (
                      pagedBeneficiaries.map((beneficiary, idx) => {
                        const student = beneficiary.student || {};
                        const globalIndex = (viewCurrentPage - 1) * VIEW_PAGE_SIZE + idx + 1;
                        const growthStatus = isEnded ? getGrowthStatus(
                          beneficiary.bmi_status_at_enrollment || 'N/A',
                          beneficiary.bmi_status || 'N/A',
                          beneficiary.bmi || 0
                        ) : '';
                        return (
                          <tr key={beneficiary.id} className="hover:bg-slate-50 text-slate-700">
                            <td className="px-2 py-2 text-center text-slate-400 font-medium">{globalIndex}</td>
                            <td className="px-3 py-2 font-medium">
                              {[student.last_name, student.first_name, student.middle_name ? student.middle_name.charAt(0) + '.' : ''].filter(Boolean).join(', ').replace(', ', ', ') || [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {student.grade_level === 0 ? 'Kinder' : `Grade ${student.grade_level}`}
                            </td>
                            <td className="px-3 py-2 text-center">{student.age}</td>
                            <td className="px-3 py-2 text-center">{currentProgram?.start_date ? new Date(currentProgram.start_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-3 py-2 text-center">{currentProgram?.end_date ? new Date(currentProgram.end_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-3 py-2 text-center">
                              {beneficiary.bmi_at_enrollment ? (
                                <div>
                                  <div className="font-medium">{beneficiary.bmi_at_enrollment.toFixed(2)}</div>
                                  <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-0.5 font-medium ${
                                    beneficiary.bmi_status_at_enrollment === 'Severely Wasted' ? 'bg-red-100 text-red-700' :
                                    beneficiary.bmi_status_at_enrollment === 'Wasted' ? 'bg-orange-100 text-orange-700' :
                                    beneficiary.bmi_status_at_enrollment === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                    beneficiary.bmi_status_at_enrollment === 'Overweight' ? 'bg-yellow-100 text-yellow-700' :
                                    beneficiary.bmi_status_at_enrollment === 'Obese' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>{beneficiary.bmi_status_at_enrollment}</span>
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {beneficiary.height_for_age_status_at_enrollment ? (
                                <span className={`inline-block px-1.5 py-0.5 text-xs rounded font-medium ${
                                  beneficiary.height_for_age_status_at_enrollment === 'Severely Stunted' ? 'bg-red-100 text-red-700' :
                                  beneficiary.height_for_age_status_at_enrollment === 'Stunted' ? 'bg-orange-100 text-orange-700' :
                                  beneficiary.height_for_age_status_at_enrollment === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                  beneficiary.height_for_age_status_at_enrollment === 'Tall' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{beneficiary.height_for_age_status_at_enrollment}</span>
                              ) : 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {beneficiary.bmi ? (
                                <div>
                                  <div className="font-medium">{beneficiary.bmi.toFixed(2)}</div>
                                  <span className={`inline-block px-1.5 py-0.5 text-xs rounded mt-0.5 font-medium ${
                                    beneficiary.bmi_status === 'Severely Wasted' ? 'bg-red-100 text-red-700' :
                                    beneficiary.bmi_status === 'Wasted' ? 'bg-orange-100 text-orange-700' :
                                    beneficiary.bmi_status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                    beneficiary.bmi_status === 'Overweight' ? 'bg-yellow-100 text-yellow-700' :
                                    beneficiary.bmi_status === 'Obese' ? 'bg-red-100 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>{beneficiary.bmi_status}</span>
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {beneficiary.height_for_age_status ? (
                                <span className={`inline-block px-1.5 py-0.5 text-xs rounded font-medium ${
                                  beneficiary.height_for_age_status === 'Severely Stunted' ? 'bg-red-100 text-red-700' :
                                  beneficiary.height_for_age_status === 'Stunted' ? 'bg-orange-100 text-orange-700' :
                                  beneficiary.height_for_age_status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                                  beneficiary.height_for_age_status === 'Tall' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{beneficiary.height_for_age_status}</span>
                              ) : 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isEnded ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  growthStatus === 'Recovered'    ? 'bg-emerald-100 text-emerald-700' :
                                  growthStatus === 'Improved'     ? 'bg-green-100 text-green-800' :
                                  growthStatus === 'Maintained'   ? 'bg-orange-100 text-orange-700' :
                                  growthStatus === 'Not Improved' ? 'bg-red-100 text-red-700' :
                                  growthStatus === 'Overdone'     ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>{growthStatus}</span>
                              ) : (
                                <button
                                  onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                                  className="text-white px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap" style={{ background: '#b91c1c' }}
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

              {/* Pagination */}
              {filteredBeneficiaries.length > VIEW_PAGE_SIZE && (
                <div className="px-4 py-3 border-t border-slate-200 flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-b-xl">
                  <span className="text-xs text-slate-500">
                    Page {viewCurrentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewCurrentPage(1)}
                      disabled={viewCurrentPage === 1}
                      className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                    >«</button>
                    <button
                      onClick={() => setViewCurrentPage(p => Math.max(1, p - 1))}
                      disabled={viewCurrentPage === 1}
                      className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                    >‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - viewCurrentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '…' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setViewCurrentPage(p as number)}
                            className={`px-2.5 py-1 text-xs rounded border transition ${
                              viewCurrentPage === p
                                ? 'text-white border-transparent'
                                : 'border-slate-300 hover:bg-slate-100'
                            }`}
                            style={viewCurrentPage === p ? { background: '#1a3a6c' } : {}}
                          >{p}</button>
                        )
                      )}
                    <button
                      onClick={() => setViewCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={viewCurrentPage === totalPages}
                      className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                    >›</button>
                    <button
                      onClick={() => setViewCurrentPage(totalPages)}
                      disabled={viewCurrentPage === totalPages}
                      className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                    >»</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Students Needing Support Modal */}
      {showNeedsSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h2 className="text-sm font-bold text-white">Students Needing Feeding Support</h2>
              <button
                onClick={() => {
                  setShowNeedsSupportModal(false);
                  setSearchNeedsSupport('');
                  setNeedsSupportPage(1);
                }}
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

              {/* Search Filter */}
              <div className="mb-4">
                <label htmlFor="searchNeedsSupport" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Search Student
                </label>
                <input
                  type="text"
                  id="searchNeedsSupport"
                  placeholder="Search by name or grade level..."
                  value={searchNeedsSupport}
                  onChange={(e) => { setSearchNeedsSupport(e.target.value); setNeedsSupportPage(1); }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: '#1a3a6c' }} className="text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Grade</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">BMI Status</th>
                      <th className="px-4 py-3 text-left">HFA Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filteredNeedsSupportStudents = needsSupportStudents
                        .filter((student) => {
                          if (!searchNeedsSupport) return true;
                          const searchLower = searchNeedsSupport.toLowerCase();
                          const fullName = `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.toLowerCase();
                          const grade = student.grade_level === 0 ? 'kinder' : `grade ${student.grade_level}`.toLowerCase();
                          return fullName.includes(searchLower) || grade.includes(searchLower);
                        })
                        .sort((a, b) => {
                          // Sort by grade level (ascending)
                          const gradeDiff = (a.grade_level || 0) - (b.grade_level || 0);
                          if (gradeDiff !== 0) return gradeDiff;

                          // Sort alphabetically by name within same grade level
                          const nameA = `${a.first_name || ''} ${a.middle_name || ''} ${a.last_name || ''}`.trim();
                          const nameB = `${b.first_name || ''} ${b.middle_name || ''} ${b.last_name || ''}`.trim();
                          return nameA.localeCompare(nameB);
                        });

                      return filteredNeedsSupportStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                            {searchNeedsSupport ? 'No students found matching your search' : 'No students found'}
                          </td>
                        </tr>
                      ) : (
                        filteredNeedsSupportStudents
                          .slice((needsSupportPage - 1) * NEEDS_SUPPORT_PAGE_SIZE, needsSupportPage * NEEDS_SUPPORT_PAGE_SIZE)
                          .map((student) => {
                        const studentFullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
                        
                        return (
                          <tr key={student.id} className="hover:bg-slate-50 text-slate-700">
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
                          </tr>
                        );
                      })
                    );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(() => {
                const filteredNeedsSupportStudents = needsSupportStudents
                  .filter((student) => {
                    if (!searchNeedsSupport) return true;
                    const searchLower = searchNeedsSupport.toLowerCase();
                    const fullName = `${student.first_name || ''} ${student.middle_name || ''} ${student.last_name || ''}`.toLowerCase();
                    const grade = student.grade_level === 0 ? 'kinder' : `grade ${student.grade_level}`.toLowerCase();
                    return fullName.includes(searchLower) || grade.includes(searchLower);
                  })
                  .sort((a, b) => {
                    // Sort by grade level (ascending)
                    const gradeDiff = (a.grade_level || 0) - (b.grade_level || 0);
                    if (gradeDiff !== 0) return gradeDiff;

                    // Sort alphabetically by name within same grade level
                    const nameA = `${a.first_name || ''} ${a.middle_name || ''} ${a.last_name || ''}`.trim();
                    const nameB = `${b.first_name || ''} ${b.middle_name || ''} ${b.last_name || ''}`.trim();
                    return nameA.localeCompare(nameB);
                  });

                if (filteredNeedsSupportStudents.length <= NEEDS_SUPPORT_PAGE_SIZE) return null;

                const totalNSPages = Math.ceil(filteredNeedsSupportStudents.length / NEEDS_SUPPORT_PAGE_SIZE);
                return (
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Showing {(needsSupportPage - 1) * NEEDS_SUPPORT_PAGE_SIZE + 1}–{Math.min(needsSupportPage * NEEDS_SUPPORT_PAGE_SIZE, filteredNeedsSupportStudents.length)} of {filteredNeedsSupportStudents.length} students
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setNeedsSupportPage(1)}
                        disabled={needsSupportPage === 1}
                        className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                      >«</button>
                      <button
                        onClick={() => setNeedsSupportPage(p => Math.max(1, p - 1))}
                        disabled={needsSupportPage === 1}
                        className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                      >‹</button>
                      {Array.from({ length: totalNSPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalNSPages || Math.abs(p - needsSupportPage) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === '…' ? (
                            <span key={`ellipsis-${idx}`} className="px-1">…</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setNeedsSupportPage(item as number)}
                              className={`px-2 py-1 rounded border text-xs font-medium transition ${
                                needsSupportPage === item
                                  ? 'text-white border-transparent'
                                  : 'border-slate-300 hover:bg-slate-100'
                              }`}
                              style={needsSupportPage === item ? { background: '#1a3a6c' } : {}}
                            >{item}</button>
                          )
                        )}
                      <button
                        onClick={() => setNeedsSupportPage(p => Math.min(totalNSPages, p + 1))}
                        disabled={needsSupportPage === totalNSPages}
                        className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                      >›</button>
                      <button
                        onClick={() => setNeedsSupportPage(totalNSPages)}
                        disabled={needsSupportPage === totalNSPages}
                        className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 disabled:cursor-not-allowed"
                      >»</button>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setShowNeedsSupportModal(false);
                  setSearchNeedsSupport('');
                  setNeedsSupportPage(1);
                }}
                className="px-5 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertModal.open} onClose={() => setAlertModal(m => ({ ...m, open: false }))} message={alertModal.message} type={alertModal.type} title={alertModal.title} />
      <ConfirmModal isOpen={confirmModal.open} onClose={() => setConfirmModal(m => ({ ...m, open: false }))} onConfirm={confirmModal.onConfirm} message={confirmModal.message} title={confirmModal.title} danger={confirmModal.danger} />

      {/* Edit Program Modal */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
              <h3 className="text-sm font-bold text-white">Edit Feeding Program</h3>
              <button onClick={() => { setShowEditModal(false); setEditingProgram(null); setFormError(''); }} className="text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateProgram} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Program Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProgram.name}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProgram.description}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    defaultValue={editingProgram.start_date?.split('T')[0]}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    defaultValue={editingProgram.end_date?.split('T')[0]}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs">{formError}</div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingProgram(null); setFormError(''); }}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white rounded-lg transition font-medium bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
