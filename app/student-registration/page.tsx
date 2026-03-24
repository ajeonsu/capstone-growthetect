'use client';

import { useEffect, useState } from 'react';
import ModuleLoader from '@/components/ModuleLoader';
import NutritionistSidebar from '@/components/NutritionistSidebar';

// Returns true if the LRN is an auto-generated placeholder (no real LRN was provided)
const isPlaceholderLrn = (lrn: string | null | undefined) =>
  !lrn || lrn.startsWith('NL-') || lrn.startsWith('NO-LRN-');

const GRADES = [
  { label: 'Kinder',  value: 0, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 1', value: 1, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 2', value: 2, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 3', value: 3, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 4', value: 4, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 5', value: 5, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
  { label: 'Grade 6', value: 6, headerBg: 'bg-[#355872]', cardBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-[#355872]', countBg: 'bg-[#355872]' },
];

// Empty row template for bulk Kinder registration
const emptyKinderRow = () => ({
  id: Math.random().toString(36).slice(2),
  lrn: '', first_name: '', middle_name: '', last_name: '',
  birthdate: '', age: '', gender: '', section: '', parent_guardian: '', contact_number: '', address: '',
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
  const [showPromoteConfirmModal, setShowPromoteConfirmModal] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [pendingBulkKinder, setPendingBulkKinder] = useState(false);
  const [repeatingIds, setRepeatingIds] = useState<Set<number>>(new Set());
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteGradeFilter, setPromoteGradeFilter] = useState<number | ''>('');

  // Delete confirmation modal
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [deleteStudentName, setDeleteStudentName] = useState('');

  // Notification modal
  const [notifModal, setNotifModal] = useState<{ type: 'success' | 'error' | 'delete'; title: string; message: string } | null>(null);
  const showNotif = (type: 'success' | 'error' | 'delete', title: string, message: string) =>
    setNotifModal({ type, title, message });

  // Bulk Kinder Registration modal
  const [showBulkKinderModal, setShowBulkKinderModal] = useState(false);
  const [kinderRows, setKinderRows] = useState<ReturnType<typeof emptyKinderRow>[]>([emptyKinderRow()]);
  const [bulkError, setBulkError] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkGradeLevel, setBulkGradeLevel] = useState(0);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  // Archive modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveTab, setArchiveTab] = useState<'archived' | 'history'>('archived');
  const [archivedStudents, setArchivedStudents] = useState<any[]>([]);
  const [promotionSessions, setPromotionSessions] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveReasonFilter, setArchiveReasonFilter] = useState<'all' | 'deleted' | 'graduated'>('all');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [archiveActionLoading, setArchiveActionLoading] = useState<number | null>(null);
  const [rollbackSessionLoading, setRollbackSessionLoading] = useState<string | null>(null);
  const [permDeleteId, setPermDeleteId] = useState<number | null>(null);
  const [permDeleteName, setPermDeleteName] = useState('');

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

  const loadArchivedStudents = async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch('/api/students?archived=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setArchivedStudents(data.students);
    } catch {
      // silent
    } finally {
      setArchiveLoading(false);
    }
  };

  const loadPromotionSessions = async () => {
    try {
      const res = await fetch('/api/promotion-sessions', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPromotionSessions(data.sessions);
    } catch {
      // silent
    }
  };

  const openArchiveModal = async () => {
    setShowArchiveModal(true);
    setArchiveTab('archived');
    setArchiveSearch('');
    setArchiveReasonFilter('all');
    setExpandedSession(null);
    await Promise.all([loadArchivedStudents(), loadPromotionSessions()]);
  };

  const handleRestoreStudent = async (id: number) => {
    setArchiveActionLoading(id);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', id }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadStudents(), loadArchivedStudents(), loadPromotionSessions()]);
        showNotif('success', 'Student Restored', data.message || 'Student has been restored successfully.');
      } else {
        showNotif('error', 'Restore Failed', data.message || 'Failed to restore student.');
      }
    } catch {
      showNotif('error', 'Restore Failed', 'An error occurred.');
    } finally {
      setArchiveActionLoading(null);
    }
  };

  const handleRevertStudent = async (id: number) => {
    setArchiveActionLoading(id);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert_student', id }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadStudents(), loadPromotionSessions()]);
        showNotif('success', 'Grade Reverted', data.message || 'Student grade has been reverted.');
      } else {
        showNotif('error', 'Revert Failed', data.message || 'Failed to revert student grade.');
      }
    } catch {
      showNotif('error', 'Revert Failed', 'An error occurred.');
    } finally {
      setArchiveActionLoading(null);
    }
  };

  const handleRollbackSession = async (sessionId: string) => {
    setRollbackSessionLoading(sessionId);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback_session', sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadStudents(), loadArchivedStudents(), loadPromotionSessions()]);
        setExpandedSession(null);
        showNotif('success', 'Rollback Complete', data.message || 'Promotion has been fully rolled back.');
      } else {
        showNotif('error', 'Rollback Failed', data.message || 'Failed to roll back promotion.');
      }
    } catch {
      showNotif('error', 'Rollback Failed', 'An error occurred.');
    } finally {
      setRollbackSessionLoading(null);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/students?id=${id}&permanent=true`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPermDeleteId(null);
        setPermDeleteName('');
        await loadArchivedStudents();
        showNotif('delete', 'Permanently Removed', 'The student record has been permanently deleted.');
      } else {
        showNotif('error', 'Delete Failed', data.message || 'Failed to permanently delete student.');
      }
    } catch {
      showNotif('error', 'Delete Failed', 'An error occurred.');
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
        const wasEditing = method === 'PUT';
        setShowFormModal(false);
        setEditingStudent(null);
        await loadStudents();
        showNotif('success', wasEditing ? 'Student Updated' : 'Student Added', wasEditing ? 'The student record has been updated successfully.' : 'The student has been registered successfully.');
      } else {
        setFormError(data.message);
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    }
  };

  const deleteStudent = (id: number, name: string) => {
    setDeleteStudentId(id);
    setDeleteStudentName(name);
  };

  const confirmDeleteStudent = async () => {
    if (deleteStudentId === null) return;
    try {
      const response = await fetch(`/api/students?id=${deleteStudentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        const name = deleteStudentName;
        setDeleteStudentId(null);
        setDeleteStudentName('');
        await loadStudents();
        showNotif('delete', 'Student Archived', `${name} has been moved to the archive and can be restored later.`);
      } else {
        showNotif('error', 'Delete Failed', data.message || 'Failed to delete student.');
      }
    } catch {
      showNotif('error', 'Delete Failed', 'An error occurred while deleting the student.');
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
    const kinderCount = students.filter((s) => s.grade_level === 0).length;
    if (kinderCount === 0) {
      showNotif(
        'error',
        'Cannot Promote Yet',
        'Kinder has no enrolled students. Please register new Kinder students before starting a new school year promotion.'
      );
      return;
    }
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
        setPendingBulkKinder(true);
        showNotif('success', 'Promotion Complete', data.message);
      } else {
        showNotif('error', 'Promotion Failed', 'Error: ' + data.message);
      }
    } catch {
      showNotif('error', 'Promotion Error', 'An error occurred during promotion.');
    } finally {
      setPromoting(false);
    }
  };

  // ── Bulk Kinder helpers ───────────────────────────────────────────────────
  const openBulkKinderModal = (gradeLevel: number = 0) => {
    setBulkGradeLevel(gradeLevel);
    setKinderRows([emptyKinderRow()]);
    setBulkError('');
    setShowBulkDropdown(false);
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
      if (!r.first_name || !r.last_name || !r.birthdate || !r.gender || !r.section) {
        setBulkError(`Row ${i + 1}: First Name, Last Name, Birthdate, Gender, and Section are required.`);
        return;
      }
    }
    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_insert', students: kinderRows.map(r => ({ ...r, grade_level: bulkGradeLevel })) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBulkKinderModal(false);
        await loadStudents();
        showNotif('success', 'Students Registered', data.message || 'Students have been registered successfully.');
      } else if (res.status === 401 || data.message === 'Unauthorized') {
        setBulkError('SESSION_EXPIRED');
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
    return fullName.includes(gradeSearch.toLowerCase()) || (s.rfid_uid || '').toLowerCase().includes(gradeSearch.toLowerCase());
  });

  const totalGradePages = Math.ceil(filteredGradeStudents.length / gradeItemsPerPage);
  const paginatedGradeStudents = filteredGradeStudents.slice(
    (gradePage - 1) * gradeItemsPerPage,
    gradePage * gradeItemsPerPage
  );

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
      <main className="md:ml-60 min-h-screen">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Manage Students</h1>
            <p className="text-xs text-slate-500 mt-0.5">View, add, edit, and manage enrolled students by grade level</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Bulk Register dropdown */}
            <div className="relative">
            <button
                onClick={() => setShowBulkDropdown((v) => !v)}
                className="flex items-center gap-2 bg-violet-700 text-white px-4 py-2.5 rounded-lg hover:bg-violet-800 transition font-semibold text-sm shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
                Bulk Registers
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
              {showBulkDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBulkDropdown(false)} />
                  <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                  {[
                    { label: 'Kinder', value: 0 },
                    { label: 'Grade 1', value: 1 },
                    { label: 'Grade 2', value: 2 },
                    { label: 'Grade 3', value: 3 },
                    { label: 'Grade 4', value: 4 },
                    { label: 'Grade 5', value: 5 },
                    { label: 'Grade 6', value: 6 },
                  ].map((g) => (
                    <button
                      key={g.value}
                      onClick={() => openBulkKinderModal(g.value)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 font-medium transition"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                </>
              )}
            </div>
            <button
              onClick={openPromoteModal}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 transition font-semibold text-sm shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              New School Year
            </button>
            <button
              onClick={openArchiveModal}
              className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition font-semibold text-sm shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive
            </button>
          </div>
          </div>

        <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">

          {loading ? (
            <ModuleLoader text="Loading students..." />
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
                  <table className="w-full text-base">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-500 uppercase tracking-wider">Grade Level</th>
                        <th className="px-4 py-2.5 text-center text-sm font-semibold text-sky-600 uppercase tracking-wider">♂ Male</th>
                        <th className="px-4 py-2.5 text-center text-sm font-semibold text-rose-500 uppercase tracking-wider">♀ Female</th>
                        <th className="px-4 py-2.5 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-500 uppercase tracking-wider w-48">Enrollment</th>
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
                                <span className={`font-semibold text-base ${gradeInfo.text}`}>{gradeInfo.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-sky-700">{male}</td>
                            <td className="px-4 py-3 text-center font-semibold text-rose-600">{female}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`${gradeInfo.countBg} text-white font-bold text-sm px-2.5 py-1 rounded-full`}>{total}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${gradeInfo.headerBg} rounded-full transition-all`} style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-sm text-slate-500 w-8">{percent}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grand total row */}
                      <tr className="bg-green-50 font-bold border-t-2 border-green-200">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-6 rounded-full bg-green-700"></span>
                            <span className="font-bold text-green-800 text-base">GRAND TOTAL</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-sky-700">
                          {students.filter((s) => s.gender === 'Male' || s.gender === 'M').length}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600">
                          {students.filter((s) => s.gender === 'Female' || s.gender === 'F').length}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-green-700 text-white font-bold text-sm px-2.5 py-1 rounded-full">{students.length}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-700 rounded-full w-full" />
                            </div>
                            <span className="text-sm text-slate-500 w-8">100%</span>
                          </div>
                        </td>
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
                                <td className="px-4 py-2 text-xs text-gray-500">{isPlaceholderLrn(s.lrn) ? '—' : s.lrn}</td>
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
                  ℹ️ Grade 6 graduates will be <strong>archived</strong> (not deleted) and can be restored later. Checked students stay at their current grade. Use the <strong>Archive</strong> button to roll back this promotion if needed.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPromoteModal(false)} disabled={promoting}
                    className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition text-sm">
                    Cancel
                  </button>
                  <button onClick={() => setShowPromoteConfirmModal(true)} disabled={promoting}
                    className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold text-sm flex items-center gap-2 shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span>Confirm & Promote</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Promotion Loading Overlay ── */}
      {promoting && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-8 flex flex-col items-center text-center">
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Promoting Students</h3>
            <p className="text-sm text-slate-500">Please wait while grades are being updated and graduates are being archived...</p>
          </div>
        </div>
      )}

      {/* ── Promote Confirmation Modal ── */}
      {showPromoteConfirmModal && (() => {
        const grade6Students = students.filter((s) => s.grade_level === 6);
        const grade6ToGraduate = grade6Students.filter((s) => !repeatingIds.has(s.id));
        const grade6Repeaters = grade6Students.filter((s) => repeatingIds.has(s.id));
        const totalToPromote = students.filter((s) => !repeatingIds.has(s.id) && s.grade_level < 6).length;
        const totalRepeaters = repeatingIds.size - grade6Repeaters.length; // non-grade-6 repeaters

        return (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Promotion</h3>
                  <p className="text-amber-100 text-xs">Please review before proceeding</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-slate-700">
                  You are about to start a new school year. Here is a summary of what will happen:
                </p>

                {/* Summary cards */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">{totalToPromote} student{totalToPromote !== 1 ? 's' : ''} will be promoted</p>
                      <p className="text-xs text-green-600">Grades Kinder–5 move up one level</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">{grade6ToGraduate.length} Grade 6 student{grade6ToGraduate.length !== 1 ? 's' : ''} will be archived</p>
                      <p className="text-xs text-blue-600">Graduates are NOT deleted — restorable from Archive</p>
                    </div>
                  </div>

                  {repeatingIds.size > 0 && (
                    <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-orange-800">{repeatingIds.size} student{repeatingIds.size !== 1 ? 's' : ''} will repeat their grade</p>
                        <p className="text-xs text-orange-600">These stay at their current grade level</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  You can roll back this entire promotion anytime using the <strong>Archive</strong> button.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => setShowPromoteConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition text-sm font-medium"
                >
                  Go Back
                </button>
                <button
                  onClick={() => { setShowPromoteConfirmModal(false); handlePromote(); }}
                  disabled={promoting}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {promoting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /><span>Promoting...</span></>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Yes, Promote Now
                    </>
                  )}
                </button>
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
                <h2 className="text-xl font-bold text-white">Bulk Register {bulkGradeLevel === 0 ? 'Kinder' : `Grade ${bulkGradeLevel}`} Students</h2>
                <span className="bg-white bg-opacity-20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{kinderRows.length} row{kinderRows.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => setShowBulkKinderModal(false)} className="text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              </div>

            <p className="px-6 pt-4 pb-2 text-sm text-gray-600 flex-shrink-0">
              Fill in the details for each new student. All students will be registered under <strong>{bulkGradeLevel === 0 ? 'Kinder (Grade 0)' : `Grade ${bulkGradeLevel}`}</strong>. Fields marked <span className="text-red-500">*</span> are required.
            </p>

            {/* Scrollable table */}
            <div className="overflow-auto flex-1 px-6 pb-2">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-purple-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold w-8">#</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold"><span className="text-red-500">*</span> First Name</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold">Middle Name</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold"><span className="text-red-500">*</span> Last Name</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold"><span className="text-red-500">*</span> Birthdate</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold w-14">Age</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold whitespace-nowrap"><span className="text-red-500">*</span> Gender</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold"><span className="text-red-500">*</span> Section</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold">Parent/Guardian</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold">Contact Number</th>
                    <th className="px-2 py-2 text-center text-purple-700 font-semibold">Address</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kinderRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 text-gray-400 text-xs font-medium">{idx + 1}</td>
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
                      <td className="px-2 py-1.5">
                        <input value={row.contact_number} onChange={(e) => updateKinderRow(row.id, 'contact_number', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="e.g. 09XX" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={row.address} onChange={(e) => updateKinderRow(row.id, 'address', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-sm" placeholder="Address" />
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
                {bulkError && (
                  bulkError === 'SESSION_EXPIRED' ? (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2 max-w-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <div>
                        <p className="text-red-700 text-xs font-bold">Session expired — your data is safe!</p>
                        <p className="text-red-600 text-xs mt-0.5">
                          <a href="/login" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Log in again in a new tab</a>, then click Register again.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm">{bulkError}</p>
                  )
                )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 md:pl-[calc(15rem+1rem)]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
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
            <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <input
                type="text"
                value={gradeSearch}
                onChange={(e) => { setGradeSearch(e.target.value); setGradePage(1); }}
                placeholder="Search by name or UID..."
                className="w-full sm:w-72 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
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
                <thead className={`${selectedGrade.headerBg} sticky top-0 z-10 border-b-2 border-black`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">UID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">Gender</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">Age</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">Section</th>
                    <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedGradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        {gradeSearch ? 'No students match your search.' : `No students enrolled in ${selectedGrade.label} yet.`}
                      </td>
                    </tr>
                  ) : (
                    paginatedGradeStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-blue-50 dark:hover:bg-gray-600 transition">
                        <td className="px-4 py-3 text-base">
                          {student.rfid_uid ? (
                            <span
                              title={student.rfid_uid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-mono font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600 cursor-default select-all"
                            >
                              🎴 {student.rfid_uid}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">No UID</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100">
                          {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                        </td>
                        <td className="px-4 py-3 text-base text-gray-700 dark:text-gray-300">{student.gender}</td>
                        <td className="px-4 py-3 text-base text-gray-700 dark:text-gray-300">{student.age || '-'}</td>
                        <td className="px-4 py-3 text-base text-gray-700 dark:text-gray-300">{student.section || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(student)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 transition font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id, `${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''} ${student.last_name}`)}
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
      {showFormModal && (() => {
        const formGradeVal = editingStudent ? editingStudent.grade_level : prefilledGrade;
        const formGradeInfo = GRADES.find((g) => g.value === Number(formGradeVal)) ?? GRADES[0];
        return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 md:pl-[calc(15rem+1rem)]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Form Header */}
            <div className={`${formGradeInfo.headerBg} px-5 py-3 rounded-t-2xl flex items-center justify-between flex-shrink-0`}>
              <h3 className="text-base font-bold text-white">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button onClick={closeFormModal} className="text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 space-y-3">
              <input type="hidden" name="id" value={editingStudent?.id || ''} />

              {/* Grade-level note */}
              {(() => {
                const gl = editingStudent ? editingStudent.grade_level : prefilledGrade;
                const gradeLabel = gl === 0 ? 'Kinder' : (gl !== null && gl !== undefined && gl !== '') ? `Grade ${gl}` : null;
                return (
                  <p className="text-sm text-gray-600">
                    {gradeLabel && (
                      <>This student will be registered under <strong>{gradeLabel}</strong>. </>
                    )}
                    Fields marked <span className="text-red-500">*</span> are required.
                  </p>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFID Card UID 🎴</label>
                  <input type="text" name="rfid_uid" placeholder="Tap RFID card or enter UID"
                    defaultValue={editingStudent?.rfid_uid || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                  <p className="text-xs text-gray-500 mt-0.5">Optional: For automatic student selection</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="first_name" required defaultValue={editingStudent?.first_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input type="text" name="middle_name" defaultValue={editingStudent?.middle_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="last_name" required defaultValue={editingStudent?.last_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate <span className="text-red-500">*</span></label>
                  <input type="date" name="birthdate" required defaultValue={editingStudent?.birthdate || ''}
                    onChange={(e) => {
                      const age = calculateAge(e.target.value);
                      const el = document.getElementById('ageField') as HTMLInputElement;
                      if (el) el.value = age.toString();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" id="ageField" name="age" readOnly defaultValue={editingStudent?.age || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  <select name="gender" required defaultValue={editingStudent?.gender || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level <span className="text-red-500">*</span></label>
                  <select name="grade_level" required
                    defaultValue={editingStudent?.grade_level ?? prefilledGrade ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section <span className="text-red-500">*</span></label>
                  <input type="text" name="section" required defaultValue={editingStudent?.section || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input type="tel" name="contact_number" defaultValue={editingStudent?.contact_number || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name</label>
                  <input type="text" name="parent_guardian" defaultValue={editingStudent?.parent_guardian || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea name="address" rows={2} defaultValue={editingStudent?.address || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1 pb-1">
                <button type="button" onClick={closeFormModal}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
                <button type="submit"
                  className={`px-5 py-2 ${formGradeInfo.headerBg} text-white rounded-lg hover:opacity-90 transition font-semibold text-sm`}>
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Notification Modal */}
      {notifModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
            {notifModal.type === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : notifModal.type === 'delete' ? (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <h3 className={`text-lg font-bold mb-2 ${notifModal.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {notifModal.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">{notifModal.message}</p>
                <button
              onClick={() => {
                setNotifModal(null);
                if (pendingBulkKinder) {
                  setPendingBulkKinder(false);
                  openBulkKinderModal();
                }
              }}
              className={`px-8 py-2 rounded-lg text-white font-semibold transition ${
                notifModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {pendingBulkKinder ? 'OK — Register New Students' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* ── Archive Modal ── */}
      {showArchiveModal && (() => {
        const filteredArchived = archivedStudents.filter((s) => {
          const matchReason = archiveReasonFilter === 'all' || s.archive_reason === archiveReasonFilter;
          const matchSearch = !archiveSearch ||
            `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase().includes(archiveSearch.toLowerCase());
          return matchReason && matchSearch;
        });

        return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="bg-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">Archive</h2>
                </div>
                <button onClick={() => setShowArchiveModal(false)} className="text-white hover:text-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200 flex flex-shrink-0">
                <button
                  onClick={() => setArchiveTab('archived')}
                  className={`px-6 py-3 text-sm font-semibold transition border-b-2 ${archiveTab === 'archived' ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Archived Students ({archivedStudents.length})
                </button>
                <button
                  onClick={() => { setArchiveTab('history'); loadPromotionSessions(); }}
                  className={`px-6 py-3 text-sm font-semibold transition border-b-2 ${archiveTab === 'history' ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Promotion History ({promotionSessions.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto">

                {/* ── Archived Students Tab ── */}
                {archiveTab === 'archived' && (
                  <div className="flex flex-col h-full">
                    {/* Filter bar */}
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-3 flex-shrink-0">
                      <input
                        type="text"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        placeholder="Search by name..."
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 w-60"
                      />
                      <div className="flex gap-1">
                        {(['all', 'deleted', 'graduated'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setArchiveReasonFilter(f)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition capitalize ${
                              archiveReasonFilter === f
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {f === 'all'
                              ? `All (${archivedStudents.length})`
                              : f === 'deleted'
                              ? `Deleted (${archivedStudents.filter((s) => s.archive_reason === 'deleted').length})`
                              : `Graduated (${archivedStudents.filter((s) => s.archive_reason === 'graduated').length})`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {archiveLoading ? (
                      <div className="py-16 text-center text-slate-400">Loading archived students...</div>
                    ) : (
                      <div className="overflow-auto flex-1">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Last Grade</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date Archived</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredArchived.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400">
                                  {archiveSearch || archiveReasonFilter !== 'all'
                                    ? 'No archived students match your filter.'
                                    : 'No archived students yet.'}
                                </td>
                              </tr>
                            ) : (
                              filteredArchived.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">{getGradeLabel(s.pre_archive_grade_level)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      s.archive_reason === 'graduated'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {s.archive_reason === 'graduated' ? 'Graduated' : 'Deleted'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 text-xs">
                                    {s.archived_at ? new Date(s.archived_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleRestoreStudent(s.id)}
                                        disabled={archiveActionLoading === s.id}
                                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                                      >
                                        {archiveActionLoading === s.id ? 'Restoring...' : 'Restore'}
                                      </button>
                                      <button
                                        onClick={() => { setPermDeleteId(s.id); setPermDeleteName(`${s.first_name} ${s.last_name}`); }}
                                        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Promotion History Tab ── */}
                {archiveTab === 'history' && (
                  <div className="p-6 space-y-4">
                    {promotionSessions.length === 0 ? (
                      <p className="text-center text-slate-400 py-16">No promotion history found.</p>
                    ) : (
                      promotionSessions.map((session: any, idx: number) => {
                        const isLatest = idx === 0;
                        return (
                        <div key={session.id} className={`border rounded-xl overflow-hidden ${isLatest ? 'border-slate-200' : 'border-slate-100 opacity-75'}`}>
                          {/* Session header row */}
                          <div className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${isLatest ? 'bg-slate-50' : 'bg-slate-50/60'}`}>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-semibold text-slate-800">
                                Promotion — {new Date(session.promoted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              {isLatest && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Latest</span>
                              )}
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                {session.total_promoted} promoted
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                {session.total_graduated} graduated
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition"
                              >
                                {expandedSession === session.id ? 'Collapse' : 'View Students'}
                              </button>
                              {isLatest ? (
                                <button
                                  onClick={() => handleRollbackSession(session.id)}
                                  disabled={rollbackSessionLoading === session.id}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {rollbackSessionLoading === session.id ? (
                                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /><span>Rolling back...</span></>
                                  ) : (
                                    'Rollback All'
                                  )}
                                </button>
                              ) : (
                                <div className="flex flex-col items-end gap-1">
                                  <button
                                    disabled
                                    className="px-3 py-1.5 bg-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center gap-1"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Rollback All
                                  </button>
                                  <p className="text-xs text-slate-400 italic text-right max-w-[180px]">
                                    Roll back the latest promotion first.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded student list */}
                          {expandedSession === session.id && session.students && (
                            <div className="border-t border-slate-200">
                              {session.students.length === 0 ? (
                                <p className="text-center text-slate-400 py-6 text-sm">No student records for this session.</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Grade Change</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {session.students.map((s: any) => (
                                      <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-medium text-slate-800">
                                          {s.first_name} {s.middle_name ? s.middle_name[0] + '. ' : ''}{s.last_name}
                                        </td>
                                        <td className="px-4 py-2">
                                          {s.is_archived ? (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Graduated (Archived)</span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-slate-600 text-xs">
                                          {s.is_archived
                                            ? `${getGradeLabel(s.pre_archive_grade_level)} → Graduated`
                                            : `${getGradeLabel(s.pre_promotion_grade_level)} → ${getGradeLabel(s.grade_level)}`}
                                        </td>
                                        <td className="px-4 py-2">
                                          {s.is_archived ? (
                                            <button
                                              onClick={() => handleRestoreStudent(s.id)}
                                              disabled={archiveActionLoading === s.id}
                                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                                            >
                                              {archiveActionLoading === s.id ? '...' : 'Restore to Grade 6'}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleRevertStudent(s.id)}
                                              disabled={archiveActionLoading === s.id}
                                              className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 transition disabled:opacity-50"
                                            >
                                              {archiveActionLoading === s.id ? '...' : 'Revert Grade'}
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Permanent Delete Confirmation Modal ── */}
      {permDeleteId !== null && (
        <div className="fixed inset-0 bg-black/60 z-[125] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Permanently Remove</h3>
            <p className="text-sm text-gray-500 text-center mb-1">This action cannot be undone. Permanently remove:</p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-6">{permDeleteName}?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setPermDeleteId(null); setPermDeleteName(''); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(permDeleteId)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Permanently Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {deleteStudentId !== null && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Archive Student</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">This will move to the archive:</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center mb-1">{deleteStudentName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">You can restore this student later from the Archive.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteStudentId(null); setDeleteStudentName(''); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                onClick={confirmDeleteStudent}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 transition-colors"
                >
                Move to Archive
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
