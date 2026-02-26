'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

const GRADES = [
  { label: 'Kinder',  value: 0, headerBg: 'bg-violet-700',  cardBg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700',  countBg: 'bg-violet-700'  },
  { label: 'Grade 1', value: 1, headerBg: 'bg-sky-700',     cardBg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',     countBg: 'bg-sky-700'     },
  { label: 'Grade 2', value: 2, headerBg: 'bg-teal-700',    cardBg: 'bg-teal-50',    border: 'border-teal-200',   text: 'text-teal-700',    countBg: 'bg-teal-700'    },
  { label: 'Grade 3', value: 3, headerBg: 'bg-amber-600',   cardBg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',   countBg: 'bg-amber-600'   },
  { label: 'Grade 4', value: 4, headerBg: 'bg-orange-600',  cardBg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700',  countBg: 'bg-orange-600'  },
  { label: 'Grade 5', value: 5, headerBg: 'bg-rose-700',    cardBg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',    countBg: 'bg-rose-700'    },
  { label: 'Grade 6', value: 6, headerBg: 'bg-indigo-700',  cardBg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-700',  countBg: 'bg-indigo-700'  },
];

// Empty row template for bulk Kinder registration
const emptyKinderRow = () => ({
  id: Math.random().toString(36).slice(2),
  lrn: '', first_name: '', middle_name: '', last_name: '',
  birthdate: '', age: '', gender: '', section: '', parent_guardian: '', contact_number: '',
});

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

  // New School Year — Promotion modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [repeatingIds, setRepeatingIds] = useState<Set<number>>(new Set());
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteGradeFilter, setPromoteGradeFilter] = useState<number | ''>('');

  // Bulk Kinder Registration modal
  const [showBulkKinderModal, setShowBulkKinderModal] = useState(false);
  const [kinderRows, setKinderRows] = useState<ReturnType<typeof emptyKinderRow>[]>([emptyKinderRow()]);
  const [bulkError, setBulkError] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  // ── Grade Promotion ───────────────────────────────────────────────────────
  const openPromoteModal = () => {
    setRepeatingIds(new Set());
    setPromoteSearch('');
    setPromoteGradeFilter('');
    setShowPromoteModal(true);
  };

  const toggleRepeating = (id: number) => {
    setRepeatingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote', repeatingIds: Array.from(repeatingIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPromoteModal(false);
        setRepeatingIds(new Set());
        await loadStudents();
        alert(data.message);
        openBulkKinderModal();
      } else {
        alert('Error: ' + data.message);
      }
    } catch {
      alert('An error occurred during promotion.');
    } finally {
      setPromoting(false);
    }
  };

  // ── Bulk Kinder helpers ───────────────────────────────────────────────────
  const openBulkKinderModal = () => {
    setKinderRows([emptyKinderRow()]);
    setBulkError('');
    setShowBulkKinderModal(true);
  };

  const updateKinderRow = (id: string, field: string, value: string) => {
    setKinderRows((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // Auto-calculate age when birthdate changes
        if (field === 'birthdate' && value) {
          const birth = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          updated.age = age.toString();
        }
        return updated;
      })
    );
  };

  const addKinderRow = () => setKinderRows((rows) => [...rows, emptyKinderRow()]);

  const removeKinderRow = (id: string) =>
    setKinderRows((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));

  const handleBulkKinderSubmit = async () => {
    setBulkError('');
    // Validate required fields
    for (let i = 0; i < kinderRows.length; i++) {
      const r = kinderRows[i];
      if (!r.lrn || !r.first_name || !r.last_name || !r.birthdate || !r.gender) {
        setBulkError(`Row ${i + 1}: LRN, First Name, Last Name, Birthdate, and Gender are required.`);
        return;
      }
    }
    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_insert', students: kinderRows }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBulkKinderModal(false);
        await loadStudents();
        alert(data.message);
      } else {
        setBulkError(data.message);
      }
    } catch {
      setBulkError('An error occurred. Please try again.');
    } finally {
      setBulkSubmitting(false);
    }
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
    <div className="bg-slate-50 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-60 min-h-screen">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Student Registration</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage enrolled students by grade level</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openBulkKinderModal}
              className="flex items-center gap-1.5 bg-violet-700 text-white px-3.5 py-2 rounded-lg hover:bg-violet-800 transition font-semibold text-xs shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Bulk Register Kinder
            </button>
            <button
              onClick={openPromoteModal}
              className="flex items-center gap-1.5 bg-amber-600 text-white px-3.5 py-2 rounded-lg hover:bg-amber-700 transition font-semibold text-xs shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              New School Year
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
              <p className="mt-3 text-slate-500 text-sm">Loading students...</p>
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
                      className={`group flex flex-col rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border ${gradeInfo.border} hover:-translate-y-0.5 cursor-pointer text-left`}
                    >
                      {/* Colored header */}
                      <div className={`w-full ${gradeInfo.headerBg} py-4 flex flex-col items-center gap-1`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-white font-bold text-xs">{gradeInfo.label}</p>
                      </div>
                      {/* Card body */}
                      <div className={`w-full ${gradeInfo.cardBg} flex flex-col items-center py-3 px-2.5 gap-2.5 flex-1`}>
                        {/* Total count */}
                        <div className="flex flex-col items-center">
                          <span className={`${gradeInfo.countBg} text-white text-xl font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-sm`}>
                            {count}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">students</p>
                        </div>
                        {/* M / F breakdown */}
                        <div className="w-full space-y-1">
                          <div className="flex justify-between text-xs font-medium text-slate-600">
                            <span>♂ {maleCount}</span>
                            <span>♀ {femaleCount}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            {count > 0 && (
                              <div
                                className="h-full bg-sky-500 rounded-full transition-all"
                                style={{ width: `${malePercent}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <p className={`text-xs font-semibold ${gradeInfo.text}`}>View →</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Enrollment Summary Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between" style={{ background: '#1a3a6c' }}>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Enrollment Summary
                  </h2>
                  <span className="text-blue-200 text-xs font-medium">Total: {students.length} students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade Level</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-600 uppercase tracking-wider">♂ Male</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-rose-500 uppercase tracking-wider">♀ Female</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Enrollment</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {GRADES.map((gradeInfo) => {
                        const gradeStudentsList = students.filter((s) => s.grade_level === gradeInfo.value);
                        const total = gradeStudentsList.length;
                        const male = gradeStudentsList.filter((s) => s.gender === 'Male' || s.gender === 'M').length;
                        const female = gradeStudentsList.filter((s) => s.gender === 'Female' || s.gender === 'F').length;
                        const grandTotal = students.length || 1;
                        const percent = Math.round((total / grandTotal) * 100);
                        return (
                          <tr key={gradeInfo.value} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-6 rounded-full ${gradeInfo.headerBg}`}></span>
                                <span className={`font-semibold text-sm ${gradeInfo.text}`}>{gradeInfo.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-sky-700">{male}</td>
                            <td className="px-4 py-3 text-center font-semibold text-rose-600">{female}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`${gradeInfo.countBg} text-white font-bold text-xs px-2.5 py-1 rounded-full`}>{total}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${gradeInfo.headerBg} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 w-8">{percent}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => openGradeModal(gradeInfo)}
                                className={`text-xs font-semibold px-3 py-1 rounded-full border ${gradeInfo.border} ${gradeInfo.text} hover:bg-slate-100 transition`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grand total row */}
                      <tr className="bg-green-50 font-bold border-t-2 border-green-200">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-6 rounded-full bg-green-700"></span>
                            <span className="font-bold text-green-800 text-sm">GRAND TOTAL</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-sky-700">
                          {students.filter((s) => s.gender === 'Male' || s.gender === 'M').length}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600">
                          {students.filter((s) => s.gender === 'Female' || s.gender === 'F').length}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-green-700 text-white font-bold text-xs px-2.5 py-1 rounded-full">{students.length}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-700 rounded-full w-full" />
                            </div>
                            <span className="text-xs text-slate-500 w-8">100%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>{/* max-w-7xl */}
        </div>{/* p-4 sm:p-6 */}
      </main>

      {/* ── New School Year / Promotion Modal ── */}
      {showPromoteModal && (() => {
        // Students filtered for the repeaters panel
        const promoteFiltered = students.filter((s) => {
          const nameMatch = promoteSearch
            ? `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase().includes(promoteSearch.toLowerCase()) ||
              (s.lrn || '').includes(promoteSearch)
            : true;
          const gradeMatch = promoteGradeFilter !== '' ? s.grade_level === promoteGradeFilter : true;
          return nameMatch && gradeMatch;
        });

        return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="bg-amber-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">New School Year — Student Promotion</h2>
                </div>
                <button onClick={() => setShowPromoteModal(false)} className="text-white hover:text-amber-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0">

                {/* LEFT — Promotion summary */}
                <div className="lg:w-72 flex-shrink-0 border-r border-gray-200 flex flex-col">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Promotion Plan</p>
                    <p className="text-xs text-gray-600">Students <span className="font-semibold text-orange-600">not checked</span> below will be promoted. Checked students stay at their current grade.</p>
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold text-xs">Grade</th>
                          <th className="px-3 py-2 text-center text-gray-500 font-semibold text-xs">Total</th>
                          <th className="px-3 py-2 text-center text-orange-500 font-semibold text-xs">Repeat</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold text-xs">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {GRADES.map((g) => {
                          const gradeStuds = students.filter((s) => s.grade_level === g.value);
                          const repeatCount = gradeStuds.filter((s) => repeatingIds.has(s.id)).length;
                          const promoteCount = gradeStuds.length - repeatCount;
                          const isGrad = g.value === 6;
                          return (
                            <tr key={g.value} className={isGrad ? 'bg-red-50' : ''}>
                              <td className={`px-3 py-2 font-semibold text-xs ${g.text}`}>{g.label}</td>
                              <td className="px-3 py-2 text-center text-xs font-bold text-gray-700">{gradeStuds.length}</td>
                              <td className="px-3 py-2 text-center text-xs font-bold text-orange-600">{repeatCount > 0 ? repeatCount : '—'}</td>
                              <td className={`px-3 py-2 text-xs font-medium ${isGrad ? 'text-red-600' : 'text-green-700'}`}>
                                {isGrad
                                  ? `🎓 ${promoteCount} grad`
                                  : `→ ${GRADES[g.value + 1]?.label}`}
                                {repeatCount > 0 && !isGrad && (
                                  <span className="block text-orange-500">↩ {repeatCount} repeat</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-purple-50">
                          <td className="px-3 py-2 text-xs font-semibold text-purple-700">New Kinder</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-400">—</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-400">—</td>
                          <td className="px-3 py-2 text-xs font-medium text-purple-700">📝 Bulk register</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {repeatingIds.size > 0 && (
                    <div className="px-4 py-3 bg-orange-50 border-t border-orange-200 text-xs text-orange-700 font-semibold">
                      {repeatingIds.size} student{repeatingIds.size !== 1 ? 's' : ''} marked as repeating
                    </div>
                  )}
                </div>

                {/* RIGHT — Student repeater selection */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider self-center hidden sm:block">Mark Repeating Students:</p>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={promoteSearch}
                        onChange={(e) => setPromoteSearch(e.target.value)}
                        placeholder="Search name or LRN..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <select
                        value={promoteGradeFilter}
                        onChange={(e) => setPromoteGradeFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">All Grades</option>
                        {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-auto flex-1">
                    {promoteFiltered.length === 0 ? (
                      <p className="text-center text-gray-400 py-12 text-sm">No students found.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2 text-center w-12">
                              <span className="text-xs text-orange-500 font-bold">Repeat?</span>
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">LRN</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Gender</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {promoteFiltered.map((s) => {
                            const isRepeating = repeatingIds.has(s.id);
                            const gradeInfo = GRADES.find((g) => g.value === s.grade_level);
                            return (
                              <tr
                                key={s.id}
                                onClick={() => toggleRepeating(s.id)}
                                className={`cursor-pointer transition ${isRepeating ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
                              >
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isRepeating}
                                    onChange={() => toggleRepeating(s.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`font-medium ${isRepeating ? 'text-orange-700' : 'text-gray-800'}`}>
                                    {s.first_name} {s.middle_name ? s.middle_name[0] + '. ' : ''}{s.last_name}
                                  </span>
                                  {isRepeating && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">Repeating</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-500">{s.lrn}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gradeInfo?.cardBg} ${gradeInfo?.text}`}>
                                    {gradeInfo?.label ?? `Grade ${s.grade_level}`}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-600">{s.gender}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0 bg-gray-50">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800 flex-1">
                  ⚠️ <strong>Cannot be undone.</strong> Grade 6 non-repeaters will be permanently removed. Checked students stay at their current grade.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPromoteModal(false)} disabled={promoting}
                    className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition text-sm">
                    Cancel
                  </button>
                  <button onClick={handlePromote} disabled={promoting}
                    className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold text-sm flex items-center gap-2 shadow">
                    {promoting ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Promoting...</span></>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Confirm & Promote</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Kinder Registration Modal ── */}
      {showBulkKinderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-purple-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-xl font-bold text-white">Bulk Register Kinder Students</h2>
                <span className="bg-white bg-opacity-20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{kinderRows.length} row{kinderRows.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => setShowBulkKinderModal(false)} className="text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="px-6 pt-4 pb-2 text-sm text-gray-600 flex-shrink-0">
              Fill in the details for each new Kinder student. All students will be registered under <strong>Kinder (Grade 0)</strong>. Fields marked <span className="text-red-500">*</span> are required.
            </p>

            {/* Scrollable table */}
            <div className="overflow-auto flex-1 px-6 pb-2">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-purple-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold w-8">#</th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">LRN <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">First Name <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Middle Name</th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Last Name <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Birthdate <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold w-14">Age</th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Gender <span className="text-red-500">*</span></th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Section</th>
                    <th className="px-2 py-2 text-left text-purple-700 font-semibold">Parent/Guardian</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kinderRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-400 text-xs font-medium">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <input value={row.lrn} onChange={(e) => updateKinderRow(row.id, 'lrn', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="LRN" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.first_name} onChange={(e) => updateKinderRow(row.id, 'first_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="First name" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.middle_name} onChange={(e) => updateKinderRow(row.id, 'middle_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="Middle name" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.last_name} onChange={(e) => updateKinderRow(row.id, 'last_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="Last name" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="date" value={row.birthdate} onChange={(e) => updateKinderRow(row.id, 'birthdate', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.age} readOnly
                          className="w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-sm text-center text-gray-500" placeholder="—" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={row.gender} onChange={(e) => updateKinderRow(row.id, 'gender', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.section} onChange={(e) => updateKinderRow(row.id, 'section', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="Section" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.parent_guardian} onChange={(e) => updateKinderRow(row.id, 'parent_guardian', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="Parent name" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeKinderRow(row.id)}
                          className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50" title="Remove row">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={addKinderRow}
                  className="flex items-center gap-2 bg-purple-50 border-2 border-purple-300 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition text-sm font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Row
                </button>
                {bulkError && <p className="text-red-600 text-sm">{bulkError}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkKinderModal(false)} disabled={bulkSubmitting}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
                <button onClick={handleBulkKinderSubmit} disabled={bulkSubmitting}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm flex items-center gap-2">
                  {bulkSubmitting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Saving...</span></>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>Register {kinderRows.length} Student{kinderRows.length !== 1 ? 's' : ''}</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
