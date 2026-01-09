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
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState('');
  const [needsSupportCount, setNeedsSupportCount] = useState(0);

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
      const response = await fetch('/api/feeding-program?type=eligible_students&program_id=0', {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();
      if (data.success) {
        setNeedsSupportCount(data.eligible_students?.length || 0);
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
            return {
              ...student,
              bmi_status: bmiRecord?.bmi_status || null,
              isPriority: bmiRecord && (bmiRecord.bmi_status === 'Severely Wasted' || bmiRecord.bmi_status === 'Wasted'),
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
  };

  const viewBeneficiaries = async (programId: number) => {
    setCurrentProgramId(programId);
    setShowViewModal(true);
    await loadEnrolledStudents(programId);
  };

  const generateReport = async (programId: number, programName: string, startDate: string, endDate: string) => {
    if (!confirm(`Generate report for "${programName}"? This will create a pending report that will be sent for approval.`)) {
      return;
    }

    try {
      // Generate report PDF/HTML
      const formData = new FormData();
      formData.append('program_id', programId.toString());
      formData.append('date_from', startDate);
      formData.append('date_to', endDate);
      formData.append('title', `Feeding Program: ${programName}`);
      formData.append('description', `Feeding program report for ${programName} covering the period from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`);

      // Note: generate_feeding_report.php would need to be converted to Next.js API route
      // For now, we'll create the report entry directly
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
      }));

      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
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
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800">Students Need Feeding Support</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {needsSupportCount} students have "Severely Wasted" or "Wasted" BMI status and should be enrolled in feeding programs for nutritional support.
                  </p>
                </div>
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
                const statusColor = program.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

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
                        <button
                          onClick={() => openAddBeneficiaryModal(program.id)}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          Add Student
                        </button>
                      </div>
                      <button
                        onClick={() => generateReport(program.id, program.name, program.start_date, program.end_date)}
                        className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-semibold shadow-md"
                      >
                        📄 Generate Report
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Add Beneficiary</h3>

            {priorityStudents.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-bold text-red-800 text-base mb-1">⚠️ Priority Students Available</p>
                    <p className="text-red-700 text-sm font-semibold mb-2">
                      {priorityStudents.length} students need feeding support: {priorityStudents.filter((s) => s.bmi_status === 'Severely Wasted').length} Severely Wasted, {priorityStudents.filter((s) => s.bmi_status === 'Wasted').length} Wasted
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAddBeneficiary} className="space-y-4">
              <input type="hidden" name="program_id" value={currentProgramId || ''} />

              <div>
                <label htmlFor="beneficiaryStudent" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <select
                  id="beneficiaryStudent"
                  name="student_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Choose a student...</option>
                  {priorityStudents.length > 0 && (
                    <optgroup label="⚠️ PRIORITY STUDENTS (Need Feeding Support)">
                      {priorityStudents.map((s) => {
                        const statusIcon = s.bmi_status === 'Severely Wasted' ? '🔴' : '🟠';
                        return (
                          <option key={s.id} value={s.id} style={{ backgroundColor: '#fee2e2', fontWeight: 'bold', color: '#991b1b' }}>
                            {statusIcon} {s.first_name} {s.last_name} (Grade {s.grade_level}) - {s.bmi_status}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {regularStudents.length > 0 && (
                    <optgroup label="Other Students">
                      {regularStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} (Grade {s.grade_level})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availableStudents.length === 0 && (
                    <option value="" disabled>
                      All students are already enrolled in this program
                    </option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">⚠️ Priority students (highlighted in red) need immediate feeding support</p>
              </div>

              <div>
                <label htmlFor="enrollmentDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Date *
                </label>
                <input
                  type="date"
                  id="enrollmentDate"
                  name="enrollment_date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
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
                    setShowBeneficiaryModal(false);
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
                  Add Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Beneficiaries Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full mx-4 my-8">
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
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LRN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BMI at Enrollment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current BMI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                      return (
                        <tr key={beneficiary.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{student.lrn}</td>
                          <td className="px-4 py-3">
                            {student.first_name} {student.middle_name || ''} {student.last_name}
                          </td>
                          <td className="px-4 py-3">Grade {student.grade_level}</td>
                          <td className="px-4 py-3">{student.age}</td>
                          <td className="px-4 py-3">{new Date(beneficiary.enrollment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {beneficiary.bmi_at_enrollment ? (
                              <>
                                {beneficiary.bmi_at_enrollment.toFixed(2)} ({beneficiary.bmi_status_at_enrollment})
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {beneficiary.bmi ? (
                              <>
                                {beneficiary.bmi.toFixed(2)} ({beneficiary.bmi_status})
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {beneficiary.attendance_rate !== undefined
                              ? `${beneficiary.attendance_rate}% (${beneficiary.days_present}/${beneficiary.total_attendance})`
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Remove
                            </button>
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
    </div>
  );
}
