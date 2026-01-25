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
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Feeding Programs</h1>
            <button
              onClick={() => setShowProgramModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Program
            </button>
          </div>

           {/* Alert for students needing feeding support */}
          {needsSupportCount > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800">Students Need Feeding Support</h3>
                    <p className="text-red-700 text-sm mt-1">
                      {needsSupportCount} {needsSupportCount === 1 ? 'student has' : 'students have'} poor nutritional status (Severely Wasted/Wasted BMI or Severely Stunted/Stunted Height For Age) and should be enrolled in feeding programs for nutritional support.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNeedsSupportModal(true)}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex-shrink-0"
                >
                  View
                </button>
              </div>
            </div>
          )}

          {/* Programs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading programs...</div>
            ) : programs.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">No programs found. Create your first program!</div>
            ) : (
              programs.map((program) => {
                const startDate = new Date(program.start_date).toLocaleDateString();
                const endDate = new Date(program.end_date).toLocaleDateString();
                const isEnded = program.status === 'ended';
                const statusColor = program.status === 'active' ? 'bg-green-100 text-green-800' : 
                                   program.status === 'ended' ? 'bg-red-100 text-red-800' : 
                                   'bg-gray-100 text-gray-800';

                return (
                  <div key={program.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{program.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                        {program.status}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{program.description || 'No description'}</p>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {startDate} - {endDate}
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {program.total_beneficiaries} Beneficiaries
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewBeneficiaries(program.id)}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          View
                        </button>
                        {!isEnded && (
                        <button
                          onClick={() => openAddBeneficiaryModal(program.id)}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          Add Student
                        </button>
                        )}
                      </div>
                      <button
                        onClick={() => generateReport(program.id, program.name, program.start_date, program.end_date)}
                        className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-semibold shadow-md"
                      >
                        📄 Generate Report
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(program.id, program.name)}
                        className="w-full bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition text-sm font-semibold shadow-md"
                      >
                        🗑️ Delete Program
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Create Feeding Program</h3>

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div>
                <label htmlFor="programName" className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  id="programName"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="start_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="end_date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowProgramModal(false);
                    setFormError('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800">Add Beneficiary</h3>
                <button
                  onClick={() => {
                    setShowBeneficiaryModal(false);
                    setFormError('');
                    setSearchStudent('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4">
                <label htmlFor="searchStudent" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Student
                </label>
                <input
                  type="text"
                  id="searchStudent"
                  placeholder="Search by name or grade level..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleAddBeneficiary}>
                <input type="hidden" name="program_id" value={currentProgramId || ''} />
                <input type="hidden" name="student_id" value={selectedStudent || ''} />
                <input type="hidden" name="enrollment_date" value={new Date().toISOString().split('T')[0]} />

                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Student *
                </label>

                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
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
                          className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                            selectedStudent === student.id
                              ? 'border-green-500 bg-green-50'
                              : isPriority
                              ? 'border-red-300 bg-red-50 hover:border-red-400'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
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
                                  className="w-4 h-4 text-green-600"
                                />
                                <h4 className="font-semibold text-gray-900">
                                  {student.first_name} {student.last_name}
                                </h4>
                                {isPriority && (
                                  <span className="text-red-600 font-bold">⚠️</span>
                                )}
                                {isEnrolledInOtherProgram && (
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                    📋 Enrolled in: {enrolledInProgram}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 ml-6 mt-1">
                                Grade {student.grade_level} • Age: {student.age}
                              </p>
                              <div className="flex gap-3 ml-6 mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  student.bmi_status === 'Severely Wasted' || student.bmi_status === 'Wasted'
                                    ? 'bg-red-100 text-red-800 font-semibold'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  BMI: {student.bmi_status || 'Normal'}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  student.height_for_age_status === 'Severely Stunted' || student.height_for_age_status === 'Stunted'
                                    ? 'bg-red-100 text-red-800 font-semibold'
                                    : 'bg-gray-100 text-gray-700'
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

                <p className="text-xs text-gray-500 mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                  🔴 Highlighted students have Wasted/Severely Wasted BMI or Stunted/Severely Stunted Height For Age status and need immediate feeding support
                </p>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
                    {formError}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBeneficiaryModal(false);
                      setFormError('');
                      setSearchStudent('');
                      setSelectedStudent(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedStudent}
                    className={`px-6 py-2 rounded-lg transition ${
                      selectedStudent
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-7xl w-full mx-4 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {programs.find((p) => p.id === currentProgramId)?.name} - Beneficiaries
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setBeneficiaries([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-600 text-white">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {beneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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
                        <tr key={beneficiary.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {student.first_name} {student.middle_name || ''} {student.last_name}
                          </td>
                          <td className="px-4 py-3 text-sm">Grade {student.grade_level}</td>
                          <td className="px-4 py-3 text-sm">{student.age}</td>
                          <td className="px-4 py-3 text-sm">{new Date(beneficiary.enrollment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">
                            {beneficiary.bmi_at_enrollment ? (
                              <div>
                                <div className="font-medium">{beneficiary.bmi_at_enrollment.toFixed(2)}</div>
                                <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                                  beneficiary.bmi_status_at_enrollment === 'Severely Wasted' ? 'bg-red-100 text-red-800' :
                                  beneficiary.bmi_status_at_enrollment === 'Wasted' ? 'bg-orange-100 text-orange-800' :
                                  beneficiary.bmi_status_at_enrollment === 'Normal' ? 'bg-green-100 text-green-800' :
                                  beneficiary.bmi_status_at_enrollment === 'Overweight' ? 'bg-yellow-100 text-yellow-800' :
                                  beneficiary.bmi_status_at_enrollment === 'Obese' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
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
                              <span className={`inline-block px-2 py-1 text-xs rounded ${
                                beneficiary.height_for_age_status_at_enrollment === 'Severely Stunted' ? 'bg-red-100 text-red-800' :
                                beneficiary.height_for_age_status_at_enrollment === 'Stunted' ? 'bg-orange-100 text-orange-800' :
                                beneficiary.height_for_age_status_at_enrollment === 'Normal' ? 'bg-green-100 text-green-800' :
                                beneficiary.height_for_age_status_at_enrollment === 'Tall' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
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
                                <span className={`inline-block px-2 py-0.5 text-xs rounded mt-1 ${
                                  beneficiary.bmi_status === 'Severely Wasted' ? 'bg-red-100 text-red-800' :
                                  beneficiary.bmi_status === 'Wasted' ? 'bg-orange-100 text-orange-800' :
                                  beneficiary.bmi_status === 'Normal' ? 'bg-green-100 text-green-800' :
                                  beneficiary.bmi_status === 'Overweight' ? 'bg-yellow-100 text-yellow-800' :
                                  beneficiary.bmi_status === 'Obese' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
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
                              <span className={`inline-block px-2 py-1 text-xs rounded ${
                                beneficiary.height_for_age_status === 'Severely Stunted' ? 'bg-red-100 text-red-800' :
                                beneficiary.height_for_age_status === 'Stunted' ? 'bg-orange-100 text-orange-800' :
                                beneficiary.height_for_age_status === 'Normal' ? 'bg-green-100 text-green-800' :
                                beneficiary.height_for_age_status === 'Tall' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {beneficiary.height_for_age_status}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEnded ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                growthStatus === 'Improve' ? 'bg-green-100 text-green-800' :
                                growthStatus === 'Overdone' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {growthStatus}
                              </span>
                            ) : (
                            <button
                              onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-red-50">
              <h2 className="text-2xl font-bold text-red-800">Students Needing Feeding Support</h2>
              <button
                onClick={() => setShowNeedsSupportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                ℹ️ These students have poor nutritional status and should be enrolled in feeding programs
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">LRN</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Grade</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">BMI Status</th>
                      <th className="px-4 py-3 text-left">HFA Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {needsSupportStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      needsSupportStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{student.lrn}</td>
                          <td className="px-4 py-3">
                            {student.first_name} {student.middle_name} {student.last_name}
                          </td>
                          <td className="px-4 py-3">
                            {student.grade_level === 0 ? 'Kinder' : `Grade ${student.grade_level}`}
                          </td>
                          <td className="px-4 py-3">{student.gender}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              student.bmi_status === 'Severely Wasted' ? 'bg-red-100 text-red-800' :
                              student.bmi_status === 'Wasted' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {student.bmi_status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              student.height_for_age_status === 'Severely Stunted' ? 'bg-red-100 text-red-800' :
                              student.height_for_age_status === 'Stunted' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {student.height_for_age_status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowNeedsSupportModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
