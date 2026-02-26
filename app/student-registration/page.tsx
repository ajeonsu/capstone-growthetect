'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

const GRADES = [
  { label: 'Kinder',  value: 0, headerBg: 'bg-purple-600', cardBg: 'bg-purple-50',  border: 'border-purple-300', text: 'text-purple-700',  countBg: 'bg-purple-600' },
  { label: 'Grade 1', value: 1, headerBg: 'bg-blue-600',   cardBg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-700',    countBg: 'bg-blue-600'   },
  { label: 'Grade 2', value: 2, headerBg: 'bg-green-600',  cardBg: 'bg-green-50',   border: 'border-green-300',  text: 'text-green-700',   countBg: 'bg-green-600'  },
  { label: 'Grade 3', value: 3, headerBg: 'bg-yellow-500', cardBg: 'bg-yellow-50',  border: 'border-yellow-300', text: 'text-yellow-700',  countBg: 'bg-yellow-500' },
  { label: 'Grade 4', value: 4, headerBg: 'bg-orange-500', cardBg: 'bg-orange-50',  border: 'border-orange-300', text: 'text-orange-700',  countBg: 'bg-orange-500' },
  { label: 'Grade 5', value: 5, headerBg: 'bg-red-600',    cardBg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-700',     countBg: 'bg-red-600'    },
  { label: 'Grade 6', value: 6, headerBg: 'bg-indigo-600', cardBg: 'bg-indigo-50',  border: 'border-indigo-300', text: 'text-indigo-700',  countBg: 'bg-indigo-600' },
];

export default function StudentRegistrationPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Grade modal state
  const [selectedGrade, setSelectedGrade] = useState<typeof GRADES[0] | null>(null);
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradePage, setGradePage] = useState(1);
  const gradeItemsPerPage = 10;

  // Add/Edit form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [prefilledGrade, setPrefilledGrade] = useState<number | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await fetch('/api/students', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setStudents(data.students);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate: string) => {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getGradeLabel = (value: number) => {
    const g = GRADES.find((g) => g.value === value);
    return g ? g.label : `Grade ${value}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const formData = new FormData(e.target as HTMLFormElement);
    const method = editingStudent ? 'PUT' : 'POST';
    try {
      let response;
      if (method === 'PUT') {
        const body: any = {};
        formData.forEach((v, k) => { body[k] = v; });
        body.id = editingStudent.id;
        response = await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch('/api/students', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      }
      const data = await response.json();
      if (data.success) {
        setShowFormModal(false);
        setEditingStudent(null);
        await loadStudents();
      } else {
        setFormError(data.message);
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const response = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        await loadStudents();
      } else {
        alert(data.message);
      }
    } catch {
      alert('Error deleting student');
    }
  };

  const openAddModal = (gradeValue?: number) => {
    setEditingStudent(null);
    setPrefilledGrade(gradeValue ?? null);
    setShowFormModal(true);
    setFormError('');
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setPrefilledGrade(null);
    setShowFormModal(true);
    setFormError('');
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingStudent(null);
    setFormError('');
  };

  const openGradeModal = (gradeInfo: typeof GRADES[0]) => {
    setSelectedGrade(gradeInfo);
    setGradeSearch('');
    setGradePage(1);
  };

  const closeGradeModal = () => {
    setSelectedGrade(null);
    setGradeSearch('');
    setGradePage(1);
  };

  // Students filtered by selected grade
  const gradeStudents = selectedGrade
    ? students.filter((s) => s.grade_level === selectedGrade.value)
    : [];

  const filteredGradeStudents = gradeStudents.filter((s) => {
    if (!gradeSearch) return true;
    const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
    return fullName.includes(gradeSearch.toLowerCase()) || (s.lrn || '').includes(gradeSearch);
  });

  const totalGradePages = Math.ceil(filteredGradeStudents.length / gradeItemsPerPage);
  const paginatedGradeStudents = filteredGradeStudents.slice(
    (gradePage - 1) * gradeItemsPerPage,
    gradePage * gradeItemsPerPage
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Student Registration</h1>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Loading students...</p>
            </div>
          ) : (
            <>
              {/* Grade Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                {GRADES.map((gradeInfo) => {
                  const gradeStudentsList = students.filter((s) => s.grade_level === gradeInfo.value);
                  const count = gradeStudentsList.length;
                  const maleCount = gradeStudentsList.filter((s) => s.gender === 'Male' || s.gender === 'M').length;
                  const femaleCount = gradeStudentsList.filter((s) => s.gender === 'Female' || s.gender === 'F').length;
                  const malePercent = count > 0 ? Math.round((maleCount / count) * 100) : 0;
                  return (
                    <button
                      key={gradeInfo.value}
                      onClick={() => openGradeModal(gradeInfo)}
                      className={`group flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2 ${gradeInfo.border} hover:scale-105 cursor-pointer text-left`}
                    >
                      {/* Colored header */}
                      <div className={`w-full ${gradeInfo.headerBg} py-5 flex flex-col items-center gap-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-white font-bold text-sm">{gradeInfo.label}</p>
                      </div>
                      {/* Card body */}
                      <div className={`w-full ${gradeInfo.cardBg} flex flex-col items-center py-4 px-3 gap-3 flex-1`}>
                        {/* Total count */}
                        <div className="flex flex-col items-center">
                          <span className={`${gradeInfo.countBg} text-white text-2xl font-bold rounded-full w-14 h-14 flex items-center justify-center shadow`}>
                            {count}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">total students</p>
                        </div>
                        {/* M / F breakdown */}
                        <div className="w-full space-y-1">
                          <div className="flex justify-between text-xs font-medium text-gray-600">
                            <span>♂ {maleCount} Male</span>
                            <span>♀ {femaleCount} Female</span>
                          </div>
                          {/* Gender bar */}
                          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                            {count > 0 && (
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${malePercent}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <p className={`text-xs font-semibold ${gradeInfo.text} group-hover:underline`}>View Students →</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Enrollment Summary Table */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Enrollment Summary
                  </h2>
                  <span className="text-white text-sm font-medium opacity-80">Total: {students.length} students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grade Level</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-blue-500 uppercase tracking-wider">♂ Male</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-pink-500 uppercase tracking-wider">♀ Female</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-56">Enrollment</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {GRADES.map((gradeInfo) => {
                        const gradeStudentsList = students.filter((s) => s.grade_level === gradeInfo.value);
                        const total = gradeStudentsList.length;
                        const male = gradeStudentsList.filter((s) => s.gender === 'Male' || s.gender === 'M').length;
                        const female = gradeStudentsList.filter((s) => s.gender === 'Female' || s.gender === 'F').length;
                        const grandTotal = students.length || 1;
                        const percent = Math.round((total / grandTotal) * 100);
                        return (
                          <tr key={gradeInfo.value} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-8 rounded-full ${gradeInfo.headerBg}`}></span>
                                <span className={`font-semibold ${gradeInfo.text}`}>{gradeInfo.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-semibold text-blue-600">{male}</td>
                            <td className="px-6 py-4 text-center font-semibold text-pink-600">{female}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`${gradeInfo.countBg} text-white font-bold text-sm px-3 py-1 rounded-full`}>{total}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${gradeInfo.headerBg} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 w-8">{percent}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => openGradeModal(gradeInfo)}
                                className={`text-xs font-semibold px-4 py-1.5 rounded-full border-2 ${gradeInfo.border} ${gradeInfo.text} hover:${gradeInfo.headerBg} hover:text-white transition`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grand total row */}
                      <tr className="bg-green-50 font-bold border-t-2 border-green-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full bg-green-600"></span>
                            <span className="font-bold text-green-800">GRAND TOTAL</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-700">
                          {students.filter((s) => s.gender === 'Male' || s.gender === 'M').length}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-pink-700">
                          {students.filter((s) => s.gender === 'Female' || s.gender === 'F').length}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-green-600 text-white font-bold text-sm px-3 py-1 rounded-full">{students.length}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-600 rounded-full w-full" />
                            </div>
                            <span className="text-xs text-gray-500 w-8">100%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Grade Detail Modal ── */}
      {selectedGrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className={`${selectedGrade.headerBg} px-6 py-4 flex items-center justify-between flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-xl font-bold text-white">{selectedGrade.label} — Students</h2>
                <span className="bg-white bg-opacity-30 text-white text-sm font-semibold px-3 py-0.5 rounded-full">
                  {gradeStudents.length} total
                </span>
              </div>
              <button onClick={closeGradeModal} className="text-white hover:text-gray-200 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search + Add Button */}
            <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 flex-shrink-0">
              <input
                type="text"
                value={gradeSearch}
                onChange={(e) => { setGradeSearch(e.target.value); setGradePage(1); }}
                placeholder="Search by name or LRN..."
                className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <button
                onClick={() => openAddModal(selectedGrade.value)}
                className="w-full sm:w-auto bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-semibold shadow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Student
              </button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>LRN</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>Name</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>Gender</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>Age</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>Section</th>
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${selectedGrade.text}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedGradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        {gradeSearch ? 'No students match your search.' : `No students enrolled in ${selectedGrade.label} yet.`}
                      </td>
                    </tr>
                  ) : (
                    paginatedGradeStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-700">{student.lrn}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{student.gender}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{student.age || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{student.section || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(student)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 transition font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteStudent(student.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded-md text-xs hover:bg-red-700 transition font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredGradeStudents.length > gradeItemsPerPage && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <p className="text-sm text-gray-600">
                  Showing {(gradePage - 1) * gradeItemsPerPage + 1} to{' '}
                  {Math.min(gradePage * gradeItemsPerPage, filteredGradeStudents.length)} of{' '}
                  {filteredGradeStudents.length} students
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGradePage((p) => Math.max(1, p - 1))}
                    disabled={gradePage === 1}
                    className={`px-3 py-1 rounded text-sm ${gradePage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalGradePages }, (_, i) => i + 1)
                    .filter((i) => i === 1 || i === totalGradePages || (i >= gradePage - 1 && i <= gradePage + 1))
                    .map((i, idx, arr) => (
                      <div key={i} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-1 text-gray-400">…</span>}
                        <button
                          onClick={() => setGradePage(i)}
                          className={`px-3 py-1 rounded text-sm ${i === gradePage ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          {i}
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() => setGradePage((p) => Math.min(totalGradePages, p + 1))}
                    disabled={gradePage === totalGradePages}
                    className={`px-3 py-1 rounded text-sm ${gradePage === totalGradePages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Student Form Modal ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            {/* Form Header */}
            <div className="bg-green-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button onClick={closeFormModal} className="text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input type="hidden" name="id" value={editingStudent?.id || ''} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LRN *</label>
                  <input type="text" name="lrn" required defaultValue={editingStudent?.lrn || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFID Card UID 🎴</label>
                  <input type="text" name="rfid_uid" placeholder="Tap RFID card or enter UID"
                    defaultValue={editingStudent?.rfid_uid || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <p className="text-xs text-gray-500 mt-1">Optional: For automatic student selection</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" name="first_name" required defaultValue={editingStudent?.first_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input type="text" name="middle_name" defaultValue={editingStudent?.middle_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" name="last_name" required defaultValue={editingStudent?.last_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate *</label>
                  <input type="date" name="birthdate" required defaultValue={editingStudent?.birthdate || ''}
                    onChange={(e) => {
                      const age = calculateAge(e.target.value);
                      const el = document.getElementById('ageField') as HTMLInputElement;
                      if (el) el.value = age.toString();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" id="ageField" name="age" readOnly defaultValue={editingStudent?.age || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select name="gender" required defaultValue={editingStudent?.gender || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
                  <select name="grade_level" required
                    defaultValue={editingStudent?.grade_level ?? prefilledGrade ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select Grade</option>
                    <option value="0">Kinder</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input type="text" name="section" defaultValue={editingStudent?.section || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input type="tel" name="contact_number" defaultValue={editingStudent?.contact_number || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea name="address" rows={2} defaultValue={editingStudent?.address || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name</label>
                <input type="text" name="parent_guardian" defaultValue={editingStudent?.parent_guardian || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeFormModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
